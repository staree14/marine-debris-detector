import { useEffect, useRef, useState } from 'react'
import SonarCanvas from './SonarCanvas.jsx'
import { DEBRIS_CLASSES } from '../utils/taxonomy.js'

// Model-predicted boxes: solid border (teal confirmed, red rejected, dashed
// yellow unreviewed). Operator-drawn boxes: blue dashed until saved.
// `critical` (a safety-critical class, e.g. person in water) always wins
// regardless of review status — a tight alert-red dash so it never reads as
// just another routine low-confidence debris flag.
// Caps the on-screen size of the review image so the Detection Pipeline
// panel below it stays reachable without excessive scrolling.
const MAX_IMAGE_HEIGHT = 460

const VARIANT_STYLE = {
  confirmed: { stroke: '#2fb7a8', dash: 'none' },
  rejected: { stroke: '#e05a4a', dash: 'none' },
  'needs-review': { stroke: '#e0b64d', dash: '5 4' },
  'operator-drawn': { stroke: '#4d8ee0', dash: '5 4' },
  critical: { stroke: '#e0175f', dash: '3 3' },
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v))
}

/**
 * Sonar canvas + bounding-box drawing tool for the Review page.
 *
 * `boxes` is a flat list of everything to render — model detections and
 * already-drawn operator annotations alike — pre-formatted by the caller as
 * { id, bboxPct, label, variant, selected }. This component only owns the
 * draw-a-new-box gesture and its class-picker popup; confirming/rejecting an
 * *existing* box is delegated back to the caller via onConfirmSelected /
 * onRejectSelected so Review.jsx can own the single source of truth for
 * detection status.
 */
