import { useState, useEffect } from 'react';
import RekognitionFaceDetection from './RekognitionFaceDetection';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import './Dashboard.css';

const API_URL = '';

function Dashboard({ username, onLogout, token }) {
  const [stats, setStats] = useState({ total: 0, male: 0, female: 0, averageAge: 0 });
  const [detections, setDetections] = useState([]);
  const [detectionMessage, setDetectionMessage] = useState(null);
  const [ageRangeMode, setAgeRangeMode] = useState('5-year');
  const [ageDistribution, setAgeDistribution] = useState({});

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/detections/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchDetections = async () => {
    try {
      const response = await fetch(`${API_URL}/api/detections`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDetections(data);
        calculateAgeDistribution(data);
      }
    } catch (err) {
      console.error('Failed to fetch detections:', err);
    }
  };

  const calculateAgeDistribution = (data) => {
    let distribution = {};

    if (ageRangeMode === '5-year') {
      distribution = {
        '0-17': 0,
        '18-22': 0,
        '23-27': 0,
        '28-32': 0,
        '33-37': 0,
        '38-42': 0,
        '43-47': 0,
        '48-52': 0,
        '53-57': 0,
        '58-62': 0,
        '63-67': 0,
        '68+': 0
      };

      data.forEach(d => {
        const age = d.age;
        if (age < 18) distribution['0-17']++;
        else if (age <= 22) distribution['18-22']++;
        else if (age <= 27) distribution['23-27']++;
        else if (age <= 32) distribution['28-32']++;
        else if (age <= 37) distribution['33-37']++;
        else if (age <= 42) distribution['38-42']++;
        else if (age <= 47) distribution['43-47']++;
        else if (age <= 52) distribution['48-52']++;
        else if (age <= 57) distribution['53-57']++;
        else if (age <= 62) distribution['58-62']++;
        else if (age <= 67) distribution['63-67']++;
        else distribution['68+']++;
      });
    } else {
      distribution = {
        '0-17': 0,
        '18-24': 0,
        '25-34': 0,
        '35-44': 0,
        '45-54': 0,
        '55-64': 0,
        '65+': 0
      };

      data.forEach(d => {
        const age = d.age;
        if (age < 18) distribution['0-17']++;
        else if (age <= 24) distribution['18-24']++;
        else if (age <= 34) distribution['25-34']++;
        else if (age <= 44) distribution['35-44']++;
        else if (age <= 54) distribution['45-54']++;
        else if (age <= 64) distribution['55-64']++;
        else distribution['65+']++;
      });
    }

    setAgeDistribution(distribution);
  };

  const handleDetection = async (age, gender, confidence, faceDescriptor) => {
    try {
      const response = await fetch(`${API_URL}/api/detections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ age, gender, confidence, faceDescriptor })
      });
      
      const result = await response.json();
      
      if (result.duplicate) {
        const lastDetectedDate = new Date(result.lastDetected);
        const timeAgo = Math.floor((Date.now() - lastDetectedDate.getTime()) / 60000);
        setDetectionMessage({
          type: 'duplicate',
          text: `⚠️ Already counted! This person was detected ${timeAgo} minute(s) ago.`
        });
        setTimeout(() => setDetectionMessage(null), 5000);
      } else {
        setDetectionMessage({
          type: 'success',
          text: '✅ New person detected and saved!'
        });
        setTimeout(() => setDetectionMessage(null), 3000);
        fetchStats();
        fetchDetections();
      }
    } catch (err) {
      console.error('Failed to save detection:', err);
      setDetectionMessage({
        type: 'error',
        text: '❌ Error saving detection'
      });
      setTimeout(() => setDetectionMessage(null), 3000);
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.text('Face Detection Analytics Report', 14, 20);
      
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Total Detections: ${stats.total || 0}`, 14, 40);
      doc.text(`Male: ${stats.male || 0} | Female: ${stats.female || 0}`, 14, 47);
      doc.text(`Average Age: ${stats.averageAge || 0} years`, 14, 54);
      
      if (detections && detections.length > 0) {
        const tableData = detections.slice(0, 100).map(d => [
          new Date(d.timestamp).toLocaleString(),
          d.gender || 'N/A',
          d.age || 'N/A',
          d.confidence ? `${(d.confidence * 100).toFixed(1)}%` : 'N/A'
        ]);
        
        doc.autoTable({
          startY: 65,
          head: [['Timestamp', 'Gender', 'Age', 'Confidence']],
          body: tableData,
        });
      } else {
        doc.setFontSize(10);
        doc.text('No detection data available yet.', 14, 70);
      }
      
      doc.save(`face-detection-report-${new Date().toISOString().split('T')[0]}.pdf`);
      
      setDetectionMessage({
        type: 'success',
        text: '✅ PDF report generated successfully!'
      });
      setTimeout(() => setDetectionMessage(null), 3000);
    } catch (err) {
      console.error('PDF Export Error:', err);
      setDetectionMessage({
        type: 'error',
        text: '❌ Failed to generate PDF report'
      });
      setTimeout(() => setDetectionMessage(null), 3000);
    }
  };

  const clearData = async () => {
    if (window.confirm('Are you sure you want to clear all detection data?')) {
      try {
        await fetch(`${API_URL}/api/detections`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        fetchStats();
        fetchDetections();
      } catch (err) {
        console.error('Failed to clear data:', err);
      }
    }
  };

  useEffect(() => {
    fetchStats();
    fetchDetections();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (detections.length > 0) {
      calculateAgeDistribution(detections);
    }
  }, [ageRangeMode]);

  return (
    <div className="dashboard-minimal">
      <button className="floating-logout-button" onClick={onLogout}>
        ×
      </button>

      <div className="fullscreen-camera">
        <RekognitionFaceDetection onDetection={handleDetection} token={token} />
      </div>
    </div>
  );
}

export default Dashboard;
