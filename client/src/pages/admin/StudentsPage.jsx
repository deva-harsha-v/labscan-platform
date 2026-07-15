import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import AdminNav from './AdminNav.jsx';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () =>
    api
      .get('/admin/students')
      .then((d) => setStudents(d.students))
      .catch(() => setError('Failed to load students'));

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/admin/students', { username, password });
      setMessage(`Created student "${username}".`);
      setUsername('');
      setPassword('');
      load();
    } catch (err) {
      setError(err.status === 409 ? 'Username already taken.' : err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this student account?')) return;
    await api.del(`/admin/students/${id}`);
    load();
  };

  return (
    <div className="container">
      <h2>Admin — Students</h2>
      <AdminNav />
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div className="card">
        <h3>Create student account</h3>
        <form onSubmit={create}>
          <label>Username (min 3 chars)</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} />
          <label>Password (min 8 chars)</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <button type="submit" style={{ marginTop: 12 }}>
            Create student
          </button>
        </form>
      </div>

      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>{s.username}</td>
              <td className="muted">{new Date(s.createdAt).toLocaleDateString()}</td>
              <td>
                <button className="btn-danger btn-sm" onClick={() => remove(s.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
