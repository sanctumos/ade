export default function Loading({ message = 'Loading…' }) {
  return (
    <div style={{ padding: 24, color: '#888', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span className="spinner" style={{
        width: 20,
        height: 20,
        border: '2px solid #333',
        borderTopColor: '#7eb8da',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      {message}
    </div>
  );
}
