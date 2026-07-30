import { useRef, useEffect } from 'react'
import type { AsciiGrid } from '../types'
import { renderGridToCanvas } from '../lib/imageToAscii'

interface Props {
  ascii?: string
  grid?: AsciiGrid
  fontSize?: number
  lineHeight?: number
  bgColor?: string
  bgTransparent?: boolean
  sourceImageData?: ImageData
  outputScale?: number
}

export default function AsciiPreview({ ascii, grid, fontSize = 8, lineHeight = 1.05, bgColor = '#000000', bgTransparent = false, sourceImageData, outputScale = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cellW = 7 * outputScale
  const cellH = 12 * outputScale

  useEffect(() => {
    if (!grid || !canvasRef.current) return
    renderGridToCanvas(grid, bgColor, bgTransparent, cellW, cellH, canvasRef.current, undefined, sourceImageData)
  }, [grid, bgColor, bgTransparent, sourceImageData, cellW, cellH])

  if (grid) {
    const w = grid.cols * cellW
    const h = grid.rows * cellH
    return (
      <div style={{
        background: bgTransparent ? 'transparent' : bgColor,
        width: '100%', height: '100%',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        overflow: 'auto',
      }}>
        <canvas ref={canvasRef} width={w} height={h}
          style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} />
      </div>
    )
  }

  const ls = fontSize * outputScale * 0.7 * (lineHeight - 1)
  return (
    <div style={{
      background: '#000000', width: '100%', height: '100%',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      overflow: 'auto',
    }}>
      <pre style={{
        margin: 0, fontSize: fontSize * outputScale, lineHeight,
        fontFamily: "'Monocraft', 'Courier New', 'Consolas', monospace",
        color: 'var(--color-text-primary)',
        letterSpacing: `${ls}px`, wordBreak: 'keep-all',
      }}>
        {ascii}
      </pre>
    </div>
  )
}
