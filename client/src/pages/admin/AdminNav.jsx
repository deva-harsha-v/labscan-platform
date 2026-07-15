import { NavLink } from 'react-router-dom';

const linkStyle = ({ isActive }) => ({
  padding: '6px 12px',
  borderRadius: 8,
  background: isActive ? 'var(--primary)' : 'var(--surface-2)',
  color: isActive ? '#fff' : 'var(--text)',
});

export default function AdminNav() {
  return (
    <div className="row" style={{ flexWrap: 'wrap', marginBottom: 20 }}>
      <NavLink to="/admin/labs" style={linkStyle}>
        Labs &amp; Experiments
      </NavLink>
      <NavLink to="/admin/students" style={linkStyle}>
        Students
      </NavLink>
      <NavLink to="/admin/audit" style={linkStyle}>
        Audit Log
      </NavLink>
    </div>
  );
}
