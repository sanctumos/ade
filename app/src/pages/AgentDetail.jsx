import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getAgent,
  updateAgentMemory,
  updateAgent,
  deleteAgent,
  listModels,
  listTools,
  listAgentMemoryBlocks,
} from '../api/client';
import Loading from '../components/Loading';
import ErrorBanner from '../components/ErrorBanner';

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
/** Backend may return UUID strings; tool list may use numeric ids — compare as strings. */
function toolIdsIncludes(list, tid) {
  const s = String(tid);
  return list.some((x) => String(x) === s);
}
function normalizeAgentToolIds(raw) {
  const ids = Array.isArray(raw) ? raw : [];
  return ids.map((x) => String(x));
}
function normalizeMemoryBlocksResponse(d) {
  if (Array.isArray(d)) return d;
  if (d?.data && Array.isArray(d.data)) return d.data;
  if (d?.blocks && Array.isArray(d.blocks)) return d.blocks;
  if (d?.memory_blocks && Array.isArray(d.memory_blocks)) return d.memory_blocks;
  if (d?.core_memory_blocks && Array.isArray(d.core_memory_blocks)) return d.core_memory_blocks;
  if (d?.block_list && Array.isArray(d.block_list)) return d.block_list;
  if (d?.items && Array.isArray(d.items)) return d.items;
  if (d?.results && Array.isArray(d.results)) return d.results;
  if (d && (d.label || d.id) && (d.value !== undefined || d.content !== undefined || d.text !== undefined)) return [d];
  return [];
}

