import type { AsciiOptions, AsciiCell, AsciiGrid } from '../types'
import { applyPresets, applyIndividualFilters } from './filters'

export function removeBackground(imageData: ImageData, threshold = 50): ImageData {
  const { data, width, height } = imageData
  const out = new ImageData(new Uint8ClampedArray(data), width, height)
  const d = out.data
  const bw = Math.max(3, Math.floor(Math.min(width, height) * 0.04))
  let rSum = 0, gSum = 0, bSum = 0, count = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x >= bw && x < width - bw && y >= bw && y < height - bw) continue
      const i = (y * width + x) * 4
      rSum += d[i]; gSum += d[i + 1]; bSum += d[i + 2]
      count++
    }
  }

  const bgR = rSum / count, bgG = gSum / count, bgB = bSum / count

  for (let i = 0; i < d.length; i += 4) {
    const dr = Math.abs(d[i] - bgR)
    const dg = Math.abs(d[i + 1] - bgG)
    const db = Math.abs(d[i + 2] - bgB)
    if (dr < threshold && dg < threshold && db < threshold) {
      d[i + 3] = 0
    }
  }
  return out
}

function applyTone(data: Uint8ClampedArray, brightness: number, contrast: number, gamma: number): void {
  const gInv = gamma !== 0 ? 1 / gamma : 1

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2]

    if (brightness !== 0) {
      r = Math.max(0, Math.min(255, r + brightness))
      g = Math.max(0, Math.min(255, g + brightness))
      b = Math.max(0, Math.min(255, b + brightness))
    }

    if (contrast !== 1.0) {
      r = Math.max(0, Math.min(255, ((r / 255 - 0.5) * contrast + 0.5) * 255))
      g = Math.max(0, Math.min(255, ((g / 255 - 0.5) * contrast + 0.5) * 255))
      b = Math.max(0, Math.min(255, ((b / 255 - 0.5) * contrast + 0.5) * 255))
    }

    if (gamma !== 1.0) {
      r = Math.max(0, Math.min(255, Math.pow(r / 255, gInv) * 255))
      g = Math.max(0, Math.min(255, Math.pow(g / 255, gInv) * 255))
      b = Math.max(0, Math.min(255, Math.pow(b / 255, gInv) * 255))
    }

    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }
}

function applyPixelate(data: Uint8ClampedArray, width: number, height: number, blockSize: number): void {
  if (blockSize <= 1) return
  const copy = new Uint8ClampedArray(data)
  const bs = blockSize
  for (let y = 0; y < height; y += bs) {
    for (let x = 0; x < width; x += bs) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0
      for (let dy = 0; dy < bs && y + dy < height; dy++) {
        for (let dx = 0; dx < bs && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4
          rSum += copy[i]
          gSum += copy[i + 1]
          bSum += copy[i + 2]
          aSum += copy[i + 3]
          count++
        }
      }
      const avgR = rSum / count, avgG = gSum / count, avgB = bSum / count, avgA = aSum / count
      for (let dy = 0; dy < bs && y + dy < height; dy++) {
        for (let dx = 0; dx < bs && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4
          data[i] = avgR
          data[i + 1] = avgG
          data[i + 2] = avgB
          data[i + 3] = avgA
        }
      }
    }
  }
}

export function imageToAsciiGrid(imageData: ImageData, options: AsciiOptions): AsciiGrid {
  const { width: outW, charset, invert, heightScale, densityBias, brightness, contrast, gamma, pixelate, colorMode, fgColor, cutDarks, cutLights } = options
  const { data: srcData, width: imgW, height: imgH } = imageData

  const scale = Math.max(0.1, options.contentScale || 1)
  const regionW = imgW / scale
  const regionH = imgH / scale
  const offX = (imgW - regionW) / 2
  const offY = (imgH - regionH) / 2

  const data = new Uint8ClampedArray(srcData)

  applyPixelate(data, imgW, imgH, pixelate)
  applyTone(data, brightness, contrast, gamma)

  if (options.activeFilters.length > 0) {
    applyIndividualFilters(data, imgW, imgH, options.activeFilters, options.filterParams)
  }

  if (options.presets.length > 0) {
    applyPresets(data, imgW, imgH, options.presets, options.presetStrength)
  }

  const outH = Math.max(1, Math.round(outW * (imgH / imgW) * heightScale))
  const chars = charset.split('')
  const cells: AsciiCell[][] = []

  const parseHex = (hex: string) => {
    const h = hex.replace('#', '')
    return { fr: parseInt(h.slice(0, 2), 16), fg: parseInt(h.slice(2, 4), 16), fb: parseInt(h.slice(4, 6), 16) }
  }

  const { fr, fg, fb } = parseHex(fgColor)

  for (let row = 0; row < outH; row++) {
    const rowCells: AsciiCell[] = []
    for (let col = 0; col < outW; col++) {
      const cx = offX + (col + 0.5) / outW * regionW
      const cy = offY + (row + 0.5) / outH * regionH
      const px = Math.max(0, Math.min(imgW - 1, Math.floor(cx)))
      const py = Math.max(0, Math.min(imgH - 1, Math.floor(cy)))
      const i = (py * imgW + px) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]

      if (a < 128) {
        rowCells.push({ char: ' ', r: 0, g: 0, b: 0, a: 0 })
        continue
      }

      let luma = 0.299 * r + 0.587 * g + 0.114 * b

      // Cut darks / cut lights
      const darkCut = cutDarks * 255
      const lightCut = (1 - cutLights) * 255
      if (luma < darkCut) {
        rowCells.push({ char: ' ', r: 0, g: 0, b: 0, a: 0 })
        continue
      }
      if (luma > lightCut) {
        luma = 255
      }

      let mappedLuma: number
      if (densityBias !== 1.0) {
        mappedLuma = Math.pow(luma / 255, densityBias) * 255
      } else {
        mappedLuma = luma
      }

      const idx = Math.floor((mappedLuma / 255) * (chars.length - 1))
      const ci = Math.max(0, Math.min(chars.length - 1, idx))
      const char = invert ? chars[chars.length - 1 - ci] : chars[ci]

      if (colorMode === 'mono') {
        rowCells.push({ char, r: fr, g: fg, b: fb, a: 255 })
      } else {
        rowCells.push({ char, r, g, b, a: 255 })
      }
    }
    cells.push(rowCells)
  }
  return { cells, cols: outW, rows: outH }
}

