import { useEffect, useRef, useState } from 'react'
import { AuthError, getToken } from '../api'
import { fetchAttendance } from './api'
import './Dashboard.css'

const MAX_UNKNOWN = 12
const MAX_RECONNECT_DELAY_MS = 10000

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function Dashboard({ onAuthError, onEnrollFromCrop }) {
  const [frame, setFrame] = useState(null) // { image, camera_name, timestamp } -- boxes are pre-drawn server-side
  const [attendance, setAttendance] = useState([])
  const [unknowns, setUnknowns] = useState([])
  const [wsStatus, setWsStatus] = useState('connecting')
  const wsRef = useRef(null)
  const reconnectDelayRef = useRef(1000)

  useEffect(() => {
    let cancelled = false
    fetchAttendance(todayStr())
      .then((rows) => {
        if (!cancelled) setAttendance(rows.slice().reverse())
      })
      .catch((err) => {
        if (err instanceof AuthError) onAuthError()
      })
    return () => {
      cancelled = true
    }
  }, [onAuthError])

  useEffect(() => {
    let cancelled = false
    let ws

    function connect() {
      if (cancelled) return
      const token = getToken()
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      ws = new WebSocket(`${proto}://${window.location.host}/ws/events?token=${encodeURIComponent(token || '')}`)
      wsRef.current = ws

      ws.onopen = () => {
        setWsStatus('connected')
        reconnectDelayRef.current = 1000
      }
      ws.onclose = () => {
        if (cancelled) return
        setWsStatus('disconnected')
        const delay = reconnectDelayRef.current
        reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY_MS)
        setTimeout(connect, delay)
      }
      ws.onerror = () => ws.close()
      ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data)
        if (msg.type === 'frame') {
          setFrame(msg)
        } else if (msg.type === 'attendance') {
          setAttendance((prev) => [msg, ...prev].slice(0, 200))
        } else if (msg.type === 'unknown') {
          setUnknowns((prev) => [msg, ...prev].slice(0, MAX_UNKNOWN))
        }
      }
    }

    connect()
    return () => {
      cancelled = true
      wsRef.current?.close()
    }
  }, [])

  return (
    <div className="dashboard">
      <section className="dashboard__panel dashboard__live">
        <h2>
          Live view {frame ? `— ${frame.camera_name}` : ''}
          <span className={`dashboard__ws-status dashboard__ws-status--${wsStatus}`}>{wsStatus}</span>
        </h2>
        <div className="dashboard__live-frame">
          {frame ? (
            <img src={frame.image} alt="live camera feed" />
          ) : (
            <p className="dashboard__hint">Waiting for first frame…</p>
          )}
        </div>
      </section>

      <section className="dashboard__panel">
        <h2>Today's attendance ({attendance.length})</h2>
        <div className="dashboard__attendance-list">
          {attendance.length === 0 && <p className="dashboard__hint">No attendance events yet today.</p>}
          {attendance.map((a, i) => (
            <div key={a.id ?? `${a.track_id}-${i}`} className="dashboard__attendance-row">
              <img src={a.thumbnail_url} alt={a.name} />
              <div className="dashboard__attendance-info">
                <strong>{a.name}</strong>
                <span>{a.employee_id}</span>
                <span>{new Date(a.timestamp).toLocaleTimeString()}</span>
                <span>
                  conf {Number(a.confidence).toFixed(2)} · {a.face_width_px}px
                  {a.low_confidence && <span className="dashboard__low-conf"> low-conf</span>}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard__panel">
        <h2>Unknown faces</h2>
        <div className="dashboard__unknown-grid">
          {unknowns.length === 0 && <p className="dashboard__hint">No unrecognized faces recently.</p>}
          {unknowns.map((u, i) => (
            <div key={`${u.track_id}-${i}`} className="dashboard__unknown-card">
              <img src={u.thumbnail_url} alt="unknown face" />
              <span className="dashboard__hint">
                {u.face_width_px}px{u.best_score != null ? ` · best ${u.best_score.toFixed(2)}` : ''}
              </span>
              <button type="button" onClick={() => onEnrollFromCrop(u.thumbnail_url)}>
                Enroll this person
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
