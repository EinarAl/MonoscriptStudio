import { useRef, useCallback, useEffect, useState } from 'react'

interface Props {
  grid: string[][]
  onChange: (grid: string[][]) => void
  visible: boolean
}

const CELL = 24
const SIZE = 16

type Tool = 'draw' | 'erase' | 'eyedrop'

function createEmptyGrid(): string[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(''))
}

export default function PixelEditor({ grid, onChange, visible }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const [tool, setTool] = useState<Tool>('draw')
  const [color, setColor] = useState('#ffffff')

  useEffect(() => {
    if (grid.length === 0 || grid[0].length === 0) {
      onChange(createEmptyGrid())
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || grid.length === 0) return
    const ctx = canvas.getContext('2d')!
    const rows = grid.length
    const cols = grid[0].length
    const w = cols * CELL
    const h = rows * CELL
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }

    ctx.clearRect(0, 0, w, h)

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = grid[r][c]
        ctx.fillStyle = val || '#141414'
        ctx.fillRect(c * CELL, r * CELL, CELL, CELL)
        ctx.strokeStyle = '#222'
        ctx.lineWidth = 1
        ctx.strokeRect(c * CELL, r * CELL, CELL, CELL)
      }
    }
  }, [grid])

  const getCell = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas || grid.length === 0) return null
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const scaleX = rect.width / (grid[0].length * CELL)
    const scaleY = rect.height / (grid.length * CELL)
    const col = Math.floor(x / (CELL * scaleX))
    const row = Math.floor(y / (CELL * scaleY))
    if (col < 0 || col >= grid[0].length || row < 0 || row >= grid.length) return null
    return { row, col }
  }, [grid])

  const setCell = useCallback((row: number, col: number, val: string) => {
    const newGrid = grid.map(r => [...r])
    newGrid[row][col] = val
    onChange(newGrid)
  }, [grid, onChange])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const cell = getCell(e.clientX, e.clientY)
    if (!cell) return

    if (tool === 'eyedrop') {
      const cur = grid[cell.row][cell.col]
      if (cur) {
        setColor(cur)
        setTool('draw')
      }
      return
    }

    drawingRef.current = true
    const cur = grid[cell.row][cell.col]
    if (tool === 'draw' && !cur) {
      setCell(cell.row, cell.col, color)
    } else if (tool === 'erase' && cur) {
      setCell(cell.row, cell.col, '')
    }
  }, [getCell, grid, setCell, tool, color])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!drawingRef.current) return
    const cell = getCell(e.clientX, e.clientY)
    if (!cell) return
    const cur = grid[cell.row][cell.col]
    if (tool === 'draw' && !cur) {
      setCell(cell.row, cell.col, color)
    } else if (tool === 'erase' && cur) {
      setCell(cell.row, cell.col, '')
    }
  }, [getCell, grid, setCell, tool, color])

  const handlePointerUp = useCallback(() => { drawingRef.current = false }, [])

  const clear = useCallback(() => {
    if (grid.length > 0) {
      onChange(createEmptyGrid())
    }
  }, [grid, onChange])

  if (!visible) return null

  const rows = grid.length || SIZE
  const cols = grid[0]?.length || SIZE

  const toolBtn = (t: Tool, label: string) => (
    <button onClick={() => setTool(t)}
      style={{
        padding: '3px 8px', borderRadius: 4, fontSize: 10,
        border: `1px solid ${tool === t ? 'var(--color-accent)' : 'var(--color-border-visible)'}`,
        background: tool === t ? 'rgba(255,255,255,0.1)' : 'transparent',
        color: tool === t ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        cursor: 'pointer',
      }}>{label}</button>
  )

  return (
    <div style={{
      background: 'var(--color-surface-raised)',
      borderRadius: 6,
      padding: 10,
      border: '1px solid var(--color-border-visible)',
      userSelect: 'none',
    }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
        {toolBtn('draw', 'Draw')}
        {toolBtn('erase', 'Erase')}
        {toolBtn('eyedrop', 'Pick')}
        <button onClick={clear} style={{
          padding: '3px 8px', borderRadius: 4, fontSize: 10,
          border: '1px solid var(--color-border-visible)',
          background: 'transparent',
          color: 'var(--color-text-tertiary)', cursor: 'pointer',
        }}>Clear</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto' }}>
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            style={{ width: 22, height: 22, padding: 0, border: '1px solid var(--color-border-visible)', cursor: 'pointer', background: 'transparent', borderRadius: 3 }} />
          <input type="text" value={color} onChange={e => setColor(e.target.value)}
            style={{ width: 60, background: 'var(--color-surface-base)', border: '1px solid var(--color-border-visible)', borderRadius: 3, padding: '2px 4px', fontSize: 10, color: 'var(--color-text-secondary)', outline: 'none' }} />
        </div>
      </div>
      <span style={{ color: 'var(--color-text-tertiary)', fontSize: 10, display: 'block', marginBottom: 4 }}>{cols}&times;{rows}</span>
      <canvas
        ref={canvasRef}
        style={{
          border: '1px solid var(--color-border-visible)',
          borderRadius: 4,
          cursor: tool === 'eyedrop' ? 'copy' : tool === 'erase' ? 'not-allowed' : 'crosshair',
          imageRendering: 'pixelated',
          maxWidth: '100%',
          display: 'block',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  )
}
