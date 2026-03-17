import { Link, useLocation } from 'react-router-dom';
import { apiBase } from '../api/client';

const nav = [
  { to: '/', label: 'Dashboard' },
  { to: '/projects', label: 'Projects' },
  { to: '/agents', label: 'Agents' },
  { to: '/chat', label: 'Chat' },
];

export default function Layout({ children }) {
  const loc = useLocation();
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 200, padding: 16, borderRight: '1px solid #333', background: '#1a1a1a' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>ADE (Local)</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {nav.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                textDecoration: 'none',
                color: loc.pathname === to ? '#fff' : '#aaa',
                background: loc.pathname === to ? '#333' : 'transparent',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <p style={{ fontSize: 12, color: '#666', marginTop: 24 }}>
          API: {apiBase()}
        </p>
      </aside>
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}