export default function AnnotationTool({
  imageSrc,
  seed,
  boxes,
  drawMode,
  onToggleDrawMode,
  onSelectBox,
  onCreateAnnotation,
  onConfirmSelected,
  onRejectSelected,
  onSaveNext,
  canConfirmSelected,
  canRejectSelected,
  pendingCount = 0,
  saving = false,
}) {
  const wrapRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [draft, setDraft] = useState(null) // { x0, y0, x1, y1, finalized }
  const [pendingClass, setPendingClass] = useState(DEBRIS_CLASSES[0].key)
  // Matches the container's box to the real image's aspect ratio so
  // bbox_pct overlays land exactly where they should — falls back to a
  // wide placeholder ratio until the real image reports its size (or
  // forever, for the procedural fallback, which has no natural size).
  const [aspect, setAspect] = useState(1.6)

  useEffect(() => {
    setAspect(1.6)
  }, [imageSrc])

  const cancelDraft = () => {
    setDragging(false)
    setDraft(null)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') cancelDraft()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const pointFromEvent = (e) => {
    const rect = wrapRef.current.getBoundingClientRect()
    return {
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    }
  }

  const handleMouseDown = (e) => {
    if (!drawMode || draft) return
    const p = pointFromEvent(e)
    setDragging(true)
    setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y, finalized: false })
  }

  const handleMouseMove = (e) => {
    if (!dragging || !draft || draft.finalized) return
    const p = pointFromEvent(e)
    setDraft((d) => ({ ...d, x1: p.x, y1: p.y }))
  }

  const handleMouseUp = () => {
    if (!dragging || !draft) return
    setDragging(false)
    const width = Math.abs(draft.x1 - draft.x0)
    const height = Math.abs(draft.y1 - draft.y0)
    if (width < 0.012 || height < 0.012) {
      setDraft(null) // treat as an accidental click, not a drawn box
      return
    }
    setDraft((d) => ({ ...d, finalized: true }))
  }

  const confirmDraft = () => {
    if (!draft) return
    onCreateAnnotation({
      bboxPct: {
        left: Math.min(draft.x0, draft.x1),
        top: Math.min(draft.y0, draft.y1),
        width: Math.abs(draft.x1 - draft.x0),
        height: Math.abs(draft.y1 - draft.y0),
      },
      classKey: pendingClass,
    })
    setDraft(null)
  }

  const draftRect = draft && {
    left: Math.min(draft.x0, draft.x1) * 100,
    top: Math.min(draft.y0, draft.y1) * 100,
    width: Math.abs(draft.x1 - draft.x0) * 100,
    height: Math.abs(draft.y1 - draft.y0) * 100,
  }

  const handleDownload = () => {
    if (!imageSrc) return
    const filename = imageSrc.startsWith('blob:') ? 'sonar-image.jpg' : imageSrc.split('/').pop()
    const a = document.createElement('a')
    a.href = imageSrc
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={drawMode ? 'btn' : 'btn ghost'}
          onClick={() => {
            cancelDraft()
            onToggleDrawMode()
          }}
        >
          {drawMode ? 'Drawing — click again to stop' : 'Draw Box'}
        </button>
        <button type="button" className="btn ghost" disabled={!canConfirmSelected} onClick={onConfirmSelected}>
          Confirm Detection
        </button>
        <button type="button" className="btn ghost" disabled={!canRejectSelected} onClick={onRejectSelected}>
          Reject Detection
        </button>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn ghost" disabled={!imageSrc} onClick={handleDownload} title="Download source image">
          Download image
        </button>
        <button type="button" className="btn" disabled={saving} onClick={onSaveNext}>
          {saving ? 'Saving…' : `Save & Next${pendingCount ? ` (${pendingCount})` : ''} →`}
        </button>
      </div>

      <div
        ref={wrapRef}
        style={{
          position: 'relative',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          border: '1px solid var(--border-strong)',
          background: '#04121a',
          cursor: drawMode ? 'crosshair' : 'default',
          userSelect: 'none',
          // Capped so a tall/narrow waterfall tile can't blow the box up to
          // the point the Detection Pipeline below is scrolled out of view —
          // width (not height) is the constrained dimension, so aspectRatio
          // derives the other side and the image never letterboxes, which
          // keeps the bboxPct overlay's 0-100 coordinate space exact.
          aspectRatio: `${aspect}`,
          width: `min(100%, ${Math.round(MAX_IMAGE_HEIGHT * aspect)}px)`,
          margin: '0 auto',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => dragging && handleMouseUp()}
      >
        <div style={{ position: 'relative', aspectRatio: `${aspect}` }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <SonarCanvas
              imageSrc={imageSrc}
              seed={seed}
              onLoad={({ naturalWidth, naturalHeight }) => {
                if (naturalWidth && naturalHeight) setAspect(naturalWidth / naturalHeight)
              }}
              style={{ objectFit: 'contain' }}
            />

            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            >
              {boxes.map((b) => {
                const style = VARIANT_STYLE[b.variant] || VARIANT_STYLE['needs-review']
                return (
                  <rect
                    key={b.id}
                    x={b.bboxPct.left * 100}
                    y={b.bboxPct.top * 100}
                    width={b.bboxPct.width * 100}
                    height={b.bboxPct.height * 100}
                    fill={b.selected ? `${style.stroke}26` : 'transparent'}
                    stroke={style.stroke}
                    strokeWidth={b.selected ? 3 : 1.5}
                    strokeDasharray={b.selected ? 'none' : style.dash}
                    vectorEffect="non-scaling-stroke"
                    style={{
                      pointerEvents: drawMode ? 'none' : 'auto',
                      cursor: 'pointer',
                      filter: b.selected ? `drop-shadow(0 0 4px ${style.stroke}aa)` : 'none',
                    }}
                    onClick={() => onSelectBox(b.id)}
                  />
                )
              })}
              {draftRect && (
                <rect
                  x={draftRect.left}
                  y={draftRect.top}
                  width={draftRect.width}
                  height={draftRect.height}
                  fill="rgba(77,142,224,0.15)"
                  stroke="#4d8ee0"
                  strokeWidth={1.8}
                  strokeDasharray="5 4"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>

            {boxes.map((b) => (
              <span
                key={`label-${b.id}`}
                className="mono"
                onClick={() => onSelectBox(b.id)}
                style={{
                  position: 'absolute',
                  top: `${b.bboxPct.top * 100}%`,
                  left: `${b.bboxPct.left * 100}%`,
                  transform: 'translateY(-100%)',
                  background: (VARIANT_STYLE[b.variant] || VARIANT_STYLE['needs-review']).stroke,
                  color: '#04211f',
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 3,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  pointerEvents: drawMode ? 'none' : 'auto',
                }}
              >
                {b.label}
              </span>
            ))}

            {draft?.finalized && draftRect && (
              <div
                style={{
                  position: 'absolute',
                  left: 14,
                  bottom: 14,
                  background: 'var(--panel)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 10,
                  padding: 14,
                  boxShadow: '0 10px 28px rgba(4,18,26,0.35)',
                  width: 220,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-dim)', marginBottom: 8 }}>
                  Label this box
                </div>
                <select
                  value={pendingClass}
                  onChange={(e) => setPendingClass(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontSize: 13,
                    marginBottom: 10,
                  }}
                >
                  {DEBRIS_CLASSES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn ghost" style={{ flex: 1, padding: '8px', fontSize: 12.5 }} onClick={cancelDraft}>
                    Cancel
                  </button>
                  <button type="button" className="btn" style={{ flex: 1, padding: '8px', fontSize: 12.5 }} onClick={confirmDraft}>
                    Confirm
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
