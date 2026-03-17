import { useState, useEffect } from 'react';
import { apiBase, setApiKeyInStorage, getApiKeyFromStorage } from '../api/client';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setApiKey(getApiKeyFromStorage() ?? '');
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setApiKeyInStorage(apiKey.trim() || null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h1>Settings</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Configure your local API connection.</p>

      <section style={{ marginBottom: 32, maxWidth: 560 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>API base URL</h2>
        <p style={{ color: '#aaa', fontSize: 14, marginBottom: 8 }}>
          Set in <code style={{ background: '#222', padding: '2px 6px', borderRadius: 4 }}>app/.env</code> as <code style={{ background: '#222', padding: '2px 6px', borderRadius: 4 }}>VITE_API_BASE</code>. Default: <code style={{ background: '#222', padding: '2px 6px', borderRadius: 4 }}>http://localhost:8283</code>.
        </p>
        <div style={{ padding: 12, background: '#1a1a1a', borderRadius: 8, fontFamily: 'monospace', fontSize: 14 }}>
          {apiBase()}
        </div>
      </section>

      <section style={{ marginBottom: 32, maxWidth: 560 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>API key (optional)</h2>
        <p style={{ color: '#aaa', fontSize: 14, marginBottom: 12 }}>
          If your backend requires a Bearer token, enter it below. Stored in this browser only (localStorage).
        </p>
        <form onSubmit={handleSave} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="password"
            placeholder="API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{ flex: 1, maxWidth: 320, padding: 10 }}
            autoComplete="off"
          />
          <button type="submit">{saved ? 'Saved' : 'Save'}</button>
        </form>
        {saved && <span style={{ marginLeft: 8, color: '#6a6', fontSize: 14 }}>Saved.</span>}
      </section>
    </div>
  );
}
