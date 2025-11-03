# Overview

This is an AI-powered face detection system that performs real-time age and gender detection from camera feeds or uploaded images. The application serves as a marketing analytics tool, capturing demographic data from facial analysis and providing an admin dashboard for visualizing detection statistics. Built with Flask and OpenCV, it uses pre-trained Caffe models for face detection and demographic classification.

# Recent Changes (November 2025)

## Accuracy Improvements
To address low real-world detection accuracy, comprehensive improvements were implemented:

1. **Upgraded Face Detection**: Replaced basic Haar cascade with DNN ResNet-10 SSD detector as primary method, with intelligent fallback to Haar cascade when needed
2. **CLAHE Preprocessing**: Added Contrast Limited Adaptive Histogram Equalization to handle varying lighting conditions
3. **Confidence Filtering**: Implemented thresholds (Age: 0.40, Gender: 0.55) to filter unreliable predictions and mark uncertain results
4. **Enhanced Preprocessing**: 
   - 10% padding around detected faces for better context
   - CLAHE applied to both face detection and age/gender prediction
   - crop=True in blob creation for proper image preprocessing
5. **Smart Database Filtering**: Only saves confident predictions to database (skips "Uncertain" results)

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Technology Stack**: Vanilla JavaScript with HTML5 Canvas API for real-time camera interaction

**Key Design Decisions**:
- **Multi-page SPA approach**: The application uses separate HTML pages (camera.html, dashboard.html, login.html) rather than a single-page application, providing clear separation between public-facing detection and admin analytics
- **Client-side camera handling**: WebRTC API via `getUserMedia()` handles camera access, with canvas-based frame capture sent to backend for processing
- **Real-time result display**: Detection results are dynamically rendered in the DOM without page refreshes, providing immediate visual feedback

## Backend Architecture

**Framework**: Flask (Python web framework)

**Key Design Decisions**:
- **Monolithic architecture**: Single `app.py` file handles all routes, model loading, and business logic (suitable for the application's scope but may need refactoring for scaling)
- **Session-based authentication**: Flask-Login manages admin sessions with cookie-based authentication
- **Synchronous request handling**: All image processing happens synchronously within request context (blocking approach, but acceptable for low-traffic scenarios)

**Model Loading Strategy**:
- Pre-trained Caffe models for age, gender, and face detection are loaded globally at startup
- Three separate neural networks: face detection (SSD), age classification, gender classification
- Age prediction uses bucket classification (8 age ranges: 0-2, 4-6, 8-12, 15-20, 25-32, 38-43, 48-53, 60+)

**Image Processing Pipeline**:
1. Face detection using SSD-based model with confidence threshold (0.5)
2. For each detected face: extract region of interest (ROI)
3. Gender prediction with confidence threshold (0.55)
4. Age prediction with confidence threshold (0.40)
5. Results stored in database with timestamp

## Data Storage

**Technology**: SQLAlchemy with SQLite

**Key Design Decisions**:
- **SQLite for simplicity**: File-based database suitable for development and small-scale deployment, avoiding external database dependencies
- **Relational model**: Uses SQLAlchemy ORM for database interactions
- **Two primary entities**: 
  - Admin: User authentication (username, password hash)
  - Detection records: Likely stores detection results with timestamps, age/gender predictions (not fully visible in provided code)

**Rationale**: SQLite chosen for zero-configuration deployment and portability. Trade-off is scalability limitations and no concurrent write support, which could be problematic for high-traffic scenarios.

## Authentication & Authorization

**Mechanism**: Flask-Login with password hashing via Werkzeug

**Security Approach**:
- Password hashing using `generate_password_hash()` (PBKDF2 by default)
- Session-based authentication with server-side session storage
- Login required decorator (`@login_required`) protects admin routes
- Default credentials: admin/admin123 (should be changed in production)

**Access Control**: Two-tier access - public camera/detection interface and protected admin dashboard

## Report Generation

**Technology**: ReportLab for PDF generation

**Key Features**:
- Generates analytical reports from detection data
- Supports letter and A4 page sizes
- Table-based data presentation with styling
- Image embedding capability for visual reports

**Use Case**: Admin users can export detection analytics as PDF reports for marketing analysis and presentations

# External Dependencies

## Pre-trained AI Models

**Caffe Models** (Deep Learning Framework):
- `age_deploy.prototxt` & `age_net.caffemodel`: Age classification network
- `gender_deploy.prototxt` & `gender_net.caffemodel`: Gender classification network  
- `deploy.prototxt` & `res10_300x300_ssd_iter_140000.caffemodel`: Face detection (SSD-based)

**Model Source**: Models appear to be standard pre-trained weights, likely from OpenCV's DNN module collection

## Third-Party Libraries

**Computer Vision**:
- **OpenCV (opencv-python-headless)**: Core image processing, model inference, face detection
- **NumPy**: Array operations for image data manipulation

**Web Framework**:
- **Flask**: Web server and routing
- **Flask-Login**: Session management and user authentication
- **Flask-SQLAlchemy**: Database ORM integration
- **Werkzeug**: Security utilities (password hashing)

**Document Generation**:
- **ReportLab**: PDF report generation with tables and charts

**Deployment**:
- **Gunicorn**: WSGI HTTP server for production deployment

## Database

**SQLite**: Embedded relational database (no external service required)

**Schema** (partial - from visible code):
- `Admin` table: id, username, password_hash
- Detections table: (structure not fully visible but likely contains timestamp, age_range, gender, confidence_scores)

## Environment Configuration

**Configuration Management**:
- `SECRET_KEY`: Read from environment variable with fallback to development key
- Database URI: Hardcoded to SQLite but follows SQLAlchemy URI pattern for easy migration
- No external API keys or service credentials visible in provided code

## Static Assets

**UTKFace Dataset**: Referenced in UI for sample images (large-scale face dataset with age, gender, and ethnicity labels)

**Model Files**: Stored in `models/` directory, expected to be present at deployment time