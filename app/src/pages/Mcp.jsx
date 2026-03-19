import { useState, useEffect } from 'react';
import { listMcpServers, createMcpServer, listMcpServerTools, deleteMcpServer, refreshMcpServer } from '../api/client';
import Loading from '../components/Loading';
import ErrorBanner from '../components/ErrorBanner';

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.mcp_servers && Array.isArray(data.mcp_servers)) return data.mcp_servers;
  return [];
}

function parseStdioArgs(text) {
  return String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function parseStdioEnv(text) {
  const out = {};
  String(text || '')
    .split('\n')
    .forEach((line) => {
      const t = line.trim();
      if (!t || t.startsWith('#')) return;
      const eq = t.indexOf('=');
      if (eq <= 0) return;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim();
      if (k) out[k] = v;
    });
  return out;
}

function serverTypeLabel(s) {
  const raw = (s?.mcp_server_type || s?.config?.mcp_server_type || '').toLowerCase();
  if (raw === 'streamable_http') return 'streamable HTTP';
  if (raw === 'sse') return 'SSE';
  if (raw === 'stdio') return 'stdio';
  return raw || '—';
}

export default function Mcp() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [transport, setTransport] = useState('streamable_http');
  const [serverName, setServerName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [authHeader, setAuthHeader] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [stdioCommand, setStdioCommand] = useState('');
  const [stdioArgs, setStdioArgs] = useState('');
  const [stdioEnv, setStdioEnv] = useState('');
  const [expandedServer, setExpandedServer] = useState(null);
  const [serverTools, setServerTools] = useState({});
  const [refreshingId, setRefreshingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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
    const name = serverName.trim();
    if (!name) return;

    let config;
    if (transport === 'stdio') {
      const cmd = stdioCommand.trim();
      if (!cmd) {
        setError('Command is required for stdio transport.');
        return;
      }
      config = {
        mcp_server_type: 'stdio',
        command: cmd,
        args: parseStdioArgs(stdioArgs),
      };
      const env = parseStdioEnv(stdioEnv);
      if (Object.keys(env).length) config.env = env;
    } else {
      const url = serverUrl.trim();
      if (!url) {
        setError('Server URL is required for HTTP-based MCP transports.');
        return;
      }
      config = {
        mcp_server_type: transport,
        server_url: url,
        ...(authToken.trim()
          ? {
              auth_header: authHeader.trim() || 'Authorization',
              auth_token: authToken.trim(),
            }
          : {}),
      };
    }

    setCreating(true);
    setError(null);
    createMcpServer({ server_name: name, config })
      .then((server) => {
        setServers((prev) => [...prev, server].filter(Boolean));
        setServerName('');
        setServerUrl('');
        setAuthHeader('');
        setAuthToken('');
        setStdioCommand('');
        setStdioArgs('');
        setStdioEnv('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setCreating(false));
  };

  if (loading) return <Loading message="Loading MCP servers…" />;

  return (
    <div>
      <h1>MCP servers</h1>
      <p style={{ color: '#c4c4c4', marginBottom: 24 }}>
        Register MCP servers: <code style={{ color: '#9fd6ff' }}>streamable_http</code>,{' '}
        <code style={{ color: '#9fd6ff' }}>sse</code>, or <code style={{ color: '#9fd6ff' }}>stdio</code> (Letta API). Tools can then be attached to agents.
      </p>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <form onSubmit={handleCreate} style={{ marginBottom: 24, padding: 20, background: '#222222', borderRadius: 8, border: '1px solid #5a5a5a', maxWidth: 560 }}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>Add MCP server</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>
            <span style={{ display: 'block', marginBottom: 4 }}>Transport</span>
            <select value={transport} onChange={(e) => setTransport(e.target.value)} style={{ width: '100%', maxWidth: 360 }}>
              <option value="streamable_http">Streamable HTTP</option>
              <option value="sse">SSE (Server-Sent Events)</option>
              <option value="stdio">Stdio (local command)</option>
            </select>
          </label>
          <label>
            <span style={{ display: 'block', marginBottom: 4 }}>Server name</span>
            <input type="text" value={serverName} onChange={(e) => setServerName(e.target.value)} placeholder="e.g. github-mcp" style={{ width: '100%' }} />
          </label>

          {transport === 'stdio' ? (
            <>
              <label>
                <span style={{ display: 'block', marginBottom: 4 }}>Command</span>
                <input type="text" value={stdioCommand} onChange={(e) => setStdioCommand(e.target.value)} placeholder="e.g. npx" autoComplete="off" style={{ width: '100%', fontFamily: 'ui-monospace, monospace' }} />
              </label>
              <label>
                <span style={{ display: 'block', marginBottom: 4 }}>Arguments (one per line)</span>
                <textarea value={stdioArgs} onChange={(e) => setStdioArgs(e.target.value)} rows={4} placeholder="-y&#10;@modelcontextprotocol/server-filesystem&#10;/path/on/api-host" autoComplete="off" style={{ width: '100%', fontFamily: 'ui-monospace, monospace' }} />
              </label>
              <label>
                <span style={{ display: 'block', marginBottom: 4 }}>Environment (optional, KEY=value per line)</span>
                <textarea value={stdioEnv} onChange={(e) => setStdioEnv(e.target.value)} rows={3} placeholder="FOO=bar" autoComplete="off" style={{ width: '100%', fontFamily: 'ui-monospace, monospace' }} />
              </label>
              <p style={{ color: '#a8a8a8', fontSize: 13, margin: 0 }}>
                The API host runs this process; paths must exist there.
              </p>
            </>
          ) : (
            <>
              <label>
                <span style={{ display: 'block', marginBottom: 4 }}>Server URL</span>
                <input type="url" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="https://…" style={{ width: '100%' }} />
              </label>
              <label>
                <span style={{ display: 'block', marginBottom: 4 }}>Auth header name (optional)</span>
                <input type="text" value={authHeader} onChange={(e) => setAuthHeader(e.target.value)} placeholder="Authorization" autoComplete="off" style={{ width: '100%' }} />
              </label>
              <label>
                <span style={{ display: 'block', marginBottom: 4 }}>Auth token (optional)</span>
                <input type="password" value={authToken} onChange={(e) => setAuthToken(e.target.value)} placeholder="API key or secret" autoComplete="off" style={{ width: '100%' }} />
              </label>
            </>
          )}

          <button type="submit" disabled={creating}>Add MCP server</button>
        </div>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {servers.length === 0 && (
          <li style={{ color: '#c4c4c4', padding: 16, background: '#222222', borderRadius: 8 }}>No MCP servers. Add one above.</li>
        )}
        {servers.map((s) => {
          const sid = s.id ?? s.mcp_server_id;
          const name = s.server_name ?? s.name ?? sid;
          const isExpanded = expandedServer === sid;
          const st = serverTypeLabel(s);
          const cmd = s.command ?? s.config?.command;
          const url = s.server_url ?? s.config?.server_url;
          const sub =
            st === 'stdio' && cmd ? (
              <div style={{ fontSize: 13, color: '#a8a8a8', marginTop: 6, fontFamily: 'ui-monospace, monospace', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cmd}>
                {cmd}
              </div>
            ) : url ? (
              <div style={{ fontSize: 13, color: '#a8a8a8', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis' }} title={url}>
                {url}
              </div>
            ) : null;
          return (
            <li key={sid} style={{ marginBottom: 8 }}>
              <div style={{
                padding: 16,
                background: '#222222',
                border: '1px solid #5a5a5a',
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
                  {name}{' '}
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#9fd6ff' }}>({st})</span>
                  {' '}{isExpanded ? '▼' : '▶'}
                </button>
                {sub}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    disabled={refreshingId === sid}
                    onClick={() => {
                      setRefreshingId(sid);
                      refreshMcpServer(sid)
                        .then(() => { setServerTools((p) => ({ ...p, [sid]: undefined })); loadServerTools(sid); })
                        .catch((e) => setError(e.message))
                        .finally(() => setRefreshingId(null));
                    }}
                    style={{ padding: '4px 10px', fontSize: 13, background: '#2a3a4a', border: '1px solid #3a4a5a', borderRadius: 6, color: '#a0c0e0', cursor: 'pointer' }}
                  >
                    {refreshingId === sid ? 'Refreshing…' : 'Refresh tools'}
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === sid}
                    onClick={() => {
                      if (!window.confirm(`Remove MCP server "${name}"?`)) return;
                      setDeletingId(sid);
                      deleteMcpServer(sid)
                        .then(() => {
                          setServers((prev) => prev.filter((x) => (x.id ?? x.mcp_server_id) !== sid));
                          setServerTools((prev) => { const next = { ...prev }; delete next[sid]; return next; });
                          if (expandedServer === sid) setExpandedServer(null);
                        })
                        .catch((e) => setError(e.message))
                        .finally(() => setDeletingId(null));
                    }}
                    style={{ padding: '4px 10px', fontSize: 13, background: '#4a2020', border: '1px solid #6a3030', borderRadius: 6, color: '#e0a0a0', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </div>
                {isExpanded && (
                  <div style={{ marginTop: 12, fontSize: 14 }}>
                    {Array.isArray(serverTools[sid]) ? (
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {serverTools[sid].length === 0 && <li style={{ color: '#c4c4c4' }}>No tools listed</li>}
                        {serverTools[sid].map((t) => (
                          <li key={t.id ?? t.name}>{t.name ?? t.id} {t.description ? `— ${t.description}` : ''}</li>
                        ))}
                      </ul>
                    ) : (
                      <span style={{ color: '#c4c4c4' }}>Loading tools…</span>
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
