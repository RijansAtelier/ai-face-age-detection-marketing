import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './database.js';

const app = express();
const PORT = 3001;
const JWT_SECRET = 'your-secret-key-change-in-production';

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
  const { age, gender, confidence } = req.body;
  
  const result = db.prepare(
    'INSERT INTO detections (age, gender, confidence) VALUES (?, ?, ?)'
  ).run(age, gender, confidence);
  
  res.json({ id: result.lastInsertRowid });
});

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

app.listen(PORT, 'localhost', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
