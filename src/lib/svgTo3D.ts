import * as THREE from 'three'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'
import type { ExportedPoint } from '../types'

export function extrudeSvg(svgString: string, maxSize = 4, depthRatio = 0.35): THREE.BufferGeometry | null {
  const loader = new SVGLoader()
  const data = loader.parse(svgString)

  const bbox = new THREE.Box2()
  for (const path of data.paths) {
    const style: Record<string, string> = (path.userData as any)?.style ?? {}
    const fill = style.fill
    if (!fill || fill === 'none') continue
    const pathShapes = SVGLoader.createShapes(path)
    for (const shape of pathShapes) {
      for (const pt of shape.getPoints(16)) {
        bbox.expandByPoint(new THREE.Vector2(pt.x, pt.y))
      }
    }
  }

  const sw = Math.max(bbox.max.x - bbox.min.x, 0.01)
  const sh = Math.max(bbox.max.y - bbox.min.y, 0.01)
  const scale = maxSize / Math.max(sw, sh)
  const cx = (bbox.min.x + bbox.max.x) / 2
  const cy = (bbox.min.y + bbox.max.y) / 2
  const depth = maxSize * depthRatio

  const coloredEntries: { geo: THREE.BufferGeometry; color: string }[] = []

  for (const path of data.paths) {
    const style: Record<string, string> = (path.userData as any)?.style ?? {}
    const fill = style.fill
    if (!fill || fill === 'none') continue

    const pathShapes = SVGLoader.createShapes(path)
    for (const shape of pathShapes) {
      const pts = shape.getPoints()
      const ns = new THREE.Shape()
      for (let i = 0; i < pts.length; i++) {
        const sx = (pts[i].x - cx) * scale
        const sy = -(pts[i].y - cy) * scale
        if (i === 0) ns.moveTo(sx, sy)
        else ns.lineTo(sx, sy)
      }

      const geo = new THREE.ExtrudeGeometry(ns, {
        depth,
        bevelEnabled: false,
      })
      geo.computeVertexNormals()

      const nonIndexed = geo.toNonIndexed()
      const pos = nonIndexed.getAttribute('position')
      if (!pos) continue
      const count = pos.count
      const colors = new Float32Array(count * 3)
      const parsed = parseColor(fill)
      for (let i = 0; i < count; i++) {
        colors[i * 3] = parsed.r
        colors[i * 3 + 1] = parsed.g
        colors[i * 3 + 2] = parsed.b
      }
      nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      coloredEntries.push({ geo: nonIndexed, color: fill })
    }
  }

  if (coloredEntries.length === 0) return null

  const totalVerts = coloredEntries.reduce((sum, e) => sum + (e.geo.getAttribute('position')?.count ?? 0), 0)
  if (totalVerts === 0) return null

  const positions = new Float32Array(totalVerts * 3)
  const normals = new Float32Array(totalVerts * 3)
  const colors = new Float32Array(totalVerts * 3)
  let offset = 0

  for (const { geo } of coloredEntries) {
    const pos = geo.getAttribute('position')
    const nor = geo.getAttribute('normal')
    const col = geo.getAttribute('color')
    if (!pos || !nor || !col) continue
    positions.set(pos.array as Float32Array, offset * 3)
    normals.set(nor.array as Float32Array, offset * 3)
    colors.set(col.array as Float32Array, offset * 3)
    offset += pos.count
  }

  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return merged
}

function parseColor(css: string): { r: number; g: number; b: number } {
  if (css.startsWith('#')) {
    const hex = css.slice(1)
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16) / 255,
        g: parseInt(hex[1] + hex[1], 16) / 255,
        b: parseInt(hex[2] + hex[2], 16) / 255,
      }
    }
    return {
      r: parseInt(hex.slice(0, 2), 16) / 255,
      g: parseInt(hex.slice(2, 4), 16) / 255,
      b: parseInt(hex.slice(4, 6), 16) / 255,
    }
  }
  return { r: 1, g: 1, b: 1 }
}

export function extractPointCloud(
  geometry: THREE.BufferGeometry,
  sampleCount: number
): ExportedPoint[] {
  const pos = geometry.getAttribute('position')
  const nor = geometry.getAttribute('normal')
  const col = geometry.getAttribute('color')
  if (!pos || !nor) return []

  const points: ExportedPoint[] = []
  const count = pos.count
  const step = Math.max(1, Math.floor(count / sampleCount))

  for (let i = 0; i < count; i += step) {
      let luma = 0.5
      if (col) {
        const r = col.getX(i), g = col.getY(i), b = col.getZ(i)
        luma = 0.299 * r + 0.587 * g + 0.114 * b
      }
      points.push({
        x: pos.getX(i),
        y: pos.getY(i),
        z: pos.getZ(i),
        nx: nor.getX(i),
        ny: nor.getY(i),
        nz: nor.getZ(i),
        l: luma,
      })
  }
  return points
}
