import { Link, useLocation } from 'react-router-dom';
import { apiBase } from '../api/client';

const nav = [
  { to: '/', label: 'Dashboard' },
  { to: '/projects', label: 'Projects' },
  { to: '/agents', label: 'Agents' },
  { to: '/tools', label: 'Tools' },
  { to: '/mcp', label: 'MCP' },
  { to: '/chat', label: 'Chat' },
  { to: '/settings', label: 'Settings' },
];

export default function Layout({ children }) {
  const loc = useLocation();
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 200, padding: 16, borderRight: '1px solid #5a5a5a', background: '#1e1e1e' }}>
        <h2 style={{ marginTop: 0, fontSize: 18, color: '#f2f2f2' }}>ADE (Local)</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {nav.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                textDecoration: 'none',
                color: loc.pathname === to ? '#fff' : '#d8d8d8',
                background: loc.pathname === to ? '#404040' : 'transparent',
                border: `1px solid ${loc.pathname === to ? '#6a6a6a' : 'transparent'}`,
                fontWeight: loc.pathname === to ? 600 : 400,
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <p style={{ fontSize: 12, color: '#a8a8a8', marginTop: 24, wordBreak: 'break-all' }}>
          API: {apiBase()}
        </p>
      </aside>
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}
