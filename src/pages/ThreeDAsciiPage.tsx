import { useState, useCallback, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { Link } from 'react-router-dom'
import FileUpload from '../components/FileUpload'
import CharSetPicker from '../components/CharSetPicker'
import AnimationModePicker from '../components/AnimationModePicker'
import ExportPanel from '../components/ExportPanel'
import ThreeDViewer from '../components/ThreeDViewer'
import PixelEditor from '../components/PixelEditor'
import PresetPicker from '../components/PresetPicker'
import FilterPanel from '../components/FilterPanel'
import { extrudeSvg, extractPointCloud } from '../lib/svgTo3D'
import { pixelGridToGeometry } from '../lib/pixelTo3D'
import { generateTerminalScript } from '../lib/terminalExporter'
import { DEFAULT_ASCII_OPTIONS } from '../types'
import type { AsciiOptions, ExportedPoint, AnimationMode, ColorMode } from '../types'

function makeDefaultGeometry(): THREE.BufferGeometry {
  const geo = new THREE.TorusGeometry(1.5, 0.6, 30, 60)
  geo.computeVertexNormals()
  return geo
}

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
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ width: 80, accentColor: '#4f46e5' }}
      />
      <span style={{ color: '#999', fontSize: 11, minWidth: 36, textAlign: 'right' }}>{format ? format(value) : value}</span>
    </div>
  )
}

function Stepper({ value, set, min, max, step }: {
  value: number; set: (v: number) => void; min: number; max: number; step: number
}) {
  const ref = useRef(value)
  ref.current = value
  const up = () => set(Math.min(max, +(value + step).toFixed(2)))
  const down = () => set(Math.max(min, +(value - step).toFixed(2)))
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const cur = ref.current
    set(Math.max(min, Math.min(max, +(cur + (e.deltaY > 0 ? -step : step)).toFixed(2))))
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} onWheel={onWheel}>
      <span style={{ color: '#999', fontSize: 11, minWidth: 32, textAlign: 'right' }}>{value}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <button onClick={up} style={stepperBtnStyle}>&#9650;</button>
        <button onClick={down} style={stepperBtnStyle}>&#9660;</button>
      </div>
    </div>
  )
}

const stepperBtnStyle: React.CSSProperties = {
  padding: 0, width: 16, height: 10, fontSize: 8, lineHeight: '8px',
  border: '1px solid #444', background: '#1a1a2e', color: '#999',
  cursor: 'pointer', borderRadius: 2,
}

const colorModes: ColorMode[] = ['mono', 'multi', 'original']

