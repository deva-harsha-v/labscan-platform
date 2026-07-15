import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="container">Loading…</div>;
  }
  if (!user) {
    const to = role === 'admin' ? '/admin/login' : '/student/login';
    return <Navigate to={to} state={{ from: location }} replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }
  return children;
}
