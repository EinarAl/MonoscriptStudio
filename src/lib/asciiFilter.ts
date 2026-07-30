import type { AsciiOptions, AsciiGrid } from '../types'
import { imageToAsciiGrid } from './imageToAscii'

function flipY(data: Uint8Array, w: number, h: number): void {
  const rowSize = w * 4
  const temp = new Uint8Array(rowSize)
  for (let y = 0; y < h / 2; y++) {
    const topOff = y * rowSize
    const botOff = (h - 1 - y) * rowSize
    temp.set(data.subarray(topOff, topOff + rowSize))
    data.copyWithin(topOff, botOff, botOff + rowSize)
    data.set(temp, botOff)
  }
}

export function makeAsciiFilter(renderer: any) {
  const gl = renderer.getContext()
  let pixelBuf: Uint8Array | null = null

  function readPixels(fbW: number, fbH: number): Uint8Array {
    const bufSize = fbW * fbH * 4
    if (!pixelBuf || pixelBuf.length !== bufSize) {
      pixelBuf = new Uint8Array(bufSize)
    }
    gl.readPixels(0, 0, fbW, fbH, gl.RGBA, gl.UNSIGNED_BYTE, pixelBuf)
    return pixelBuf
  }

  function renderToAscii(
    scene: any,
    camera: any,
    options: AsciiOptions,
  ): AsciiGrid {
    renderer.render(scene, camera)
    const fbW = gl.drawingBufferWidth
    const fbH = gl.drawingBufferHeight
    const pixels = readPixels(fbW, fbH)
    flipY(pixels, fbW, fbH)
    const imageData = new ImageData(new Uint8ClampedArray(pixels), fbW, fbH)
    return imageToAsciiGrid(imageData, options)
  }

  return { renderToAscii }
}
