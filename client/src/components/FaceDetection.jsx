import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import './FaceDetection.css';

function FaceDetection({ onDetection }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentDetection, setCurrentDetection] = useState(null);
  const detectionIntervalRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);
        setIsLoading(false);
        startVideo();
      } catch (err) {
        setError('Failed to load AI models. Please refresh the page.');
        setIsLoading(false);
      }
    };

    loadModels();

    return () => {
      stopVideo();
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Cannot access webcam. Please grant camera permissions.');
    }
  };

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const detectFaces = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState !== 4) return;

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withAgeAndGender();

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length > 0) {
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      
      resizedDetections.forEach(detection => {
        const { age, gender, genderProbability } = detection;
        const box = detection.detection.box;
        
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        ctx.fillStyle = '#00FF00';
        ctx.font = '20px Arial';
        ctx.fillText(
          `${gender} (${Math.round(age)})`,
          box.x,
          box.y > 10 ? box.y - 10 : 10
        );
        
        const roundedAge = Math.round(age);
        const confidence = genderProbability;
        
        setCurrentDetection({
          age: roundedAge,
          gender: gender,
          confidence: confidence
        });
        
        if (onDetection) {
          onDetection(roundedAge, gender, confidence);
        }
      });
    } else {
      setCurrentDetection(null);
    }
  };

  const toggleDetection = () => {
    if (isDetecting) {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      setIsDetecting(false);
    } else {
      detectionIntervalRef.current = setInterval(detectFaces, 1000);
      setIsDetecting(true);
    }
  };

  return (
    <div className="face-detection">
      <h2>Live Camera Feed</h2>
      
      {isLoading && <div className="loading">Loading AI models...</div>}
      {error && <div className="error">{error}</div>}

      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          width="640"
          height="480"
        />
        <canvas ref={canvasRef} className="overlay-canvas" />
      </div>

      {currentDetection && (
        <div className="detection-info">
          <div className="info-item">
            <span className="label">Gender:</span>
            <span className="value">{currentDetection.gender}</span>
          </div>
          <div className="info-item">
            <span className="label">Age:</span>
            <span className="value">{currentDetection.age} years</span>
          </div>
          <div className="info-item">
            <span className="label">Confidence:</span>
            <span className="value">{(currentDetection.confidence * 100).toFixed(1)}%</span>
          </div>
        </div>
      )}

      <button 
        onClick={toggleDetection} 
        className={`detection-btn ${isDetecting ? 'active' : ''}`}
        disabled={isLoading || !!error}
      >
        {isDetecting ? 'Stop Detection' : 'Start Detection'}
      </button>
    </div>
  );
}

export default FaceDetection;
