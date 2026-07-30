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

export default function AsciiPreview({ ascii, grid, fontSize = 8, lineHeight = 1.05, bgColor = '#0d0d1a', bgTransparent = false, sourceImageData, outputScale = 1 }: Props) {
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
        borderRadius: 8,
        padding: 16,
        overflow: 'auto',
        height: '60vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <canvas ref={canvasRef} width={w} height={h} style={{ maxWidth: '100%', maxHeight: '100%', imageRendering: 'pixelated' }} />
      </div>
    )
  }

  const ls = fontSize * outputScale * 0.7 * (lineHeight - 1)
  return (
    <div style={{
      background: '#0d0d1a',
      borderRadius: 8,
      padding: 16,
      overflow: 'auto',
      height: '60vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <pre style={{
        margin: 0,
        fontSize: fontSize * outputScale,
        lineHeight,
        fontFamily: "'Courier New', 'Consolas', monospace",
        color: '#f0e6d0',
        letterSpacing: `${ls}px`,
        wordBreak: 'keep-all',
      }}>
        {ascii}
      </pre>
    </div>
  )
}
