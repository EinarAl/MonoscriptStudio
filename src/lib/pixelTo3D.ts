import * as THREE from 'three'

function parseColor(hex: string): number | null {
  const m = hex.trim().replace(/^#/, '').match(/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (!m) return null
  const v = m[1]
  const full = v.length === 3 ? v.split('').map(ch => ch + ch).join('') : v
  return parseInt(full, 16)
}

export function pixelGridToGeometry(
  grid: string[][],
  maxSize = 4,
  depthRatio = 0.35
): THREE.BufferGeometry | null {
  const rows = grid.length
  if (rows === 0) return null
  const cols = grid[0].length
  if (cols === 0) return null

  const cellSize = maxSize / Math.max(rows, cols)
  const depth = maxSize * depthRatio

  const geos: THREE.BufferGeometry[] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c]) continue
      const cx = (c - (cols - 1) / 2) * cellSize
      const cy = ((rows - 1) / 2 - r) * cellSize
      const h = cellSize / 2

      const shape = new THREE.Shape()
      shape.moveTo(cx - h, cy - h)
      shape.lineTo(cx + h, cy - h)
      shape.lineTo(cx + h, cy + h)
      shape.lineTo(cx - h, cy + h)
      shape.closePath()

      const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })
      geo.computeVertexNormals()
      const ni = geo.toNonIndexed()

      const colorHex = parseColor(grid[r][c])
      if (colorHex != null) {
        const pos = ni.getAttribute('position')
        const count = pos ? pos.count : 0
        const c3 = new THREE.Color(colorHex)
        const col = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
          col[i * 3] = c3.r
          col[i * 3 + 1] = c3.g
          col[i * 3 + 2] = c3.b
        }
        ni.setAttribute('color', new THREE.BufferAttribute(col, 3))
      }
      geos.push(ni)
    }
  }

  if (geos.length === 0) return null

  const totalVerts = geos.reduce((sum, g) => sum + (g.getAttribute('position')?.count ?? 0), 0)
  if (totalVerts === 0) return null

  const positions = new Float32Array(totalVerts * 3)
  const normals = new Float32Array(totalVerts * 3)
  const colors = new Float32Array(totalVerts * 3)
  colors.fill(1)
  let offset = 0

  for (const geo of geos) {
    const pos = geo.getAttribute('position')
    const nor = geo.getAttribute('normal')
    if (!pos || !nor) continue
    positions.set(pos.array as Float32Array, offset * 3)
    normals.set(nor.array as Float32Array, offset * 3)
    const col = geo.getAttribute('color')
    if (col) {
      colors.set(col.array as Float32Array, offset * 3)
    }
    offset += pos.count
  }

  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return merged
}
