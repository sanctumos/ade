import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAgent, getAgentMemory, updateAgentMemory, listModels } from '../api/client';
import Loading from '../components/Loading';
import ErrorBanner from '../components/ErrorBanner';

export default function AgentDetail() {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [memory, setMemory] = useState(null);
  const [memoryEditing, setMemoryEditing] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getAgent(id)
      .then((a) => !cancelled && setAgent(a))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    getAgentMemory(id, 'persona').then((m) => {
      if (cancelled) return;
      const content = m?.content ?? m?.block?.content ?? (typeof m === 'string' ? m : '');
      setMemory(content);
      setMemoryEditing(content);
    }).catch(() => !cancelled && setMemoryEditing(''));
    return () => { cancelled = true; };
  }, [id]);

  const handleSaveMemory = (e) => {
    e.preventDefault();
    setSaving(true);
    updateAgentMemory(id, 'persona', { content: memoryEditing })
      .then(() => setMemory(memoryEditing))
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  if (loading && !agent) return <Loading message="Loading agent…" />;

  const name = agent?.name ?? agent?.agent_name ?? agent?.id ?? id;

  return (
    <div>
      <p style={{ marginBottom: 16 }}>
        <Link to="/agents" style={{ color: '#7eb8da' }}>← Agents</Link>
      </p>
      <h1>{name}</h1>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Quick actions</h2>
        <Link
          to={`/chat?agent=${id}`}
          style={{
            display: 'inline-block',
            padding: '10px 16px',
            background: '#2a4a6a',
            border: '1px solid #3a5a7a',
            borderRadius: 8,
            color: '#e0e0e0',
            textDecoration: 'none',
          }}
        >
          Open in Chat →
        </Link>
      </section>

      {agent && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Details</h2>
          <pre style={{
            padding: 16,
            background: '#1a1a1a',
            borderRadius: 8,
            overflow: 'auto',
            fontSize: 13,
            margin: 0,
          }}>
            {JSON.stringify(agent, null, 2)}
          </pre>
        </section>
      )}

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Memory (persona)</h2>
        <form onSubmit={handleSaveMemory}>
          <textarea
            value={memoryEditing}
            onChange={(e) => setMemoryEditing(e.target.value)}
            placeholder="Agent persona / memory block…"
            rows={6}
            style={{ width: '100%', maxWidth: 560, marginBottom: 8 }}
          />
          <button type="submit" disabled={saving}>Save memory</button>
        </form>
      </section>
    </div>
  );
}
