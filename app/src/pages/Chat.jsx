import { useState, useEffect } from 'react';
import { listAgents, sendMessage } from '../api/client';

export default function Chat() {
  const [agents, setAgents] = useState([]);
  const [selectedId, setSelectedId] = useState('');
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
          const list = Array.isArray(data) ? data : data?.data ?? [];
          setAgents(list);
          if (list.length && !selectedId) setSelectedId(list[0].id ?? list[0].agent_id ?? '');
        }
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedId) return;
    setSending(true);
    setError(null);
    sendMessage(selectedId, { message: input.trim() })
      .then((res) => {
        setMessages((prev) => [...prev, { role: 'user', content: input.trim() }]);
        if (res?.message ?? res?.content) {
          setMessages((prev) => [...prev, { role: 'assistant', content: res.message ?? res.content }]);
        }
        setInput('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setSending(false));
  };

  if (loading) return <p>Loading agents…</p>;

  return (
    <div>
      <h1>Chat</h1>
      {error && <p style={{ color: '#e88' }}>{error}</p>}
      <div style={{ marginBottom: 16 }}>
        <label>Agent: </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ padding: 6, minWidth: 200 }}
        >
          {agents.map((a) => (
            <option key={a.id ?? a.agent_id} value={a.id ?? a.agent_id}>
              {a.name ?? a.agent_name ?? a.id ?? a.agent_id}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 16, minHeight: 200, padding: 12, background: '#1a1a1a', borderRadius: 8 }}>
        {messages.length === 0 && <span style={{ color: '#666' }}>Send a message below.</span>}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <strong>{m.role}:</strong> {m.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ flex: 1, padding: 10 }}
        />
        <button type="submit" disabled={sending}>Send</button>
      </form>
    </div>
  );
}
