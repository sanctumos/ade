import { useState, useEffect } from 'react';
import { listTools } from '../api/client';
import Loading from '../components/Loading';
import ErrorBanner from '../components/ErrorBanner';

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.tools && Array.isArray(data.tools)) return data.tools;
  return [];
}

function toolId(t) {
  return t.id ?? t.tool_id ?? t.name;
}
function toolName(t) {
  return t.name ?? t.tool_id ?? t.id;
}
function toolType(t) {
  return t.tool_type ?? t.type ?? '—';
}

export default function Tools() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listTools()
      .then((data) => !cancelled && setTools(normalizeList(data)))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Loading message="Loading tools…" />;

  return (
    <div>
      <h1>Tools</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>
        All tools available to agents (server tools, MCP tools, etc.). Attach them when creating or editing an agent.
      </p>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tools.length === 0 && (
          <li style={{ color: '#888', padding: 16, background: '#1a1a1a', borderRadius: 8 }}>No tools yet. Add MCP servers or create server tools.</li>
        )}
        {tools.map((t) => (
          <li key={toolId(t)} style={{ marginBottom: 8 }}>
            <div style={{
              padding: 16,
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 8,
            }}>
              <div style={{ fontWeight: 600 }}>{toolName(t)}</div>
              <div style={{ fontSize: 13, color: '#888' }}>ID: {toolId(t)} · Type: {toolType(t)}</div>
              {t.description && <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>{t.description}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