export default function ThreeDAsciiPage() {
  const [opts, setOpts] = useState<AsciiOptions>({ ...DEFAULT_ASCII_OPTIONS })
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)
  const [pointCloud, setPointCloud] = useState<ExportedPoint[] | null>(null)
  const [ascii, setAscii] = useState('')
  const [depthRatio, setDepthRatio] = useState(0.35)
  const [spinSpeed, setSpinSpeed] = useState(1.0)
  const [fileLoaded, setFileLoaded] = useState(false)
  const [animationMode, setAnimationMode] = useState<AnimationMode>('spin')
  const [terminalScript, setTerminalScript] = useState('')
  const [showPixelArt, setShowPixelArt] = useState(false)
  const [pixelGrid, setPixelGrid] = useState<boolean[][]>([])
  const asciiRef = useRef('')
  const frameCount = useRef(0)
  const pixelDebounceRef = useRef(0)
  const loadedRef = useRef(false)
  const svgRef = useRef('')
  const showPixelArtRef = useRef(false)
  const pixelGridRef = useRef<boolean[][]>([])

  const updateOpt = <K extends keyof AsciiOptions>(key: K, val: AsciiOptions[K]) =>
    setOpts(prev => ({ ...prev, [key]: val }))

  const loadGeometry = useCallback((geo: THREE.BufferGeometry) => {
    setGeometry(geo)
    const cloud = extractPointCloud(geo, 4000)
    setPointCloud(cloud)
  }, [])

  const buildFromSvg = useCallback((svg: string, depth: number) => {
    const geo = extrudeSvg(svg, 4, depth)
    if (geo) loadGeometry(geo)
  }, [loadGeometry])

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    const geo = makeDefaultGeometry()
    loadGeometry(geo)
  }, [loadGeometry])

  const handleFile = useCallback(async (_file: File, dataUrl: string) => {
    setShowPixelArt(false)
    showPixelArtRef.current = false
    setFileLoaded(true)
    const svg = await fetch(dataUrl).then(r => r.text())
    svgRef.current = svg
    buildFromSvg(svg, depthRatio)
  }, [buildFromSvg, depthRatio])

  const handleDepthChange = useCallback((d: number) => {
    setDepthRatio(d)
    if (showPixelArtRef.current && pixelGridRef.current.length > 0) {
      const geo = pixelGridToGeometry(pixelGridRef.current, 4, d)
      if (geo) loadGeometry(geo)
    } else if (svgRef.current) {
      buildFromSvg(svgRef.current, d)
    }
  }, [buildFromSvg, loadGeometry])

  const handlePixelGridChange = useCallback((grid: boolean[][]) => {
    setPixelGrid(grid)
    pixelGridRef.current = grid
    clearTimeout(pixelDebounceRef.current)
    pixelDebounceRef.current = window.setTimeout(() => {
      const geo = pixelGridToGeometry(grid, 4, depthRatio)
      if (geo) loadGeometry(geo)
    }, 150)
  }, [loadGeometry, depthRatio])

  const handleTogglePixelArt = useCallback(() => {
    const next = !showPixelArt
    if (next) setFileLoaded(false)
    showPixelArtRef.current = next
    setShowPixelArt(next)
    if (next && pixelGrid.length === 0) {
      const size = 16
      const empty = Array.from({ length: size }, () => Array(size).fill(false))
      setPixelGrid(empty)
      pixelGridRef.current = empty
    }
    if (!next && geometry === null) {
      const geo = makeDefaultGeometry()
      loadGeometry(geo)
    }
  }, [showPixelArt, pixelGrid, geometry, loadGeometry])

  const handleFrame = useCallback((a: string) => {
    asciiRef.current = a
    frameCount.current++
    if (frameCount.current % 5 === 0) {
      setAscii(a)
    }
  }, [])

  const handleExportTxt = useCallback(() => {
    const blob = new Blob([asciiRef.current], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ascii-frame.txt'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleExportTerminal = useCallback(() => {
    if (!pointCloud) return
    const script = generateTerminalScript(pointCloud, opts.width)
    setTerminalScript(script)
    const blob = new Blob([script], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'logo.js'
    a.click()
    URL.revokeObjectURL(url)
  }, [pointCloud, opts.width])

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/" style={{ color: '#4f46e5', fontSize: 13, textDecoration: 'none' }}>&larr; Back</Link>
        <h1 style={{ fontSize: 24, margin: '0.5rem 0 0' }}>SVG &rarr; 3D ASCII</h1>
      </div>

      <FileUpload accept=".svg,image/svg+xml" onFile={handleFile} hasFile={fileLoaded} />

      <div style={{ margin: '8px 0' }}>
        <button onClick={handleTogglePixelArt}
          style={{
            padding: '8px 16px', borderRadius: 8,
            border: `1px solid ${showPixelArt ? '#4f46e5' : '#333'}`,
            background: showPixelArt ? 'rgba(79,70,229,0.2)' : 'transparent',
            color: showPixelArt ? '#fff' : '#999', cursor: 'pointer', fontSize: 13,
          }}
        >
          {showPixelArt ? 'Close Pixel Art' : 'Draw Pixel Art'}
        </button>
      </div>

      <PixelEditor grid={pixelGrid} onChange={handlePixelGridChange} visible={showPixelArt} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '16px 0' }}>
        {/* Row 1: Charset + Animation + Resolution + Depth + Speed + Invert + Color + Multicolor */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <CharSetPicker value={opts.charset} onChange={v => updateOpt('charset', v)} />
          <AnimationModePicker value={animationMode} onChange={setAnimationMode} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ color: '#999', fontSize: 11 }}>W:</label>
            <input type="range" min={20} max={160} value={opts.width}
              onChange={e => updateOpt('width', +e.target.value)}
              style={{ width: 80, accentColor: '#4f46e5' }} />
            <Stepper value={opts.width} set={(v: number) => updateOpt('width', v)} min={20} max={160} step={1} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ color: '#999', fontSize: 11 }}>Depth:</label>
            <input type="range" min={5} max={100} value={Math.round(depthRatio * 100)}
              onChange={e => handleDepthChange(+e.target.value / 100)}
              style={{ width: 60, accentColor: '#4f46e5' }} />
            <Stepper value={depthRatio} set={(v: number) => handleDepthChange(v)} min={0.05} max={1} step={0.01} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ color: '#999', fontSize: 11 }}>Speed:</label>
            <input type="range" min={1} max={50} value={Math.round(spinSpeed * 10)}
              onChange={e => setSpinSpeed(+e.target.value / 10)}
              style={{ width: 60, accentColor: '#4f46e5' }} />
            <Stepper value={spinSpeed} set={setSpinSpeed} min={0.1} max={5} step={0.1} />
          </div>

          <label style={{ color: '#999', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
            <input type="checkbox" checked={opts.invert} onChange={e => updateOpt('invert', e.target.checked)} /> Invert
          </label>

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


        </div>

        {/* Row 1b: Presets */}
        <div>
          <PresetPicker value={opts.presets} strength={opts.presetStrength} onChange={v => updateOpt('presets', v)}
            onStrengthChange={(id, val) => setOpts(prev => ({ ...prev, presetStrength: { ...prev.presetStrength, [id]: val } }))} />
        </div>

        {/* Row 1c: Individual filters */}
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

        {/* Row 4: Density + Cut Darks + Cut Lights */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Slider label="Density" value={opts.densityBias} min={0.2} max={3.0} step={0.05} onChange={v => updateOpt('densityBias', v)} format={v => v.toFixed(2)} />
          <Slider label="Cut Darks" value={opts.cutDarks} min={0} max={0.5} step={0.01} onChange={v => updateOpt('cutDarks', v)} format={v => v.toFixed(2)} />
          <Slider label="Cut Lights" value={opts.cutLights} min={0} max={0.5} step={0.01} onChange={v => updateOpt('cutLights', v)} format={v => v.toFixed(2)} />
        </div>

        {/* Row 5: FG + BG Colors */}
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
      </div>

      {geometry && (
        <ThreeDViewer
          geometry={geometry}
          asciiOptions={opts}
          animationMode={animationMode}
          spinSpeed={spinSpeed}
          onFrame={handleFrame}
        />
      )}

      {ascii && (
        <ExportPanel
          ascii={ascii}
          onExportTxt={handleExportTxt}
          terminalScript={terminalScript}
          onExportTerminal={handleExportTerminal}
        />
      )}
    </div>
  )
}
