import { useState, useCallback, useRef, useEffect } from 'react'
import FileUpload from '../components/FileUpload'
import CharSetPicker from '../components/CharSetPicker'
import PresetPicker from '../components/PresetPicker'
import FilterPanel from '../components/FilterPanel'
import { DEFAULT_ASCII_OPTIONS } from '../types'
import type { AsciiOptions, ColorMode } from '../types'
import { generateAsciiGif } from '../lib/gifAscii'
import { imageToAsciiGrid, renderGridToCanvas } from '../lib/imageToAscii'

function Slider({ label, value, min, max, step, onChange, format }: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <label style={{ color: '#999', fontSize: 11, minWidth: 50, textAlign: 'right' }}>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ width: 80, accentColor: '#4f46e5' }}
      />
      <span style={{ color: '#999', fontSize: 11, minWidth: 36, textAlign: 'right' }}>{format ? format(value) : value}</span>
    </div>
  )
}

export default function GifAsciiPage() {
  const [opts, setOpts] = useState<AsciiOptions>({ ...DEFAULT_ASCII_OPTIONS })
  const [duration, setDuration] = useState(2)
  const [fps, setFps] = useState(10)
  const [gifUrl, setGifUrl] = useState('')
  const [generating, setGenerating] = useState(false)
  const [fileLoaded, setFileLoaded] = useState(false)
  const [progress, setProgress] = useState('')
  const [autoUpdate, setAutoUpdate] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [gifDone, setGifDone] = useState(false)
  const imageDataRef = useRef<ImageData | null>(null)
  const sourceImageRef = useRef<ImageData | null>(null)
  const debounceRef = useRef<number>(0)
  const previewDebounceRef = useRef<number>(0)
  const previewBusy = useRef(false)
  const generatingRef = useRef(false)
  const previewRef = useRef<HTMLImageElement>(null)
  const draggingOrigin = useRef(false)

  const updateOpt = <K extends keyof AsciiOptions>(key: K, val: AsciiOptions[K]) =>
    setOpts(prev => ({ ...prev, [key]: val }))

  const originFromPointer = useCallback((e: React.PointerEvent) => {
    const el = previewRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setOpts(prev => ({
      ...prev,
      waveOriginX: Math.max(0, Math.min(1, x)),
      waveOriginY: Math.max(0, Math.min(1, y)),
    }))
  }, [])

  const handleOriginPointerDown = useCallback((e: React.PointerEvent) => {
    if (opts.gifAnim !== 'radioWaves') return
    draggingOrigin.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    originFromPointer(e)
  }, [opts.gifAnim, originFromPointer])

  const handleOriginPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingOrigin.current) return
    originFromPointer(e)
  }, [originFromPointer])

  const handleOriginPointerUp = useCallback(() => {
    draggingOrigin.current = false
  }, [])

  const handleFile = useCallback(async (_file: File, dataUrl: string) => {
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
    const fullImageData = ctx.getImageData(0, 0, img.width, img.height)
    imageDataRef.current = fullImageData
    sourceImageRef.current = fullImageData
    setFileLoaded(true)
    setGifUrl('')
  }, [])

  const doGenerate = useCallback(async () => {
    const id = imageDataRef.current
    if (!id) return
    generatingRef.current = true
    setGenerating(true)
    setGifUrl('')

    try {
      const blob = await generateAsciiGif(id, opts, duration, fps, (frame, total) => {
        setProgress(`Frame ${frame}/${total}`)
      }, sourceImageRef.current ?? undefined)
      setGifUrl(URL.createObjectURL(blob))
      setGifDone(true)
    } finally {
      generatingRef.current = false
      setGenerating(false)
      setProgress('')
    }
  }, [opts, duration, fps])

  // Live single-frame preview on every option change
  useEffect(() => {
    const id = imageDataRef.current
    if (!id || previewBusy.current) return
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current)
    previewDebounceRef.current = window.setTimeout(() => {
      previewBusy.current = true
      const cellW = 6 * opts.outputScale
      const cellH = 12 * opts.outputScale
      const grid = imageToAsciiGrid(id, opts)
      const { canvas } = renderGridToCanvas(grid, opts.bgColor, opts.bgTransparent, cellW, cellH)
      setPreviewUrl(canvas.toDataURL())
      setGifDone(false)
      previewBusy.current = false
    }, 300)
    return () => { if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current) }
  }, [fileLoaded, opts])

  // Auto-generate: debounce + poll until generation finishes
  useEffect(() => {
    if (!autoUpdate || !fileLoaded) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const tryGen = () => {
      if (generatingRef.current) {
        debounceRef.current = window.setTimeout(tryGen, 200)
      } else {
        doGenerate()
      }
    }
    debounceRef.current = window.setTimeout(tryGen, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [autoUpdate, fileLoaded, opts, duration, fps])

  const colorModes: ColorMode[] = ['mono', 'multi', 'original']

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 24, margin: '0.5rem 0 0' }}>Image &rarr; ASCII GIF</h1>
      </div>

      <FileUpload accept="image/png,image/jpeg,image/svg+xml" onFile={handleFile} hasFile={fileLoaded} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '16px 0' }}>
        {/* Row 1: Charset + Color Mode + Preset */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <CharSetPicker value={opts.charset} onChange={v => updateOpt('charset', v)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#999', fontSize: 11 }}>Color:</span>
            {colorModes.map(m => (
              <button key={m} onClick={() => updateOpt('colorMode', m)}
                style={{
                  padding: '3px 8px', borderRadius: 4, border: `1px solid ${opts.colorMode === m ? '#4f46e5' : '#333'}`,
                  background: opts.colorMode === m ? 'rgba(79,70,229,0.2)' : 'transparent',
                  color: opts.colorMode === m ? '#fff' : '#999', cursor: 'pointer', fontSize: 10,
                }}
              >{m}</button>
            ))}
          </div>
          <PresetPicker value={opts.presets} strength={opts.presetStrength} onChange={v => updateOpt('presets', v)}
            onStrengthChange={(id, val) => setOpts(prev => ({ ...prev, presetStrength: { ...prev.presetStrength, [id]: val } }))} />
        </div>

        {/* Row 1b: Individual filters */}
        <div>
          <FilterPanel
            activeFilters={opts.activeFilters}
            filterParams={opts.filterParams}
            onChange={v => updateOpt('activeFilters', v)}
            onParamChange={(fid, key, val) => setOpts(prev => ({
              ...prev,
              filterParams: {
                ...prev.filterParams,
                [fid]: { ...prev.filterParams[fid], [key]: val },
              },
            }))}
          />
        </div>

        {/* Row 2: Sampling */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Slider label="Width" value={opts.width} min={10} max={160} step={1} onChange={v => updateOpt('width', v)} />
          <Slider label="Size" value={opts.outputScale} min={0.25} max={4} step={0.25} onChange={v => updateOpt('outputScale', v)} format={v => v.toFixed(2)} />
          <Slider label="H Scale" value={opts.heightScale} min={0.2} max={2.0} step={0.05} onChange={v => updateOpt('heightScale', v)} format={v => v.toFixed(2)} />
          <Slider label="Pixelate" value={opts.pixelate} min={0} max={10} step={1} onChange={v => updateOpt('pixelate', v)} />
        </div>

        {/* Row 3: Tone */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Slider label="Bright" value={opts.brightness} min={-100} max={100} step={1} onChange={v => updateOpt('brightness', v)} />
          <Slider label="Contrast" value={opts.contrast} min={0} max={3} step={0.05} onChange={v => updateOpt('contrast', v)} format={v => v.toFixed(2)} />
          <Slider label="Gamma" value={opts.gamma} min={0.2} max={3.0} step={0.05} onChange={v => updateOpt('gamma', v)} format={v => v.toFixed(2)} />
        </div>

        {/* Row 4: Density + Duration + FPS + Invert + Anim + Auto */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Slider label="Density" value={opts.densityBias} min={0.2} max={3.0} step={0.05} onChange={v => updateOpt('densityBias', v)} format={v => v.toFixed(2)} />
          <Slider label="Duration" value={duration} min={1} max={10} step={1} onChange={v => setDuration(v)} format={v => `${v}s`} />
          <Slider label="FPS" value={fps} min={5} max={30} step={5} onChange={v => setFps(v)} />
          <label style={{ color: '#999', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
            <input type="checkbox" checked={opts.invert} onChange={e => updateOpt('invert', e.target.checked)} /> Invert
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <label style={{ color: '#999', fontSize: 11 }}>Anim:</label>
            <select value={opts.gifAnim} onChange={e => updateOpt('gifAnim', e.target.value as any)}
              style={{ background: '#1a1a2e', color: '#f0e6d0', border: '1px solid #444', borderRadius: 4, padding: '2px 6px', fontSize: 11 }}>
              <option value="none">None</option>
              <option value="rotation">Spin</option>
              <option value="radioWaves">Radio Waves</option>
            </select>
          </div>
          <label style={{ color: '#999', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
            <input type="checkbox" checked={autoUpdate} onChange={e => setAutoUpdate(e.target.checked)} /> Auto
          </label>
        </div>

        {/* Row 5: FG Color + BG Color + Transparent */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {opts.colorMode === 'mono' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ color: '#999', fontSize: 11 }}>FG Color:</label>
              <input type="color" value={opts.fgColor} onChange={e => updateOpt('fgColor', e.target.value)}
                style={{ width: 28, height: 24, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }} />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ color: '#999', fontSize: 11 }}>BG Color:</label>
            <input type="color" value={opts.bgColor} onChange={e => updateOpt('bgColor', e.target.value)}
              style={{ width: 28, height: 24, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }} />
            <label style={{ color: '#999', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
              <input type="checkbox" checked={opts.bgTransparent} onChange={e => updateOpt('bgTransparent', e.target.checked)} /> Transparent
            </label>
          </div>
        </div>

        {/* Row 6: Cut Darks + Cut Lights + Overlay */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Slider label="Cut Darks" value={opts.cutDarks} min={0} max={0.5} step={0.01} onChange={v => updateOpt('cutDarks', v)} format={v => v.toFixed(2)} />
          <Slider label="Cut Lights" value={opts.cutLights} min={0} max={0.5} step={0.01} onChange={v => updateOpt('cutLights', v)} format={v => v.toFixed(2)} />
          <label style={{ color: '#999', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
            <input type="checkbox" checked={opts.overlayImage} onChange={e => updateOpt('overlayImage', e.target.checked)} /> Overlay on image
          </label>
        </div>

        {opts.gifAnim === 'radioWaves' && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Slider label="Origin X" value={opts.waveOriginX} min={0} max={1} step={0.05} onChange={v => updateOpt('waveOriginX', v)} format={v => v.toFixed(2)} />
            <Slider label="Origin Y" value={opts.waveOriginY} min={0} max={1} step={0.05} onChange={v => updateOpt('waveOriginY', v)} format={v => v.toFixed(2)} />
            <Slider label="Range" value={opts.waveRange} min={0.2} max={1.5} step={0.05} onChange={v => updateOpt('waveRange', v)} format={v => v.toFixed(2)} />
            <Slider label="Radius" value={opts.waveRadius} min={0.05} max={0.4} step={0.01} onChange={v => updateOpt('waveRadius', v)} format={v => v.toFixed(2)} />
            <Slider label="Squareness" value={opts.waveSquareness} min={0} max={1} step={0.05} onChange={v => updateOpt('waveSquareness', v)} format={v => v.toFixed(2)} />
            <Slider label="Gap" value={opts.waveGap} min={0.04} max={0.3} step={0.01} onChange={v => updateOpt('waveGap', v)} format={v => v.toFixed(2)} />
            <Slider label="Amt" value={opts.waveAmplitude} min={0} max={50} step={1} onChange={v => updateOpt('waveAmplitude', v)} format={v => v.toString()} />
            <Slider label="Speed" value={opts.waveSpeed} min={0.1} max={5} step={0.1} onChange={v => updateOpt('waveSpeed', v)} format={v => v.toFixed(1)} />
            <Slider label="Drama" value={opts.waveSharpness} min={0.5} max={5} step={0.1} onChange={v => updateOpt('waveSharpness', v)} format={v => v.toFixed(1)} />
            <Slider label="Warmth" value={opts.waveWarmth} min={0} max={1} step={0.05} onChange={v => updateOpt('waveWarmth', v)} format={v => v.toFixed(2)} />
            <label style={{ color: '#999', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={opts.waveInward} onChange={e => updateOpt('waveInward', e.target.checked)} /> Inward
            </label>
            <label style={{ color: '#999', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={opts.waveVisible} onChange={e => updateOpt('waveVisible', e.target.checked)} /> Show lines
            </label>
            {opts.waveVisible && (
              <>
                <Slider label="Thickness" value={opts.waveLineThickness} min={1} max={10} step={1} onChange={v => updateOpt('waveLineThickness', v)} format={v => v.toString()} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ color: '#999', fontSize: 11 }}>Line Color:</label>
                  <input type="color" value={opts.waveLineColor} onChange={e => updateOpt('waveLineColor', e.target.value)}
                    style={{ width: 28, height: 24, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }} />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <button
        onClick={doGenerate}
        disabled={!fileLoaded || generating}
        style={{
          padding: '10px 24px',
          borderRadius: 8,
          border: 'none',
          background: generating ? '#555' : autoUpdate ? '#2a6e3a' : '#4f46e5',
          color: '#fff',
          cursor: fileLoaded && !generating ? 'pointer' : 'default',
          fontSize: 14,
          marginBottom: 16,
        }}
      >
        {generating ? `Generating ${progress || '...'}` : autoUpdate ? 'Auto (live)' : fileLoaded ? 'Generate GIF' : 'Upload an image first'}
      </button>

      {(previewUrl || gifUrl) && (
        <div style={{
          background: '#0d0d1a',
          borderRadius: 8,
          padding: 16,
          display: 'flex',
          justifyContent: 'center',
          position: 'relative',
        }}>
          <img ref={previewRef} src={gifDone && gifUrl ? gifUrl : previewUrl} alt="ASCII preview"
            style={{ maxWidth: '100%', borderRadius: 4, display: 'block' }} draggable={false} />
          {opts.gifAnim === 'radioWaves' && (
            <div
              style={{
                position: 'absolute',
                inset: 16,
                cursor: 'crosshair',
                touchAction: 'none',
              }}
              onPointerDown={handleOriginPointerDown}
              onPointerMove={handleOriginPointerMove}
              onPointerUp={handleOriginPointerUp}
              onPointerLeave={handleOriginPointerUp}
            >
              <div style={{
                position: 'absolute',
                left: `calc(${opts.waveOriginX * 100}% - 6px)`,
                top: `calc(${opts.waveOriginY * 100}% - 6px)`,
                width: 12, height: 12,
                borderRadius: '50%',
                border: '2px solid #fff',
                background: 'rgba(255,255,255,0.25)',
                pointerEvents: 'none',
                boxShadow: '0 0 4px rgba(0,0,0,0.5)',
              }} />
            </div>
          )}
        </div>
      )}

      {(previewUrl || gifUrl) && (
        <a
          href={gifDone && gifUrl ? gifUrl : previewUrl}
          download={gifDone && gifUrl ? 'ascii.gif' : 'ascii-preview.png'}
          style={{
            display: 'inline-block',
            marginTop: 12,
            padding: '8px 20px',
            borderRadius: 6,
            border: '1px solid #4f46e5',
            color: '#4f46e5',
            textDecoration: 'none',
            fontSize: 13,
          }}
        >
          {gifDone && gifUrl ? 'Download GIF' : 'Download Preview'}
        </a>
      )}
    </div>
  )
}
