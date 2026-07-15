import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="container">
      <div className="center">
        <h1>🔬 LabScan</h1>
        <p className="muted">
          Scan an ArUco marker (or QR fallback) to open a lab experiment. Choose how you want to
          continue.
        </p>
      </div>

      <div className="entry-grid">
        <Link to="/student/login" className="card entry-card">
          <div style={{ fontSize: 40 }}>🎓</div>
          <h3>Student Login</h3>
          <p className="muted">Track progress through the learning and visual stages and a checklist.</p>
        </Link>

        <Link to="/admin/login" className="card entry-card">
          <div style={{ fontSize: 40 }}>🛠️</div>
          <h3>Admin Login</h3>
          <p className="muted">Manage labs, experiments, content and student accounts.</p>
        </Link>

        <Link to="/ghost" className="card entry-card">
          <div style={{ fontSize: 40 }}>👻</div>
          <h3>Ghost Mode</h3>
          <p className="muted">Browse learning content and videos freely — no login, no tracking.</p>
        </Link>
      </div>
    </div>
  );
}
