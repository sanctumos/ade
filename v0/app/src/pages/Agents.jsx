import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listAgents, createAgent, deleteAgent, listModels, listTools } from '../api/client';
import Loading from '../components/Loading';
import ErrorBanner from '../components/ErrorBanner';

function normalizeAgents(data) {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.agents && Array.isArray(data.agents)) return data.agents;
  return [];
}
function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.tools && Array.isArray(data.tools)) return data.tools;
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
function toolIdsIncludes(list, tid) {
  const s = String(tid);
  return list.some((x) => String(x) === s);
}

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [models, setModels] = useState([]);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [system, setSystem] = useState('');
  const [toolIds, setToolIds] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listAgents(), listModels().catch(() => []), listTools().catch(() => [])]).then(([agentsData, modelsData, toolsData]) => {
      if (cancelled) return;
      setAgents(normalizeAgents(agentsData));
      setModels(normalizeList(modelsData));
      setTools(normalizeList(toolsData));
    }).catch((e) => !cancelled && setError(e.message)).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    const body = { name: name.trim() };
    if (model) body.model = model;
    if (system.trim()) body.system = system.trim();
    if (toolIds.length) body.tool_ids = toolIds;
    createAgent(body)
      .then(() => {
        setName('');
        setModel('');
        setSystem('');
        setToolIds([]);
        return listAgents();
      })
      .then((data) => setAgents(normalizeAgents(data)))
      .catch((e) => setError(e.message))
      .finally(() => setCreating(false));
  };

  const toggleTool = (id) => {
    const s = String(id);
    setToolIds((prev) => (toolIdsIncludes(prev, s) ? prev.filter((x) => String(x) !== s) : [...prev, s]));
  };

  if (loading) return <Loading message="Loading agents…" />;

  return (
    <div>
      <h1>Agents</h1>
      <p style={{ color: '#c4c4c4', marginBottom: 24 }}>Create and manage agents. Set model, system prompt, and tools.</p>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <form onSubmit={handleCreate} style={{ marginBottom: 24, padding: 20, background: '#222222', borderRadius: 8, maxWidth: 560 }}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>Create agent</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>
            <span style={{ display: 'block', marginBottom: 4 }}>Name *</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name" style={{ width: '100%' }} />
          </label>
          {models.length > 0 && (
            <label>
              <span style={{ display: 'block', marginBottom: 4 }}>Model</span>
              <select value={model} onChange={(e) => setModel(e.target.value)} style={{ width: '100%' }}>
                <option value="">—</option>
                {models.map((m) => (
                  <option key={modelId(m)} value={modelId(m)}>{modelLabel(m)}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span style={{ display: 'block', marginBottom: 4 }}>System prompt</span>
            <textarea value={system} onChange={(e) => setSystem(e.target.value)} placeholder="Instructions for the agent…" rows={4} style={{ width: '100%' }} />
          </label>
          {tools.length > 0 && (
            <label>
              <span style={{ display: 'block', marginBottom: 4 }}>Tools</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {tools.map((t) => (
                  <label key={toolId(t)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={toolIdsIncludes(toolIds, toolId(t))} onChange={() => toggleTool(toolId(t))} />
                    <span>{toolName(t)}</span>
                  </label>
                ))}
              </div>
            </label>
          )}
          <button type="submit" disabled={creating}>Create agent</button>
        </div>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {agents.length === 0 && <li style={{ color: '#c4c4c4', padding: 16, background: '#222222', borderRadius: 8 }}>No agents yet.</li>}
        {agents.map((a) => {
          const aid = a.id ?? a.agent_id;
          return (
            <li key={aid} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16, background: '#222222', border: '1px solid #5a5a5a', borderRadius: 8 }}>
                <Link to={`/agents/${aid}`} style={{ flex: 1, textDecoration: 'none', color: '#e0e0e0' }}>
                  {a.name ?? a.agent_name ?? aid}
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!window.confirm('Delete this agent?')) return;
                    deleteAgent(aid).then(() => listAgents()).then((data) => setAgents(normalizeAgents(data))).catch((e) => setError(e.message));
                  }}
                  style={{ padding: '4px 10px', fontSize: 13, background: '#4a2020', border: '1px solid #6a3030', borderRadius: 6, color: '#e0a0a0', cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
