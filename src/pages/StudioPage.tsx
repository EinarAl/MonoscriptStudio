import { useState, useCallback, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { AnimatePresence, motion } from 'framer-motion'
import StudioShell from '../components/StudioShell'
import ControlSection from '../components/ControlSection'
import AnimatedSlider from '../components/AnimatedSlider'
import ThreeDViewer from '../components/ThreeDViewer'
import CharSetPicker from '../components/CharSetPicker'
import FilterList from '../components/FilterList'
import PresetManager from '../components/PresetManager'
import FileUpload from '../components/FileUpload'
import GifAsciiPage from './GifAsciiPage'
import StaticAsciiPage from './StaticAsciiPage'
import { generateAsciiGif } from '../lib/gifAscii'
import { imageToAsciiGrid, gridToPlainText, gridToHtml, gridToSvg, gridToJson, renderGridToCanvas, removeBackground } from '../lib/imageToAscii'
import { extrudeSvg } from '../lib/svgTo3D'
import { DEFAULT_ASCII_OPTIONS } from '../types'
import type { AsciiOptions, AsciiGrid, ColorMode } from '../types'

type Mode = '3d' | 'gif' | 'static'

function makeDefaultGeometry(): THREE.BufferGeometry {
  const geo = new THREE.TorusGeometry(1.5, 0.6, 30, 60)
  geo.computeVertexNormals()
  return geo
}

export default function StudioPage() {
  const [mode, setMode] = useState<Mode>('3d')
  const [opts, setOpts] = useState<AsciiOptions>({ ...DEFAULT_ASCII_OPTIONS })
  const [geometry, setGeometry] = useState<THREE.BufferGeometry>(() => makeDefaultGeometry())
  const [animationMode] = useState<'spin' | 'tilt' | 'drag'>('tilt')
  const [depthRatio, setDepthRatio] = useState(0.35)
  const [fileLoaded, setFileLoaded] = useState(false)
  const [imageData, setImageData] = useState<ImageData | null>(null)
  const [sourceImageData, setSourceImageData] = useState<ImageData | null>(null)
  const [gridInfo, setGridInfo] = useState<{ cols: number; rows: number } | null>(null)
  const svgRef = useRef('')
  const [previewZoom, setPreviewZoom] = useState(1)
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)

  const handlePreviewWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    zoomRef.current = Math.max(0.25, Math.min(10, zoomRef.current + delta))
    setPreviewZoom(zoomRef.current)
  }, [])

  const handlePreviewMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 1) return
    e.preventDefault()
    isPanning.current = true
    setPanning(true)
    lastPan.current = { x: e.clientX, y: e.clientY }
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isPanning.current) return
      const dx = e.clientX - lastPan.current.x
      const dy = e.clientY - lastPan.current.y
      lastPan.current = { x: e.clientX, y: e.clientY }
      panRef.current.x += dx
      panRef.current.y += dy
      setPreviewPan({ ...panRef.current })
    }
    const onUp = () => {
      isPanning.current = false
      setPanning(false)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  useEffect(() => {
    zoomRef.current = 1
    panRef.current = { x: 0, y: 0 }
    setPreviewZoom(1)
    setPreviewPan({ x: 0, y: 0 })
  }, [mode])

  const updateOpt = <K extends keyof AsciiOptions>(key: K, val: AsciiOptions[K]) =>
    setOpts(prev => ({ ...prev, [key]: val }))

  const loadGeometryFromSvg = useCallback((svg: string, depth: number) => {
    const geo = extrudeSvg(svg, 4, depth)
    if (geo) {
      setGeometry(geo)
      setFileLoaded(true)
    }
  }, [])

  const handleFile = useCallback((_file: File, dataUrl: string) => {
    if (mode === '3d') {
      fetch(dataUrl).then(r => r.text()).then(svg => {
        svgRef.current = svg
        loadGeometryFromSvg(svg, depthRatio)
      })
      return
    }
    const img = new Image()
    img.src = dataUrl
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      const fullImageData = ctx.getImageData(0, 0, img.width, img.height)
      setImageData(fullImageData)
      const srcCanvas = document.createElement('canvas')
      srcCanvas.width = img.width
      srcCanvas.height = img.height
      const srcCtx = srcCanvas.getContext('2d')!
      srcCtx.drawImage(img, 0, 0)
      setSourceImageData(srcCtx.getImageData(0, 0, img.width, img.height))
      setFileLoaded(true)
    }
  }, [mode, depthRatio, loadGeometryFromSvg])

  /* Re-extrude SVG when depth changes */
  useEffect(() => {
    if (mode === '3d' && svgRef.current) {
      loadGeometryFromSvg(svgRef.current, depthRatio)
    }
  }, [depthRatio, mode, loadGeometryFromSvg])

  /* GIF state */
  const [gifUrl, setGifUrl] = useState('')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState('')
  const [autoUpdate, setAutoUpdate] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [gifDone, setGifDone] = useState(false)
  const generatingRef = useRef(false)
  const previewBusy = useRef(false)
  const gifDebounceRef = useRef<number>(0)
  const previewDebounceRef = useRef<number>(0)

  /* Static state */
  const [staticGrid, setStaticGrid] = useState<AsciiGrid | null>(null)
  const [exportScale, setExportScale] = useState(2)

  /* GIF generation */
  const doGenerate = useCallback(async () => {
    if (!imageData) return
    generatingRef.current = true
    setGenerating(true)
    setGifUrl('')
    try {
      const blob = await generateAsciiGif(imageData, opts, opts.duration, opts.fps, (f, t) => {
        setProgress(`Frame ${f}/${t}`)
      }, sourceImageData ?? undefined)
      setGifUrl(URL.createObjectURL(blob))
      setGifDone(true)
    } finally {
      generatingRef.current = false
      setGenerating(false)
      setProgress('')
    }
  }, [opts, imageData, sourceImageData])

  /* GIF live preview */
  useEffect(() => {
    if (!imageData || previewBusy.current) return
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current)
    previewDebounceRef.current = window.setTimeout(() => {
      previewBusy.current = true
      const grid = imageToAsciiGrid(imageData, opts)
      setGridInfo({ cols: grid.cols, rows: grid.rows })
      const { canvas } = renderGridToCanvas(grid, opts.bgColor, opts.bgTransparent, 6 * opts.outputScale, 12 * opts.outputScale)
      setPreviewUrl(canvas.toDataURL())
      setGifDone(false)
      previewBusy.current = false
    }, 300)
    return () => { if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current) }
  }, [imageData, opts])

  /* Auto-generate */
  useEffect(() => {
    if (!autoUpdate || !imageData) return
    if (gifDebounceRef.current) clearTimeout(gifDebounceRef.current)
    const tryGen = () => {
      if (generatingRef.current) {
        gifDebounceRef.current = window.setTimeout(tryGen, 200)
      } else {
        doGenerate()
      }
    }
    gifDebounceRef.current = window.setTimeout(tryGen, 300)
    return () => { if (gifDebounceRef.current) clearTimeout(gifDebounceRef.current) }
  }, [autoUpdate, imageData, opts, doGenerate])

  /* Static grid computation */
  useEffect(() => {
    if (!imageData || mode !== 'static') return
    let id = imageData
    if (opts.removeBg) {
      id = removeBackground(id)
    }
    const grid = imageToAsciiGrid(id, opts)
    setStaticGrid(grid)
    setGridInfo({ cols: grid.cols, rows: grid.rows })
  }, [imageData, opts, mode])

  /* Static export */
  const handleStaticExport = useCallback((format: string) => {
    const g = staticGrid
    if (!g) return
    const download = (blob: Blob, name: string) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = name; a.click()
      URL.revokeObjectURL(url)
    }
    switch (format) {
      case 'txt': download(new Blob([gridToPlainText(g)], { type: 'text/plain' }), 'ascii-art.txt'); break
      case 'html': download(new Blob([gridToHtml(g, opts.bgColor, opts.bgTransparent)], { type: 'text/html' }), 'ascii-art.html'); break
      case 'svg': download(new Blob([gridToSvg(g, opts.bgColor, opts.bgTransparent, exportScale)], { type: 'image/svg+xml' }), 'ascii-art.svg'); break
      case 'json': download(new Blob([gridToJson(g)], { type: 'application/json' }), 'ascii-art.json'); break
      case 'png':
        const srcForExport = opts.overlayImage ? sourceImageData ?? undefined : undefined
        const { canvas } = renderGridToCanvas(g, opts.bgColor, opts.bgTransparent, 7 * exportScale, 12 * exportScale, undefined, undefined, srcForExport)
        canvas.toBlob(b => { if (b) download(b, 'ascii-art.png') }); break
    }
  }, [staticGrid, opts, exportScale, sourceImageData])

  /* 3D grid info */
  const handle3dGrid = useCallback((cols: number, rows: number) => {
    setGridInfo({ cols, rows })
  }, [])

  /* GIF download */
  const gifDownloadUrl = gifDone && gifUrl ? gifUrl : previewUrl
  const gifDownloadName = gifDone && gifUrl ? 'ascii.gif' : 'ascii-preview.png'

  const colorModes: ColorMode[] = ['mono', 'multi', 'original']

  const leftSidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <FileUpload
          accept={mode === '3d' ? '.svg,image/svg+xml' : 'image/png,image/jpeg,image/svg+xml'}
          onFile={handleFile} hasFile={fileLoaded} compact
          label={mode === '3d' ? (fileLoaded ? 'SVG loaded' : 'Upload SVG') : undefined}
        />
      </div>
      <div style={{ flex: 1, overflow: 'hidden auto' }}>
        <FilterList
          activeFilters={opts.activeFilters}
          filterParams={opts.filterParams}
          onChange={v => updateOpt('activeFilters', v)}
          onParamChange={(fid, key, val) => setOpts(prev => ({
            ...prev, filterParams: { ...prev.filterParams, [fid]: { ...prev.filterParams[fid], [key]: val } },
          }))}
        />
        <PresetManager value={opts.presets} strength={opts.presetStrength} onChange={v => updateOpt('presets', v)}
          onStrengthChange={(id, val) => setOpts(prev => ({ ...prev, presetStrength: { ...prev.presetStrength, [id]: val } }))} />
      </div>
    </div>
  )

  const rightSidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {gridInfo && (
        <div style={{ padding: '8px 16px', fontSize: 10, color: 'var(--color-text-tertiary)', borderBottom: '1px solid var(--color-border-subtle)' }}>
          {gridInfo.cols}W &times; {gridInfo.rows}H
        </div>
      )}

      {mode === '3d' && (
        <>
          <ControlSection label="Sampling">
            <AnimatedSlider label="Width" value={opts.width} min={10} max={160} step={1} onChange={v => updateOpt('width', v)} />
            <AnimatedSlider label="Scale" value={opts.outputScale} min={0.25} max={4} step={0.25} onChange={v => updateOpt('outputScale', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Height" value={opts.heightScale} min={0.2} max={2} step={0.05} onChange={v => updateOpt('heightScale', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Density" value={opts.densityBias} min={0.2} max={3} step={0.05} onChange={v => updateOpt('densityBias', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Depth" value={depthRatio} min={0.1} max={1} step={0.05} onChange={setDepthRatio} format={v => v.toFixed(2)} />
            <CharSetPicker value={opts.charset} onChange={v => updateOpt('charset', v)} />
          </ControlSection>
          <ControlSection label="Tone">
            <AnimatedSlider label="Bright" value={opts.brightness} min={-100} max={100} step={1} onChange={v => updateOpt('brightness', v)} />
            <AnimatedSlider label="Contrast" value={opts.contrast} min={0} max={3} step={0.05} onChange={v => updateOpt('contrast', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Gamma" value={opts.gamma} min={0.2} max={3} step={0.05} onChange={v => updateOpt('gamma', v)} format={v => v.toFixed(2)} />
          </ControlSection>
          <ControlSection label="Color">
            <div style={{ display: 'flex', gap: 6 }}>
              {colorModes.map(m => (
                <button key={m} onClick={() => updateOpt('colorMode', m)} style={{
                  flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid',
                  borderColor: opts.colorMode === m ? 'var(--color-accent)' : 'var(--color-border-visible)',
                  background: opts.colorMode === m ? 'var(--color-accent-glow)' : 'transparent',
                  color: opts.colorMode === m ? '#fff' : 'var(--color-text-secondary)',
                  fontSize: 11, fontWeight: 500, cursor: 'pointer',
                }}>{m}</button>
              ))}
            </div>
          </ControlSection>
        </>
      )}

      {mode === 'gif' && (
        <>
          <ControlSection label="Sampling">
            <AnimatedSlider label="Width" value={opts.width} min={10} max={160} step={1} onChange={v => updateOpt('width', v)} />
            <AnimatedSlider label="Scale" value={opts.outputScale} min={0.25} max={4} step={0.25} onChange={v => updateOpt('outputScale', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Duration" value={opts.duration} min={1} max={10} step={1} onChange={v => updateOpt('duration', v)} format={v => `${v}s`} />
            <AnimatedSlider label="FPS" value={opts.fps} min={5} max={30} step={5} onChange={v => updateOpt('fps', v)} />
            <CharSetPicker value={opts.charset} onChange={v => updateOpt('charset', v)} />
          </ControlSection>
          <ControlSection label="Tone">
            <AnimatedSlider label="Bright" value={opts.brightness} min={-100} max={100} step={1} onChange={v => updateOpt('brightness', v)} />
            <AnimatedSlider label="Contrast" value={opts.contrast} min={0} max={3} step={0.05} onChange={v => updateOpt('contrast', v)} format={v => v.toFixed(2)} />
          </ControlSection>
          <ControlSection label="Animation" defaultOpen={false}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
              <label style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>Type:</label>
              <select value={opts.gifAnim} onChange={e => updateOpt('gifAnim', e.target.value as any)}
                style={{ flex: 1, background: 'var(--color-surface-base)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-visible)', borderRadius: 4, padding: '4px 6px', fontSize: 11 }}>
                <option value="none">None</option>
                <option value="rotation">Spin</option>
                <option value="radioWaves">Radio Waves</option>
              </select>
            </div>
            <label style={{ color: 'var(--color-text-secondary)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0' }}>
              <input type="checkbox" checked={opts.invert} onChange={e => updateOpt('invert', e.target.checked)} /> Invert
            </label>
          </ControlSection>
          {opts.gifAnim === 'radioWaves' && (
            <ControlSection label="Radio Waves">
              <AnimatedSlider label="Range" value={opts.waveRange} min={0.2} max={1.5} step={0.05} onChange={v => updateOpt('waveRange', v)} format={v => v.toFixed(2)} />
              <AnimatedSlider label="Radius" value={opts.waveRadius} min={0.05} max={0.4} step={0.01} onChange={v => updateOpt('waveRadius', v)} format={v => v.toFixed(2)} />
              <AnimatedSlider label="Squareness" value={opts.waveSquareness} min={0} max={1} step={0.05} onChange={v => updateOpt('waveSquareness', v)} format={v => v.toFixed(2)} />
              <AnimatedSlider label="Gap" value={opts.waveGap} min={0.04} max={0.3} step={0.01} onChange={v => updateOpt('waveGap', v)} format={v => v.toFixed(2)} />
              <AnimatedSlider label="Amplitude" value={opts.waveAmplitude} min={0} max={50} step={1} onChange={v => updateOpt('waveAmplitude', v)} format={v => v.toString()} />
              <AnimatedSlider label="Speed" value={opts.waveSpeed} min={0.1} max={5} step={0.1} onChange={v => updateOpt('waveSpeed', v)} format={v => v.toFixed(1)} />
              <AnimatedSlider label="Drama" value={opts.waveSharpness} min={0.5} max={5} step={0.1} onChange={v => updateOpt('waveSharpness', v)} format={v => v.toFixed(1)} />
              <AnimatedSlider label="Warmth" value={opts.waveWarmth} min={0} max={1} step={0.05} onChange={v => updateOpt('waveWarmth', v)} format={v => v.toFixed(2)} />
              <label style={{ color: 'var(--color-text-secondary)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0' }}>
                <input type="checkbox" checked={opts.waveInward} onChange={e => updateOpt('waveInward', e.target.checked)} /> Inward
              </label>
              <label style={{ color: 'var(--color-text-secondary)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0' }}>
                <input type="checkbox" checked={opts.waveVisible} onChange={e => updateOpt('waveVisible', e.target.checked)} /> Show lines
              </label>
              {opts.waveVisible && (
                <>
                  <AnimatedSlider label="Thickness" value={opts.waveLineThickness} min={1} max={10} step={1} onChange={v => updateOpt('waveLineThickness', v)} format={v => v.toString()} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>Line Color:</label>
                    <input type="color" value={opts.waveLineColor} onChange={e => updateOpt('waveLineColor', e.target.value)}
                      style={{ width: 28, height: 24, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }} />
                  </div>
                </>
              )}
              <div style={{ color: 'var(--color-text-tertiary)', fontSize: 10, padding: '2px 0' }}>
                Drag on the preview to set wave origin
              </div>
            </ControlSection>
          )}
          <ControlSection label="Generate">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={doGenerate} disabled={!fileLoaded || generating}
                style={{ padding: '8px 0', borderRadius: 6, border: 'none', width: '100%',
                  background: generating ? '#555' : autoUpdate ? '#2a6e3a' : 'var(--color-accent)',
                  color: '#000', cursor: fileLoaded && !generating ? 'pointer' : 'default',
                  fontSize: 12, fontWeight: 500 }}>
                {generating ? `Generating ${progress || '...'}` : autoUpdate ? 'Auto (live)' : fileLoaded ? 'Generate GIF' : 'Upload first'}
              </button>
              <label style={{ color: 'var(--color-text-secondary)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                <input type="checkbox" checked={autoUpdate} onChange={e => setAutoUpdate(e.target.checked)} /> Auto-update
              </label>
              {gifDownloadUrl && (
                <a href={gifDownloadUrl} download={gifDownloadName}
                  style={{ display: 'block', padding: '6px 0', borderRadius: 6, width: '100%', textAlign: 'center',
                    border: '1px solid var(--color-accent)', color: 'var(--color-accent)',
                    textDecoration: 'none', fontSize: 11 }}>
                  {gifDone && gifUrl ? 'Download GIF' : 'Download Preview'}
                </a>
              )}
            </div>
          </ControlSection>
          <ControlSection label="Color" defaultOpen={false}>
            <div style={{ display: 'flex', gap: 6 }}>
              {colorModes.map(m => (
                <button key={m} onClick={() => updateOpt('colorMode', m)} style={{
                  flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid',
                  borderColor: opts.colorMode === m ? 'var(--color-accent)' : 'var(--color-border-visible)',
                  background: opts.colorMode === m ? 'var(--color-accent-glow)' : 'transparent',
                  color: opts.colorMode === m ? '#fff' : 'var(--color-text-secondary)',
                  fontSize: 11, fontWeight: 500, cursor: 'pointer',
                }}>{m}</button>
              ))}
            </div>
          </ControlSection>
        </>
      )}

      {mode === 'static' && (
        <>
          <ControlSection label="Sampling">
            <AnimatedSlider label="Width" value={opts.width} min={10} max={220} step={1} onChange={v => updateOpt('width', v)} />
            <AnimatedSlider label="Scale" value={opts.outputScale} min={0.25} max={4} step={0.25} onChange={v => updateOpt('outputScale', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="H Scale" value={opts.heightScale} min={0.2} max={2} step={0.05} onChange={v => updateOpt('heightScale', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Pixelate" value={opts.pixelate} min={0} max={10} step={1} onChange={v => updateOpt('pixelate', v)} />
            <CharSetPicker value={opts.charset} onChange={v => updateOpt('charset', v)} />
          </ControlSection>
          <ControlSection label="Tone">
            <AnimatedSlider label="Bright" value={opts.brightness} min={-100} max={100} step={1} onChange={v => updateOpt('brightness', v)} />
            <AnimatedSlider label="Contrast" value={opts.contrast} min={0} max={3} step={0.05} onChange={v => updateOpt('contrast', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Gamma" value={opts.gamma} min={0.2} max={3} step={0.05} onChange={v => updateOpt('gamma', v)} format={v => v.toFixed(2)} />
          </ControlSection>
          <ControlSection label="Color" defaultOpen={false}>
            <div style={{ display: 'flex', gap: 6 }}>
              {colorModes.map(m => (
                <button key={m} onClick={() => updateOpt('colorMode', m)} style={{
                  flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid',
                  borderColor: opts.colorMode === m ? 'var(--color-accent)' : 'var(--color-border-visible)',
                  background: opts.colorMode === m ? 'var(--color-accent-glow)' : 'transparent',
                  color: opts.colorMode === m ? '#fff' : 'var(--color-text-secondary)',
                  fontSize: 11, fontWeight: 500, cursor: 'pointer',
                }}>{m}</button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <label style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>BG:</label>
              <input type="color" value={opts.bgColor} onChange={e => updateOpt('bgColor', e.target.value)}
                style={{ width: 28, height: 24, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }} />
              <label style={{ color: 'var(--color-text-secondary)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3, marginLeft: 4 }}>
                <input type="checkbox" checked={opts.bgTransparent} onChange={e => updateOpt('bgTransparent', e.target.checked)} /> Transparent
              </label>
            </div>
          </ControlSection>
          <ControlSection label="Advanced" defaultOpen={false}>
            <AnimatedSlider label="Density" value={opts.densityBias} min={0.2} max={3} step={0.05} onChange={v => updateOpt('densityBias', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Cut Darks" value={opts.cutDarks} min={0} max={0.5} step={0.01} onChange={v => updateOpt('cutDarks', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Cut Lights" value={opts.cutLights} min={0} max={0.5} step={0.01} onChange={v => updateOpt('cutLights', v)} format={v => v.toFixed(2)} />
            <label style={{ color: 'var(--color-text-secondary)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0' }}>
              <input type="checkbox" checked={opts.invert} onChange={e => updateOpt('invert', e.target.checked)} /> Invert
            </label>
          </ControlSection>
          <ControlSection label="Export" defaultOpen={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {['txt', 'html', 'svg', 'json', 'png'].map(f => (
                  <button key={f} onClick={() => handleStaticExport(f)}
                    style={{ flex: 1, padding: '5px 0', borderRadius: 4, minWidth: 40,
                      border: '1px solid var(--color-accent)', background: 'transparent',
                      color: 'var(--color-accent)', cursor: 'pointer', fontSize: 10, fontWeight: 500 }}>
                    .{f}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <label style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>Scale:</label>
                <select value={exportScale} onChange={e => setExportScale(+e.target.value)}
                  style={{ flex: 1, background: 'var(--color-surface-base)', color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border-visible)', borderRadius: 4, padding: '2px 6px', fontSize: 11 }}>
                  {[1,2,3,4,5,6].map(s => <option key={s} value={s}>{s}x</option>)}
                </select>
              </div>
            </div>
          </ControlSection>
        </>
      )}
    </div>
  )

  return (
    <StudioShell mode={mode} onModeChange={setMode} leftSidebar={leftSidebar} rightSidebar={rightSidebar}>
      <div
        onWheel={handlePreviewWheel}
        onMouseDown={handlePreviewMouseDown}
        style={{ width: '100%', height: '100%', overflow: 'hidden', cursor: panning ? 'grabbing' : 'default' }}
      >
        <div style={{
          transform: `scale(${previewZoom})`,
          translate: `${previewPan.x}px ${previewPan.y}px`,
          transformOrigin: 'center center',
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {mode === '3d' && (
                <ThreeDViewer
                  geometry={geometry}
                  asciiOptions={opts}
                  animationMode={animationMode}
                  spinSpeed={1}
                  onGrid={handle3dGrid}
                />
              )}
              {mode === 'gif' && (
                <GifAsciiPage
                  opts={opts}
                  updateOpt={updateOpt}
                  previewUrl={previewUrl}
                  gifUrl={gifUrl}
                  gifDone={gifDone}
                />
              )}
              {mode === 'static' && (
                <StaticAsciiPage
                  grid={staticGrid}
                  opts={opts}
                  sourceImageData={sourceImageData}
                  fileLoaded={fileLoaded}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </StudioShell>
  )
}
