import { useState } from 'react'
import { MAX_DESCRIPTION, REPORT_TYPES } from '../hooks/useReports.js'

const QUEUED_TEXT = {
  offline: 'You are offline. The report is saved on this device and will be sent automatically when you reconnect.',
  network: 'Could not reach the server. The report is saved on this device and will be retried.',
  'no-backend': 'The report service is not connected yet. The report is saved on this device.',
}

export default function ReportForm({ edges, selectedRoadId, onSelectRoad, reports }) {
  const [type, setType] = useState(REPORT_TYPES[0].value)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!edges.some((r) => r.id === selectedRoadId)) {
      setFeedback({ kind: 'error', text: 'Choose a road first (or click one on the map).' })
      return
    }
    if (!description.trim()) {
      setFeedback({ kind: 'error', text: 'Add a short description of what you see.' })
      return
    }
    setSubmitting(true)
    try {
      const result = await reports.submit({ roadId: selectedRoadId, type, description })
      if (result.status === 'sent') {
        setFeedback({ kind: 'ok', text: 'Report sent and stored. Thank you.' })
      } else if (result.status === 'queued') {
        setFeedback({ kind: 'queued', text: QUEUED_TEXT[result.reason] })
      } else {
        setFeedback({ kind: 'error', text: result.message })
        return
      }
      setDescription('')
    } catch {
      setFeedback({ kind: 'error', text: 'Could not save the report on this device. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel" aria-labelledby="report-heading">
      <h2 id="report-heading">Report a road</h2>
      <form onSubmit={handleSubmit} className="report-form">
        <label>
          Road
          <select value={selectedRoadId} onChange={(e) => onSelectRoad(e.target.value)}>
            <option value="">Select a road…</option>
            {edges.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} ({Math.round(r.distance)} m)
              </option>
            ))}
          </select>
        </label>
        <label>
          Condition
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {REPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Description
          <textarea
            rows={3}
            maxLength={MAX_DESCRIPTION}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Water covering the road"
          />
          <span className="muted small">
            {description.length}/{MAX_DESCRIPTION}
          </span>
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit report'}
        </button>
        {feedback && (
          <p className={`feedback ${feedback.kind}`} role="status">
            {feedback.text}
          </p>
        )}
      </form>

      {reports.pending.length > 0 && (
        <div className="queue">
          <h3>Pending reports ({reports.pending.length})</h3>
          <ul>
            {reports.pending.map((p) => (
              <li key={p.reportId} className={p.status === 'failed' ? 'failed' : ''}>
                <span>
                  Road {p.roadId} · {p.type}
                  <span className="muted small">
                    {' '}
                    — {p.status === 'failed' ? p.error : 'waiting to sync'}
                  </span>
                </span>
                {p.status === 'failed' && (
                  <button type="button" className="link" onClick={() => reports.discard(p.reportId)}>
                    Discard
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
