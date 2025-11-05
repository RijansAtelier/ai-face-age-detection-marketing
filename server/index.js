import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './database.js';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const KIOSK_API_KEY = process.env.KIOSK_API_KEY || 'default-kiosk-key';

app.use(cors());
app.use(express.json());

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

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username: user.username });
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

app.post('/api/detections/kiosk', (req, res) => {
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

app.listen(PORT, 'localhost', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (JWT_SECRET === 'your-secret-key-change-in-production') {
    console.warn('WARNING: Using default JWT_SECRET. Set JWT_SECRET environment variable for production!');
  }
  if (KIOSK_API_KEY === 'default-kiosk-key') {
    console.warn('WARNING: Using default KIOSK_API_KEY. Set KIOSK_API_KEY environment variable for production!');
  }
});
