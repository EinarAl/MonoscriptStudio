import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { makeAsciiFilter } from '../lib/asciiFilter'
import { gridToPlainText, renderGridToCanvas } from '../lib/imageToAscii'
import type { AsciiOptions, AnimationMode, AsciiGrid } from '../types'

interface Props {
  geometry: THREE.BufferGeometry
  asciiOptions: AsciiOptions
  animationMode: AnimationMode
  spinSpeed: number
  onFrame?: (ascii: string) => void
  onGrid?: (cols: number, rows: number) => void
  onGridCapture?: (grid: AsciiGrid) => void
}

export default function ThreeDViewer({ geometry, asciiOptions, animationMode, spinSpeed, onFrame, onGrid, onGridCapture }: Props) {
  const containerRef = useRef<HTMLDivElement>(null!)
  const canvasRef = useRef<HTMLCanvasElement>(null!)
  const optsRef = useRef(asciiOptions)
  const onFrameRef = useRef(onFrame)
  const onGridRef = useRef(onGrid)
  const onGridCaptureRef = useRef(onGridCapture)
  const animModeRef = useRef(animationMode)
  const spinSpeedRef = useRef(spinSpeed)
  const prevColorModeRef = useRef<string | null>(null)
  optsRef.current = asciiOptions
  onFrameRef.current = onFrame
  onGridRef.current = onGrid
  onGridCaptureRef.current = onGridCapture
  animModeRef.current = animationMode
  spinSpeedRef.current = spinSpeed

  useEffect(() => {
    const container = containerRef.current

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#000000')

    const camera = new THREE.PerspectiveCamera(45, 640 / 480, 0.1, 100)

    const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true })
    renderer.setSize(640, 480)
    renderer.setPixelRatio(1)
    renderer.domElement.style.display = 'none'
    container.appendChild(renderer.domElement)

    const resize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (w === 0 || h === 0) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()

    const ambient = new THREE.AmbientLight(0xffffff, 0.15)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 1.3)
    dir.position.set(5, 5, 5)
    scene.add(dir)
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.35)
    dir2.position.set(-3, -2, -4)
    scene.add(dir2)

    const material = new THREE.MeshLambertMaterial({ color: '#cccccc' })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const bbox = new THREE.Box3().setFromObject(mesh)
    const bsize = bbox.getSize(new THREE.Vector3())
    const center = bbox.getCenter(new THREE.Vector3())
    const size = bsize.length()
    const baseDist = Math.max(size * 1.6, 3)
    const camTarget = new THREE.Vector3()
    camera.position.set(center.x, center.y, baseDist)
    camera.lookAt(center)
    camera.near = baseDist * 0.01
    camera.far = baseDist * 4
    camera.updateProjectionMatrix()
    camTarget.copy(center)

    const filter = makeAsciiFilter(renderer)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    let angleY = 0
    let currentRotX = 0, currentRotY = 0
    let targetRotX = 0, targetRotY = 0
    let lastAsciiTime = 0
    let isDragging = false
    let dragLastX = 0, dragLastY = 0
    prevColorModeRef.current = null

    function animate(now: number) {
      const mode = animModeRef.current
      if (mode === 'spin') {
        angleY += 0.015 * spinSpeedRef.current
      }

      const spring = mode === 'tilt' ? 0.08 : 0.12
      currentRotX += (targetRotX - currentRotX) * spring
      currentRotY += (targetRotY - currentRotY) * spring

      let rotX: number, rotY: number
      if (mode === 'spin') {
        rotX = 0; rotY = angleY
      } else if (mode === 'tilt') {
        rotX = currentRotX; rotY = currentRotY
      } else {
        rotX = currentRotX; rotY = currentRotY
      }
      mesh.rotation.x = rotX
      mesh.rotation.y = rotY

      const cm = optsRef.current.colorMode
      const useVertex = cm !== 'mono' && !!geometry.getAttribute('color')
      const flag = useVertex ? 'on' : 'off'
      if (flag !== prevColorModeRef.current) {
        prevColorModeRef.current = flag
        if (useVertex) {
          material.vertexColors = true
          material.color.set('#ffffff')
        } else {
          material.vertexColors = false
          material.color.set('#cccccc')
        }
        material.needsUpdate = true
      }

      if (now - lastAsciiTime >= 33) {
        lastAsciiTime = now
        const opts = optsRef.current
        const zoom = Math.max(0.1, opts.contentScale || 1)
        camera.position.set(camTarget.x, camTarget.y, baseDist / zoom)
        const grid = filter.renderToAscii(scene, camera, opts)
        renderGridToCanvas(grid, opts.bgColor, opts.bgTransparent, 7 * opts.outputScale, 12 * opts.outputScale, canvas, ctx)
        onFrameRef.current?.(gridToPlainText(grid))
        onGridRef.current?.(grid.cols, grid.rows)
        onGridCaptureRef.current?.(grid)
      }

      animId = requestAnimationFrame(animate)
    }
    let animId = requestAnimationFrame(animate)

    const handlePointerMove = (e: PointerEvent) => {
      if (animModeRef.current === 'drag') {
        if (!isDragging) return
        const dx = e.clientX - dragLastX
        const dy = e.clientY - dragLastY
        const sensitivity = 0.005
        currentRotY += dx * sensitivity
        currentRotX += dy * sensitivity
        dragLastX = e.clientX
        dragLastY = e.clientY
        targetRotX = currentRotX
        targetRotY = currentRotY
      } else {
        const rect = container.getBoundingClientRect()
        const nx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1))
        const ny = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1))
        targetRotY = nx * 0.5
        targetRotX = ny * 0.5
      }
    }

    const handlePointerDown = (e: PointerEvent) => {
      if (animModeRef.current === 'drag' && e.button === 0) {
        isDragging = true
        dragLastX = e.clientX
        dragLastY = e.clientY
        container.setPointerCapture(e.pointerId)
      }
    }

    const handlePointerUp = () => {
      isDragging = false
    }

    window.addEventListener('pointermove', handlePointerMove)
    container.addEventListener('pointerdown', handlePointerDown)
    container.addEventListener('pointerup', handlePointerUp)
    container.addEventListener('pointerleave', handlePointerUp)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
      window.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerdown', handlePointerDown)
      container.removeEventListener('pointerup', handlePointerUp)
      container.removeEventListener('pointerleave', handlePointerUp)
      renderer.dispose()
      renderer.forceContextLoss()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [geometry])

  return (
    <div ref={containerRef} style={{
      width: '100%', height: '100%', display: 'flex',
      justifyContent: 'center', alignItems: 'center',
      background: '#000000',
    }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
      />
    </div>
  )
}
