import { useState } from 'react'
import { MAX_DESCRIPTION, REPORT_TYPES } from '../hooks/useReports.js'
import { STATUS_STYLE } from '../lib/roadStyle.js'
import { formatDistance } from '../lib/routing.js'

const QUEUED_TEXT = {
  offline: 'You are offline. The report is saved on this device and will be sent automatically when you reconnect.',
  network: 'Could not reach the server. The report is saved on this device and will be retried.',
  server: 'The server did not confirm the report. It is saved on this device and will be retried.',
  'no-backend': 'The report service is not connected yet. The report is saved on this device.',
}

export default function ReportForm({
  edgeById,
  statuses,
  selectedRoadId,
  onSelectRoad,
  onPickOnMap,
  reports,
}) {
  const [type, setType] = useState(REPORT_TYPES[0].value)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const road = edgeById.get(selectedRoadId.trim())
  // Once a queued report has synced, replace the "saved on this device" message.
  const shownFeedback =
    feedback?.kind === 'queued' && reports.pending.length === 0
      ? { kind: 'ok', text: 'Your saved report has now been sent. Thank you.' }
      : feedback
  async function handleSubmit(e) {
    e.preventDefault()
    if (!road) {
      setFeedback({ kind: 'error', text: 'Pick a road on the map, or type a valid road ID.' })
      return
    }
    if (!description.trim()) {
      setFeedback({ kind: 'error', text: 'Add a short description of what you see.' })
      return
    }
    setSubmitting(true)
    try {
      const result = await reports.submit({ roadId: road.id, type, description })
      if (result.status === 'sent') {
        setFeedback({ kind: 'ok', text: 'Report sent and stored. Thank you.' })
      } else {
        setFeedback({ kind: 'queued', text: QUEUED_TEXT[result.reason] })
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
          Road ID
          <div className="road-row">
            <input
              type="text"
              value={selectedRoadId}
              onChange={(e) => onSelectRoad(e.target.value)}
              placeholder="e.g. E123"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" className="small-btn dark" onClick={onPickOnMap}>
              Pick on map
            </button>
          </div>
          {road ? (
            <span className="muted small">
              {formatDistance(road.distance)} ·{' '}
              {STATUS_STYLE[statuses.get(road.id) ?? 'open'].label}
            </span>
          ) : (
            <span className="muted small">
              Use “Pick on map”, then click a road. Or type its ID.
            </span>
          )}
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
        {shownFeedback && (
          <p className={`feedback ${shownFeedback.kind}`} role="status">
            {shownFeedback.text}
          </p>
        )}
      </form>

      {reports.pending.length > 0 && (
        <div className="queue">
          <h3>Pending reports ({reports.pending.length})</h3>
          <ul>
            {reports.pending.map((p) => (
              <li key={p.reportId} className={p.lastError ? 'failed' : ''}>
                <span>
                  Road {p.roadId} · {p.type}
                  <span className="muted small"> — {p.lastError ?? 'waiting to sync'}</span>
                </span>
                <button type="button" className="link" onClick={() => reports.discard(p.reportId)}>
                  Discard
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}