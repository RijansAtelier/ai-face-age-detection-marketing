"""
Enhanced Age and Gender Detection using DeepFace
Maximum accuracy configuration with RetinaFace detector
"""

import os
os.environ['TF_USE_LEGACY_KERAS'] = '1'

from deepface import DeepFace
import cv2
import numpy as np
from typing import Dict, List, Optional
import base64
from io import BytesIO
from PIL import Image

class DeepFaceDetector:
    """
    High-accuracy age and gender detector using DeepFace library
    Uses RetinaFace for face detection and VGG-Face for age/gender prediction
    """
    
    def __init__(self):
        self.detector_backend = 'retinaface'
        self.actions = ['age', 'gender']
        print("DeepFace Detector initialized with RetinaFace backend for maximum accuracy")
    
    def analyze_image(self, image_input, enforce_detection=False) -> List[Dict]:
        """
        Analyze image for age and gender
        
        Args:
            image_input: Can be file path, numpy array, or base64 string
            enforce_detection: If True, raises error when no face detected
            
        Returns:
            List of dictionaries with detection results for each face
        """
        try:
            result = DeepFace.analyze(
                img_path=image_input,
                actions=self.actions,
                detector_backend=self.detector_backend,
                enforce_detection=enforce_detection,
                silent=True
            )
            
            if not isinstance(result, list):
                result = [result]
            
            processed_results = []
            for face_data in result:
                dominant_gender = face_data.get('dominant_gender', 'Unknown')
                gender_normalized = 'Male' if dominant_gender == 'Man' else ('Female' if dominant_gender == 'Woman' else 'Unknown')
                
                processed_results.append({
                    'age': int(face_data.get('age', 0)),
                    'gender': gender_normalized,
                    'gender_confidence': face_data.get('gender', {}),
                    'region': face_data.get('region', {}),
                    'face_confidence': face_data.get('face_confidence', 0)
                })
            
            return processed_results
            
        except Exception as e:
            print(f"Error in DeepFace analysis: {str(e)}")
            return []
    
    def analyze_base64(self, base64_string: str) -> List[Dict]:
        """
        Analyze base64 encoded image
        
        Args:
            base64_string: Base64 encoded image string
            
        Returns:
            List of detection results
        """
        try:
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            img_data = base64.b64decode(base64_string)
            img = Image.open(BytesIO(img_data))
            img_array = np.array(img)
            
            if len(img_array.shape) == 2:
                img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)
            elif img_array.shape[2] == 4:
                img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2RGB)
            
            return self.analyze_image(img_array, enforce_detection=False)
            
        except Exception as e:
            print(f"Error processing base64 image: {str(e)}")
            return []
    
    def analyze_stream_frame(self, frame: np.ndarray) -> List[Dict]:
        """
        Analyze a video frame for real-time detection
        
        Args:
            frame: Numpy array representing the frame
            
        Returns:
            List of detection results
        """
        try:
            if frame is None or frame.size == 0:
                return []
            
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            return self.analyze_image(rgb_frame, enforce_detection=False)
            
        except Exception as e:
            print(f"Error analyzing video frame: {str(e)}")
            return []
    
    def get_age_range(self, age: int) -> str:
        """
        Convert exact age to age range for consistency with old system
        
        Args:
            age: Predicted age
            
        Returns:
            Age range string
        """
        if age <= 2:
            return '0-2'
        elif age <= 6:
            return '4-6'
        elif age <= 12:
            return '8-12'
        elif age <= 20:
            return '15-20'
        elif age <= 32:
            return '25-32'
        elif age <= 43:
            return '38-43'
        elif age <= 53:
            return '48-53'
        else:
            return '60+'
    
    def format_result_for_display(self, results: List[Dict]) -> Dict:
        """
        Format results for display in the web interface
        
        Args:
            results: List of detection results
            
        Returns:
            Formatted dictionary for web display
        """
        if not results:
            return {
                'success': False,
                'message': 'No faces detected',
                'faces': []
            }
        
        faces = []
        for result in results:
            age = result.get('age', 0)
            gender = result.get('gender', 'Unknown')
            gender_conf = result.get('gender_confidence', {})
            
            gender_percentage = gender_conf.get('Man' if gender == 'Male' else 'Woman', 0)
            
            faces.append({
                'age': age,
                'age_range': self.get_age_range(age),
                'gender': gender,
                'confidence': round(gender_percentage, 2),
                'region': result.get('region', {})
            })
        
        return {
            'success': True,
            'faces': faces,
            'total_faces': len(faces)
        }
