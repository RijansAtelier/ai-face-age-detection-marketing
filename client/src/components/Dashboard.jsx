import { useState, useEffect } from 'react';
import FaceDetection from './FaceDetection';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import './Dashboard.css';

const API_URL = '';

function Dashboard({ username, onLogout, token }) {
  const [stats, setStats] = useState({ total: 0, male: 0, female: 0, averageAge: 0 });
  const [detections, setDetections] = useState([]);

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
      }
    } catch (err) {
      console.error('Failed to fetch detections:', err);
    }
  };

  const handleDetection = async (age, gender, confidence) => {
    try {
      await fetch(`${API_URL}/api/detections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ age, gender, confidence })
      });
      fetchStats();
      fetchDetections();
    } catch (err) {
      console.error('Failed to save detection:', err);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Face Detection Analytics Report', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total Detections: ${stats.total}`, 14, 40);
    doc.text(`Male: ${stats.male} | Female: ${stats.female}`, 14, 47);
    doc.text(`Average Age: ${stats.averageAge} years`, 14, 54);
    
    const tableData = detections.slice(0, 100).map(d => [
      new Date(d.timestamp).toLocaleString(),
      d.gender,
      d.age,
      `${(d.confidence * 100).toFixed(1)}%`
    ]);
    
    doc.autoTable({
      startY: 65,
      head: [['Timestamp', 'Gender', 'Age', 'Confidence']],
      body: tableData,
    });
    
    doc.save('face-detection-report.pdf');
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

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>AI Face Detection Dashboard</h1>
        <div className="header-actions">
          <span className="username">Welcome, {username}</span>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="stats-panel">
          <div className="stat-card">
            <h3>Total Detections</h3>
            <p className="stat-value">{stats.total}</p>
          </div>
          <div className="stat-card">
            <h3>Male</h3>
            <p className="stat-value">{stats.male}</p>
          </div>
          <div className="stat-card">
            <h3>Female</h3>
            <p className="stat-value">{stats.female}</p>
          </div>
          <div className="stat-card">
            <h3>Avg Age</h3>
            <p className="stat-value">{stats.averageAge}</p>
          </div>
        </div>

        <div className="main-panel">
          <div className="camera-section">
            <FaceDetection onDetection={handleDetection} />
          </div>

          <div className="actions-section">
            <button onClick={exportToPDF} className="action-btn export-btn">
              Export to PDF
            </button>
            <button onClick={clearData} className="action-btn clear-btn">
              Clear Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
