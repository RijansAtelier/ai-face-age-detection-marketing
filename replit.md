# AI Face Age Detection SaaS

## Overview

This is a full-stack SaaS application that performs real-time face detection, age estimation, and gender prediction using AI models. The system provides two operational modes: an authenticated dashboard for administrators to review detection history and analytics, and a kiosk mode for public-facing deployments where users can interact with the face detection system without authentication.

The application uses browser-based face detection with face-api.js for real-time analysis and AWS Rekognition as a cloud-based alternative for enhanced accuracy. Detection results are stored locally for historical tracking and reporting capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**: React 19 with Vite bundler
- **Rationale**: Vite provides fast development builds and Hot Module Replacement (HMR). React 19 offers modern features and performance optimizations.
- **Alternatives Considered**: Create React App was considered but Vite offers superior developer experience with faster build times.

**Face Detection Strategy**: Dual-mode AI implementation
- **Primary Method**: Browser-based face-api.js for real-time detection
  - **Pros**: No API costs, works offline, instant results, privacy-preserving
  - **Cons**: Limited accuracy compared to cloud solutions, requires model downloads
- **Secondary Method**: AWS Rekognition for enhanced accuracy
  - **Pros**: Higher accuracy, regularly updated models
  - **Cons**: API costs, requires internet connection, latency considerations

**Component Structure**: Mode-based rendering
- Dashboard mode for authenticated admin users (detection history, analytics, reporting)
- Kiosk mode for public-facing deployments (unauthenticated, simplified interface)
- **Rationale**: Separating modes allows for different user experiences and security models while sharing core detection functionality

**PDF Generation**: Client-side using jsPDF and jspdf-autotable
- **Rationale**: Generates reports without server processing, reducing backend load
- **Trade-off**: Larger client bundle size vs. server processing overhead

### Backend Architecture

**Framework**: Express.js 5.x
- **Rationale**: Mature, well-documented, excellent middleware ecosystem
- **Server Configuration**: Dual-port setup (port 3001 for development API, port 5000 for production serving both API and static files)

**Authentication System**: JWT-based with dual authentication strategies
- **Admin Authentication**: JWT tokens for dashboard access
  - **Implementation**: Username/password login with bcrypt password hashing
  - **Token Storage**: Client-side with bearer token transmission
- **Kiosk Authentication**: API key-based for public kiosks
  - **Implementation**: Custom header `x-kiosk-api-key` for validation
  - **Rationale**: Allows public-facing kiosks to submit detections without user login

**API Design**: RESTful endpoints with role-based access
- `/api/login` - Admin authentication (public)
- `/api/detections` - CRUD operations (JWT protected for admin, API key protected for kiosk submissions)
- **Rationale**: Clear separation between admin operations and kiosk operations

### Data Storage

**Database**: SQLite with better-sqlite3
- **Rationale**: Serverless deployment-friendly, zero configuration, embedded database
- **Pros**: Simple setup, no separate database server, excellent for single-server deployments
- **Cons**: Not suitable for high-concurrency or distributed systems
- **Alternatives Considered**: PostgreSQL would provide better scalability but adds deployment complexity

**Schema Design**:
- `users` table: User authentication (username, hashed password, timestamps)
- `detections` table: Face detection records (age, gender, confidence, face descriptor, timestamps)
- **Rationale**: Simple relational model with minimal joins, optimized for read-heavy workloads

**Data Persistence**: File-based SQLite database (`detections.db`)
- **Location**: Server directory for easy backup and portability
- **Default User**: Auto-creates admin user (username: admin, password: admin123) on first run

### External Dependencies

**AWS Rekognition Integration**
- **Purpose**: Cloud-based face detection and analysis
- **Configuration**: Requires AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) and region configuration
- **SDK**: @aws-sdk/client-rekognition v3.x
- **Usage Pattern**: Optional enhancement - application functions without AWS if face-api.js is sufficient

**Face-api.js Models**
- **Pre-trained Models Required**:
  - SSD MobileNetV1 (face detection)
  - Face Landmark 68 Point (facial feature detection)
  - Age-Gender Model (age and gender prediction)
  - Face Recognition Model (face descriptors)
- **Model Loading**: Static files served from `/client/public/models/`
- **Rationale**: TensorFlow.js-based models run entirely in browser for privacy and cost efficiency

**Environment Variables**:
- `NODE_ENV`: Production/development mode toggle
- `PORT`: Server port (default: 5000 production, 3001 development)
- `JWT_SECRET`: Secret key for JWT signing (must be changed in production)
- `KIOSK_API_KEY`: API key for kiosk mode authentication
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: AWS Rekognition credentials (optional)

**Development Dependencies**:
- `concurrently`: Runs frontend and backend servers simultaneously in development
- CORS middleware: Enables cross-origin requests during development (frontend on port 5000, API on port 3001)

**Production Deployment Strategy**:
- Backend serves pre-built frontend static files from `/client/dist`
- Single-port deployment on port 5000
- Proxy configuration in Vite routes `/api/*` requests to backend during development