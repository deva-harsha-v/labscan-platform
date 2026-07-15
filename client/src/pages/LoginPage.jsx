import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage({ role }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isAdmin = role === 'admin';
  const home = isAdmin ? '/admin' : '/student';

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username, password, role);
      const dest = location.state?.from?.pathname || home;
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.status === 429 ? 'Too many attempts. Try again later.' : 'Invalid credentials');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="card auth-shell">
        <h2>{isAdmin ? 'Admin Login' : 'Student Login'}</h2>
        <form onSubmit={onSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={busy} style={{ marginTop: 16, width: '100%' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
          {isAdmin ? (
            <Link to="/student/login">Student login →</Link>
          ) : (
            <Link to="/admin/login">Admin login →</Link>
          )}
        </p>
      </div>
    </div>
  );
}
