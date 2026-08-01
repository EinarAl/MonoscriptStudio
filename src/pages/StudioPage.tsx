import { useState, useCallback, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { AnimatePresence, motion } from 'framer-motion'
import StudioShell from '../components/StudioShell'
import ControlSection from '../components/ControlSection'
import AnimatedSlider from '../components/AnimatedSlider'
import ThreeDViewer from '../components/ThreeDViewer'
import CharSetPicker from '../components/CharSetPicker'
import GlowButton from '../components/GlowButton'
import FilterList from '../components/FilterList'
import PresetManager from '../components/PresetManager'
import FileUpload from '../components/FileUpload'
import PixelEditor from '../components/PixelEditor'
import GifAsciiPage from './GifAsciiPage'
import StaticAsciiPage from './StaticAsciiPage'
import { generateAsciiGif, generateGifFromGrids } from '../lib/gifAscii'
import { imageToAsciiGrid, gridToPlainText, gridToHtml, gridToSvg, gridToJson, renderGridToCanvas, removeBackground } from '../lib/imageToAscii'
import { extrudeSvg, extractPointCloud } from '../lib/svgTo3D'
import { pixelGridToGeometry } from '../lib/pixelTo3D'
import { getFileExtension, is3dExtension, loadModelGeometry } from '../lib/modelTo3D'
import { generateTerminalScript } from '../lib/terminalExporter'
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
  const [leftOpen, setLeftOpen] = useState(() => window.innerWidth > 768)
  const [rightOpen, setRightOpen] = useState(() => window.innerWidth > 768)
  const [opts, setOpts] = useState<AsciiOptions>({ ...DEFAULT_ASCII_OPTIONS })
  const [geometry, setGeometry] = useState<THREE.BufferGeometry>(() => makeDefaultGeometry())
  const [animationMode, setAnimationMode] = useState<'spin' | 'tilt' | 'drag'>('tilt')
  const [spinSpeed, setSpinSpeed] = useState(1)
  const [depthRatio, setDepthRatio] = useState(0.35)
  const [terminalSampleCount, setTerminalSampleCount] = useState(5000)
  const latestGridRef = useRef<AsciiGrid | null>(null)
  const [recordSeconds, setRecordSeconds] = useState(10)
  const [recording, setRecording] = useState(false)
  const [renderingGif, setRenderingGif] = useState(false)
  const recordFramesRef = useRef<AsciiGrid[]>([])
  const recordTimerRef = useRef(0)
  const [uploadedType, setUploadedType] = useState<'none' | 'image' | 'svg' | 'model'>('none')
  const [uploadError, setUploadError] = useState('')
  const [imageData, setImageData] = useState<ImageData | null>(null)
  const [sourceImageData, setSourceImageData] = useState<ImageData | null>(null)
  const [gridInfo, setGridInfo] = useState<{ cols: number; rows: number } | null>(null)
  const svgRef = useRef('')
  const modelGeometryRef = useRef<THREE.BufferGeometry | null>(null)
  const [previewZoom, setPreviewZoom] = useState(1)
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const [pixelGrid, setPixelGrid] = useState<string[][]>([])
  const [showPixelArt, setShowPixelArt] = useState(false)
  const pixelGridRef = useRef<string[][]>([])
  const showPixelArtRef = useRef(false)
  const pixelDebounceRef = useRef(0)

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

  const fileLoaded = mode === '3d'
    ? uploadedType === 'svg' || uploadedType === 'model'
    : uploadedType === 'image' || uploadedType === 'svg'

  const loadGeometryFromSvg = useCallback((svg: string, depth: number) => {
    const geo = extrudeSvg(svg, 4, depth)
    if (geo) setGeometry(geo)
  }, [])

  const handleTogglePixelArt = useCallback(() => {
    const next = !showPixelArt
    showPixelArtRef.current = next
    setShowPixelArt(next)
    if (next && pixelGrid.length === 0) {
      const size = 16
      const empty = Array.from({ length: size }, () => Array(size).fill(''))
      setPixelGrid(empty)
      pixelGridRef.current = empty
    }
  }, [showPixelArt, pixelGrid])

  const handlePixelGridChange = useCallback((grid: string[][]) => {
    setPixelGrid(grid)
    pixelGridRef.current = grid
    clearTimeout(pixelDebounceRef.current)
    pixelDebounceRef.current = window.setTimeout(() => {
      const hasContent = grid.some(row => row.some(v => v !== ''))
      if (hasContent) {
        const geo = pixelGridToGeometry(grid, 4, depthRatio)
        if (geo) setGeometry(geo)
      } else {
        if (svgRef.current) {
          loadGeometryFromSvg(svgRef.current, depthRatio)
        } else if (modelGeometryRef.current) {
          setGeometry(modelGeometryRef.current)
        } else {
          setGeometry(makeDefaultGeometry())
        }
      }
    }, 150)
  }, [depthRatio, loadGeometryFromSvg])

  const rasterizeToImage = useCallback((dataUrl: string) => {
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
    }
  }, [])

  const handleFile = useCallback((file: File, dataUrl: string) => {
    setUploadError('')
    const ext = getFileExtension(file.name)
    const isImage = ext === '.png' || ext === '.jpg' || ext === '.jpeg'
    const isSvg = ext === '.svg'
    const isModel = is3dExtension(ext)

    if (isSvg) {
      setUploadedType('svg')
      modelGeometryRef.current = null
      rasterizeToImage(dataUrl)
      fetch(dataUrl).then(r => r.text()).then(svg => {
        svgRef.current = svg
        if (mode === '3d') {
          loadGeometryFromSvg(svg, depthRatio)
          setShowPixelArt(false)
          showPixelArtRef.current = false
          setPixelGrid([])
          pixelGridRef.current = []
        }
      })
      setLeftOpen(true)
      return
    }
    if (isModel) {
      setUploadedType('model')
      svgRef.current = ''
      loadModelGeometry(dataUrl, file.name).then(geo => {
        if (!geo) {
          setUploadError(`Could not read 3D file: ${file.name}`)
          return
        }
        modelGeometryRef.current = geo
        setGeometry(geo)
        setShowPixelArt(false)
        showPixelArtRef.current = false
        setPixelGrid([])
        pixelGridRef.current = []
      }).catch(() => setUploadError(`Could not load 3D file: ${file.name}`))
      setLeftOpen(true)
      return
    }
    if (isImage) {
      setUploadedType('image')
      svgRef.current = ''
      modelGeometryRef.current = null
      setGeometry(makeDefaultGeometry())
      rasterizeToImage(dataUrl)
      setLeftOpen(true)
      return
    }
    setUploadError(`Unsupported file type: ${file.name}`)
  }, [mode, depthRatio, loadGeometryFromSvg, rasterizeToImage])

  /* Re-source geometry when depth changes or mode enters 3D */
  useEffect(() => {
    if (mode !== '3d') return
    if (showPixelArtRef.current && pixelGridRef.current.length > 0) {
      const geo = pixelGridToGeometry(pixelGridRef.current, 4, depthRatio)
      if (geo) setGeometry(geo)
    } else if (svgRef.current) {
      loadGeometryFromSvg(svgRef.current, depthRatio)
    } else if (modelGeometryRef.current) {
      setGeometry(modelGeometryRef.current)
    } else {
      setGeometry(makeDefaultGeometry())
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
    setGridInfo(prev => prev && prev.cols === cols && prev.rows === rows ? prev : { cols, rows })
  }, [])

  /* Terminal export */
  const handleTerminalExport = useCallback(() => {
    const g = geometry
    if (!g) return
    const pts = extractPointCloud(g, terminalSampleCount)
    if (pts.length === 0) return
    const script = generateTerminalScript(pts, opts.width)
    const blob = new Blob([script], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'logo.js'; a.click()
    URL.revokeObjectURL(url)
  }, [geometry, terminalSampleCount, opts.width])

  /* 3D screenshot export (transparent background, ASCII render only) */
  const handleExportPng = useCallback(() => {
    const grid = latestGridRef.current
    if (!grid) return
    const cellW = 7 * opts.outputScale
    const cellH = 12 * opts.outputScale
    const { canvas } = renderGridToCanvas(grid, '#000000', true, cellW, cellH)
    canvas.toBlob(b => {
      if (!b) return
      const url = URL.createObjectURL(b)
      const a = document.createElement('a')
      a.href = url; a.download = 'ascii-3d.png'; a.click()
      URL.revokeObjectURL(url)
    })
  }, [opts.outputScale])

  const handleExportSvg = useCallback(() => {
    const grid = latestGridRef.current
    if (!grid) return
    const svg = gridToSvg(grid, '#000000', true, opts.outputScale)
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'ascii-3d.svg'; a.click()
    URL.revokeObjectURL(url)
  }, [opts.outputScale])

  /* 3D screenrecord GIF */
  const handleRecordFinish = useCallback(() => {
    const frames = recordFramesRef.current
    if (frames.length === 0) return
    setRenderingGif(true)
    generateGifFromGrids(frames, 30).then(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'ascii-3d.gif'; a.click()
      URL.revokeObjectURL(url)
      setRenderingGif(false)
    })
  }, [])

  const handleRecordStart = useCallback(() => {
    recordFramesRef.current = []
    setRecording(true)
    recordTimerRef.current = window.setTimeout(() => {
      setRecording(false)
      handleRecordFinish()
    }, recordSeconds * 1000)
  }, [recordSeconds, handleRecordFinish])

  const handleRecordStop = useCallback(() => {
    window.clearTimeout(recordTimerRef.current)
    setRecording(false)
    handleRecordFinish()
  }, [handleRecordFinish])

  const handleGridCapture = useCallback((grid: AsciiGrid) => {
    latestGridRef.current = grid
    if (recordingRef.current) recordFramesRef.current.push(grid)
  }, [])

  const recordingRef = useRef(false)
  recordingRef.current = recording

  /* GIF download */
  const gifDownloadUrl = gifDone && gifUrl ? gifUrl : previewUrl
  const gifDownloadName = gifDone && gifUrl ? 'ascii.gif' : 'ascii-preview.png'

  const colorModes: ColorMode[] = ['mono', 'multi', 'original']

  const leftSidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <FileUpload
          accept={mode === '3d' ? '.svg,.glb,.gltf,.obj,.stl,.ply' : 'image/png,image/jpeg,image/svg+xml'}
          onFile={handleFile} hasFile={fileLoaded} compact
          label={mode === '3d' ? 'Upload SVG or 3D model' : undefined}
        />
        {uploadError && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>
            {uploadError}
          </div>
        )}
      </div>
      <div style={{ flex: 1, overflow: 'hidden auto', touchAction: 'pan-y' }}>
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
      {(gridInfo || previewZoom !== 1 || previewPan.x !== 0 || previewPan.y !== 0) && (
        <div style={{ padding: '8px 16px', fontSize: 10, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {gridInfo && <span style={{ flex: 1, textAlign: 'left' }}>{gridInfo.cols}W &times; {gridInfo.rows}H</span>}
          {gridInfo && <span style={{ color: 'var(--color-text-tertiary)' }}>&middot;</span>}
          <span style={{ flex: 1, textAlign: 'center' }}>{previewZoom.toFixed(2)}x</span>
          <span style={{ color: 'var(--color-text-tertiary)' }}>&middot;</span>
          <span style={{ flex: 1, textAlign: 'right' }}>X {previewPan.x >= 0 ? '+' : ''}{Math.round(previewPan.x)} Y {previewPan.y >= 0 ? '+' : ''}{Math.round(previewPan.y)}</span>
        </div>
      )}

      {mode === '3d' && (
        <>
          <ControlSection label="Sampling">
            <AnimatedSlider label="Res." value={opts.width} min={10} max={160} step={1} onChange={v => updateOpt('width', v)} />
            <AnimatedSlider label="Scale" value={opts.contentScale} min={0.5} max={4} step={0.1} onChange={v => updateOpt('contentScale', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Density" value={opts.densityBias} min={0.2} max={3} step={0.05} onChange={v => updateOpt('densityBias', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Depth" value={depthRatio} min={0.1} max={1} step={0.05} onChange={setDepthRatio} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Focus" value={opts.outputScale} min={0.25} max={4} step={0.25} onChange={v => updateOpt('outputScale', v)} format={v => v.toFixed(2)} />
            <CharSetPicker value={opts.charset} onChange={v => updateOpt('charset', v)} />
          </ControlSection>
          <ControlSection label="Pixel Art" defaultOpen={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <GlowButton onClick={handleTogglePixelArt} active={showPixelArt}
                radius={0} textColor="var(--color-text-secondary)" lineColor="#ffffff" intensity={1.5}
                style={{ width: '100%', padding: '6px 0', fontSize: 11, fontWeight: 500, border: '1px dashed var(--color-border-visible)', background: 'transparent' }}>
                {showPixelArt ? 'Close Pixel Art' : 'Draw Pixel Art'}
              </GlowButton>
              <PixelEditor grid={pixelGrid} onChange={handlePixelGridChange} visible={showPixelArt} />
            </div>
          </ControlSection>
          <ControlSection label="Controls">
            <div style={{ display: 'flex', gap: 6 }}>
              {(['spin', 'tilt', 'drag'] as const).map(m => (
                <GlowButton key={m} onClick={() => setAnimationMode(m)} active={animationMode === m}
                  radius={0} textColor="var(--color-text-secondary)" style={{ padding: '4px 8px', fontSize: 10, fontWeight: 500 }}>
                  {m === 'spin' ? 'Auto-Spin' : m === 'tilt' ? 'Mouse Tilt' : 'Click-Drag'}
                </GlowButton>
              ))}
            </div>
            <AnimatePresence initial={false}>
              {animationMode === 'spin' && (
                <motion.div
                  key="spinSpeed"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <AnimatedSlider label="Spin Speed" value={spinSpeed} min={0.1} max={5} step={0.1} onChange={setSpinSpeed} format={v => v.toFixed(1)} />
                </motion.div>
              )}
            </AnimatePresence>
          </ControlSection>
          <ControlSection label="Tone">
            <AnimatedSlider label="Bright" value={opts.brightness} min={-100} max={100} step={1} onChange={v => updateOpt('brightness', v)} />
            <AnimatedSlider label="Contr." value={opts.contrast} min={0} max={3} step={0.05} onChange={v => updateOpt('contrast', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Gamma" value={opts.gamma} min={0.2} max={3} step={0.05} onChange={v => updateOpt('gamma', v)} format={v => v.toFixed(2)} />
          </ControlSection>
          <ControlSection label="Color">
            <div style={{ display: 'flex', gap: 6 }}>
              {colorModes.map(m => (
                <GlowButton key={m} onClick={() => updateOpt('colorMode', m)} active={opts.colorMode === m}
                  radius={0} textColor="var(--color-text-secondary)" style={{ padding: '4px 8px', fontSize: 11, fontWeight: 500 }}>
                  {m}
                </GlowButton>
              ))}
            </div>
          </ControlSection>
          <ControlSection label="Export" defaultOpen={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <GlowButton onClick={handleTerminalExport}
                radius={0} textColor="var(--color-text-secondary)" lineColor="#ffffff" intensity={1.5}
                style={{ width: '100%', padding: '6px 0', fontSize: 11, fontWeight: 500, border: '1px dashed var(--color-border-visible)', background: 'transparent' }}>
                Download Terminal Script
              </GlowButton>
              <AnimatedSlider label="Samples" value={terminalSampleCount} min={500} max={30000} step={500} onChange={setTerminalSampleCount} format={v => v.toString()} />
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 9, padding: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Screenshot</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <GlowButton onClick={handleExportPng}
                  radius={0} textColor="var(--color-text-secondary)" lineColor="#ffffff" intensity={1.5}
                  style={{ flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 500, border: '1px solid var(--color-accent)', background: 'transparent', boxShadow: 'none' }}>
                  PNG
                </GlowButton>
                <GlowButton onClick={handleExportSvg}
                  radius={0} textColor="var(--color-text-secondary)" lineColor="#ffffff" intensity={1.5}
                  style={{ flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 500, border: '1px solid var(--color-accent)', background: 'transparent', boxShadow: 'none' }}>
                  SVG
                </GlowButton>
              </div>
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 9, padding: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Screenrecord</span>
              <AnimatedSlider label="Length" value={recordSeconds} min={5} max={15} step={5} onChange={setRecordSeconds} format={v => `${v}s`} />
              <GlowButton onClick={recording ? handleRecordStop : handleRecordStart} disabled={renderingGif}
                radius={0} textColor="var(--color-text-secondary)" lineColor="#ffffff" intensity={1.5}
                style={{ width: '100%', padding: '6px 0', fontSize: 11, fontWeight: 500, border: '1px solid var(--color-accent)', background: 'transparent', boxShadow: 'none' }}>
                {renderingGif ? 'Rendering...' : recording ? `Recording... (stop)` : `Record GIF`}
              </GlowButton>
            </div>
          </ControlSection>
        </>
      )}

      {mode === 'gif' && (
        <>
          <ControlSection label="Sampling">
            <AnimatedSlider label="Res." value={opts.width} min={10} max={160} step={1} onChange={v => updateOpt('width', v)} />
            <AnimatedSlider label="Scale" value={opts.contentScale} min={0.5} max={4} step={0.1} onChange={v => updateOpt('contentScale', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Time" value={opts.duration} min={1} max={10} step={1} onChange={v => updateOpt('duration', v)} format={v => `${v}s`} />
            <AnimatedSlider label="FPS" value={opts.fps} min={5} max={30} step={5} onChange={v => updateOpt('fps', v)} />
            <AnimatedSlider label="Focus" value={opts.outputScale} min={0.25} max={4} step={0.25} onChange={v => updateOpt('outputScale', v)} format={v => v.toFixed(2)} />
            <CharSetPicker value={opts.charset} onChange={v => updateOpt('charset', v)} />
          </ControlSection>
          <ControlSection label="Tone">
            <AnimatedSlider label="Bright" value={opts.brightness} min={-100} max={100} step={1} onChange={v => updateOpt('brightness', v)} />
            <AnimatedSlider label="Contr." value={opts.contrast} min={0} max={3} step={0.05} onChange={v => updateOpt('contrast', v)} format={v => v.toFixed(2)} />
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
              <AnimatedSlider label="Square" value={opts.waveSquareness} min={0} max={1} step={0.05} onChange={v => updateOpt('waveSquareness', v)} format={v => v.toFixed(2)} />
              <AnimatedSlider label="Gap" value={opts.waveGap} min={0.04} max={0.3} step={0.01} onChange={v => updateOpt('waveGap', v)} format={v => v.toFixed(2)} />
              <AnimatedSlider label="Amp." value={opts.waveAmplitude} min={0} max={50} step={1} onChange={v => updateOpt('waveAmplitude', v)} format={v => v.toString()} />
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
                  <AnimatedSlider label="Weight" value={opts.waveLineThickness} min={1} max={10} step={1} onChange={v => updateOpt('waveLineThickness', v)} format={v => v.toString()} />
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
              <GlowButton onClick={doGenerate} disabled={!fileLoaded || generating}
                radius={0} textColor="var(--color-text-secondary)" lineColor="#ffffff" intensity={1.5}
                style={{
                  width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 500,
                  border: '1px dashed var(--color-border-visible)',
                  background: 'transparent',
                }}>
                {generating ? `Generating ${progress || '...'}` : autoUpdate ? 'Auto (live)' : fileLoaded ? 'Generate GIF' : 'Upload first'}
              </GlowButton>
              <label style={{ color: 'var(--color-text-secondary)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                <input type="checkbox" checked={autoUpdate} onChange={e => setAutoUpdate(e.target.checked)} /> Auto-update
              </label>
              {gifDownloadUrl && (
                <GlowButton onClick={() => { const a = document.createElement('a'); a.href = gifDownloadUrl; a.download = gifDownloadName; a.click() }}
                  radius={0} textColor="var(--color-text-secondary)"
                  style={{ width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 500, border: '1px dashed var(--color-border-visible)', background: 'transparent' }}>
                  {gifDone && gifUrl ? 'Download GIF' : 'Download Preview'}
                </GlowButton>
              )}
            </div>
          </ControlSection>
          <ControlSection label="Color" defaultOpen={false}>
            <div style={{ display: 'flex', gap: 6 }}>
              {colorModes.map(m => (
                <GlowButton key={m} onClick={() => updateOpt('colorMode', m)} active={opts.colorMode === m}
                  radius={0} textColor="var(--color-text-secondary)" style={{ padding: '4px 8px', fontSize: 11, fontWeight: 500 }}>
                  {m}
                </GlowButton>
              ))}
            </div>
          </ControlSection>
        </>
      )}

      {mode === 'static' && (
        <>
          <ControlSection label="Sampling">
            <AnimatedSlider label="Res." value={opts.width} min={10} max={220} step={1} onChange={v => updateOpt('width', v)} />
            <AnimatedSlider label="Scale" value={opts.contentScale} min={0.5} max={4} step={0.1} onChange={v => updateOpt('contentScale', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Pixel" value={opts.pixelate} min={0} max={10} step={1} onChange={v => updateOpt('pixelate', v)} />
            <AnimatedSlider label="Focus" value={opts.outputScale} min={0.25} max={4} step={0.25} onChange={v => updateOpt('outputScale', v)} format={v => v.toFixed(2)} />
            <CharSetPicker value={opts.charset} onChange={v => updateOpt('charset', v)} />
          </ControlSection>
          <ControlSection label="Tone">
            <AnimatedSlider label="Bright" value={opts.brightness} min={-100} max={100} step={1} onChange={v => updateOpt('brightness', v)} />
            <AnimatedSlider label="Contr." value={opts.contrast} min={0} max={3} step={0.05} onChange={v => updateOpt('contrast', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Gamma" value={opts.gamma} min={0.2} max={3} step={0.05} onChange={v => updateOpt('gamma', v)} format={v => v.toFixed(2)} />
          </ControlSection>
          <ControlSection label="Color" defaultOpen={false}>
            <div style={{ display: 'flex', gap: 6 }}>
              {colorModes.map(m => (
                <GlowButton key={m} onClick={() => updateOpt('colorMode', m)} active={opts.colorMode === m}
                  radius={0} textColor="var(--color-text-secondary)" style={{ padding: '4px 8px', fontSize: 11, fontWeight: 500 }}>
                  {m}
                </GlowButton>
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
            <AnimatedSlider label="Shadows" value={opts.cutDarks} min={0} max={0.5} step={0.01} onChange={v => updateOpt('cutDarks', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Lights" value={opts.cutLights} min={0} max={0.5} step={0.01} onChange={v => updateOpt('cutLights', v)} format={v => v.toFixed(2)} />
            <label style={{ color: 'var(--color-text-secondary)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0' }}>
              <input type="checkbox" checked={opts.invert} onChange={e => updateOpt('invert', e.target.checked)} /> Invert
            </label>
          </ControlSection>
          <ControlSection label="Export" defaultOpen={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {['txt', 'html', 'svg', 'json', 'png'].map(f => (
                  <GlowButton key={f} onClick={() => handleStaticExport(f)}
                    radius={0} textColor="var(--color-text-secondary)"
                    style={{ padding: '5px 0', minWidth: 40, fontSize: 10, fontWeight: 500, border: '1px solid var(--color-accent)', background: 'transparent', boxShadow: 'none' }}>
                    .{f}
                  </GlowButton>
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
    <StudioShell
      mode={mode}
      onModeChange={setMode}
      leftSidebar={leftSidebar}
      rightSidebar={rightSidebar}
      leftOpen={leftOpen}
      rightOpen={rightOpen}
      onToggleLeft={() => setLeftOpen(o => !o)}
      onToggleRight={() => setRightOpen(o => !o)}
    >
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
                  spinSpeed={spinSpeed}
                  onGrid={handle3dGrid}
                  onGridCapture={handleGridCapture}
                />
              )}
              {mode === 'gif' && (
                <GifAsciiPage
                  opts={opts}
                  updateOpt={updateOpt}
                  previewUrl={previewUrl}
                  gifUrl={gifUrl}
                  gifDone={gifDone}
                  onFile={handleFile}
                />
              )}
              {mode === 'static' && (
                <StaticAsciiPage
                  grid={staticGrid}
                  opts={opts}
                  sourceImageData={sourceImageData}
                  onFile={handleFile}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </StudioShell>
  )
}
