import { useState, useEffect } from 'react';
import { listAgents, createAgent } from '../api/client';

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
        if (!cancelled) setAgents(Array.isArray(data) ? data : data?.data ?? []);
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
    createAgent({ name: name.trim() })
      .then((agent) => {
        setAgents((prev) => [...prev, agent].filter(Boolean));
        setName('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setCreating(false));
  };

  if (loading) return <p>Loading agents…</p>;
  if (error) return <p style={{ color: '#e88' }}>Error: {error}</p>;

  return (
    <div>
      <h1>Agents</h1>
      <form onSubmit={handleCreate} style={{ marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Agent name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 8, width: 200 }}
        />
        <button type="submit" disabled={creating}>Create</button>
      </form>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {agents.length === 0 && <li style={{ color: '#888' }}>No agents yet.</li>}
        {agents.map((a) => (
          <li key={a.id ?? a.agent_id} style={{ padding: '8px 0', borderBottom: '1px solid #333' }}>
            {a.name ?? a.agent_name ?? a.id ?? a.agent_id}
          </li>
        ))}
      </ul>
    </div>
  );
}
