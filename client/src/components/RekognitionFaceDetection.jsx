import { useEffect, useRef, useState } from "react";
import "./FaceDetection.css";

function RekognitionFaceDetection({ onDetection, isKioskMode = false, token = null }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentDetections, setCurrentDetections] = useState([]);
  const detectionIntervalRef = useRef(null);
  const DETECTION_INTERVAL = 1000; // 1 second between detections for higher accuracy
  const MIN_CONFIDENCE = 90; // Minimum confidence threshold (0-100)

  useEffect(() => {
    const init = async () => {
      try {
        await startVideo();
        setIsLoading(false);
        setTimeout(() => {
          startDetectionAutomatically();
        }, 500);
      } catch (err) {
        setError("Failed to initialize camera. Please refresh the page.");
        setIsLoading(false);
      }
    };

    init();

    return () => {
      stopVideo();
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  const startDetectionAutomatically = () => {
    if (!isDetecting && !detectionIntervalRef.current) {
      detectionIntervalRef.current = setInterval(detectFaces, DETECTION_INTERVAL);
      setIsDetecting(true);
    }
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          facingMode: "user",
          frameRate: { ideal: 30 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Cannot access webcam. Please grant camera permissions.");
      throw err;
    }
  };

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || video.readyState !== 4) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Use high-quality settings for better AWS Rekognition accuracy
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0);
    
    // Increase JPEG quality to 0.95 for maximum accuracy
    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const detectFaces = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const frameDataUrl = captureFrame();
      if (!frameDataUrl) return;

      // Convert data URL to blob
      const base64Data = frameDataUrl.split(',')[1];

      // Send to backend for Rekognition processing
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (isKioskMode) {
        headers['X-Kiosk-API-Key'] = import.meta.env.VITE_KIOSK_API_KEY || 'default-kiosk-key';
      }
      
      const response = await fetch('/api/rekognition/detect-faces', {
        method: 'POST',
        headers,
        body: JSON.stringify({ image: base64Data }),
      });

      if (!response.ok) {
        console.error('Failed to detect faces');
        return;
      }

      const data = await response.json();
      
      if (data.faces && data.faces.length > 0) {
        // Filter faces by minimum confidence threshold for higher accuracy
        const highConfidenceFaces = data.faces.filter(face => face.confidence >= MIN_CONFIDENCE);
        
        setCurrentDetections(highConfidenceFaces);
        drawDetections(highConfidenceFaces);
        
        // Save each detected face - backend handles deduplication
        for (let i = 0; i < highConfidenceFaces.length; i++) {
          const face = highConfidenceFaces[i];
          if (onDetection) {
            // Send full bounding box data to server for accurate IoU calculation
            const faceData = {
              boundingBox: face.boundingBox,
              gender: face.gender,
              ageRangeLow: face.ageRangeLow,
              ageRangeHigh: face.ageRangeHigh,
              confidence: face.confidence
            };
            
            onDetection(
              Math.round((face.ageRangeLow + face.ageRangeHigh) / 2),
              face.gender.toLowerCase(),
              face.confidence / 100,
              faceData // Pass full face data for backend deduplication
            );
          }
        }
      } else {
        setCurrentDetections([]);
        drawDetections([]);
      }
    } catch (error) {
      console.error("Face detection error:", error);
    }
  };

  const drawDetections = (faces) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    faces.forEach((face) => {
      const box = face.boundingBox;
      const x = box.left * canvas.width;
      const y = box.top * canvas.height;
      const width = box.width * canvas.width;
      const height = box.height * canvas.height;

      // Draw green bounding box for all high-accuracy detections
      ctx.strokeStyle = "#00FF00";
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, width, height);

      // Draw semi-transparent background for labels
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      const labelHeight = 35;
      ctx.fillRect(x, y > labelHeight ? y - labelHeight : y + height, width, labelHeight);

      // Draw label with age and gender
      ctx.fillStyle = "#00FF00";
      ctx.font = "bold 22px Arial";
      const avgAge = Math.round((face.ageRangeLow + face.ageRangeHigh) / 2);
      const label = `${face.gender} • Age: ${avgAge}`;
      ctx.fillText(label, x + 5, y > labelHeight ? y - 10 : y + height + 25);
    });
  };

  const toggleDetection = () => {
    if (isDetecting) {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      setIsDetecting(false);
      setCurrentDetections([]);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    } else {
      detectionIntervalRef.current = setInterval(detectFaces, DETECTION_INTERVAL);
      setIsDetecting(true);
    }
  };

  return (
    <div className="face-detection">
      <h2>Live Camera Feed - Amazon Rekognition</h2>

      {isLoading && <div className="loading">Initializing camera...</div>}
      {error && <div className="error">{error}</div>}

      {!isLoading && !error && (
        <div className="accuracy-tips">
          <strong>🚪 High-Accuracy Detection System - Amazon Rekognition</strong>
          <ul>
            <li>
              <strong>⚡ Maximum Accuracy:</strong> 95% JPEG quality + HD resolution for precise detection
            </li>
            <li>
              <strong>👥 Multiple Faces:</strong> Detects all people in frame with individual age & gender analysis
            </li>
            <li>
              <strong>🚫 Smart Tracking:</strong> Same person detected again after 12 hours
            </li>
            <li>
              <strong>📊 Real-time Processing:</strong> Scans every second with AWS Rekognition AI
            </li>
          </ul>
        </div>
      )}

      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onLoadedMetadata={() => {
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
            }
          }}
        />
        <canvas ref={canvasRef} />
      </div>

      {!isLoading && !error && (
        <>
          <button onClick={toggleDetection} className="detection-button">
            {isDetecting ? "Stop Detection" : "Start Detection"}
          </button>

          {currentDetections.length > 0 && (
            <div className="detection-info">
              <h3>Current Detections:</h3>
              {currentDetections.map((face, idx) => (
                <div key={idx} className="detection-details">
                  <p>Person {idx + 1}:</p>
                  <p>Gender: {face.gender}</p>
                  <p>Age Range: {face.ageRangeLow}-{face.ageRangeHigh} years</p>
                  <p>Confidence: {face.confidence.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default RekognitionFaceDetection;
