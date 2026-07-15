import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="navbar">
      <Link to="/" className="brand">
        🔬 LabScan
      </Link>
      <nav>
        {user ? (
          <>
            <span className="muted">
              {user.username} ({user.role})
            </span>
            {user.role === 'admin' && <Link to="/admin">Dashboard</Link>}
            {user.role === 'student' && <Link to="/student">Dashboard</Link>}
            <button className="btn-secondary btn-sm" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/ghost">Browse (Ghost)</Link>
            <Link to="/student/login">Student</Link>
            <Link to="/admin/login">Admin</Link>
          </>
        )}
      </nav>
    </div>
  );
}
