import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client.js';

export default function ScanPage() {
  const { marker } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setError('');
    api
      .get(`/student/scan/${encodeURIComponent(marker)}`)
      .then(setInfo)
      .catch((e) => setError(e.status === 404 ? 'No experiment found for that marker.' : 'Lookup failed'));
  }, [marker]);

  const startOrResume = async () => {
    setBusy(true);
    setError('');
    try {
      const { session } = await api.post('/student/sessions', { markerId: marker });
      navigate(`/student/sessions/${session.id}`);
    } catch (e) {
      setError(e.message || 'Could not start session');
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
        <Link to="/student">← Back to dashboard</Link>
      </div>
    );
  }
  if (!info) return <div className="container">Resolving marker…</div>;

  return (
    <div className="container">
      <div className="card">
        <div className="muted" style={{ fontSize: 12 }}>
          {info.experiment.labName} · marker {marker}
        </div>
        <h2>{info.experiment.experimentName}</h2>
        {info.experiment.description && <p className="muted">{info.experiment.description}</p>}
        <div className="spread">
          <span className={`badge badge-${info.status}`}>{info.status.replace('_', ' ')}</span>
        </div>
        {!info.experiment.hasContent ? (
          <p className="error">This experiment has no published content yet.</p>
        ) : (
          <button onClick={startOrResume} disabled={busy} style={{ marginTop: 16 }}>
            {info.status === 'not_started' ? 'Start experiment' : 'Resume experiment'}
          </button>
        )}
      </div>
    </div>
  );
}
