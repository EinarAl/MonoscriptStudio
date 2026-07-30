import { useState, useCallback, useRef } from 'react'
import * as THREE from 'three'
import { AnimatePresence, motion } from 'framer-motion'
import StudioShell from '../components/StudioShell'
import ControlSection from '../components/ControlSection'
import AnimatedSlider from '../components/AnimatedSlider'
import ThreeDViewer from '../components/ThreeDViewer'
import CharSetPicker from '../components/CharSetPicker'
import PresetPicker from '../components/PresetPicker'
import FilterPanel from '../components/FilterPanel'
import FileUpload from '../components/FileUpload'
import { DEFAULT_ASCII_OPTIONS } from '../types'
import type { AsciiOptions, ColorMode } from '../types'

type Mode = '3d' | 'gif' | 'static'

function makeDefaultGeometry(): THREE.BufferGeometry {
  const geo = new THREE.TorusGeometry(1.5, 0.6, 30, 60)
  geo.computeVertexNormals()
  return geo
}

export default function StudioPage() {
  const [mode, setMode] = useState<Mode>('3d')
  const [opts, setOpts] = useState<AsciiOptions>({ ...DEFAULT_ASCII_OPTIONS })
  const [geometry] = useState<THREE.BufferGeometry>(() => makeDefaultGeometry())
  const [animationMode] = useState<'spin' | 'tilt' | 'drag'>('tilt')
  const [fileLoaded, setFileLoaded] = useState(false)
  const imageDataRef = useRef<ImageData | null>(null)

  const updateOpt = <K extends keyof AsciiOptions>(key: K, val: AsciiOptions[K]) =>
    setOpts(prev => ({ ...prev, [key]: val }))

  const handleFile = useCallback((_file: File, dataUrl: string) => {
    const img = new Image()
    img.src = dataUrl
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      const fullImageData = ctx.getImageData(0, 0, img.width, img.height)
      imageDataRef.current = fullImageData
      setFileLoaded(true)
    }
  }, [])

  const colorModes: ColorMode[] = ['mono', 'multi', 'original']

  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <FileUpload accept="image/png,image/jpeg,image/svg+xml" onFile={handleFile} hasFile={fileLoaded} compact />
      </div>

      {mode === '3d' && (
        <>
          <ControlSection label="Sampling">
            <AnimatedSlider label="Width" value={opts.width} min={10} max={160} step={1} onChange={v => updateOpt('width', v)} />
            <AnimatedSlider label="Scale" value={opts.outputScale} min={0.25} max={4} step={0.25} onChange={v => updateOpt('outputScale', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Height" value={opts.heightScale} min={0.2} max={2} step={0.05} onChange={v => updateOpt('heightScale', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Density" value={opts.densityBias} min={0.2} max={3} step={0.05} onChange={v => updateOpt('densityBias', v)} format={v => v.toFixed(2)} />
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
          <ControlSection label="Filters" defaultOpen={false}>
            <FilterPanel
              activeFilters={opts.activeFilters}
              filterParams={opts.filterParams}
              onChange={v => updateOpt('activeFilters', v)}
              onParamChange={(fid, key, val) => setOpts(prev => ({
                ...prev, filterParams: { ...prev.filterParams, [fid]: { ...prev.filterParams[fid], [key]: val } },
              }))}
            />
          </ControlSection>
          <ControlSection label="Presets" defaultOpen={false}>
            <PresetPicker value={opts.presets} strength={opts.presetStrength} onChange={v => updateOpt('presets', v)}
              onStrengthChange={(id, val) => setOpts(prev => ({ ...prev, presetStrength: { ...prev.presetStrength, [id]: val } }))} />
          </ControlSection>
        </>
      )}

      {mode === 'gif' && (
        <>
          <ControlSection label="Sampling">
            <AnimatedSlider label="Width" value={opts.width} min={10} max={160} step={1} onChange={v => updateOpt('width', v)} />
            <AnimatedSlider label="Scale" value={opts.outputScale} min={0.25} max={4} step={0.25} onChange={v => updateOpt('outputScale', v)} format={v => v.toFixed(2)} />
            <AnimatedSlider label="Duration" value={2} min={1} max={10} step={1} onChange={() => {}} format={v => `${v}s`} />
            <CharSetPicker value={opts.charset} onChange={v => updateOpt('charset', v)} />
          </ControlSection>
          <ControlSection label="Tone">
            <AnimatedSlider label="Bright" value={opts.brightness} min={-100} max={100} step={1} onChange={v => updateOpt('brightness', v)} />
            <AnimatedSlider label="Contrast" value={opts.contrast} min={0} max={3} step={0.05} onChange={v => updateOpt('contrast', v)} format={v => v.toFixed(2)} />
          </ControlSection>
          <ControlSection label="Presets" defaultOpen={false}>
            <PresetPicker value={opts.presets} strength={opts.presetStrength} onChange={v => updateOpt('presets', v)}
              onStrengthChange={(id, val) => setOpts(prev => ({ ...prev, presetStrength: { ...prev.presetStrength, [id]: val } }))} />
          </ControlSection>
        </>
      )}

      {mode === 'static' && (
        <>
          <ControlSection label="Sampling">
            <AnimatedSlider label="Width" value={opts.width} min={10} max={160} step={1} onChange={v => updateOpt('width', v)} />
            <AnimatedSlider label="Scale" value={opts.outputScale} min={0.25} max={4} step={0.25} onChange={v => updateOpt('outputScale', v)} format={v => v.toFixed(2)} />
            <CharSetPicker value={opts.charset} onChange={v => updateOpt('charset', v)} />
          </ControlSection>
          <ControlSection label="Tone">
            <AnimatedSlider label="Bright" value={opts.brightness} min={-100} max={100} step={1} onChange={v => updateOpt('brightness', v)} />
            <AnimatedSlider label="Contrast" value={opts.contrast} min={0} max={3} step={0.05} onChange={v => updateOpt('contrast', v)} format={v => v.toFixed(2)} />
          </ControlSection>
        </>
      )}
    </div>
  )

  return (
    <StudioShell mode={mode} onModeChange={setMode} sidebar={sidebar}>
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
            />
          )}
          {mode === 'gif' && (
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14, textAlign: 'center' }}>
              <p>Upload an image to start</p>
            </div>
          )}
          {mode === 'static' && (
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14, textAlign: 'center' }}>
              <p>Upload an image to start</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </StudioShell>
  )
}
