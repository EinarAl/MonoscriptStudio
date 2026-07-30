import { useState, useCallback, useEffect, useRef } from 'react'
import FileUpload from '../components/FileUpload'
import AsciiPreview from '../components/AsciiPreview'
import CharSetPicker from '../components/CharSetPicker'
import PresetPicker from '../components/PresetPicker'
import FilterPanel from '../components/FilterPanel'
import { imageToAsciiGrid, gridToPlainText, gridToHtml, gridToSvg, gridToJson, renderGridToCanvas, removeBackground } from '../lib/imageToAscii'
import { DEFAULT_ASCII_OPTIONS } from '../types'
import type { AsciiOptions, AsciiGrid, ColorMode } from '../types'

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

export default function StaticAsciiPage() {
  const [opts, setOpts] = useState<AsciiOptions>({ ...DEFAULT_ASCII_OPTIONS })
  const [removeBg, setRemoveBg] = useState(false)
  const [lineHeight, setLineHeight] = useState(1.0)
  const [fileLoaded, setFileLoaded] = useState(false)
  const [grid, setGrid] = useState<AsciiGrid | null>(null)
  const [exportScale, setExportScale] = useState(2)
  const [imageData, setImageData] = useState<ImageData | null>(null)
  const sourceImageRef = useRef<ImageData | null>(null)

  const updateOpt = <K extends keyof AsciiOptions>(key: K, val: AsciiOptions[K]) =>
    setOpts(prev => ({ ...prev, [key]: val }))

  const process = useCallback(() => {
    if (!imageData) return
    let id = imageData
    if (removeBg) {
      id = removeBackground(id)
    }
    setGrid(imageToAsciiGrid(id, opts))
  }, [opts, removeBg, imageData])

  useEffect(() => { process() }, [process])

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
    setImageData(fullImageData)
    sourceImageRef.current = fullImageData
    setFileLoaded(true)
  }, [])

  const handleExport = useCallback((format: string) => {
    if (!grid) return
    let blob: Blob, filename: string

    switch (format) {
      case 'txt': {
        const text = gridToPlainText(grid)
        blob = new Blob([text], { type: 'text/plain' })
        filename = 'ascii-art.txt'
        break
      }
      case 'html': {
        const html = gridToHtml(grid, opts.bgColor, opts.bgTransparent)
        blob = new Blob([html], { type: 'text/html' })
        filename = 'ascii-art.html'
        break
      }
      case 'svg': {
        const svg = gridToSvg(grid, opts.bgColor, opts.bgTransparent, exportScale)
        blob = new Blob([svg], { type: 'image/svg+xml' })
        filename = 'ascii-art.svg'
        break
      }
      case 'json': {
        const json = gridToJson(grid)
        blob = new Blob([json], { type: 'application/json' })
        filename = 'ascii-art.json'
        break
      }
      case 'png': {
        const srcForExport = opts.overlayImage ? sourceImageRef.current ?? undefined : undefined
        const { canvas } = renderGridToCanvas(grid, opts.bgColor, opts.bgTransparent, 7 * exportScale, 12 * exportScale, undefined, undefined, srcForExport)
        canvas.toBlob(b => {
          if (b) {
            const url = URL.createObjectURL(b)
            const a = document.createElement('a')
            a.href = url
            a.download = 'ascii-art.png'
            a.click()
            URL.revokeObjectURL(url)
          }
        })
        return
      }
      default: return
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [grid, opts.bgColor, opts.bgTransparent, exportScale, opts.overlayImage])

  const colorModes: ColorMode[] = ['mono', 'multi', 'original']

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 24, margin: '0.5rem 0 0' }}>Image &rarr; ASCII</h1>
      </div>

      <FileUpload accept="image/png,image/jpeg,image/svg+xml" onFile={handleFile} hasFile={fileLoaded} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '16px 0' }}>
        {/* Row 1: Charset + Color Mode */}
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
          <Slider label="Width" value={opts.width} min={10} max={220} step={1} onChange={v => updateOpt('width', v)} />
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

        {/* Row 4: Density + Line H + Invert + Remove BG */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Slider label="Density" value={opts.densityBias} min={0.2} max={3.0} step={0.05} onChange={v => updateOpt('densityBias', v)} format={v => v.toFixed(2)} />
          <Slider label="Line H" value={lineHeight} min={0.3} max={1.5} step={0.01} onChange={v => setLineHeight(v)} format={v => v.toFixed(2)} />
          <label style={{ color: '#999', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
            <input type="checkbox" checked={opts.invert} onChange={e => updateOpt('invert', e.target.checked)} /> Invert
          </label>
          <label style={{ color: '#999', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
            <input type="checkbox" checked={removeBg} onChange={e => setRemoveBg(e.target.checked)} /> Remove BG
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
      </div>

      {/* Preview */}
      {grid && (
        <div>
          <div style={{ color: '#666', fontSize: 11, marginBottom: 4 }}>
            {grid.cols}W &times; {grid.rows}H
          </div>
          <AsciiPreview
            grid={grid}
            ascii={gridToPlainText(grid)}
            fontSize={lineHeight > 0.5 ? Math.min(1800 / opts.width, 60) : 8}
            lineHeight={lineHeight}
            bgColor={opts.bgColor}
            bgTransparent={opts.bgTransparent}
            sourceImageData={opts.overlayImage ? sourceImageRef.current ?? undefined : undefined}
            outputScale={opts.outputScale}
          />
        </div>
      )}

      {/* Export */}
      {grid && (
        <div style={{ display: 'flex', gap: 10, padding: '12px 0', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#999', fontSize: 12 }}>Export:</span>
          {['txt', 'html', 'svg', 'json', 'png'].map(f => (
            <button key={f} onClick={() => handleExport(f)}
              style={{
                padding: '6px 14px', borderRadius: 6, border: '1px solid #4f46e5',
                background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}
            >.{f}</button>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
            <label style={{ color: '#999', fontSize: 11 }}>Scale:</label>
            <select value={exportScale} onChange={e => setExportScale(+e.target.value)}
              style={{ background: '#1a1a2e', color: '#f0e6d0', border: '1px solid #444', borderRadius: 4, padding: '2px 6px', fontSize: 11 }}>
              {[1, 2, 3, 4, 5, 6].map(s => <option key={s} value={s}>{s}x</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
