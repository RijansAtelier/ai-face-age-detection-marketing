import { useState, useEffect } from 'react';
import RekognitionFaceDetection from './components/RekognitionFaceDetection';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
    }
  }, [token, username]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUsername(data.username);
        setShowLoginModal(false);
        setLoginUsername('');
        setLoginPassword('');
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch (err) {
      setLoginError('Cannot connect to server. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUsername(null);
  };

  if (token) {
    return <Dashboard username={username} onLogout={handleLogout} token={token} />;
  }

  return (
    <div className="app public-view">
      <button className="floating-login-button" onClick={() => setShowLoginModal(true)}>
        Login
      </button>

      <div className="fullscreen-camera">
        <RekognitionFaceDetection onDetection={() => {}} isKioskMode={true} />
      </div>

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLoginModal(false)}>×</button>
            <h2>Admin Login</h2>
            <form onSubmit={handleLoginSubmit}>
              <input
                type="text"
                placeholder="Username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
                autoFocus
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
              {loginError && <div className="error-message">{loginError}</div>}
              <button type="submit" disabled={loginLoading}>
                {loginLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>
            <p className="login-hint">Default: admin / admin123</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
