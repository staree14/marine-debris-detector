import { useEffect, useRef, useState } from 'react'
import SonarCanvas from './SonarCanvas.jsx'
import AcousticQualityBadge, { QualityWarningRibbon } from './AcousticQualityBadge.jsx'
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
 */
export default function AnnotationTool({
  imageSrc,
  seed,
  boxes,
  quality,
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
  // wide placeholder ratio only for the very first render (or forever, for
  // the procedural fallback, which has no natural size). Deliberately NOT
  // reset on every imageSrc change: detections for the new line arrive and
  // render before the new image's onLoad fires, so resetting to a hardcoded
  // ratio here left a window where boxes rendered against a container sized
  // for the wrong shape — visible as boxes overflowing past the image edge
  // until onLoad caught up (worse for cached images that decode near-
  // instantly). Keeping the previous image's aspect as a placeholder means
  // the container is always sized to *some* real image's shape, not an
  // arbitrary one.
  const [aspect, setAspect] = useState(1.6)

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn ghost" disabled={!imageSrc} onClick={handleDownload} title="Download source image">
            Download image
          </button>
          <button type="button" className="btn" disabled={saving} onClick={onSaveNext}>
            {saving ? 'Saving…' : `Save & Next${pendingCount ? ` (${pendingCount})` : ''} →`}
          </button>

          {/* Header Badge: Rendered in the top-right corner of the inspected tile/card */}
          {quality && <AcousticQualityBadge quality={quality} />}
        </div>
      </div>

      {/* Warning Ribbon: Rendered if quality.flags.length > 0 */}
      {quality && <QualityWarningRibbon flags={quality.flags} status={quality.status} />}

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
                const isQualityWarning = b.quality_warning === true
                const baseStyle = VARIANT_STYLE[b.variant] || VARIANT_STYLE['needs-review']

                // When detection.quality_warning === true, render with dashed amber/red border
                // When quality_warning === false, render standard solid green/cyan box
                const strokeColor = isQualityWarning ? '#f59e0b' : baseStyle.stroke
                const strokeDash = isQualityWarning ? '6 4' : (b.selected ? 'none' : baseStyle.dash)
                const strokeWidth = b.selected ? 3 : (isQualityWarning ? 2 : 1.5)

                return (
                  <rect
                    key={b.id}
                    x={b.bboxPct.left * 100}
                    y={b.bboxPct.top * 100}
                    width={b.bboxPct.width * 100}
                    height={b.bboxPct.height * 100}
                    fill={b.selected ? `${strokeColor}26` : 'transparent'}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDash}
                    vectorEffect="non-scaling-stroke"
                    className={isQualityWarning ? 'border-dashed border-amber-500' : ''}
                    style={{
                      pointerEvents: drawMode ? 'none' : 'auto',
                      cursor: 'pointer',
                      filter: b.selected ? `drop-shadow(0 0 4px ${strokeColor}aa)` : 'none',
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

            {boxes.map((b) => {
              const isQualityWarning = b.quality_warning === true
              const anchorRight = b.bboxPct.left > 0.5
              const baseStyle = VARIANT_STYLE[b.variant] || VARIANT_STYLE['needs-review']

              // When detection.quality_warning === true, append [Low Data Quality] to class label tag
              const displayLabel = isQualityWarning && !b.label.includes('[Low Data Quality]')
                ? `${b.label} [Low Data Quality]`
                : b.label

              const tagBg = isQualityWarning ? '#d97706' : baseStyle.stroke
              const tagColor = isQualityWarning ? '#ffffff' : '#04211f'
              const tagBorder = isQualityWarning ? '1px dashed #f59e0b' : 'none'

              return (
                <span
                  key={`label-${b.id}`}
                  className="mono"
                  onClick={() => onSelectBox(b.id)}
                  style={{
                    position: 'absolute',
                    top: `${b.bboxPct.top * 100}%`,
                    ...(anchorRight
                      ? { right: `${Math.max(0, 1 - (b.bboxPct.left + b.bboxPct.width)) * 100}%` }
                      : { left: `${b.bboxPct.left * 100}%` }),
                    transform: 'translateY(-100%)',
                    background: tagBg,
                    color: tagColor,
                    border: tagBorder,
                    fontSize: 10.5,
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: 3,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    pointerEvents: drawMode ? 'none' : 'auto',
                    boxShadow: isQualityWarning ? '0 1px 4px rgba(217,119,6,0.5)' : 'none',
                  }}
                >
                  {displayLabel}
                </span>
              )
            })}

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
