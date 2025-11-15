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

const authenticateTokenOrKiosk = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-kiosk-api-key'];
  
  if (apiKey && apiKey === KIOSK_API_KEY) {
    return next();
  }
  
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post('/api/rekognition/detect-faces', authenticateTokenOrKiosk, async (req, res) => {
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
  
  // Reject requests without face descriptor to prevent bypass of deduplication
  if (!faceDescriptor) {
    return res.status(400).json({ error: 'Face descriptor is required for deduplication' });
  }
  
  // Handle Rekognition-based detections with object descriptors
  if (faceDescriptor && typeof faceDescriptor === 'object' && faceDescriptor.boundingBox) {
    // Validate descriptor format
    if (!validateRekognitionDescriptor(faceDescriptor)) {
      return res.status(400).json({ error: 'Invalid Rekognition descriptor format - numeric bounding box required' });
    }
    
    const duplicate = checkRekognitionDuplicate(age, gender, faceDescriptor);
    
    if (duplicate) {
      return res.json({ 
        id: duplicate.id, 
        duplicate: true, 
        message: 'Person already detected within the last hour',
        lastDetected: duplicate.timestamp
      });
    }
  }
  
  // Handle legacy array-based descriptors (face-api.js)
  else if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length > 0) {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const recentDetections = db.prepare(
      'SELECT * FROM detections WHERE timestamp > ?'
    ).all(twelveHoursAgo);
    
    const MATCH_THRESHOLD = 0.6;
    
    for (const detection of recentDetections) {
      if (detection.face_descriptor) {
        try {
          const storedDescriptor = JSON.parse(detection.face_descriptor);
          if (Array.isArray(storedDescriptor)) {
            const distance = euclideanDistance(faceDescriptor, storedDescriptor);
            
            if (distance < MATCH_THRESHOLD) {
              return res.json({ 
                id: detection.id, 
                duplicate: true, 
                message: 'Person already detected within the last 12 hours',
                lastDetected: detection.timestamp
              });
            }
          }
        } catch (e) {
          console.error('Error parsing face descriptor:', e);
        }
      }
    }
  }
  
  // Reject invalid descriptor formats (not Rekognition object or array)
  else {
    return res.status(400).json({ error: 'Invalid face descriptor format - must be Rekognition object or array' });
  }
  
  // Save the detection
  const result = db.prepare(
    'INSERT INTO detections (age, gender, confidence, face_descriptor) VALUES (?, ?, ?, ?)'
  ).run(age, gender, confidence, faceDescriptor ? JSON.stringify(faceDescriptor) : null);
  
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

function calculateIoU(box1, box2) {
  const xOverlap = Math.max(0, Math.min(box1.left + box1.width, box2.left + box2.width) - Math.max(box1.left, box2.left));
  const yOverlap = Math.max(0, Math.min(box1.top + box1.height, box2.top + box2.height) - Math.max(box1.top, box2.top));
  const intersection = xOverlap * yOverlap;
  
  const area1 = box1.width * box1.height;
  const area2 = box2.width * box2.height;
  const union = area1 + area2 - intersection;
  
  return union > 0 ? intersection / union : 0;
}

function parseFaceIdComponents(faceId) {
  if (typeof faceId !== 'string' || !faceId.includes('_')) return null;
  
  const parts = faceId.split('_');
  if (parts.length < 6) return null;
  
  return {
    gender: parts[0],
    age: parseInt(parts[1]),
    left: parseFloat(parts[2]),
    top: parseFloat(parts[3]),
    width: parseFloat(parts[4]),
    height: parseFloat(parts[5])
  };
}

function normalizeBoundingBox(box) {
  return {
    left: parseFloat(box.left) || 0,
    top: parseFloat(box.top) || 0,
    width: parseFloat(box.width) || 0,
    height: parseFloat(box.height) || 0
  };
}

function validateRekognitionDescriptor(faceDescriptor) {
  if (!faceDescriptor || typeof faceDescriptor !== 'object') {
    return false;
  }
  
  const bb = faceDescriptor.boundingBox;
  if (!bb || typeof bb !== 'object') {
    return false;
  }
  
  // Ensure all bounding box fields are numeric
  if (typeof bb.left !== 'number' || typeof bb.top !== 'number' || 
      typeof bb.width !== 'number' || typeof bb.height !== 'number') {
    return false;
  }
  
  return true;
}

function checkRekognitionDuplicate(age, gender, faceDescriptor) {
  // faceDescriptor is an object with boundingBox, gender, ageRangeLow, ageRangeHigh, confidence
  if (!faceDescriptor || typeof faceDescriptor !== 'object' || !faceDescriptor.boundingBox) {
    return null;
  }
  
  // Validate bounding box has numeric values
  const bb = faceDescriptor.boundingBox;
  if (typeof bb.left !== 'number' || typeof bb.top !== 'number' || 
      typeof bb.width !== 'number' || typeof bb.height !== 'number') {
    return null;
  }
  
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const recentDetections = db.prepare(
    'SELECT * FROM detections WHERE timestamp > ? AND gender = ? AND ABS(age - ?) <= 3'
  ).all(twelveHoursAgo, gender, age);
  
  const currentBox = normalizeBoundingBox(faceDescriptor.boundingBox);
  
  for (const detection of recentDetections) {
    if (detection.face_descriptor) {
      try {
        const storedData = JSON.parse(detection.face_descriptor);
        
        // Check if it's a Rekognition object descriptor
        if (storedData && typeof storedData === 'object' && storedData.boundingBox) {
          const storedBox = normalizeBoundingBox(storedData.boundingBox);
          const iou = calculateIoU(currentBox, storedBox);
          
          // IoU > 0.5 means likely the same person (tolerates small movement/jitter)
          if (iou > 0.5) {
            return detection;
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
  
  return null;
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
  
  // Reject requests without face descriptor to prevent bypass of deduplication
  if (!faceDescriptor) {
    return res.status(400).json({ error: 'Face descriptor is required for deduplication' });
  }
  
  // Handle Rekognition-based detections with object descriptors
  if (faceDescriptor && typeof faceDescriptor === 'object' && faceDescriptor.boundingBox) {
    // Validate descriptor format
    if (!validateRekognitionDescriptor(faceDescriptor)) {
      return res.status(400).json({ error: 'Invalid Rekognition descriptor format - numeric bounding box required' });
    }
    
    const duplicate = checkRekognitionDuplicate(age, gender, faceDescriptor);
    
    if (duplicate) {
      return res.json({ 
        id: duplicate.id, 
        duplicate: true, 
        message: 'Person already detected within the last hour',
        lastDetected: duplicate.timestamp
      });
    }
  }
  
  // Handle legacy array-based descriptors (face-api.js)
  else if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length > 0) {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const recentDetections = db.prepare(
      'SELECT * FROM detections WHERE timestamp > ?'
    ).all(twelveHoursAgo);
    
    const MATCH_THRESHOLD = 0.6;
    
    for (const detection of recentDetections) {
      if (detection.face_descriptor) {
        try {
          const storedDescriptor = JSON.parse(detection.face_descriptor);
          if (Array.isArray(storedDescriptor)) {
            const distance = euclideanDistance(faceDescriptor, storedDescriptor);
            
            if (distance < MATCH_THRESHOLD) {
              return res.json({ 
                id: detection.id, 
                duplicate: true, 
                message: 'Person already detected within the last 12 hours',
                lastDetected: detection.timestamp
              });
            }
          }
        } catch (e) {
          console.error('Error parsing face descriptor:', e);
        }
      }
    }
  }
  
  // Reject invalid descriptor formats (not Rekognition object or array)
  else {
    return res.status(400).json({ error: 'Invalid face descriptor format - must be Rekognition object or array' });
  }
  
  // Save the detection
  const result = db.prepare(
    'INSERT INTO detections (age, gender, confidence, face_descriptor) VALUES (?, ?, ?, ?)'
  ).run(age, gender, confidence, faceDescriptor ? JSON.stringify(faceDescriptor) : null);
  
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
