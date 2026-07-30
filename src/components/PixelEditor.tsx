import { useRef, useCallback, useEffect } from 'react'

interface Props {
  grid: boolean[][]
  onChange: (grid: boolean[][]) => void
  visible: boolean
}

const CELL = 24

function createEmptyGrid(size: number): boolean[][] {
  return Array.from({ length: size }, () => Array(size).fill(false))
}

export default function PixelEditor({ grid, onChange, visible }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)

  useEffect(() => {
    if (grid.length === 0 || grid[0].length === 0) {
      onChange(createEmptyGrid(16))
      return
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
        ctx.fillStyle = grid[r][c] ? '#4f46e5' : '#1a1a2e'
        ctx.fillRect(c * CELL, r * CELL, CELL, CELL)
        ctx.strokeStyle = '#333'
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
    const col = Math.floor(x / CELL)
    const row = Math.floor(y / CELL)
    if (col < 0 || col >= grid[0].length || row < 0 || row >= grid.length) return null
    return { row, col }
  }, [grid])

  const setCell = useCallback((row: number, col: number, val: boolean) => {
    const newGrid = grid.map(r => [...r])
    newGrid[row][col] = val
    onChange(newGrid)
  }, [grid, onChange])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    drawingRef.current = true
    const cell = getCell(e.clientX, e.clientY)
    if (cell) {
      const cur = grid[cell.row][cell.col]
      setCell(cell.row, cell.col, !cur)
    }
  }, [getCell, grid, setCell])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!drawingRef.current) return
    const cell = getCell(e.clientX, e.clientY)
    if (cell && !grid[cell.row][cell.col]) {
      setCell(cell.row, cell.col, true)
    }
  }, [getCell, grid, setCell])

  const handlePointerUp = useCallback(() => { drawingRef.current = false }, [])

  const clear = useCallback(() => {
    if (grid.length > 0) {
      onChange(createEmptyGrid(grid.length))
    }
  }, [grid, onChange])

  if (!visible) return null

  const rows = grid.length || 16
  const cols = grid[0]?.length || 16

  return (
    <div style={{
      background: '#0d0d1a',
      borderRadius: 8,
      padding: 16,
      margin: '12px 0',
      border: '1px solid #333',
      userSelect: 'none',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: '#999', fontSize: 13, fontWeight: 600 }}>Pixel Art</span>
        <button onClick={clear} style={smallBtn}>Clear</button>
        <span style={{ color: '#666', fontSize: 11 }}>{cols}&times;{rows}</span>
      </div>
      <canvas
        ref={canvasRef}
        style={{
          border: '1px solid #444',
          borderRadius: 4,
          cursor: 'crosshair',
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

const smallBtn: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 6,
  border: '1px solid #333',
  background: '#1a1a2e',
  color: '#999',
  cursor: 'pointer',
  fontSize: 11,
}
