import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getAgent,
  getAgentMemory,
  updateAgentMemory,
  updateAgent,
  listModels,
  listTools,
} from '../api/client';
import Loading from '../components/Loading';
import ErrorBanner from '../components/ErrorBanner';

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  return [];
}
function modelId(m) {
  return m.handle ?? m.id ?? m.model ?? m.name;
}
function modelLabel(m) {
  return m.display_name ?? m.handle ?? m.model ?? m.name ?? modelId(m);
}
function toolId(t) {
  return t.id ?? t.tool_id ?? t.name;
}
function toolName(t) {
  return t.name ?? t.tool_id ?? t.id;
}

export default function AgentDetail() {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [models, setModels] = useState([]);
  const [tools, setTools] = useState([]);
  const [memory, setMemory] = useState(null);
  const [memoryEditing, setMemoryEditing] = useState('');
  const [modelEditing, setModelEditing] = useState('');
  const [systemEditing, setSystemEditing] = useState('');
  const [toolIdsEditing, setToolIdsEditing] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getAgent(id),
      listModels().catch(() => []),
      listTools().catch(() => []),
    ])
      .then(([a, modelsData, toolsData]) => {
        if (cancelled) return;
        setAgent(a);
        setModelEditing(a?.model ?? a?.handle ?? '');
        setSystemEditing(a?.system ?? '');
        const ids = a?.tool_ids ?? a?.tools ?? [];
        setToolIdsEditing(Array.isArray(ids) ? ids : []);
        setModels(normalizeList(modelsData));
        setTools(normalizeList(toolsData));
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    getAgentMemory(id, 'persona').then((m) => {
      if (cancelled) return;
      const content = m?.content ?? m?.block?.content ?? (typeof m === 'string' ? m : '');
      setMemory(content);
      setMemoryEditing(content);
    }).catch(() => setMemoryEditing(''));
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

  const handleSaveConfig = (e) => {
    e.preventDefault();
    setSaving(true);
    const body = {};
    if (modelEditing !== (agent?.model ?? agent?.handle)) body.model = modelEditing || undefined;
    if (systemEditing !== (agent?.system ?? '')) body.system = systemEditing;
    if (JSON.stringify(toolIdsEditing.sort()) !== JSON.stringify((agent?.tool_ids ?? agent?.tools ?? []).sort())) body.tool_ids = toolIdsEditing;
    updateAgent(id, body)
      .then((updated) => setAgent((prev) => ({ ...prev, ...updated })))
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  const toggleTool = (tid) => {
    setToolIdsEditing((prev) => (prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid]));
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

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Model, system prompt & tools</h2>
        <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560 }}>
          {models.length > 0 && (
            <label>
              <span style={{ display: 'block', marginBottom: 4 }}>Model</span>
              <select value={modelEditing} onChange={(e) => setModelEditing(e.target.value)} style={{ width: '100%' }}>
                <option value="">—</option>
                {models.map((m) => (
                  <option key={modelId(m)} value={modelId(m)}>{modelLabel(m)}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span style={{ display: 'block', marginBottom: 4 }}>System prompt</span>
            <textarea value={systemEditing} onChange={(e) => setSystemEditing(e.target.value)} rows={4} style={{ width: '100%' }} />
          </label>
          {tools.length > 0 && (
            <label>
              <span style={{ display: 'block', marginBottom: 4 }}>Tools</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {tools.map((t) => (
                  <label key={toolId(t)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={toolIdsEditing.includes(toolId(t))} onChange={() => toggleTool(toolId(t))} />
                    <span>{toolName(t)}</span>
                  </label>
                ))}
              </div>
            </label>
          )}
          <button type="submit" disabled={saving}>Save config</button>
        </form>
      </section>

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

      {agent && (
        <section style={{ marginBottom: 24 }}>
          <button type="button" onClick={() => setShowRaw((x) => !x)} style={{ marginBottom: 8 }}>
            {showRaw ? 'Hide' : 'Show'} raw agent JSON
          </button>
          {showRaw && (
            <pre style={{ padding: 16, background: '#1a1a1a', borderRadius: 8, overflow: 'auto', fontSize: 13, margin: 0 }}>
              {JSON.stringify(agent, null, 2)}
            </pre>
          )}
        </section>
      )}
    </div>
  );
}
