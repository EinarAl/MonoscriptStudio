import { useCallback, useRef, useState } from 'react'
import type { AsciiOptions } from '../types'

interface Props {
  opts: AsciiOptions
  updateOpt: <K extends keyof AsciiOptions>(key: K, val: AsciiOptions[K]) => void
  previewUrl: string
  gifUrl: string
  gifDone: boolean
}

export default function GifAsciiPage({ opts, updateOpt, previewUrl, gifUrl, gifDone }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const src = gifDone && gifUrl ? gifUrl : previewUrl

  const originFromPointer = useCallback((e: React.PointerEvent) => {
    const el = gridRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    updateOpt('waveOriginX', Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
    updateOpt('waveOriginY', Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)))
  }, [updateOpt])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (opts.gifAnim !== 'radioWaves') return
    draggingRef.current = true
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    originFromPointer(e)
  }, [opts.gifAnim, originFromPointer])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return
    originFromPointer(e)
  }, [originFromPointer])

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false
    setIsDragging(false)
  }, [])

  if (!src) {
    return (
      <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>
        Upload an image in the sidebar to start
      </div>
    )
  }

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#000000',
    }}>
      <div ref={gridRef} style={{
        display: 'inline-grid', position: 'relative',
        maxWidth: '100%', maxHeight: '100%',
      }}>
        <img src={src} alt="ASCII preview"
          style={{ gridArea: '1/1', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
          draggable={false} />
        {opts.gifAnim === 'radioWaves' && (
          <div
            style={{ gridArea: '1/1', touchAction: 'none', cursor: isDragging ? 'grabbing' : 'default', position: 'relative' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <div style={{
              position: 'absolute',
              left: `calc(${opts.waveOriginX * 100}% - 10px)`,
              top: `calc(${opts.waveOriginY * 100}% - 10px)`,
              width: 20, height: 20, pointerEvents: 'none',
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20">
                <line x1="10" y1="2" x2="10" y2="18" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="2" y1="10" x2="18" y2="10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="10" cy="10" r="2" fill="#fff" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
