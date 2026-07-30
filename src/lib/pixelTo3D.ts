import * as THREE from 'three'

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
      geos.push(ni)
    }
  }

  if (geos.length === 0) return null

  const totalVerts = geos.reduce((sum, g) => sum + (g.getAttribute('position')?.count ?? 0), 0)
  if (totalVerts === 0) return null

  const positions = new Float32Array(totalVerts * 3)
  const normals = new Float32Array(totalVerts * 3)
  let offset = 0

  for (const geo of geos) {
    const pos = geo.getAttribute('position')
    const nor = geo.getAttribute('normal')
    if (!pos || !nor) continue
    positions.set(pos.array as Float32Array, offset * 3)
    normals.set(nor.array as Float32Array, offset * 3)
    offset += pos.count
  }

  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  return merged
}
