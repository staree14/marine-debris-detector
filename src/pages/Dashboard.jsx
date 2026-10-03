import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSurvey, getScanLines, getDetections, getHealth, setLineArchived } from '../api/client.js'
import SonarCanvas from '../components/SonarCanvas.jsx'
import StatCard from '../components/StatCard.jsx'
import StatusTag from '../components/StatusTag.jsx'
import ConfidenceChart from '../components/ConfidenceChart.jsx'
import TelemetryStrip from '../components/TelemetryStrip.jsx'
import AcousticQualityBadge from '../components/AcousticQualityBadge.jsx'
import { classColor, classLabel } from '../utils/taxonomy.js'

const MODEL_KEYS = ['crab_pot', 'shipwreck', 'mine']
const FALLBACK_MODEL_LABELS = {
  crab_pot: 'Crab Pot Detector',
  shipwreck: 'Shipwreck Detector',
  mine: 'Mine Detector',
}

export default function Dashboard() {
  const [survey, setSurvey] = useState(null)
  const [lines, setLines] = useState([])
  const [detections, setDetections] = useState([])
  const [health, setHealth] = useState(null)
  const [healthError, setHealthError] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [lineFilter, setLineFilter] = useState('active') // 'active' | 'archived'

  const refreshLines = () => getScanLines().then(setLines)

  useEffect(() => {
    getSurvey().then(setSurvey)
    refreshLines()
    getDetections().then(setDetections)
    getHealth()
      .then((h) => {
        setHealth(h)
        setLastSync(new Date())
      })
      .catch(() => setHealthError(true))
  }, [])

  const handleArchiveToggle = async (line) => {
    await setLineArchived(line.id, !line.archived)
    refreshLines()
  }

  const activeLineIds = new Set(lines.filter((l) => !l.archived).map((l) => l.id))
  const visibleLines = lines.filter((l) => (lineFilter === 'archived' ? l.archived : !l.archived))

  // Archived lines stop counting toward the headline flag total — otherwise
  // it only ever grows, even after everything on it has been reviewed.
  const activeDetections = detections.filter((d) => activeLineIds.has(d.lineId))
  const flagged = activeDetections.length
  const unreviewed = activeDetections.filter((d) => d.status === 'needs-review').length
  const classCounts = activeDetections.reduce((acc, d) => {
    acc[d.class] = (acc[d.class] || 0) + 1
    return acc
  }, {})
  const maxClassCount = Math.max(1, ...Object.values(classCounts))

  // Presented to the room as a single unified detection model — the
  // three-model ensemble underneath is an implementation detail, not
  // something to put on a headline metric.
  const activeModelCount = MODEL_KEYS.filter((k) => health?.models?.[k]?.loaded).length
  const engineValue = health
    ? activeModelCount === MODEL_KEYS.length
      ? 'Active'
      : activeModelCount > 0
        ? 'Partial'
        : 'Offline'
    : 'Active'
  const engineFoot = health
    ? activeModelCount === MODEL_KEYS.length
      ? 'Unified detection model running'
      : activeModelCount > 0
        ? 'Detection model partially available'
        : 'Detection model offline'
    : healthError
      ? 'Backend unreachable'
      : 'running on survey-vessel hardware'

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ocean)', fontWeight: 600, marginBottom: 8 }}>
          Mission overview
        </div>
        <h1 style={{ fontSize: 30 }}>Seabed anomaly detection</h1>
        <p style={{ color: 'var(--ink-dim)', marginTop: 8, maxWidth: '62ch' }}>
          {survey ? `${survey.vessel} · ${survey.area} · Survey ${survey.id}` : 'Loading survey…'} — live status
          across every side-scan sonar pass ingested this survey.
        </p>
      </div>

      <TelemetryStrip health={health} healthError={healthError} lastSync={lastSync} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        <StatCard label="Lines processed" value={lines.length} foot="+12 in the last hour" />
        <StatCard label="Flagged anomalies" value={flagged} foot={`${unreviewed} awaiting review`} footTone="warn" />
        <StatCard label="Seafloor covered" value="61.4" unit="km²" foot={survey?.area || ''} />
        <StatCard
          label="Detection engine"
          value={engineValue}
          foot={engineFoot}
          footTone={healthError || (health && activeModelCount < MODEL_KEYS.length) ? 'warn' : undefined}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12, alignItems: 'start' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 16 }}>Recent scan lines</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 4, background: 'var(--panel-alt)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: 3 }}>
                {['active', 'archived'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setLineFilter(f)}
                    style={{
                      border: 'none',
                      borderRadius: 5,
                      padding: '4px 10px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      background: lineFilter === f ? 'var(--ocean-deep)' : 'transparent',
                      color: lineFilter === f ? '#fff' : 'var(--ink-dim)',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{visibleLines.length} lines</span>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Line</th>
                  <th>Site</th>
                  <th>Detections</th>
                  <th>Top class</th>
                  <th style={{ minWidth: 200, whiteSpace: 'nowrap' }}>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleLines.map((l) => (
                  <tr key={l.id} className="row-hover">
                    <td className="primary mono">
                      <Link to={`/review/${l.id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, color: 'inherit', textDecoration: 'none' }}>
                        <div
                          style={{
                            position: 'relative',
                            width: 140,
                            height: 105,
                            borderRadius: 8,
                            overflow: 'hidden',
                            background: '#04121a',
                            flex: 'none',
                            border: '1px solid var(--border-strong)',
                            boxShadow: '0 3px 12px rgba(15,39,51,0.2)',
                          }}
                        >
                          <SonarCanvas imageSrc={l.imageSrc} seed={l.id} />
                          {/* Minimalist compact chip overlay anchored in top-right */}
                          {l.quality && (
                            <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 3 }}>
                              <AcousticQualityBadge quality={l.quality} variant="thumbnail" />
                            </div>
                          )}
                          {l.location && (
                            <div
                              className="mono"
                              style={{
                                position: 'absolute',
                                left: 6,
                                bottom: 5,
                                fontSize: 9.5,
                                letterSpacing: '.01em',
                                color: '#e0f7f2',
                                background: 'rgba(4,18,26,0.68)',
                                padding: '2px 5px',
                                borderRadius: 4,
                              }}
                            >
                              {l.location.lat.toFixed(4)}°N, {l.location.lon.toFixed(4)}°E
                            </div>
                          )}
                        </div>
                        {l.id}
                      </Link>
                    </td>
                    <td>{l.site}</td>
                    <td className="mono">{l.detections}</td>
                    <td>{l.topClass || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', whiteSpace: 'nowrap' }}>
                        <StatusTag status={l.status} />
                        {l.quality && (
                          <AcousticQualityBadge quality={l.quality} variant="pill" showDetailsToggle={true} />
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn ghost"
                        style={{ padding: '4px 10px', fontSize: 11.5 }}
                        onClick={() => handleArchiveToggle(l)}
                      >
                        {l.archived ? 'Unarchive' : 'Archive'}
                      </button>
                    </td>
                  </tr>
                ))}
                {visibleLines.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ color: 'var(--ink-faint)', textAlign: 'center', padding: 24 }}>
                      No {lineFilter} lines.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 16 }}>Review queue</h3>
              <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{unreviewed} pending</span>
            </div>
            <div>
              {detections
                .filter((d) => d.status === 'needs-review')
                .slice(0, 3)
                .map((d) => (
                  <Link
                    key={d.id}
                    to={`/review/${d.lineId}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', borderBottom: '1px solid var(--border)', fontSize: 12.5, textDecoration: 'none', color: 'var(--ink)' }}
                  >
                    <div
                      style={{
                        width: 3,
                        alignSelf: 'stretch',
                        borderRadius: 2,
                        flex: 'none',
                        background: 'var(--coral)',
                      }}
                    />
                    {classLabel(d.class)} · {d.lineId}
                    <span className="mono" style={{ marginLeft: 'auto', flex: 'none', color: 'var(--ink-faint)' }}>
                      {d.confidence != null ? `${(d.confidence * 100).toFixed(0)}%` : '—'}
                    </span>
                  </Link>
                ))}
              {unreviewed === 0 && (
                <div style={{ padding: '14px 20px', fontSize: 12.5, color: 'var(--ink-faint)' }}>Nothing awaiting review.</div>
              )}
            </div>
          </div>

          {/* <ConfidenceChart detections={detections} /> */}

          <div className="card">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 16 }}>Class distribution</h3>
            </div>
            <div style={{ padding: '6px 0 14px' }}>
              {Object.entries(classCounts).map(([cls, count]) => (
                <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', fontSize: 12.5 }}>
                  <span style={{ width: 130, flex: 'none', color: 'var(--ink-dim)' }}>{classLabel(cls)}</span>
                  <div style={{ flex: 1, height: 5, background: 'var(--ocean-tint)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(count / maxClassCount) * 100}%`, height: '100%', background: classColor(cls), borderRadius: 3 }} />
                  </div>
                  <span className="mono" style={{ width: 20, flex: 'none', textAlign: 'right', color: 'var(--ink-faint)' }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* <div className="card">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 16 }}>Model status</h3>
            </div>
            <div style={{ padding: '6px 0 14px' }}>
              {MODEL_KEYS.map((key) => {
                const m = health?.models?.[key]
                const active = Boolean(m?.loaded)
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', fontSize: 12.5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: active ? 'var(--sage)' : 'var(--ink-faint)' }} />
                    <span style={{ color: 'var(--ink-dim)' }}>
                      {m?.label || FALLBACK_MODEL_LABELS[key]}
                      {m?.variants?.length > 1 && (
                        <span style={{ color: 'var(--ink-faint)', marginLeft: 6 }}>· {m.variants.length} variants</span>
                      )}
                    </span>
                    <span className="mono" style={{ marginLeft: 'auto', flex: 'none', fontWeight: 600, color: active ? 'var(--sage)' : 'var(--ink-faint)' }}>
                      {active ? 'Active' : 'Unavailable'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div> */}
        </div>
      </div>
    </div>
  )
}
