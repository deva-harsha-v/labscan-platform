import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import AdminNav from './AdminNav.jsx';

export default function LabsPage() {
  const [labs, setLabs] = useState([]);
  const [labName, setLabName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const load = () =>
    api
      .get('/admin/labs')
      .then((d) => setLabs(d.labs))
      .catch(() => setError('Failed to load labs'));

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/labs', { labName, description: description || null });
      setLabName('');
      setDescription('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this lab and all its experiments?')) return;
    await api.del(`/admin/labs/${id}`);
    load();
  };

  return (
    <div className="container">
      <h2>Admin — Labs</h2>
      <AdminNav />
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h3>Create lab</h3>
        <form onSubmit={create}>
          <label>Lab name</label>
          <input value={labName} onChange={(e) => setLabName(e.target.value)} required />
          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <button type="submit" style={{ marginTop: 12 }}>
            Create lab
          </button>
        </form>
      </div>

      <div className="grid">
        {labs.map((lab) => (
          <div key={lab.id} className="card">
            <div className="spread">
              <strong>{lab.labName}</strong>
              <span className="muted">{lab.experimentCount ?? 0} exp.</span>
            </div>
            {lab.description && <p className="muted">{lab.description}</p>}
            <div className="row" style={{ marginTop: 10 }}>
              <Link to={`/admin/labs/${lab.id}/experiments`} className="btn btn-sm">
                Experiments
              </Link>
              <button className="btn-danger btn-sm" onClick={() => remove(lab.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
