import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';

export default function StudentDashboard() {
  const [experiments, setExperiments] = useState([]);
  const [marker, setMarker] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/student/experiments')
      .then((d) => setExperiments(d.experiments))
      .catch(() => setError('Failed to load experiments'));
  }, []);

  const onScan = (e) => {
    e.preventDefault();
    if (marker.trim()) navigate(`/student/scan/${encodeURIComponent(marker.trim())}`);
  };

  const remaining = experiments.filter((e) => e.status !== 'completed');
  const completed = experiments.filter((e) => e.status === 'completed');

  return (
    <div className="container">
      <h2>My Experiments</h2>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h3>Scan a marker</h3>
        <form onSubmit={onScan} className="row">
          <input
            placeholder="Enter ArUco / QR marker id (e.g. ARUCO-DEMO-0001)"
            value={marker}
            onChange={(e) => setMarker(e.target.value)}
          />
          <button type="submit">Go</button>
        </form>
      </div>

      <h3>Remaining ({remaining.length})</h3>
      <ExperimentList experiments={remaining} />

      <h3 style={{ marginTop: 24 }}>Completed ({completed.length})</h3>
      <ExperimentList experiments={completed} />
    </div>
  );
}

function ExperimentList({ experiments }) {
  if (experiments.length === 0) return <p className="muted">Nothing here yet.</p>;
  return (
    <div className="grid">
      {experiments.map((e) => (
        <div key={e.id} className="card">
          <div className="muted" style={{ fontSize: 12 }}>
            {e.labName}
          </div>
          <div className="spread">
            <strong>{e.experimentName}</strong>
            <span className={`badge badge-${e.status}`}>{e.status.replace('_', ' ')}</span>
          </div>
          <div style={{ marginTop: 10 }}>
            {e.hasContent ? (
              <Link to={`/student/scan/${encodeURIComponent(e.markerId)}`} className="btn btn-sm">
                {e.status === 'not_started' ? 'Start' : 'Open'}
              </Link>
            ) : (
              <span className="muted">No content yet</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
