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
  const detectionBufferRef = useRef([]);
  const lockedAgeRef = useRef(null);
  const lockedGenderRef = useRef(null);
  const lastSavedDescriptorRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const isDetectingRef = useRef(false);
  const BUFFER_SIZE = 12;
  const MIN_FACE_SIZE = 80;
  const MIN_DETECTION_SCORE = 0.45;
  const MIN_AGE = 1;
  const MAX_AGE = 120;
  const OUTLIER_THRESHOLD = 2.0;
  const MIN_LANDMARK_QUALITY = 0.3;
  const SAMPLES_FOR_SAVE = 5;
  const NEW_PERSON_THRESHOLD = 0.6;
  const DETECTION_COOLDOWN = 1500;

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
        await startVideo();
        setTimeout(() => {
          startDetectionAutomatically();
        }, 500);
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

  const startDetectionAutomatically = () => {
    if (!isDetecting && !detectionIntervalRef.current) {
      detectionBufferRef.current = [];
      lockedAgeRef.current = null;
      lockedGenderRef.current = null;
      detectionIntervalRef.current = setInterval(detectFaces, 80);
      setIsDetecting(true);
    }
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
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

  const removeOutliers = (detections) => {
    if (detections.length < 10) return detections;
    
    const ages = detections.map(d => d.age).sort((a, b) => a - b);
    const q1Index = Math.floor(ages.length * 0.25);
    const q3Index = Math.floor(ages.length * 0.75);
    const q1 = ages[q1Index];
    const q3 = ages[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - OUTLIER_THRESHOLD * iqr;
    const upperBound = q3 + OUTLIER_THRESHOLD * iqr;
    
    let filtered = detections.filter(d => d.age >= lowerBound && d.age <= upperBound);
    
    if (filtered.length < 5) return detections;
    
    const trimmedAges = filtered.map(d => d.age).sort((a, b) => a - b);
    const trimAmount = Math.floor(trimmedAges.length * 0.15);
    const trimmedMean = trimmedAges.slice(trimAmount, trimmedAges.length - trimAmount)
      .reduce((a, b) => a + b, 0) / (trimmedAges.length - 2 * trimAmount);
    
    const mad = trimmedAges.map(age => Math.abs(age - trimmedMean)).sort((a, b) => a - b);
    const medianMAD = mad[Math.floor(mad.length / 2)];
    const threshold = 2.5 * medianMAD;
    
    const robustFiltered = filtered.filter(d => Math.abs(d.age - trimmedMean) <= Math.max(threshold, 3));
    
    return robustFiltered.length >= 5 ? robustFiltered : filtered;
  };

  const calculateLandmarkQuality = (landmarks) => {
    if (!landmarks || !landmarks.positions) return 0.3;
    const positions = landmarks.positions;
    if (positions.length < 68) return 0.3;
    
    const jawLine = positions.slice(0, 17);
    const eyebrows = positions.slice(17, 27);
    const nose = positions.slice(27, 36);
    const eyes = positions.slice(36, 48);
    const mouth = positions.slice(48, 68);
    
    const leftEyeCenter = { x: (eyes[0].x + eyes[3].x) / 2, y: (eyes[0].y + eyes[3].y) / 2 };
    const rightEyeCenter = { x: (eyes[6].x + eyes[9].x) / 2, y: (eyes[6].y + eyes[9].y) / 2 };
    
    const eyeDistance = Math.sqrt(
      Math.pow(rightEyeCenter.x - leftEyeCenter.x, 2) + 
      Math.pow(rightEyeCenter.y - leftEyeCenter.y, 2)
    );
    
    const horizontalSymmetry = 1.0 - Math.min(1.0, Math.abs(leftEyeCenter.x + rightEyeCenter.x - 2 * nose[4].x) / eyeDistance);
    
    const eyeYDiff = Math.abs(leftEyeCenter.y - rightEyeCenter.y);
    const tiltScore = 1.0 - Math.min(1.0, eyeYDiff / (eyeDistance * 0.15));
    
    const faceWidth = Math.abs(jawLine[0].x - jawLine[16].x);
    const eyeSpacing = eyeDistance / faceWidth;
    const proportionScore = eyeSpacing >= 0.25 && eyeSpacing <= 0.45 ? 1.0 : 0.7;
    
    const completenessScore = positions.length / 68;
    
    const totalScore = (horizontalSymmetry * 0.3 + tiltScore * 0.3 + proportionScore * 0.2 + completenessScore * 0.2);
    
    return Math.max(0.2, Math.min(1.0, totalScore));
  };

  const calculateMedianAge = (detections) => {
    const ages = detections.map(d => d.age).sort((a, b) => a - b);
    const mid = Math.floor(ages.length / 2);
    return ages.length % 2 === 0 ? (ages[mid - 1] + ages[mid]) / 2 : ages[mid];
  };

  const calculateExponentialWeightedAge = (detections) => {
    const alpha = 0.25;
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (let i = 0; i < detections.length; i++) {
      const recencyWeight = Math.pow(1 + alpha, i);
      const quality = Math.pow(detections[i].detectionScore, 1.5) * 
                     Math.pow(detections[i].confidence, 1.2) * 
                     Math.min(1.0, detections[i].faceSize / 250) * 
                     Math.pow(detections[i].landmarkQuality || 0.5, 1.3);
      const weight = recencyWeight * quality;
      weightedSum += detections[i].age * weight;
      totalWeight += weight;
    }
    
    return weightedSum / totalWeight;
  };

  const calculateTrimmedMean = (detections) => {
    const ages = detections.map(d => d.age).sort((a, b) => a - b);
    const trimAmount = Math.floor(ages.length * 0.2);
    const trimmedAges = ages.slice(trimAmount, ages.length - trimAmount);
    return trimmedAges.reduce((a, b) => a + b, 0) / trimmedAges.length;
  };

  const calculateFastAge = (detections) => {
    if (detections.length < 3) {
      return detections.reduce((sum, d) => sum + d.age, 0) / detections.length;
    }
    
    const ages = detections.map(d => d.age).sort((a, b) => a - b);
    const mid = Math.floor(ages.length / 2);
    const medianAge = ages.length % 2 === 0 ? (ages[mid - 1] + ages[mid]) / 2 : ages[mid];
    
    return medianAge;
  };

  const detectFaces = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (isDetectingRef.current) return;

    isDetectingRef.current = true;
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState !== 4) {
        return;
      }

      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ 
          inputSize: 320,
          scoreThreshold: 0.4
        }))
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withAgeAndGender();

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length > 0) {
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      
      resizedDetections.forEach(detection => {
        const { age, gender, genderProbability, descriptor } = detection;
        const box = detection.detection.box;
        const faceSize = Math.min(box.width, box.height);
        const detectionScore = detection.detection.score;
        
        const landmarkQuality = calculateLandmarkQuality(detection.landmarks);
        
        if (faceSize >= MIN_FACE_SIZE && detectionScore >= MIN_DETECTION_SCORE && 
            age >= MIN_AGE && age <= MAX_AGE && landmarkQuality >= MIN_LANDMARK_QUALITY) {
          detectionBufferRef.current.push({
            age: age,
            gender: gender,
            confidence: genderProbability,
            detectionScore: detectionScore,
            faceSize: faceSize,
            landmarkQuality: landmarkQuality,
            descriptor: descriptor ? Array.from(descriptor) : null,
            timestamp: Date.now()
          });
          
          if (detectionBufferRef.current.length > BUFFER_SIZE) {
            detectionBufferRef.current.shift();
          }
        }
        
        const isGoodDetection = faceSize >= MIN_FACE_SIZE && detectionScore >= MIN_DETECTION_SCORE;
        ctx.strokeStyle = isGoodDetection ? '#00FF00' : '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        if (detectionBufferRef.current.length >= 3) {
          const recentDetections = detectionBufferRef.current.slice(-BUFFER_SIZE);
          
          const filteredDetections = recentDetections.length >= 5 ? removeOutliers(recentDetections) : recentDetections;
          
          if (filteredDetections.length >= 3) {
            let finalAge, dominantGender;
            
            if (lockedAgeRef.current !== null && lockedGenderRef.current !== null) {
              finalAge = lockedAgeRef.current;
              dominantGender = lockedGenderRef.current;
            } else {
              const calculatedAge = calculateFastAge(filteredDetections);
              finalAge = Math.round(calculatedAge);
              
              const genderCounts = filteredDetections.reduce((acc, d) => {
                acc[d.gender] = (acc[d.gender] || 0) + (d.confidence * d.detectionScore);
                return acc;
              }, {});
              dominantGender = Object.keys(genderCounts).reduce((a, b) => genderCounts[a] > genderCounts[b] ? a : b);
              
              if (filteredDetections.length >= SAMPLES_FOR_SAVE) {
                lockedAgeRef.current = finalAge;
                lockedGenderRef.current = dominantGender;
              }
            }
            
            const avgConfidence = filteredDetections.reduce((sum, d) => sum + d.confidence, 0) / filteredDetections.length;
            const avgLandmarkQuality = filteredDetections.reduce((sum, d) => sum + (d.landmarkQuality || 0.5), 0) / filteredDetections.length;
          
          ctx.fillStyle = '#00FF00';
          ctx.font = 'bold 22px Arial';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.strokeText(
            `${dominantGender} (${finalAge})`,
            box.x,
            box.y > 10 ? box.y - 10 : 10
          );
          ctx.fillText(
            `${dominantGender} (${finalAge})`,
            box.x,
            box.y > 10 ? box.y - 10 : 10
          );
          
          const descriptorsAvailable = filteredDetections.filter(d => d.descriptor && d.descriptor.length > 0);
          const latestDescriptor = descriptorsAvailable.length > 0 
            ? descriptorsAvailable[descriptorsAvailable.length - 1].descriptor 
            : null;
          
          setCurrentDetection({
            age: finalAge,
            gender: dominantGender,
            confidence: avgConfidence,
            landmarkQuality: avgLandmarkQuality,
            descriptor: latestDescriptor
          });
          
            const now = Date.now();
            const timeSinceLastDetection = now - lastDetectionTimeRef.current;
            
            if (onDetection && detectionBufferRef.current.length >= SAMPLES_FOR_SAVE && latestDescriptor) {
              let isNewPerson = true;
              
              if (lastSavedDescriptorRef.current && timeSinceLastDetection < DETECTION_COOLDOWN) {
                const distance = euclideanDistance(latestDescriptor, lastSavedDescriptorRef.current);
                if (distance < NEW_PERSON_THRESHOLD) {
                  isNewPerson = false;
                }
              }
              
              if (isNewPerson && timeSinceLastDetection >= DETECTION_COOLDOWN) {
                lastSavedDescriptorRef.current = latestDescriptor;
                lastDetectionTimeRef.current = now;
                detectionBufferRef.current = [];
                lockedAgeRef.current = null;
                lockedGenderRef.current = null;
                onDetection(finalAge, dominantGender, avgConfidence, latestDescriptor);
              }
            }
          }
        } else {
          ctx.fillStyle = '#FFD700';
          ctx.font = '18px Arial';
          const statusText = detectionBufferRef.current.length >= 3 ? 'Analyzing...' : 'Calibrating...';
          ctx.fillText(
            statusText,
            box.x,
            box.y > 10 ? box.y - 10 : 10
          );
        }
      });
      } else {
        setCurrentDetection(null);
        const now = Date.now();
        detectionBufferRef.current = detectionBufferRef.current.filter(d => now - d.timestamp < 1000);
        if (detectionBufferRef.current.length === 0) {
          lockedAgeRef.current = null;
          lockedGenderRef.current = null;
        }
      }
    } catch (error) {
      console.error('Face detection error:', error);
    } finally {
      isDetectingRef.current = false;
    }
  };

  const toggleDetection = () => {
    if (isDetecting) {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      detectionBufferRef.current = [];
      lockedAgeRef.current = null;
      lockedGenderRef.current = null;
      lastSavedDescriptorRef.current = null;
      lastDetectionTimeRef.current = 0;
      setIsDetecting(false);
    } else {
      detectionBufferRef.current = [];
      lockedAgeRef.current = null;
      lockedGenderRef.current = null;
      lastSavedDescriptorRef.current = null;
      lastDetectionTimeRef.current = 0;
      detectionIntervalRef.current = setInterval(detectFaces, 80);
      setIsDetecting(true);
    }
  };

  const getQualityStatus = () => {
    const bufferLength = detectionBufferRef.current.length;
    const isLocked = lockedAgeRef.current !== null;
    
    if (isLocked) return { text: '🔒 Age Locked - Ready', color: '#00FF00', fontWeight: 'bold' };
    if (bufferLength >= 5) return { text: '✅ Ready to Lock', color: '#32CD32', fontWeight: 'bold' };
    if (bufferLength >= 3) return { text: '⚡ Processing...', color: '#FFD700' };
    return { text: '🔍 Detecting...', color: '#FFA500' };
  };

  return (
    <div className="face-detection">
      <h2>Live Camera Feed</h2>
      
      {isLoading && <div className="loading">Loading AI models...</div>}
      {error && <div className="error">{error}</div>}
      
      {!isLoading && !error && (
        <div className="accuracy-tips">
          <strong>🚪 Entrance Detection System - Active</strong>
          <ul>
            <li><strong>✅ Auto-Detection:</strong> Captures customers as they walk through gate</li>
            <li><strong>⚡ Ultra-Fast:</strong> Detection in under 0.5 seconds - perfect for moving customers</li>
            <li><strong>🔒 Age Lock:</strong> Age is locked once detected - expressions won't change it</li>
            <li><strong>🚫 No Duplicates:</strong> Same person won't be counted twice within 1 hour</li>
            <li><strong>📊 Marketing Data:</strong> Accurate age and gender data for analytics</li>
          </ul>
        </div>
      )}

      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="overlay-canvas" />
      </div>
      
      {isDetecting && (
        <div className="quality-indicator">
          <span>Detection Quality: </span>
          <span style={{ 
            color: getQualityStatus().color, 
            fontWeight: getQualityStatus().fontWeight || 'bold',
            fontSize: detectionBufferRef.current.length >= 50 ? '18px' : '16px'
          }}>
            {getQualityStatus().text}
          </span>
          <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
            ({detectionBufferRef.current.length}/{BUFFER_SIZE} samples)
          </span>
        </div>
      )}

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
        {isDetecting ? '🔴 Stop System' : '🟢 Start System'}
      </button>
      
      {isDetecting && (
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#4CAF50', color: 'white', borderRadius: '5px', textAlign: 'center' }}>
          <strong>✅ SYSTEM ACTIVE</strong> - Monitoring entrance for customers
        </div>
      )}
    </div>
  );
}

export default FaceDetection;
