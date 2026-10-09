export default function StatusBar({ reports }) {
  const { online, pending, syncing, apiConfigured, syncNow } = reports
  const waiting = pending.length

  return (
    <div className="status-bar">
      <span className={`pill ${online ? 'online' : 'offline'}`} role="status">
        <span className="dot" /> {online ? 'Online' : 'Offline: routing still works'}
      </span>
      {waiting > 0 && (
        <span className="pill pending">
          {waiting} report{waiting > 1 ? 's' : ''} pending
        </span>
      )}
      {online && apiConfigured && waiting > 0 && (
        <button type="button" className="small-btn" onClick={syncNow} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
      )}
      {!apiConfigured && <span className="pill muted-pill">Report API not connected</span>}
    </div>
  )
}