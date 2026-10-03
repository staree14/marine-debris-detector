import React, { useState } from 'react'

/**
 * Acoustic Data Quality Badge & Micro-indicators.
 *
 * Supports two distinct display modes:
 * 1. "thumbnail": Minimalist compact chip for image overlays:
 *    `text-[10px] px-1.5 py-0.5 rounded backdrop-blur-md bg-black/60 text-white font-mono border border-white/20`
 *    Renders only the essential score indicator (e.g. `✓ 1.00`, `⚠️ 0.65`, `⛔ 0.35`).
 *
 * 2. "pill" (default): Full horizontal rounded-full pill for table columns & card headers:
 *    `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap`
 *    Prevents text wrapping or vertical circle collapsing entirely.
 */
export default function AcousticQualityBadge({
  quality,
  variant = 'pill', // 'pill' | 'thumbnail'
  className = '',
  showDetailsToggle = true,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  if (!quality) return null

  const status = quality.status || 'PASS'
  const score = quality.score != null ? quality.score.toFixed(2) : '1.00'
  const source = quality.source || 'Image'

  // Micro-indicators & icons
  const icon = status === 'PASS' ? '✓' : status === 'WARNING' ? '⚠️' : '⛔'

  // ── Thumbnail Minimalist Variant ──────────────────────────────────────────
  if (variant === 'thumbnail') {
    return (
      <span
        className={`inline-flex flex-row items-center gap-1 text-[10px] px-1.5 py-0.5 rounded backdrop-blur-md bg-black/60 text-white font-mono border border-white/20 whitespace-nowrap ${className}`}
        style={{
          display: 'inline-flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3.5,
          fontSize: 10,
          padding: '2px 6px',
          borderRadius: 4,
          backdropFilter: 'blur(8px)',
          background: 'rgba(4, 18, 26, 0.72)',
          color: '#ffffff',
          fontFamily: 'var(--font-mono)',
          border: '1px solid rgba(255, 255, 255, 0.22)',
          whiteSpace: 'nowrap',
          lineHeight: '14px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          userSelect: 'none',
        }}
        title={`Acoustic Quality: ${status} (${score})`}
      >
        <span
          style={{
            color: status === 'PASS' ? '#34d399' : status === 'WARNING' ? '#fbbf24' : '#fb7185',
            fontSize: 10,
          }}
        >
          {icon}
        </span>
        <span style={{ fontWeight: 700 }}>{score}</span>
      </span>
    )
  }

  // ── Table & Header Pill Variant ───────────────────────────────────────────
  let variantClass = ''
  let dotClass = ''
  let variantStyle = {}
  let label = ''

  if (status === 'PASS') {
    label = `Verified (${source})`
    variantClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'
    dotClass = 'text-emerald-300'
    variantStyle = {
      background: 'rgba(16, 185, 129, 0.12)',
      color: '#059669',
      border: '1px solid rgba(16, 185, 129, 0.35)',
    }
  } else if (status === 'WARNING') {
    label = 'Low Data Quality'
    variantClass = 'bg-amber-50 text-amber-700 border-amber-200'
    dotClass = 'text-amber-300'
    variantStyle = {
      background: 'rgba(245, 158, 11, 0.12)',
      color: '#d97706',
      border: '1px solid rgba(245, 158, 11, 0.35)',
    }
  } else {
    // DEGRADED
    label = 'Degraded Data'
    variantClass = 'bg-rose-50 text-rose-700 border-rose-200'
    dotClass = 'text-rose-300'
    variantStyle = {
      background: 'rgba(244, 63, 94, 0.12)',
      color: '#e11d48',
      border: '1px solid rgba(244, 63, 94, 0.35)',
    }
  }

  const metrics = quality.metrics || {}
  const flags = quality.flags || []

  return (
    <div
      className={`acoustic-quality-container ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {/* Sleek Horizontal Rounded-Full Pill */}
      <span
        onClick={() => showDetailsToggle && setDetailsOpen((v) => !v)}
        className={`inline-flex flex-row items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap border ${variantClass}`}
        style={{
          display: 'inline-flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '2.5px 9px',
          borderRadius: 9999,
          fontSize: 11.5,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          lineHeight: '16px',
          cursor: showDetailsToggle ? 'pointer' : 'default',
          userSelect: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          ...variantStyle,
        }}
        title="Click to view acoustic data quality audit metrics"
      >
        <span style={{ fontSize: 11 }}>{icon}</span>
        <span className="font-bold" style={{ fontWeight: 700 }}>{score}</span>
        <span className={dotClass} style={{ opacity: 0.65, fontSize: 10, lineHeight: 1 }}>•</span>
        <span
          className="uppercase tracking-wider text-[10px]"
          style={{
            fontSize: 10,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          {label}
        </span>
      </span>

      {showDetailsToggle && (
        <button
          type="button"
          className="btn ghost"
          onClick={() => setDetailsOpen((v) => !v)}
          style={{
            padding: '2px 6px',
            fontSize: 10.5,
            borderRadius: 6,
            height: 'auto',
            minHeight: 'unset',
            color: 'var(--ink-dim)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            whiteSpace: 'nowrap',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
          title="Toggle Acoustic Audit Details"
        >
          {detailsOpen ? '▲' : '▼'}
        </button>
      )}

      {/* Expandable Audit Details Panel / Drawer */}
      {detailsOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 150,
            background: 'var(--panel)',
            border: '1px solid var(--border-strong)',
            borderRadius: 8,
            padding: '12px 14px',
            boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
            width: 310,
            fontSize: 11.5,
            whiteSpace: 'normal',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
            <span style={{ fontWeight: 700, color: 'var(--ink)', letterSpacing: '.03em', textTransform: 'uppercase', fontSize: 11 }}>
              Acoustic Audit Metrics
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10.5,
                fontWeight: 600,
                color: status === 'PASS' ? '#10b981' : status === 'WARNING' ? '#f59e0b' : '#ef4444',
              }}
            >
              {status} ({score})
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginBottom: 10 }}>
            <div>
              <div style={{ color: 'var(--ink-faint)', fontSize: 10.5 }}>Saturation Ratio</div>
              <div className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                {metrics.saturation_ratio != null ? `${(metrics.saturation_ratio * 100).toFixed(1)}%` : '0.0%'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--ink-faint)', fontSize: 10.5 }}>Dropout Scanlines</div>
              <div className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                {metrics.dropout_row_count != null ? `${metrics.dropout_row_count} rows` : '0 rows'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--ink-faint)', fontSize: 10.5 }}>Dynamic Range</div>
              <div className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                {metrics.dynamic_range != null ? `${metrics.dynamic_range.toFixed(1)} LSB` : '—'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--ink-faint)', fontSize: 10.5 }}>Data Source</div>
              <div className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                {quality.source || 'image'}
              </div>
            </div>
          </div>

          {flags.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 6 }}>
              <div style={{ color: '#f59e0b', fontSize: 10.5, fontWeight: 700, marginBottom: 4 }}>
                Active Quality Flags:
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--ink-dim)', fontSize: 10.5 }}>
                {flags.map((f, i) => (
                  <li key={i} style={{ marginBottom: 2 }}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {quality.config_hash && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 8, color: 'var(--ink-faint)', fontSize: 9.5, display: 'flex', justifyContent: 'space-between' }}>
              <span>Config Hash:</span>
              <span className="mono">{quality.config_hash.slice(0, 12)}…</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Warning Ribbon displayed above or below the sonar tile if quality flags exist.
 */
export function QualityWarningRibbon({ flags = [], status = 'WARNING' }) {
  if (!flags || flags.length === 0) return null

  const isDegraded = status === 'DEGRADED'
  const bg = isDegraded ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)'
  const border = isDegraded ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)'
  const text = isDegraded ? '#ef4444' : '#f59e0b'
  const icon = isDegraded ? '⛔' : '⚠️'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: bg,
        border: border,
        borderRadius: 6,
        color: text,
        fontSize: 12,
        marginBottom: 8,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontWeight: 700, letterSpacing: '.02em' }}>
        {isDegraded ? 'Degraded Acoustic Swath:' : 'Acoustic Quality Warnings:'}
      </span>
      <span style={{ color: 'var(--ink-dim)' }}>
        {flags.join('  ·  ')}
      </span>
    </div>
  )
}
