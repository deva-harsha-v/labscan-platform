import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';

export default function GhostBrowsePage() {
  const [experiments, setExperiments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/ghost/experiments', { auth: false })
      .then((d) => setExperiments(d.experiments))
      .catch(() => setError('Failed to load experiments'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <h2>👻 Ghost Mode — browse freely</h2>
      <p className="muted">Learning content and videos only. No timers, checklists, or tracking.</p>
      {error && <div className="error">{error}</div>}
      {loading ? (
        <p>Loading…</p>
      ) : experiments.length === 0 ? (
        <p className="muted">No published experiments yet.</p>
      ) : (
        <div className="grid">
          {experiments.map((e) => (
            <Link key={e.id} to={`/ghost/experiments/${e.id}`} className="card">
              <div className="muted" style={{ fontSize: 12 }}>
                {e.labName}
              </div>
              <strong>{e.experimentName}</strong>
              {e.description && <p className="muted">{e.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