export default function AgentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [models, setModels] = useState([]);
  const [tools, setTools] = useState([]);
  const [memoryBlocks, setMemoryBlocks] = useState([]);
  const [blockEdits, setBlockEdits] = useState({});
  const [modelEditing, setModelEditing] = useState('');
  const [systemEditing, setSystemEditing] = useState('');
  const [toolIdsEditing, setToolIdsEditing] = useState([]);
  const [temperatureEditing, setTemperatureEditing] = useState('');
  const [maxTokensEditing, setMaxTokensEditing] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [memoryLoadError, setMemoryLoadError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setMemoryLoadError(null);
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
        setToolIdsEditing(normalizeAgentToolIds(ids));
        const lc = a?.llm_config ?? {};
        setTemperatureEditing(lc.temperature != null && lc.temperature !== '' ? String(lc.temperature) : '');
        setMaxTokensEditing(lc.max_tokens != null && lc.max_tokens !== '' ? String(lc.max_tokens) : '');
        setModels(normalizeList(modelsData));
        setTools(normalizeList(toolsData));
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    listAgentMemoryBlocks(id, { limit: '50' })
      .then((d) => {
        if (cancelled) return;
        const raw = normalizeMemoryBlocksResponse(d);
        setMemoryBlocks(raw);
        const edits = {};
        raw.forEach((b) => {
          const label = b.label ?? (b.id != null ? String(b.id) : '');
          if (!label) return;
          let text = '';
          if (b.value != null && b.value !== '') text = String(b.value);
          else if (b.content != null && b.content !== '') text = String(b.content);
          else if (b.text != null && b.text !== '') text = String(b.text);
          edits[label] = text;
        });
        setBlockEdits(edits);
      })
      .catch((e) => {
        if (!cancelled) {
          setMemoryBlocks([]);
          setMemoryLoadError(e.message);
        }
      });
    return () => { cancelled = true; };
  }, [id]);

  const handleSaveBlock = (label) => {
    setSaving(true);
    updateAgentMemory(id, label, { value: blockEdits[label] ?? '' })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    setSaving(true);
    const body = {};
    if (modelEditing !== (agent?.model ?? agent?.handle)) body.model = modelEditing || undefined;
    if (systemEditing !== (agent?.system ?? '')) body.system = systemEditing;
    const prevTools = normalizeAgentToolIds(agent?.tool_ids ?? agent?.tools ?? []);
    const nextTools = [...toolIdsEditing].map(String).sort();
    const prevSorted = [...prevTools].sort();
    if (JSON.stringify(nextTools) !== JSON.stringify(prevSorted)) body.tool_ids = toolIdsEditing;

    const llm = { ...(agent?.llm_config ?? {}) };
    if (temperatureEditing.trim() !== '') llm.temperature = parseFloat(temperatureEditing, 10);
    else delete llm.temperature;
    if (maxTokensEditing.trim() !== '') llm.max_tokens = parseInt(maxTokensEditing, 10);
    else delete llm.max_tokens;
    if (Object.keys(llm).length) body.llm_config = llm;

    if (Object.keys(body).length === 0) {
      setSaving(false);
      return;
    }

    updateAgent(id, body)
      .then((updated) => {
        setAgent((prev) => ({ ...prev, ...updated }));
        const ut = updated?.tool_ids ?? updated?.tools;
        if (Array.isArray(ut)) setToolIdsEditing(normalizeAgentToolIds(ut));
        const lc = updated?.llm_config ?? llm;
        setTemperatureEditing(lc.temperature != null && lc.temperature !== '' ? String(lc.temperature) : '');
        setMaxTokensEditing(lc.max_tokens != null && lc.max_tokens !== '' ? String(lc.max_tokens) : '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  const toggleTool = (tid) => {
    const s = String(tid);
    setToolIdsEditing((prev) => (toolIdsIncludes(prev, s) ? prev.filter((x) => String(x) !== s) : [...prev, s]));
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
      {memoryLoadError && (
        <p style={{ color: '#f0a0a0', marginBottom: 16, padding: 12, background: '#2a1818', borderRadius: 8, border: '1px solid #5a3030' }}>
          Memory blocks: {memoryLoadError}{' '}
          <button type="button" onClick={() => setMemoryLoadError(null)} style={{ marginLeft: 8, background: 'transparent', border: 'none', color: '#9fd6ff', cursor: 'pointer', textDecoration: 'underline' }}>Dismiss</button>
        </p>
      )}

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
            marginRight: 8,
          }}
        >
          Open in Chat →
        </Link>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm('Delete this agent? This cannot be undone.')) return;
            deleteAgent(id).then(() => navigate('/agents')).catch((e) => setError(e.message));
          }}
          style={{ padding: '10px 16px', background: '#4a2020', border: '1px solid #6a3030', borderRadius: 8, color: '#e0a0a0', cursor: 'pointer' }}
        >
          Delete agent
        </button>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Model, LLM parameters & system prompt</h2>
        <p style={{ color: '#c4c4c4', fontSize: 14, marginTop: -4 }}>Saves <code>model</code>, <code>llm_config</code> (temperature, max_tokens), <code>system</code>, <code>tool_ids</code>.</p>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              <span style={{ display: 'block', marginBottom: 4 }}>Temperature</span>
              <input type="number" step={0.05} min={0} max={2} value={temperatureEditing} onChange={(e) => setTemperatureEditing(e.target.value)} placeholder="e.g. 0.7" style={{ width: '100%' }} />
            </label>
            <label>
              <span style={{ display: 'block', marginBottom: 4 }}>Max tokens</span>
              <input type="number" min={1} step={1} value={maxTokensEditing} onChange={(e) => setMaxTokensEditing(e.target.value)} placeholder="optional" style={{ width: '100%' }} />
            </label>
          </div>
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
                    <input type="checkbox" checked={toolIdsIncludes(toolIdsEditing, toolId(t))} onChange={() => toggleTool(toolId(t))} />
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
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Core memory blocks</h2>
        <p style={{ color: '#c4c4c4', fontSize: 14 }}>From <code>GET …/core-memory/blocks</code> — persona, human, and custom blocks.</p>
        {memoryBlocks.length === 0 && !loading && !memoryLoadError && (
          <p style={{ color: '#c4c4c4' }}>No blocks loaded (empty list or this agent has no blocks yet).</p>
        )}
        {memoryBlocks.map((b) => {
          const label = b.label ?? b.id;
          if (!label) return null;
          return (
            <div key={label} style={{ marginBottom: 20, padding: 16, background: '#222222', border: '1px solid #5a5a5a', borderRadius: 8, maxWidth: 560 }}>
              <h3 style={{ fontSize: 15, margin: '0 0 6px' }}>{label}</h3>
              {(b.description || b.limit != null) && (
                <p style={{ color: '#c4c4c4', fontSize: 13, margin: '0 0 8px' }}>
                  {[b.description, b.limit != null ? `limit ${b.limit} chars` : null].filter(Boolean).join(' · ')}
                </p>
              )}
              <textarea
                value={blockEdits[label] ?? ''}
                onChange={(e) => setBlockEdits((prev) => ({ ...prev, [label]: e.target.value }))}
                rows={6}
                style={{ width: '100%', marginBottom: 8 }}
              />
              <button type="button" disabled={saving} onClick={() => handleSaveBlock(label)}>
                Save “{label}”
              </button>
            </div>
          );
        })}
      </section>

      {agent && (
        <section style={{ marginBottom: 24 }}>
          <button type="button" onClick={() => setShowRaw((x) => !x)} style={{ marginBottom: 8 }}>
            {showRaw ? 'Hide' : 'Show'} raw agent JSON
          </button>
          {showRaw && (
            <pre style={{ padding: 16, background: '#222222', borderRadius: 8, overflow: 'auto', fontSize: 13, margin: 0 }}>
              {JSON.stringify(agent, null, 2)}
            </pre>
          )}
        </section>
      )}
    </div>
  );
}
