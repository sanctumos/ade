import { useState, useEffect } from 'react';
import { listMcpServers, createMcpServer, listMcpServerTools } from '../api/client';
import Loading from '../components/Loading';
import ErrorBanner from '../components/ErrorBanner';

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.mcp_servers && Array.isArray(data.mcp_servers)) return data.mcp_servers;
  return [];
}

export default function Mcp() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [serverName, setServerName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [expandedServer, setExpandedServer] = useState(null);
  const [serverTools, setServerTools] = useState({});

  useEffect(() => {
    let cancelled = false;
    listMcpServers()
      .then((data) => !cancelled && setServers(normalizeList(data)))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const loadServerTools = (serverId) => {
    if (serverTools[serverId]) return;
    listMcpServerTools(serverId)
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data ?? data?.tools ?? [];
        setServerTools((prev) => ({ ...prev, [serverId]: list }));
      })
      .catch(() => setServerTools((prev) => ({ ...prev, [serverId]: [] })));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!serverName.trim() || !serverUrl.trim()) return;
    setCreating(true);
    setError(null);
    createMcpServer({
      server_name: serverName.trim(),
      config: {
        mcp_server_type: 'streamable_http',
        server_url: serverUrl.trim(),
        ...(authToken.trim() ? { auth_header: 'Authorization', auth_token: authToken.trim() } : {}),
      },
    })
      .then((server) => {
        setServers((prev) => [...prev, server].filter(Boolean));
        setServerName('');
        setServerUrl('');
        setAuthToken('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setCreating(false));
  };

  if (loading) return <Loading message="Loading MCP servers…" />;

  return (
    <div>
      <h1>MCP servers</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>
        Register MCP (Model Context Protocol) servers. Their tools become available to attach to agents.
      </p>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <form onSubmit={handleCreate} style={{ marginBottom: 24, padding: 20, background: '#1a1a1a', borderRadius: 8, maxWidth: 560 }}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>Add MCP server (Streamable HTTP)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>
            <span style={{ display: 'block', marginBottom: 4 }}>Server name</span>
            <input type="text" value={serverName} onChange={(e) => setServerName(e.target.value)} placeholder="e.g. github" style={{ width: '100%' }} />
          </label>
          <label>
            <span style={{ display: 'block', marginBottom: 4 }}>Server URL</span>
            <input type="url" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="https://mcp.example.com/endpoint" style={{ width: '100%' }} />
          </label>
          <label>
            <span style={{ display: 'block', marginBottom: 4 }}>Auth token (optional)</span>
            <input type="password" value={authToken} onChange={(e) => setAuthToken(e.target.value)} placeholder="Bearer …" style={{ width: '100%' }} autoComplete="off" />
          </label>
          <button type="submit" disabled={creating}>Add MCP server</button>
        </div>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {servers.length === 0 && (
          <li style={{ color: '#888', padding: 16, background: '#1a1a1a', borderRadius: 8 }}>No MCP servers. Add one above.</li>
        )}
        {servers.map((s) => {
          const sid = s.id ?? s.mcp_server_id;
          const name = s.server_name ?? s.name ?? sid;
          const isExpanded = expandedServer === sid;
          return (
            <li key={sid} style={{ marginBottom: 8 }}>
              <div style={{
                padding: 16,
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: 8,
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setExpandedServer(isExpanded ? null : sid);
                    if (!isExpanded) loadServerTools(sid);
                  }}
                  style={{ background: 'none', border: 'none', color: '#e0e0e0', cursor: 'pointer', fontWeight: 600, padding: 0, textAlign: 'left', width: '100%' }}
                >
                  {name} {isExpanded ? '▼' : '▶'}
                </button>
                {isExpanded && (
                  <div style={{ marginTop: 12, fontSize: 14 }}>
                    {Array.isArray(serverTools[sid]) ? (
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {serverTools[sid].length === 0 && <li style={{ color: '#888' }}>No tools listed</li>}
                        {serverTools[sid].map((t) => (
                          <li key={t.id ?? t.name}>{t.name ?? t.id} {t.description ? `— ${t.description}` : ''}</li>
                        ))}
                      </ul>
                    ) : (
                      <span style={{ color: '#888' }}>Loading tools…</span>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
