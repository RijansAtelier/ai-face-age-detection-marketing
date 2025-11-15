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

  const handleDetection = async (age, gender, confidence, faceDescriptor, ageRange) => {
    try {
      const response = await fetch(`${API_URL}/api/detections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ age, gender, confidence, faceDescriptor, ageRange })
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
          d.age_range || d.age || 'N/A',
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

  const malePercentage = stats.total > 0 ? ((stats.male / stats.total) * 100).toFixed(1) : 0;
  const femalePercentage = stats.total > 0 ? ((stats.female / stats.total) * 100).toFixed(1) : 0;
  const maxAgeCount = Math.max(...Object.values(ageDistribution), 1);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>🎯 Face Detection Admin Dashboard</h1>
        <div className="header-actions">
          <span className="username">Welcome, {username}</span>
          <button className="logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="stats-panel">
          <div className="stat-card">
            <h3>Total Detections</h3>
            <p className="stat-value">{stats.total || 0}</p>
            <span className="stat-label">All time</span>
          </div>
          
          <div className="stat-card">
            <h3>Male</h3>
            <p className="stat-value">{stats.male || 0}</p>
            <span className="stat-label">{malePercentage}% of total</span>
          </div>
          
          <div className="stat-card">
            <h3>Female</h3>
            <p className="stat-value">{stats.female || 0}</p>
            <span className="stat-label">{femalePercentage}% of total</span>
          </div>
          
          <div className="stat-card">
            <h3>Average Age</h3>
            <p className="stat-value">{stats.averageAge || 0}</p>
            <span className="stat-label">years old</span>
          </div>

          <div className="stat-card demographics">
            <div className="demographics-header">
              <h3>Age Distribution</h3>
              <div className="range-mode-selector">
                <button 
                  className={`mode-btn ${ageRangeMode === '5-year' ? 'active' : ''}`}
                  onClick={() => setAgeRangeMode('5-year')}
                >
                  5-Year
                </button>
                <button 
                  className={`mode-btn ${ageRangeMode === '10-year' ? 'active' : ''}`}
                  onClick={() => setAgeRangeMode('10-year')}
                >
                  10-Year
                </button>
              </div>
            </div>
            
            <div className="gender-split">
              <div className="gender-bar">
                <div className="gender-bar-male" style={{ width: `${malePercentage}%` }}>
                  {stats.male > 0 && `♂ ${stats.male}`}
                </div>
                <div className="gender-bar-female" style={{ width: `${femalePercentage}%` }}>
                  {stats.female > 0 && `♀ ${stats.female}`}
                </div>
              </div>
              <div className="gender-percentages">
                <span className="male-pct">Male: {malePercentage}%</span>
                <span className="female-pct">Female: {femalePercentage}%</span>
              </div>
            </div>

            <div className="age-demographics">
              {Object.entries(ageDistribution).map(([range, count]) => (
                <div key={range} className="age-range">
                  <span className="age-label">{range}</span>
                  <div className="age-bar-container">
                    <div 
                      className="age-bar-fill" 
                      style={{ width: `${(count / maxAgeCount) * 100}%` }}
                    >
                      {count > 0 && <span className="age-bar-text">{count}</span>}
                    </div>
                  </div>
                  <span className="age-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="main-panel">
          <div className="camera-section">
            <h2>Live Detection</h2>
            {detectionMessage && (
              <div className={`detection-message ${detectionMessage.type}`}>
                {detectionMessage.text}
              </div>
            )}
            <RekognitionFaceDetection onDetection={handleDetection} token={token} />
          </div>

          <div className="actions-section">
            <button className="action-btn export-btn" onClick={exportToPDF}>
              📄 Export to PDF
            </button>
            <button className="action-btn clear-btn" onClick={clearData}>
              🗑️ Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
