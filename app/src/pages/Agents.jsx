import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listAgents, createAgent } from '../api/client';
import Loading from '../components/Loading';
import ErrorBanner from '../components/ErrorBanner';

function normalizeAgents(data) {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.agents && Array.isArray(data.agents)) return data.agents;
  return [];
}

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    let cancelled = false;
    listAgents()
      .then((data) => {
        if (!cancelled) setAgents(normalizeAgents(data));
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    createAgent({ name: name.trim() })
      .then((agent) => {
        setAgents((prev) => [...prev, agent].filter(Boolean));
        setName('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setCreating(false));
  };

  if (loading) return <Loading message="Loading agents…" />;

  return (
    <div>
      <h1>Agents</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Create and manage agents. Open one to edit memory or chat.</p>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <form onSubmit={handleCreate} style={{ marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Agent name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: 240 }}
        />
        <button type="submit" disabled={creating}>Create agent</button>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {agents.length === 0 && <li style={{ color: '#888', padding: 16, background: '#1a1a1a', borderRadius: 8 }}>No agents yet.</li>}
        {agents.map((a) => {
          const aid = a.id ?? a.agent_id;
          return (
            <li key={aid} style={{ marginBottom: 8 }}>
              <Link
                to={`/agents/${aid}`}
                style={{
                  display: 'block',
                  padding: 16,
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: 8,
                  textDecoration: 'none',
                  color: '#e0e0e0',
                }}
              >
                {a.name ?? a.agent_name ?? aid}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
