export default function ErrorBanner({ error, onDismiss }) {
  if (!error) return null;
  return (
    <div style={{
      padding: 12,
      marginBottom: 16,
      background: 'rgba(200, 80, 80, 0.15)',
      border: '1px solid #c44',
      borderRadius: 8,
      color: '#f88',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    }}>
      <span>{error}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} style={{ background: 'transparent', border: 'none', color: '#f88', cursor: 'pointer' }}>
          ×
        </button>
      )}
    </div>
  );
}
