import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { listAgents, sendMessage, getAgentMessages } from '../api/client';
import Loading from '../components/Loading';
import ErrorBanner from '../components/ErrorBanner';

function normalizeAgents(data) {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.agents && Array.isArray(data.agents)) return data.agents;
  return [];
}

function extractMessageContent(msg) {
  if (typeof msg === 'string') return msg;
  return msg?.content ?? msg?.message ?? msg?.text ?? JSON.stringify(msg);
}

function extractMessageRole(msg) {
  return msg?.role ?? msg?.type ?? 'assistant';
}

export default function Chat() {
  const [searchParams] = useSearchParams();
  const agentParam = searchParams.get('agent');
  const [agents, setAgents] = useState([]);
  const [selectedId, setSelectedId] = useState(agentParam || '');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listAgents()
      .then((data) => {
        if (!cancelled) {
          const list = normalizeAgents(data);
          setAgents(list);
          if (list.length && !selectedId) setSelectedId(agentParam || (list[0].id ?? list[0].agent_id) || '');
          else if (agentParam) setSelectedId(agentParam);
        }
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (agentParam && selectedId !== agentParam) setSelectedId(agentParam);
  }, [agentParam]);

  useEffect(() => {
    if (!selectedId) return;
    getAgentMessages(selectedId)
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.messages ?? data?.data ?? [];
        setMessages(list.map((m) => ({ role: extractMessageRole(m), content: extractMessageContent(m) })));
      })
      .catch(() => setMessages([]));
  }, [selectedId]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedId) return;
    const userContent = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userContent }]);
    setSending(true);
    setError(null);
    sendMessage(selectedId, { input: userContent })
      .then((res) => {
        const content = res?.message ?? res?.content ?? res?.response ?? extractMessageContent(res);
        setMessages((prev) => [...prev, { role: 'assistant', content: content || '(no response)' }]);
      })
      .catch((e) => {
        setError(e.message);
        setMessages((prev) => prev.filter((m) => m.content !== userContent || m.role !== 'user'));
      })
      .finally(() => setSending(false));
  };

  if (loading) return <Loading message="Loading agents…" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)', maxHeight: 720 }}>
      <h1>Chat</h1>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{ color: '#c4c4c4' }}>Agent:</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ minWidth: 200 }}
        >
          {agents.map((a) => (
            <option key={a.id ?? a.agent_id} value={a.id ?? a.agent_id}>
              {a.name ?? a.agent_name ?? a.id ?? a.agent_id}
            </option>
          ))}
        </select>
        {selectedId && (
          <Link to={`/agents/${selectedId}`} style={{ fontSize: 14, color: '#7eb8da' }}>View agent</Link>
        )}
      </div>

      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 16,
        background: '#222222',
        borderRadius: 8,
        marginBottom: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {messages.length === 0 && (
          <span style={{ color: '#a8a8a8' }}>Send a message below. History may load if the API supports it.</span>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: 12,
              background: m.role === 'user' ? '#2a4a6a' : '#252525',
              border: '1px solid #5a5a5a',
            }}
          >
            <div style={{ fontSize: 11, color: '#c4c4c4', marginBottom: 4 }}>{m.role}</div>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.content}</div>
          </div>
        ))}
        {sending && (
          <div style={{ alignSelf: 'flex-start', padding: '10px 14px', color: '#c4c4c4' }}>…</div>
        )}
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ flex: 1 }}
          disabled={sending}
        />
        <button type="submit" disabled={sending || !selectedId}>Send</button>
      </form>
    </div>
  );
}
