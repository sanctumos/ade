import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiHealth, listAgents, apiBase } from '../api/client';
import Loading from '../components/Loading';
import ErrorBanner from '../components/ErrorBanner';

function Card({ to, title, description }) {
  return (
    <Link
      to={to}
      style={{
        display: 'block',
        padding: 20,
        background: '#222222',
        border: '1px solid #5a5a5a',
        borderRadius: 12,
        textDecoration: 'none',
        color: '#e0e0e0',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = '#555';
        e.currentTarget.style.background = '#222';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = '#5a5a5a';
        e.currentTarget.style.background = '#222222';
      }}
    >
      <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{title}</h3>
      <p style={{ margin: 0, color: '#c4c4c4', fontSize: 14 }}>{description}</p>
    </Link>
  );
}

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [agentCount, setAgentCount] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiHealth().then((h) => !cancelled && setHealth(h));
    listAgents()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.data ?? data?.agents ?? [];
        setAgentCount(Array.isArray(list) ? list.length : 0);
      })
      .catch(() => !cancelled && setAgentCount(0));
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p style={{ color: '#c4c4c4', marginBottom: 24 }}>Local ADE — agents, projects, and chat.</p>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{
          padding: 16,
          background: health?.ok ? 'rgba(80, 160, 80, 0.1)' : 'rgba(160, 80, 80, 0.1)',
          border: `1px solid ${health?.ok ? '#4a4' : '#844'}`,
          borderRadius: 8,
          minWidth: 140,
        }}>
          <div style={{ fontSize: 12, color: '#c4c4c4', marginBottom: 4 }}>API</div>
          <div style={{ fontWeight: 600 }}>{health === null ? '…' : health.ok ? 'Connected' : 'Unreachable'}</div>
          <div style={{ fontSize: 12, color: '#a8a8a8', marginTop: 4 }}>{apiBase()}</div>
        </div>
        <div style={{
          padding: 16,
          background: '#222222',
          border: '1px solid #5a5a5a',
          borderRadius: 8,
          minWidth: 140,
        }}>
          <div style={{ fontSize: 12, color: '#c4c4c4', marginBottom: 4 }}>Agents</div>
          <div style={{ fontWeight: 600 }}>{agentCount === null ? '…' : agentCount}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        <Card to="/projects" title="Projects" description="List and create projects." />
        <Card to="/agents" title="Agents" description="Manage agents and create new ones." />
        <Card to="/chat" title="Chat" description="Chat with an agent." />
      </div>
    </div>
  );
}
