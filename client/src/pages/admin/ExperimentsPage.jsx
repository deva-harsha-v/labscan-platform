import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import AdminNav from './AdminNav.jsx';

export default function ExperimentsPage() {
  const { labId } = useParams();
  const [lab, setLab] = useState(null);
  const [experiments, setExperiments] = useState([]);
  const [form, setForm] = useState({ experimentName: '', description: '', markerId: '' });
  const [error, setError] = useState('');

  const load = () => {
    api.get(`/admin/labs/${labId}`).then((d) => setLab(d.lab)).catch(() => {});
    api
      .get(`/admin/labs/${labId}/experiments`)
      .then((d) => setExperiments(d.experiments))
      .catch(() => setError('Failed to load experiments'));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labId]);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/admin/labs/${labId}/experiments`, {
        experimentName: form.experimentName,
        description: form.description || null,
        markerId: form.markerId,
      });
      setForm({ experimentName: '', description: '', markerId: '' });
      load();
    } catch (err) {
      setError(err.status === 409 ? 'That marker id is already in use.' : err.message);
    }
  };

  const reassign = async (id) => {
    const markerId = prompt('New marker id:');
    if (!markerId) return;
    try {
      await api.post(`/admin/experiments/${id}/marker`, { markerId });
      load();
    } catch (err) {
      setError(err.status === 409 ? 'That marker id is already in use.' : err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this experiment?')) return;
    await api.del(`/admin/experiments/${id}`);
    load();
  };

  return (
    <div className="container">
      <h2>Experiments {lab && `— ${lab.labName}`}</h2>
      <AdminNav />
      <Link to="/admin/labs" className="muted">
        ← All labs
      </Link>
      {error && <div className="error">{error}</div>}

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Add experiment</h3>
        <form onSubmit={create}>
          <label>Name</label>
          <input
            value={form.experimentName}
            onChange={(e) => setForm({ ...form, experimentName: e.target.value })}
            required
          />
          <label>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
          />
          <label>ArUco / QR marker id</label>
          <input
            value={form.markerId}
            onChange={(e) => setForm({ ...form, markerId: e.target.value })}
            placeholder="e.g. ARUCO-PHY-0012"
            required
          />
          <button type="submit" style={{ marginTop: 12 }}>
            Add experiment
          </button>
        </form>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Marker</th>
            <th>Content</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {experiments.map((exp) => (
            <tr key={exp.id}>
              <td>{exp.experimentName}</td>
              <td>
                <code>{exp.markerId}</code>
              </td>
              <td>
                {exp.activeContentVersionId ? (
                  <span className="success">published</span>
                ) : (
                  <span className="muted">none</span>
                )}
              </td>
              <td>
                <div className="row">
                  <Link to={`/admin/experiments/${exp.id}/content`} className="btn btn-sm">
                    Content
                  </Link>
                  <button className="btn-secondary btn-sm" onClick={() => reassign(exp.id)}>
                    Marker
                  </button>
                  <button className="btn-danger btn-sm" onClick={() => remove(exp.id)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
