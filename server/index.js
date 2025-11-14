import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './database.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { RekognitionClient, DetectFacesCommand } from '@aws-sdk/client-rekognition';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || (IS_PRODUCTION ? 5000 : 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const KIOSK_API_KEY = process.env.KIOSK_API_KEY || process.env.VITE_KIOSK_API_KEY || 'default-kiosk-key';

const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

if (IS_PRODUCTION) {
  app.use(express.static(join(__dirname, '../client/dist')));
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const authenticateKioskKey = (req, res, next) => {
  const apiKey = req.headers['x-kiosk-api-key'];
  
  if (!apiKey || apiKey !== KIOSK_API_KEY) {
    return res.status(403).json({ error: 'Invalid or missing kiosk API key' });
  }
  
  next();
};

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username: user.username });
});

app.post('/api/rekognition/detect-faces', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const imageBuffer = Buffer.from(image, 'base64');

    const command = new DetectFacesCommand({
      Image: {
        Bytes: imageBuffer,
      },
      Attributes: ['ALL'],
    });

    const response = await rekognitionClient.send(command);

    const faces = response.FaceDetails.map((face) => {
      const genderValue = face.Gender?.Value || 'Unknown';
      const genderConfidence = face.Gender?.Confidence || 0;
      const ageRangeLow = face.AgeRange?.Low || 0;
      const ageRangeHigh = face.AgeRange?.High || 0;

      return {
        boundingBox: {
          left: face.BoundingBox.Left,
          top: face.BoundingBox.Top,
          width: face.BoundingBox.Width,
          height: face.BoundingBox.Height,
        },
        gender: genderValue,
        ageRangeLow: ageRangeLow,
        ageRangeHigh: ageRangeHigh,
        confidence: genderConfidence,
      };
    });

    res.json({ faces });
  } catch (error) {
    console.error('Rekognition error:', error);
    res.status(500).json({ error: 'Failed to detect faces', details: error.message });
  }
});

app.post('/api/detections', authenticateToken, (req, res) => {
  const { age, gender, confidence, faceDescriptor } = req.body;
  
  if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length === 0) {
    console.warn('Detection saved without face descriptor - deduplication will not work');
    const result = db.prepare(
      'INSERT INTO detections (age, gender, confidence, face_descriptor) VALUES (?, ?, ?, ?)'
    ).run(age, gender, confidence, null);
    return res.json({ id: result.lastInsertRowid, duplicate: false, warning: 'No face descriptor' });
  }
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recentDetections = db.prepare(
    'SELECT * FROM detections WHERE timestamp > ?'
  ).all(oneHourAgo);
  
  const MATCH_THRESHOLD = 0.6;
  
  for (const detection of recentDetections) {
    if (detection.face_descriptor) {
      try {
        const storedDescriptor = JSON.parse(detection.face_descriptor);
        const distance = euclideanDistance(faceDescriptor, storedDescriptor);
        
        if (distance < MATCH_THRESHOLD) {
          return res.json({ 
            id: detection.id, 
            duplicate: true, 
            message: 'Person already detected within the last hour',
            lastDetected: detection.timestamp
          });
        }
      } catch (e) {
        console.error('Error parsing face descriptor:', e);
      }
    }
  }
  
  const result = db.prepare(
    'INSERT INTO detections (age, gender, confidence, face_descriptor) VALUES (?, ?, ?, ?)'
  ).run(age, gender, confidence, JSON.stringify(faceDescriptor));
  
  res.json({ id: result.lastInsertRowid, duplicate: false });
});

function euclideanDistance(descriptor1, descriptor2) {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error('Descriptors must have the same length');
  }
  
  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

app.get('/api/detections', authenticateToken, (req, res) => {
  const detections = db.prepare(
    'SELECT * FROM detections ORDER BY timestamp DESC LIMIT 1000'
  ).all();
  
  res.json(detections);
});

app.get('/api/detections/stats', authenticateToken, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM detections').get();
  const maleCount = db.prepare('SELECT COUNT(*) as count FROM detections WHERE gender = ?').get('male');
  const femaleCount = db.prepare('SELECT COUNT(*) as count FROM detections WHERE gender = ?').get('female');
  const avgAge = db.prepare('SELECT AVG(age) as avg FROM detections').get();
  
  res.json({
    total: total.count,
    male: maleCount.count,
    female: femaleCount.count,
    averageAge: avgAge.avg ? Math.round(avgAge.avg) : 0
  });
});

app.delete('/api/detections', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM detections').run();
  res.json({ message: 'All detections cleared' });
});

app.post('/api/detections/kiosk', authenticateKioskKey, (req, res) => {
  const { age, gender, confidence, faceDescriptor } = req.body;
  
  if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length === 0) {
    console.warn('Kiosk detection saved without face descriptor - deduplication will not work');
    const result = db.prepare(
      'INSERT INTO detections (age, gender, confidence, face_descriptor) VALUES (?, ?, ?, ?)'
    ).run(age, gender, confidence, null);
    return res.json({ id: result.lastInsertRowid, duplicate: false, warning: 'No face descriptor' });
  }
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recentDetections = db.prepare(
    'SELECT * FROM detections WHERE timestamp > ?'
  ).all(oneHourAgo);
  
  const MATCH_THRESHOLD = 0.6;
  
  for (const detection of recentDetections) {
    if (detection.face_descriptor) {
      try {
        const storedDescriptor = JSON.parse(detection.face_descriptor);
        const distance = euclideanDistance(faceDescriptor, storedDescriptor);
        
        if (distance < MATCH_THRESHOLD) {
          return res.json({ 
            id: detection.id, 
            duplicate: true, 
            message: 'Person already detected within the last hour',
            lastDetected: detection.timestamp
          });
        }
      } catch (e) {
        console.error('Error parsing face descriptor:', e);
      }
    }
  }
  
  const result = db.prepare(
    'INSERT INTO detections (age, gender, confidence, face_descriptor) VALUES (?, ?, ?, ?)'
  ).run(age, gender, confidence, JSON.stringify(faceDescriptor));
  
  res.json({ id: result.lastInsertRowid, duplicate: false });
});

if (IS_PRODUCTION) {
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../client/dist/index.html'));
  });
}

const HOST = IS_PRODUCTION ? '0.0.0.0' : 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  if (JWT_SECRET === 'your-secret-key-change-in-production') {
    console.warn('WARNING: Using default JWT_SECRET. Set JWT_SECRET environment variable for production!');
  }
  if (KIOSK_API_KEY === 'default-kiosk-key') {
    console.warn('WARNING: Using default KIOSK_API_KEY. Set KIOSK_API_KEY or VITE_KIOSK_API_KEY environment variable for production!');
  }
});
