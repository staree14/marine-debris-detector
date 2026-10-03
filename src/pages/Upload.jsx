import { useCallback, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { runDetectionPipeline, extractSonarMetadata } from '../api/client.js'
import InfoNotice from '../components/InfoNotice.jsx'
import { HOSTED_DEMO_NOTE_PREFIX, DETECT_LOADING_TEXT, MOCK_NAV_DATA_NOTICE } from '../constants/demoNotices.js'

const ACCEPTED = '.xtf,.jsf,.segy,.tif,.tiff,.png,.jpg,.jpeg'

const GALLERY_SAMPLES = [
  {
    id: 'sample-net-1',
    name: 'Ghost Net & Debris Corridor',
    filename: 'sss-debris9-nice.jpg',
    path: '/samples/sss-debris9-nice.jpg',
    category: 'Ghost Nets & Gear',
    type: 'Derelict Fishing Net',
    size: '162 KB',
    depth: '38.4 m',
    heading: 184.2,
    coords: '13.0827, 80.2707',
  },
  {
    id: 'sample-crabpot-1',
    name: 'Derelict Crab Pot Array',
    filename: 'sss-crabpot1.jpg',
    path: '/samples/sss-crabpot1.jpg',
    category: 'Ghost Nets & Gear',
    type: 'Crab Pot Traps',
    size: '183 KB',
    depth: '36.8 m',
    heading: 95.0,
    coords: '13.0815, 80.2691',
  },
  {
    id: 'sample-mine-1',
    name: 'Subsea Ordnance Target',
    filename: 'sss-mine4.jpg',
    path: '/samples/sss-mine4.jpg',
    category: 'Ordnance & Hazards',
    type: 'Mine / Unexploded Ordnance',
    size: '265 KB',
    depth: '47.5 m',
    heading: 312.0,
    coords: '13.0802, 80.2680',
  },
  {
    id: 'sample-crabpot-2',
    name: 'Low-Visibility Crab Pot Pair',
    filename: 'sss-crabpot2.jpg',
    path: '/samples/sss-crabpot2.jpg',
    category: 'Ghost Nets & Gear',
    type: 'Crab Pot Traps',
    size: '211 KB',
    depth: '18.6 m',
    heading: 264.0,
    coords: '13.0798, 80.2688',
  },
  {
    id: 'sample-coral-1',
    name: 'Protected Deep Coral Bed',
    filename: 'coral.jpg',
    path: '/samples/coral.jpg',
    category: 'Survey Transects',
    type: 'Eco Sensitivity Zone',
    size: '175 KB',
    depth: '32.1 m',
    heading: 88.0,
    coords: '13.0872, 80.2750',
  },
  {
    id: 'sample-degraded-1',
    name: 'Degraded Acoustic Swath (Cavitation & Clipping)',
    filename: 'degraded-tile.png',
    path: '/samples/degraded-tile.png',
    category: 'Survey Transects',
    type: 'Low Data Quality Test',
    size: '410 KB',
    depth: '42.0 m',
    heading: 180.0,
    coords: '13.0850, 80.2720',
  },
]

const CATEGORIES = ['All', 'Ghost Nets & Gear', 'Wrecks', 'Ordnance & Hazards', 'Survey Transects']

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Upload() {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [loadingSampleId, setLoadingSampleId] = useState(null)
  
  // files: { id, name, size, file, metaStatus: 'pending'|'extracting'|'done'|'error' }
  const [files, setFiles] = useState([])
  const [metadataByFile, setMetadataByFile] = useState({})
  const [selectedFileId, setSelectedFileId] = useState(null)
  
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const processFileMetadata = async (fileObj, presetMeta = null) => {
    setFiles((prev) => prev.map(f => f.id === fileObj.id ? { ...f, metaStatus: 'extracting' } : f))
    
    try {
      const extracted = await extractSonarMetadata(fileObj.file)
      const merged = presetMeta ? { ...extracted, ...presetMeta } : extracted

      setMetadataByFile((prev) => ({
        ...prev,
        [fileObj.id]: {
          surveyId: merged.survey_id || presetMeta?.surveyId || `SRV-${Math.floor(1000 + Math.random() * 9000)}`,
          vessel: merged.vessel || presetMeta?.vessel || 'RV Samudra Ratna (NIOT)',
          startCoords: presetMeta?.coords || merged.start_coords || '13.0827, 80.2707',
          endCoords: merged.end_coords || '13.0855, 80.2735',
          start_lat: merged.start_lat || 13.0827,
          start_lon: merged.start_lon || 80.2707,
          end_lat: merged.end_lat || 13.0855,
          end_lon: merged.end_lon || 80.2735,
          heading_deg: presetMeta?.heading ?? merged.heading_deg ?? 184.2,
          depth_m: presetMeta?.depth ? parseFloat(presetMeta.depth) : (merged.depth_m ?? 38.4),
          altitude_m: merged.altitude_m ?? 8.5,
          timestamp: merged.timestamp || new Date().toISOString().replace('T', ' ').slice(0, 19),
          swath_width_m: merged.swath_width_m ?? 100
        }
      }))
      setFiles((prev) => prev.map(f => f.id === fileObj.id ? { ...f, metaStatus: 'done' } : f))
      setSelectedFileId((prev) => prev === null ? fileObj.id : prev)
    } catch (err) {
      console.error(err)
      setFiles((prev) => prev.map(f => f.id === fileObj.id ? { ...f, metaStatus: 'error' } : f))
    }
  }

  const addFiles = useCallback((fileList, presetMeta = null) => {
    const incoming = Array.from(fileList).map((f) => ({
      id: `${f.name}-${f.size}-${f.lastModified}`,
      name: f.name,
      size: f.size,
      file: f,
      metaStatus: 'pending'
    }))
    
    setFiles((prev) => {
      const existingIds = new Set(prev.map((f) => f.id))
      const newFiles = incoming.filter((f) => !existingIds.has(f.id))
      
      // Trigger extraction for new files
      newFiles.forEach(f => processFileMetadata(f, presetMeta))
      
      return [...prev, ...newFiles]
    })
  }, [])

  const loadGallerySample = async (sample) => {
    setLoadingSampleId(sample.id)
    try {
      const response = await fetch(sample.path)
      const blob = await response.blob()
      const file = new File([blob], sample.filename, { type: blob.type || 'image/jpeg' })
      
      addFiles([file], {
        surveyId: `SRV-SAMPLE-${sample.id.toUpperCase()}`,
        vessel: 'AUV Explorer-4 (NIOT Hydrographic)',
        coords: sample.coords,
        heading: sample.heading,
        depth: sample.depth,
      })
    } catch (err) {
      console.error('Failed to load sample:', err)
    } finally {
      setLoadingSampleId(null)
    }
  }

  const loadAllSamples = async () => {
    for (const sample of GALLERY_SAMPLES.slice(0, 4)) {
      await loadGallerySample(sample)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    setMetadataByFile((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setSelectedFileId((prev) => (prev === id ? null : prev))
  }

  const handleMetaChange = (field, value) => {
    if (!selectedFileId) return
    setMetadataByFile((prev) => ({
      ...prev,
      [selectedFileId]: {
        ...prev[selectedFileId],
        [field]: value
      }
    }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!files.length || submitting) return
    
    // Check if any files are still extracting
    if (files.some(f => f.metaStatus === 'extracting')) return
    
    setSubmitting(true)
    setResult(null)
    try {
      const res = await runDetectionPipeline({ files, metadataByFile, metadata: {} })
      setResult(res)
      setTimeout(() => navigate(`/review/${res.lineId}`), 700)
    } finally {
      setSubmitting(false)
    }
  }

  const allDone = files.length > 0 && files.every(f => f.metaStatus === 'done' || f.metaStatus === 'error')
  const canSubmit = files.length > 0 && allDone && !submitting
  const selectedMeta = selectedFileId ? metadataByFile[selectedFileId] : null

  const filteredGallery = selectedCategory === 'All'
    ? GALLERY_SAMPLES
    : GALLERY_SAMPLES.filter(s => s.category === selectedCategory)

  return (
    <div>
      <div style={{ marginBottom: 26, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ocean)', fontWeight: 600, marginBottom: 8 }}>
            Ingest & Telemetry
          </div>
          <h1 style={{ fontSize: 30 }}>Upload Sonar Imagery</h1>
          <p style={{ color: 'var(--ink-dim)', marginTop: 8, maxWidth: '68ch' }}>
            Upload raw side-scan sonar files from your computer, or pick verified imagery directly from our built-in Sonar Sample Gallery.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowGallery(!showGallery)}
          className={`btn ${showGallery ? 'primary' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span>{showGallery ? 'Hide Sonar Gallery' : 'Choose from Sonar Gallery'}</span>
          <span style={{ fontSize: 11, background: 'var(--ocean-tint)', color: 'var(--ocean)', padding: '2px 7px', borderRadius: 10 }}>
            {GALLERY_SAMPLES.length}
          </span>
        </button>
      </div>

      {/* Expandable Built-in Sonar Gallery Drawer */}
      {showGallery && (
        <div className="card" style={{ marginBottom: 24, padding: '20px 24px', border: '1.5px solid var(--ocean)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Sonar Sample Gallery</span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ocean)', background: 'var(--ocean-tint)', padding: '2px 8px', borderRadius: 4 }}>
                  Verified Target Library
                </span>
              </h3>
              <p style={{ fontSize: 12.5, color: 'var(--ink-dim)', marginTop: 4 }}>
                Click any contact to instantly load it into the ingestion queue with calibrated hydrographic metadata.
              </p>
            </div>

            <button
              type="button"
              onClick={loadAllSamples}
              className="btn ghost"
              style={{ fontSize: 12, padding: '6px 14px' }}
            >
              + Load First 4 Presets
            </button>
          </div>

          {/* Gallery Category Filter */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 11.5,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: selectedCategory === cat ? 'var(--ocean)' : 'var(--border)',
                  background: selectedCategory === cat ? 'var(--ocean-tint)' : 'transparent',
                  color: selectedCategory === cat ? 'var(--ocean)' : 'var(--ink-dim)',
                  fontWeight: selectedCategory === cat ? 600 : 400,
                  transition: 'all 0.2s',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Gallery Samples Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {filteredGallery.map((sample) => {
              const isAdded = files.some(f => f.name === sample.filename)
              const isLoading = loadingSampleId === sample.id
              return (
                <div
                  key={sample.id}
                  style={{
                    borderRadius: 8,
                    border: '1px solid',
                    borderColor: isAdded ? 'var(--sage)' : 'var(--border)',
                    background: isAdded ? 'var(--sage-tint, rgba(63, 138, 99, 0.08))' : 'var(--panel)',
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                  }}
                >
                  <div>
                    <div style={{ position: 'relative', height: 110, borderRadius: 6, overflow: 'hidden', background: '#000', marginBottom: 8 }}>
                      <img
                        src={sample.path}
                        alt={sample.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: 6,
                          left: 6,
                          background: 'rgba(0,0,0,0.75)',
                          color: '#fff',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 9.5,
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {sample.type}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{sample.name}</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>
                      Depth: {sample.depth} · {sample.size}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => loadGallerySample(sample)}
                    disabled={isAdded || isLoading}
                    className="btn block"
                    style={{
                      marginTop: 10,
                      padding: '6px 10px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      background: isAdded ? 'var(--sage)' : undefined,
                      borderColor: isAdded ? 'var(--sage)' : undefined,
                      color: isAdded ? '#fff' : undefined,
                    }}
                  >
                    {isLoading ? 'Loading…' : isAdded ? '✓ Added to Ingest' : '+ Select for Ingest'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
        <div>
          <div
            className="card"
            onDragOver={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              padding: '44px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              borderStyle: 'dashed',
              borderWidth: 1.5,
              borderColor: dragActive ? 'var(--ocean)' : 'var(--border-strong)',
              background: dragActive ? 'var(--ocean-tint)' : 'var(--panel)',
              transition: 'all 0.2s',
            }}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED}
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="var(--ocean)" strokeWidth="1.6" style={{ marginBottom: 14 }}>
              <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
              <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
            </svg>
            <h3 style={{ fontSize: 18, marginBottom: 6 }}>Drop sonar files, or click to browse</h3>
            <p style={{ color: 'var(--ink-dim)', fontSize: 12.5, margin: '0 0 16px' }}>
              Batch upload supported — .XTF, .JSF, .SEGY, .TIF, .PNG up to 2 GB
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <button type="button" className="btn" onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}>
                Browse computer
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={(e) => { e.stopPropagation(); setShowGallery(true); }}
              >
                Choose from gallery →
              </button>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: files.length ? '1px solid var(--border)' : 'none' }}>
              <h3 style={{ fontSize: 15 }}>Queued for this batch</h3>
              <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{files.length} file{files.length === 1 ? '' : 's'}</span>
            </div>
            {files.length === 0 ? (
              <div style={{ padding: '24px 20px', color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center' }}>
                No files selected yet. Drag & drop files above or pick a sample from the Sonar Gallery.
              </div>
            ) : (
              <table>
                <tbody>
                  {files.map((f) => (
                    <tr 
                      key={f.id} 
                      className={`row-hover ${selectedFileId === f.id ? 'selected' : ''}`}
                      onClick={() => setSelectedFileId(f.id)}
                      style={{ cursor: 'pointer', background: selectedFileId === f.id ? 'var(--ocean-tint)' : 'transparent' }}
                    >
                      <td className="primary mono">{f.name}</td>
                      <td className="mono">
                        {f.metaStatus === 'extracting' && <span style={{ color: 'var(--ocean)', fontSize: 11 }}>Reading sonar metadata...</span>}
                        {f.metaStatus === 'done' && <span className="tag" style={{ background: 'var(--sage)', color: 'white', border: 'none', padding: '2px 6px', borderRadius: '4px' }}>Metadata verified</span>}
                        {f.metaStatus === 'error' && <span style={{ color: 'red', fontSize: 11 }}>Extraction failed</span>}
                      </td>
                      <td className="mono">{formatBytes(f.size)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn ghost"
                          style={{ padding: '5px 12px', fontSize: 11.5 }}
                          onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          {files.length > 0 && selectedMeta && (
            <div className="card">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Survey metadata</span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      letterSpacing: '.04em',
                      textTransform: 'uppercase',
                      color: 'var(--amber)',
                      background: 'var(--amber-tint)',
                      padding: '2px 7px',
                      borderRadius: 10,
                    }}
                  >
                    Simulated
                  </span>
                </h3>
                <p style={{ marginTop: 4, fontSize: 11.5, color: 'var(--ink-faint)' }}>
                  {MOCK_NAV_DATA_NOTICE}
                </p>
              </div>
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label>Survey ID</label>
                  <input value={selectedMeta.surveyId || ''} onChange={(e) => handleMetaChange('surveyId', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label>Start lat / lon</label>
                    <input value={selectedMeta.startCoords || ''} onChange={(e) => handleMetaChange('startCoords', e.target.value)} />
                  </div>
                  <div className="field">
                    <label>End lat / lon</label>
                    <input value={selectedMeta.endCoords || ''} onChange={(e) => handleMetaChange('endCoords', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label>Heading (deg)</label>
                    <input value={selectedMeta.heading_deg ?? ''} onChange={(e) => handleMetaChange('heading_deg', parseFloat(e.target.value))} type="number" step="0.1" />
                  </div>
                  <div className="field">
                    <label>Timestamp</label>
                    <input value={selectedMeta.timestamp || ''} onChange={(e) => handleMetaChange('timestamp', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label>Depth (m)</label>
                    <input value={selectedMeta.depth_m ?? ''} onChange={(e) => handleMetaChange('depth_m', parseFloat(e.target.value))} type="number" step="0.1" />
                  </div>
                  <div className="field">
                    <label>Altitude (m)</label>
                    <input value={selectedMeta.altitude_m ?? ''} onChange={(e) => handleMetaChange('altitude_m', parseFloat(e.target.value))} type="number" step="0.1" />
                  </div>
                </div>
                <div className="field">
                  <label>Vessel / platform</label>
                  <input value={selectedMeta.vessel || ''} onChange={(e) => handleMetaChange('vessel', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="btn block" style={{ marginTop: 16, padding: 13 }} disabled={!canSubmit}>
            {submitting ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff',
                    animation: 'aquascan-spin 0.7s linear infinite',
                  }}
                />
                {DETECT_LOADING_TEXT}
              </span>
            ) : (
              'Run detection pipeline →'
            )}
          </button>
          <style>{'@keyframes aquascan-spin { to { transform: rotate(360deg); } }'}</style>
          {result && (
            <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--sage)' }}>
              Queued {result.queued} file{result.queued === 1 ? '' : 's'} as line {result.lineId} · opening review…
            </div>
          )}

          <InfoNotice style={{ marginTop: 16 }}>
            {HOSTED_DEMO_NOTE_PREFIX}{' '}
            <Link to="/review" style={{ color: 'var(--ocean)', fontWeight: 600 }}>
              Review
            </Link>
            .
          </InfoNotice>
        </div>
      </form>
    </div>
  )
}
