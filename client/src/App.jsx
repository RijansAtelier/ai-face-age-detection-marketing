import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import RekognitionFaceDetection from './components/RekognitionFaceDetection';
import './App.css';

const KIOSK_MODE = import.meta.env.VITE_ADMIN_MODE !== 'true';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [kioskDetectionCount, setKioskDetectionCount] = useState(0);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
    }
  }, [token, username]);

  const handleLogin = (newToken, newUsername) => {
    setToken(newToken);
    setUsername(newUsername);
  };

  const handleLogout = () => {
    setToken(null);
    setUsername(null);
  };

  const handleKioskDetection = async (age, gender, confidence, faceDescriptor) => {
    try {
      const response = await fetch('/api/detections/kiosk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Kiosk-API-Key': import.meta.env.VITE_KIOSK_API_KEY || 'default-kiosk-key',
        },
        body: JSON.stringify({
          age,
          gender,
          confidence,
          faceDescriptor,
        }),
      });

      const result = await response.json();
      if (result.duplicate) {
        console.log('Duplicate person detected (already counted)');
      } else {
        setKioskDetectionCount(prev => prev + 1);
        console.log('New customer detected and saved');
      }
    } catch (error) {
      console.error('Error saving detection:', error);
    }
  };

  if (KIOSK_MODE) {
    return (
      <div className="app kiosk-mode">
        <div className="kiosk-header">
          <h1>🚪 Entrance Monitoring System</h1>
          <div className="kiosk-stats">
            <span>Detected Today: {kioskDetectionCount}</span>
          </div>
        </div>
        <RekognitionFaceDetection onDetection={handleKioskDetection} isKioskMode={true} />
        <div className="kiosk-footer">
          <p>System running in automated mode - no login required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {!token ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard username={username} onLogout={handleLogout} token={token} />
      )}
    </div>
  );
}

export default App;
