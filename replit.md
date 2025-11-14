# AI Face Age Detection SaaS

## Overview
A full-stack SaaS application for real-time face detection, age and gender estimation. Features both an admin dashboard and an automated kiosk mode for entrance monitoring.

## Project Structure
- **Frontend (React + Vite)**: `/client` - User interface, camera feed, face detection visualization
- **Backend (Express)**: `/server` - API endpoints, authentication, database management, AWS Rekognition integration
- **Database (SQLite)**: `server/detections.db` - Stores user credentials and detection data

## Recent Changes (November 14, 2025)
- Initial project setup completed in Replit environment
- Installed all dependencies (root, client)
- Configured workflow for concurrent frontend/backend development
- Frontend properly configured on port 5000 with host settings for Replit proxy
- Backend running on port 3001 (localhost)
- Database initialized with default admin user

## Features
1. **Two Operating Modes**:
   - **Kiosk Mode** (default): Automated entrance monitoring system
   - **Admin Mode**: Dashboard with analytics, user authentication, data management

2. **Face Detection**:
   - Local detection using face-api.js library
   - Cloud detection using AWS Rekognition
   - Age and gender estimation
   - Duplicate detection (prevents counting same person within 1 hour)

3. **Dashboard Analytics**:
   - Total detections count
   - Gender distribution
   - Average age calculation
   - Age range demographics
   - PDF report export
   - Clear all data functionality

## Technology Stack
- **Frontend**: React 19, Vite 7, face-api.js
- **Backend**: Node.js, Express 5
- **Database**: SQLite (better-sqlite3)
- **Authentication**: JWT (JSON Web Tokens)
- **AI/ML**: AWS Rekognition, TensorFlow.js (via face-api.js)

## Environment Variables
### Required for AWS Rekognition:
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (default: us-east-1)

### Optional Configuration:
- `JWT_SECRET` - Secret for JWT signing (default: 'your-secret-key-change-in-production')
- `KIOSK_API_KEY` / `VITE_KIOSK_API_KEY` - API key for kiosk mode (default: 'default-kiosk-key')
- `VITE_ADMIN_MODE` - Set to 'true' for admin mode, otherwise kiosk mode
- `NODE_ENV` - Set to 'production' for production deployment

## Default Credentials
- **Username**: admin
- **Password**: admin123

## Development
- Frontend runs on: http://0.0.0.0:5000 (proxied in Replit)
- Backend API runs on: http://localhost:3001
- Start command: `npm run dev` (runs both concurrently)

## Production Build
- Build command: `npm run build`
- Builds frontend to `client/dist`
- In production, backend serves static frontend files on port 5000

## Database Schema
### Users Table
- id (PRIMARY KEY)
- username (UNIQUE)
- password (hashed with bcrypt)
- created_at (timestamp)

### Detections Table
- id (PRIMARY KEY)
- age (INTEGER)
- gender (TEXT)
- confidence (REAL)
- face_descriptor (TEXT/JSON) - For deduplication
- timestamp (DATETIME)

## API Endpoints
- POST `/api/login` - User authentication
- POST `/api/rekognition/detect-faces` - AWS Rekognition face detection
- POST `/api/detections` - Save detection (requires auth)
- POST `/api/detections/kiosk` - Save detection in kiosk mode
- GET `/api/detections` - Fetch all detections (requires auth)
- GET `/api/detections/stats` - Get statistics (requires auth)
- DELETE `/api/detections` - Clear all detections (requires auth)

## Project Architecture
- Uses SQLite for persistent storage with automatic initialization
- JWT-based authentication for admin access
- Kiosk mode uses API key authentication
- Supports two detection engines: face-api.js (local) and AWS Rekognition (cloud)
- Deduplication using facial descriptors or bounding box overlap
- Vite proxy configuration for API calls in development