export function gridToPlainText(grid: AsciiGrid): string {
  return grid.cells.map(row => row.map(c => c.char).join('')).join('\n')
}

export function gridToHtml(grid: AsciiGrid, bgColor: string, bgTransparent: boolean): string {
  const lines = grid.cells.map(row => {
    const spans = row.map(c => {
      if (c.char === ' ') return ' '
      return `<span style="color:rgb(${c.r},${c.g},${c.b})">${escapeHtml(c.char)}</span>`
    }).join('')
    return `<div>${spans}</div>`
  }).join('\n')
  const bg = bgTransparent ? '' : ` style="background:${bgColor}"`
  return `<pre${bg} style="font:12px/1.2 'Courier New',monospace;padding:16px;overflow:auto">\n${lines}\n</pre>`
}

export function gridToJson(grid: AsciiGrid): string {
  return JSON.stringify(grid.cells.map(row => row.map(c => ({
    c: c.char, r: c.r, g: c.g, b: c.b
  }))), null, 2)
}

export function gridToSvg(grid: AsciiGrid, bgColor: string, bgTransparent: boolean, scale: number): string {
  const cellW = 7 * scale
  const cellH = 12 * scale
  const w = grid.cols * cellW
  const h = grid.rows * cellH
  const fontSize = cellH * 0.9
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
  if (!bgTransparent) {
    svg += `<rect width="${w}" height="${h}" fill="${bgColor}"/>`
  }
  svg += `<style>text{font-family:'Courier New',monospace;font-size:${fontSize}px}</style>`
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const c = grid.cells[row][col]
      if (c.char === ' ') continue
      svg += `<text x="${col * cellW}" y="${row * cellH + cellH * 0.8}" fill="rgb(${c.r},${c.g},${c.b})">${escapeXml(c.char)}</text>`
    }
  }
  svg += '</svg>'
  return svg
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeXml = escapeHtml

export function renderGridToCanvas(
  grid: AsciiGrid,
  bgColor: string,
  bgTransparent: boolean,
  cellW: number = 7,
  cellH: number = 12,
  canvas?: HTMLCanvasElement,
  ctx?: CanvasRenderingContext2D,
  sourceImageData?: ImageData,
): { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D } {
  const cvs = canvas || document.createElement('canvas')
  const c = ctx || cvs.getContext('2d')!
  const w = grid.cols * cellW
  const h = grid.rows * cellH
  cvs.width = w
  cvs.height = h

  // Draw source image first for overlay mode
  if (sourceImageData) {
    const tempCvs = document.createElement('canvas')
    tempCvs.width = sourceImageData.width
    tempCvs.height = sourceImageData.height
    const tempCtx = tempCvs.getContext('2d')!
    tempCtx.putImageData(sourceImageData, 0, 0)
    c.drawImage(tempCvs, 0, 0, w, h)
  } else if (!bgTransparent) {
    c.fillStyle = bgColor
    c.fillRect(0, 0, w, h)
  } else {
    c.clearRect(0, 0, w, h)
  }

  const fontSize = Math.max(1, cellH * 0.9)
  c.font = `${fontSize}px "Courier New", monospace`
  c.textBaseline = 'top'
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const cell = grid.cells[row][col]
      if (cell.char === ' ') continue
      c.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`
      c.fillText(cell.char, col * cellW, row * cellH + (cellH - fontSize) * 0.5)
    }
  }
  return { canvas: cvs, ctx: c }
}
