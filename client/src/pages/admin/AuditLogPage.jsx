import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import AdminNav from './AdminNav.jsx';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    const q = filter ? `?actionType=${encodeURIComponent(filter)}` : '';
    api
      .get(`/admin/audit-logs${q}`)
      .then((d) => setLogs(d.logs))
      .catch(() => setError('Failed to load audit log'));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="container">
      <h2>Admin — Audit Log</h2>
      <AdminNav />
      <p className="muted">Append-only record of sensitive admin actions.</p>
      {error && <div className="error">{error}</div>}

      <label>Filter by action type</label>
      <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 320 }}>
        <option value="">All actions</option>
        {[
          'USER_CREATED',
          'USER_DELETED',
          'LAB_CREATED',
          'LAB_UPDATED',
          'LAB_DELETED',
          'EXPERIMENT_CREATED',
          'EXPERIMENT_UPDATED',
          'EXPERIMENT_DELETED',
          'MARKER_REASSIGNED',
          'CONTENT_VERSION_CREATED',
        ].map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      <table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>Time</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Target</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="muted">{new Date(l.timestamp).toLocaleString()}</td>
              <td>{l.actorUsername || l.actorId || '—'}</td>
              <td>
                <code>{l.actionType}</code>
              </td>
              <td className="muted">
                {l.targetType}
                {l.targetId ? ` · ${l.targetId.slice(0, 8)}…` : ''}
              </td>
              <td className="muted" style={{ fontSize: 12 }}>
                {l.details ? JSON.stringify(l.details) : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
