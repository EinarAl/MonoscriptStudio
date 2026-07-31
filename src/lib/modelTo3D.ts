import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const MODEL_EXTENSIONS = ['.obj', '.glb', '.gltf', '.stl', '.ply']

export function getFileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

export function is3dExtension(ext: string): boolean {
  return MODEL_EXTENSIONS.includes(ext)
}

function bakeMaterialColor(geo: THREE.BufferGeometry, color?: THREE.Color): THREE.BufferGeometry {
  for (const a of ['uv', 'uv1', 'uv2', 'uv3', 'tangent', 'skinIndex', 'skinWeight']) geo.deleteAttribute(a)
  const pos = geo.getAttribute('position')
  if (!pos) return geo
  const colors = new Float32Array(pos.count * 3)
  if (color) {
    for (let i = 0; i < pos.count; i++) {
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
  } else {
    colors.fill(1)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

function collectObjectGeometry(root: THREE.Object3D): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = []
  root.updateMatrixWorld(true)
  root.traverse(o => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry?.getAttribute('position')) return
    const g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld)
    g.computeVertexNormals()
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    const color = mat && 'color' in mat ? (mat as THREE.MeshStandardMaterial).color : undefined
    out.push(bakeMaterialColor(g, color))
  })
  return out
}

function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (parts.length === 0) return null
  const merged = mergeGeometries(parts, false)
  const geo = merged ?? parts[0]
  geo.computeVertexNormals()
  return geo
}

function parseGlb(buffer: ArrayBuffer): Promise<THREE.BufferGeometry | null> {
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(buffer, '', gltf => {
      resolve(mergeParts(collectObjectGeometry(gltf.scene)))
    }, reject)
  })
}

export async function loadModelGeometry(dataUrl: string, name: string): Promise<THREE.BufferGeometry | null> {
  const ext = getFileExtension(name)
  const buffer = await fetch(dataUrl).then(r => r.arrayBuffer())
  if (ext === '.glb' || ext === '.gltf') return parseGlb(buffer)
  if (ext === '.obj') {
    const text = new TextDecoder().decode(buffer)
    return mergeParts(collectObjectGeometry(new OBJLoader().parse(text)))
  }
  if (ext === '.stl') return mergeParts([bakeMaterialColor(new STLLoader().parse(buffer))])
  if (ext === '.ply') return mergeParts([bakeMaterialColor(new PLYLoader().parse(buffer))])
  return null
}
