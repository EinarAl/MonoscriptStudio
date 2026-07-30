// @ts-ignore
import GIF from 'gif.js'
import type { AsciiOptions } from '../types'
import { imageToAsciiGrid, renderGridToCanvas } from './imageToAscii'

function applyRadioWaves(
  srcData: ImageData,
  frame: number,
  totalFrames: number,
  ox: number,
  oy: number,
  range: number,
  radius: number,
  squareness: number,
  gap: number,
  visible: boolean,
  lineThickness: number,
  lineColor: string,
  amplitude: number,
  speed: number,
  sharpness: number,
  warmth: number,
  inward: boolean,
): ImageData {
  const { data, width: w, height: h } = srcData
  const out = new Uint8ClampedArray(data)
  const copy = new Uint8ClampedArray(data)
  const cx = ox * w
  const cy = oy * h
  const maxDist = Math.sqrt(Math.max(cx, w - cx) ** 2 + Math.max(cy, h - cy) ** 2) * range

  const t = totalFrames > 1 ? frame / (totalFrames - 1) : 0
  const wavePhase = t * maxDist * 1.5 * speed

  // Super-ellipse exponent: 2 = circle, >2 = square
  const n = 2 + squareness * 4

  // Warm tint curve: slight orange-red shift
  const warmR = 255, warmG = 180, warmB = 120

  // Parse line color for visible mode
  let lineR = 255, lineG = 255, lineB = 255
  if (visible) {
    const hex = lineColor.replace('#', '')
    lineR = parseInt(hex.slice(0, 2), 16)
    lineG = parseInt(hex.slice(2, 4), 16)
    lineB = parseInt(hex.slice(4, 6), 16)
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = Math.abs(x - cx)
      const dy = Math.abs(y - cy)

      // Super-ellipse distance
      const dist = Math.pow(Math.pow(dx, n) + Math.pow(dy, n), 1 / n)

      if (dist > maxDist) continue

      // Wave displacement — outward (default): phase decreases dist, rings expand from origin; inward: phase increases dist, rings contract toward origin
      const waveLength = radius * maxDist + gap * maxDist
      const waveDist = inward
        ? (dist + wavePhase) % waveLength
        : ((dist - wavePhase) % waveLength + waveLength) % waveLength
      const inWave = waveDist < radius * maxDist

      if (inWave) {
        const angle = Math.atan2(y - cy, x - cx)
        const normPos = waveDist / (radius * maxDist) // 0..1 within the wave band
        const shapedPos = Math.pow(normPos, sharpness)

        // Displace pixel outward along radial direction
        const displace = Math.sin(shapedPos * Math.PI) * amplitude
        const sx = Math.round(x + Math.cos(angle) * displace)
        const sy = Math.round(y + Math.sin(angle) * displace)

        if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
          const i = (y * w + x) * 4
          const si = (sy * w + sx) * 4

          // Warmth: blend warm tint proportional to displacement intensity
          if (warmth > 0) {
            const warmthFactor = Math.sin(normPos * Math.PI) * warmth
            const invWarm = 1 - warmthFactor
            const sr = copy[si], sg = copy[si + 1], sb = copy[si + 2]
            out[i] = Math.round(sr * invWarm + warmR * warmthFactor)
            out[i + 1] = Math.round(sg * invWarm + warmG * warmthFactor)
            out[i + 2] = Math.round(sb * invWarm + warmB * warmthFactor)
            out[i + 3] = copy[si + 3]
          } else {
            out[i] = copy[si]
            out[i + 1] = copy[si + 1]
            out[i + 2] = copy[si + 2]
            out[i + 3] = copy[si + 3]
          }

          // Visible wave line overlay
          if (visible) {
            const peakDist = Math.abs(normPos - 0.5)
            const lineWidth = (lineThickness / 100) * (radius * maxDist)
            const inLine = peakDist * (radius * maxDist) < lineWidth
            if (inLine) {
              const alpha = 1.0 - (peakDist * (radius * maxDist)) / lineWidth
              const blend = 0.4 + alpha * 0.6
              out[i] = Math.round(out[i] * (1 - blend) + lineR * blend)
              out[i + 1] = Math.round(out[i + 1] * (1 - blend) + lineG * blend)
              out[i + 2] = Math.round(out[i + 2] * (1 - blend) + lineB * blend)
            }
          }
        }
      }
    }
  }

  return new ImageData(out, w, h)
}

export function generateAsciiGif(
  sourceData: ImageData,
  options: AsciiOptions,
  durationSec: number,
  fps: number,
  onProgress?: (frame: number, total: number) => void,
  overlaySource?: ImageData,
): Promise<Blob> {
  return new Promise((resolve) => {
    const { width: imgW, height: imgH } = sourceData
    const totalFrames = Math.max(1, Math.round(durationSec * fps))
    const delayMs = Math.round(1000 / fps)
    const cellW = 6 * options.outputScale
    const cellH = 12 * options.outputScale
    const outW = options.width
    const outH = Math.max(1, Math.round(outW * (imgH / imgW) * options.heightScale))

    const srcCanvas = document.createElement('canvas')
    srcCanvas.width = imgW
    srcCanvas.height = imgH
    const srcCtx = srcCanvas.getContext('2d')!

    const outCanvas = document.createElement('canvas')
    outCanvas.width = outW * cellW
    outCanvas.height = outH * cellH
    const outCtx = outCanvas.getContext('2d')!

    const gif = new GIF({
      workers: 1,
      quality: 20,
      width: outCanvas.width,
      height: outCanvas.height,
      background: options.bgTransparent ? '#000000' : options.bgColor,
    })

    const angleRange = options.gifAnim === 'rotation' ? 6 : 0

    for (let f = 0; f < totalFrames; f++) {
      onProgress?.(f + 1, totalFrames)

      let frameData: ImageData

      if (options.gifAnim === 'radioWaves') {
        frameData = applyRadioWaves(
          sourceData, f, totalFrames,
          options.waveOriginX, options.waveOriginY,
          options.waveRange, options.waveRadius,
          options.waveSquareness, options.waveGap,
          options.waveVisible, options.waveLineThickness,
          options.waveLineColor,
          options.waveAmplitude, options.waveSpeed,
          options.waveSharpness, options.waveWarmth,
          options.waveInward,
        )
      } else {
        const t = totalFrames > 1 ? f / (totalFrames - 1) : 0
        const angle = (t - 0.5) * angleRange

        srcCtx.clearRect(0, 0, imgW, imgH)
        if (angleRange > 0) {
          srcCtx.save()
          srcCtx.translate(imgW / 2, imgH / 2)
          srcCtx.rotate((angle * Math.PI) / 180)
          srcCtx.drawImage(awaitImageData(sourceData), -imgW / 2, -imgH / 2, imgW, imgH)
          srcCtx.restore()
        } else {
          srcCtx.drawImage(awaitImageData(sourceData), 0, 0)
        }
        frameData = srcCtx.getImageData(0, 0, imgW, imgH)
      }

      const grid = imageToAsciiGrid(frameData, options)
      const overlay = options.overlayImage && overlaySource ? overlaySource : undefined
      renderGridToCanvas(grid, options.bgColor, options.bgTransparent, cellW, cellH, outCanvas, outCtx, overlay)
      gif.addFrame(outCanvas, { copy: true, delay: delayMs })
    }

    gif.on('finished', (blob: Blob) => resolve(blob))
    gif.render()
  })
}

function awaitImageData(data: ImageData): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = data.width
  c.height = data.height
  const ctx = c.getContext('2d')!
  ctx.putImageData(data, 0, 0)
  return c
}
