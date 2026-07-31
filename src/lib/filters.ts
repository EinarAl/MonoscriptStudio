export interface FilterDef {
  id: string
  label: string
  params?: FilterParam[]
  apply: (data: Uint8ClampedArray, w: number, h: number, params: Record<string, number>) => void
}

export interface FilterParam {
  key: string
  label: string
  min: number
  max: number
  step: number
  default: number
}

// ── Filter Implementations ──

function clamp(v: number): number { return Math.max(0, Math.min(255, v)) }
function luminance(r: number, g: number, b: number): number { return 0.299 * r + 0.587 * g + 0.114 * b }

export const filters: FilterDef[] = [
  {
    id: 'monochrome',
    label: 'Monochrome',
    apply(data) {
      for (let i = 0; i < data.length; i += 4) {
        const l = luminance(data[i], data[i + 1], data[i + 2])
        data[i] = data[i + 1] = data[i + 2] = l
      }
    },
  },
  {
    id: 'dither',
    label: 'Dither',
    params: [
      { key: 'strength', label: 'Str.', min: 0.2, max: 2, step: 0.1, default: 1 },
    ],
    apply(data, w, h, p) {
      const s = p.strength ?? 1
      const copy = new Float32Array(data.length)
      for (let i = 0; i < data.length; i++) copy[i] = data[i]

      const q = (err: number) => err / 16 * s
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          const oldR = copy[i], oldG = copy[i + 1], oldB = copy[i + 2]
          const l = luminance(oldR, oldG, oldB)
          const newL = l > 128 ? 255 : 0
          const err = l - newL
          data[i] = data[i + 1] = data[i + 2] = newL

          const e = q(err)
          if (x + 1 < w) { const j = i + 4; copy[j] += e * 7; copy[j + 1] += e * 7; copy[j + 2] += e * 7 }
          if (x - 1 >= 0 && y + 1 < h) { const j = i + w * 4 - 4; copy[j] += e * 3; copy[j + 1] += e * 3; copy[j + 2] += e * 3 }
          if (y + 1 < h) { const j = i + w * 4; copy[j] += e * 5; copy[j + 1] += e * 5; copy[j + 2] += e * 5 }
          if (x + 1 < w && y + 1 < h) { const j = i + w * 4 + 4; copy[j] += e * 1; copy[j + 1] += e * 1; copy[j + 2] += e * 1 }
        }
      }
    },
  },
  {
    id: 'noise',
    label: 'Noise',
    params: [
      { key: 'amount', label: 'Amt.', min: 0.01, max: 0.5, step: 0.01, default: 0.08 },
    ],
    apply(data, _w, _h, p) {
      const amount = p.amount ?? 0.08
      for (let i = 0; i < data.length; i += 4) {
        const n = (Math.random() - 0.5) * 255 * amount
        data[i] = clamp(data[i] + n)
        data[i + 1] = clamp(data[i + 1] + n)
        data[i + 2] = clamp(data[i + 2] + n)
      }
    },
  },
  {
    id: 'vignette',
    label: 'Vignette',
    params: [
      { key: 'amount', label: 'Dark', min: 0.1, max: 1, step: 0.05, default: 0.4 },
      { key: 'radius', label: 'Radius', min: 0.2, max: 1, step: 0.05, default: 0.6 },
    ],
    apply(data, w, h, p) {
      const amt = p.amount ?? 0.4, rad = p.radius ?? 0.6
      const cx = w / 2, cy = h / 2, maxD = Math.sqrt(cx * cx + cy * cy) * rad
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxD
          const f = Math.max(0, 1 - d) ** 2
          const dark = 1 - (1 - f) * amt
          const i = (y * w + x) * 4
          data[i] = clamp(data[i] * dark)
          data[i + 1] = clamp(data[i + 1] * dark)
          data[i + 2] = clamp(data[i + 2] * dark)
        }
      }
    },
  },
  {
    id: 'motionBlur',
    label: 'Motion Blur',
    params: [
      { key: 'length', label: 'Length', min: 3, max: 30, step: 1, default: 10 },
      { key: 'angle', label: 'Angle°', min: 0, max: 360, step: 5, default: 0 },
    ],
    apply(data, w, h, p) {
      const len = Math.round(p.length ?? 10)
      const ang = (p.angle ?? 0) * Math.PI / 180
      const dx = Math.cos(ang), dy = Math.sin(ang)
      const copy = new Uint8ClampedArray(data)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let r = 0, g = 0, b = 0, cnt = 0
          for (let s = -len; s <= len; s++) {
            const sx = Math.round(x + s * dx), sy = Math.round(y + s * dy)
            if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
              const i = (sy * w + sx) * 4
              r += copy[i]; g += copy[i + 1]; b += copy[i + 2]; cnt++
            }
          }
          const i = (y * w + x) * 4
          data[i] = r / cnt; data[i + 1] = g / cnt; data[i + 2] = b / cnt
        }
      }
    },
  },
  {
    id: 'vhs',
    label: 'VHS',
    params: [
      { key: 'shift', label: 'Chroma', min: 1, max: 10, step: 1, default: 3 },
      { key: 'noiseAmount', label: 'Noise', min: 0.01, max: 0.3, step: 0.01, default: 0.05 },
    ],
    apply(data, w, h, p) {
      const shift = Math.round(p.shift ?? 3)
      const noiseAmt = p.noiseAmount ?? 0.05
      for (let y = 0; y < h; y++) {
        // Horizontal noise band every ~20 rows
        const band = y % 20 < 3 ? (Math.random() - 0.5) * 40 : 0
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          // Chroma shift: shift red channel horizontally
          const sx = Math.max(0, Math.min(w - 1, x + shift))
          const si = (y * w + sx) * 4
          const r = data[si]
          const g = data[i + 1]
          const b = data[i]
          // Noise
          const n = (Math.random() - 0.5) * 255 * noiseAmt
          data[i] = clamp(r + band + n)
          data[i + 1] = clamp(g + n)
          data[i + 2] = clamp(b + n)
        }
      }
    },
  },
  {
    id: 'crt',
    label: 'CRT',
    params: [
      { key: 'scanline', label: 'Scan', min: 0.1, max: 0.8, step: 0.05, default: 0.3 },
    ],
    apply(data, w, h, p) {
      const s = p.scanline ?? 0.3
      for (let y = 0; y < h; y++) {
        const dark = y % 2 === 0 ? 1 : 1 - s
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          data[i] = clamp(data[i] * dark)
          data[i + 1] = clamp(data[i + 1] * dark)
          data[i + 2] = clamp(data[i + 2] * dark)
        }
      }
    },
  },
  {
    id: 'glitch',
    label: 'Glitch',
    params: [
      { key: 'amount', label: 'Amt.', min: 1, max: 20, step: 1, default: 5 },
    ],
    apply(data, w, h, p) {
      const amt = Math.round(p.amount ?? 5)
      const copy = new Uint8ClampedArray(data)
      for (let y = 0; y < h; y++) {
        // Occasional block displacement
        if (Math.random() < 0.05) {
          const blockH = Math.min(10, h - y)
          const shift = (Math.random() - 0.5) * amt * 2
          for (let by = 0; by < blockH && y + by < h; by++) {
            for (let x = 0; x < w; x++) {
              const sx = Math.round(x + shift)
              if (sx >= 0 && sx < w) {
                const i = ((y + by) * w + x) * 4
                const si = ((y + by) * w + sx) * 4
                data[i] = copy[si]; data[i + 1] = copy[si + 1]; data[i + 2] = copy[si + 2]
              }
            }
          }
          y += blockH
        }
        // Occasional individual pixel noise
        for (let x = 0; x < w; x++) {
          if (Math.random() < 0.01) {
            const i = (y * w + x) * 4
            data[i] = 255; data[i + 1] = 255; data[i + 2] = 255
          }
        }
      }
      // RGB shift
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          const sx = Math.max(0, Math.min(w - 1, x + (Math.random() < 0.5 ? 2 : -2)))
          const si = (y * w + sx) * 4
          data[i] = copy[si]  // red shifted
          data[i + 1] = copy[i + 1]  // green stays
          data[i + 2] = copy[si + 2]  // blue shifted
        }
      }
    },
  },
  {
    id: 'thermal',
    label: 'Thermal',
    params: [
      { key: 'contrast', label: 'Contr.', min: 0.5, max: 2, step: 0.1, default: 1 },
    ],
    apply(data, _w, _h, p) {
      const c = p.contrast ?? 1
      for (let i = 0; i < data.length; i += 4) {
        const l = luminance(data[i], data[i + 1], data[i + 2]) / 255
        const t = Math.pow(l, c)
        if (t < 0.25) {
          data[i] = 0; data[i + 1] = 0; data[i + 2] = Math.round(t / 0.25 * 128)
        } else if (t < 0.5) {
          data[i] = 0; data[i + 1] = Math.round((t - 0.25) / 0.25 * 255); data[i + 2] = 255 - Math.round((t - 0.25) / 0.25 * 128)
        } else if (t < 0.75) {
          data[i] = Math.round((t - 0.5) / 0.25 * 255); data[i + 1] = 255; data[i + 2] = 0
        } else {
          data[i] = 255; data[i + 1] = 255 - Math.round((t - 0.75) / 0.25 * 128); data[i + 2] = 0
        }
      }
    },
  },
  {
    id: 'emboss',
    label: 'Emboss',
    params: [
      { key: 'strength', label: 'Str.', min: 0.5, max: 4, step: 0.5, default: 1.5 },
    ],
    apply(data, w, h, p) {
      const s = p.strength ?? 1.5
      const copy = new Uint8ClampedArray(data)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          const iNW = y > 0 && x > 0 ? ((y - 1) * w + (x - 1)) * 4 : i
          const iSE = y < h - 1 && x < w - 1 ? ((y + 1) * w + (x + 1)) * 4 : i
          const lNW = luminance(copy[iNW], copy[iNW + 1], copy[iNW + 2])
          const lSE = luminance(copy[iSE], copy[iSE + 1], copy[iSE + 2])
          const val = clamp(128 + (lNW - lSE) * s)
          data[i] = data[i + 1] = data[i + 2] = val
        }
      }
    },
  },
  {
    id: 'threshold',
    label: 'Threshold',
    params: [
      { key: 'level', label: 'Level', min: 0.1, max: 0.9, step: 0.05, default: 0.5 },
    ],
    apply(data, _w, _h, p) {
      const level = (p.level ?? 0.5) * 255
      for (let i = 0; i < data.length; i += 4) {
        const l = luminance(data[i], data[i + 1], data[i + 2])
        data[i] = data[i + 1] = data[i + 2] = l > level ? 255 : 0
      }
    },
  },
  {
    id: 'starGlow',
    label: 'Star Glow',
    params: [
      { key: 'threshold', label: 'Thresh', min: 0.5, max: 1, step: 0.05, default: 0.8 },
      { key: 'length', label: 'Length', min: 5, max: 40, step: 5, default: 20 },
    ],
    apply(data, w, h, p) {
      const len = Math.round(p.length ?? 20)

      // Adaptive threshold: scale against the image's brightest pixel so dark
      // 3D renders and bright photos both produce streaks.
      let maxLum = 0
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          const l = luminance(data[i], data[i + 1], data[i + 2])
          if (l > maxLum) maxLum = l
        }
      }
      if (maxLum === 0) return

      const thr = Math.max((p.threshold ?? 0.8) * maxLum, 32)

      const copy = new Uint8ClampedArray(data)
      const bright: Array<[number, number, number, number, number]> = [] // x, y, r, g, b
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          const l = luminance(copy[i], copy[i + 1], copy[i + 2])
          if (l > thr) bright.push([x, y, copy[i], copy[i + 1], copy[i + 2]])
        }
      }

      // Cap streak work: even stride sampling keeps distribution even for huge images
      const MAX_BRIGHT = 1500
      const stride = bright.length > MAX_BRIGHT ? Math.ceil(bright.length / MAX_BRIGHT) : 1

      // Draw cross streaks
      for (let b = 0; b < bright.length; b += stride) {
        const [bx, by, r, g, bl] = bright[b]
        for (let s = 1; s <= len; s++) {
          const fade = 1 - s / len
          const d = Math.round(s * 0.3)
          const positions = [
            [bx + s, by], [bx - s, by],
            [bx, by + s], [bx, by - s],
            [bx + s, by + d], [bx - s, by - d],
            [bx + d, by + s], [bx - d, by - s],
          ]
          for (const [px, py] of positions) {
            if (px >= 0 && px < w && py >= 0 && py < h) {
              const i = (py * w + px) * 4
              data[i] = clamp(data[i] + r * fade * 0.5)
              data[i + 1] = clamp(data[i + 1] + g * fade * 0.5)
              data[i + 2] = clamp(data[i + 2] + bl * fade * 0.5)
            }
          }
        }
      }
    },
  },
  {
    id: 'reededGlass',
    label: 'Reeded Glass',
    params: [
      { key: 'amount', label: 'Dist.', min: 1, max: 10, step: 1, default: 4 },
    ],
    apply(data, w, h, p) {
      const amt = Math.round(p.amount ?? 4)
      const copy = new Uint8ClampedArray(data)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const offset = Math.sin(y * 0.05 + x * 0.02) * amt
          const sx = Math.max(0, Math.min(w - 1, Math.round(x + offset)))
          const i = (y * w + x) * 4
          const si = (y * w + sx) * 4
          data[i] = copy[si]; data[i + 1] = copy[si + 1]; data[i + 2] = copy[si + 2]
        }
      }
    },
  },
  {
    id: 'modulation',
    label: 'Modulation',
    params: [
      { key: 'amount', label: 'Wave', min: 1, max: 15, step: 1, default: 5 },
    ],
    apply(data, w, h, p) {
      const amt = Math.round(p.amount ?? 5)
      const copy = new Uint8ClampedArray(data)
      for (let y = 0; y < h; y++) {
        const wave = Math.sin(y * 0.1) * amt
        for (let x = 0; x < w; x++) {
          const sx = Math.max(0, Math.min(w - 1, Math.round(x + wave)))
          const i = (y * w + x) * 4
          const si = (y * w + sx) * 4
          data[i] = copy[si]; data[i + 1] = copy[si + 1]; data[i + 2] = copy[si + 2]
        }
      }
    },
  },
  {
    id: 'cameraShake',
    label: 'Camera Shake',
    params: [
      { key: 'blurriness', label: 'Blur', min: -10, max: 10, step: 1, default: -5 },
      { key: 'threshold', label: 'Thresh', min: 0.1, max: 3, step: 0.1, default: 1 },
      { key: 'ringing', label: 'Ring', min: 0.05, max: 0.5, step: 0.05, default: 0.2 },
    ],
    apply(data, w, h, p) {
      const len = Math.max(1, Math.abs(Math.round(p.blurriness ?? -5)))
      const copy = new Uint8ClampedArray(data)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let r = 0, g = 0, b = 0, cnt = 0
          for (let s = -len; s <= len; s++) {
            const sy = Math.round(y + s * 0.5)
            if (sy >= 0 && sy < h) {
              const j = (sy * w + x) * 4
              r += copy[j]; g += copy[j + 1]; b += copy[j + 2]; cnt++
            }
          }
          const i = (y * w + x) * 4
          data[i] = r / cnt; data[i + 1] = g / cnt; data[i + 2] = b / cnt
        }
      }
    },
  },
]

// ── Presets ──

export interface PresetDef {
  id: string
  label: string
  filters: Array<{ id: string; params: Record<string, number> }>
}

export const presets: PresetDef[] = [
  {
    id: 'tv-interference',
    label: 'TV Interference',
    filters: [
      { id: 'monochrome', params: {} },
      { id: 'dither', params: { strength: 0.8 } },
      { id: 'motionBlur', params: { length: 4, angle: 0 } },
      { id: 'noise', params: { amount: 0.1 } },
    ],
  },
  {
    id: 'wavy-glass',
    label: 'Wavy Glass',
    filters: [
      { id: 'reededGlass', params: { amount: 6 } },
      { id: 'noise', params: { amount: 0.02 } },
      { id: 'vignette', params: { amount: 0.3, radius: 0.7 } },
    ],
  },
  {
    id: 'lens-flare',
    label: 'Lens Flare',
    filters: [
      { id: 'starGlow', params: { threshold: 0.7, length: 25 } },
      { id: 'vignette', params: { amount: 0.4, radius: 0.6 } },
    ],
  },
  {
    id: 'retro-dither',
    label: '4-Color Dither',
    filters: [
      { id: 'dither', params: { strength: 0.6 } },
      { id: 'thermal', params: { contrast: 1.2 } },
    ],
  },
  {
    id: 'scanlines',
    label: 'Scanlines',
    filters: [
      { id: 'crt', params: { scanline: 0.4 } },
      { id: 'vignette', params: { amount: 0.3, radius: 0.7 } },
    ],
  },
  {
    id: 'floyd-dither',
    label: 'Floyd-Steinberg',
    filters: [
      { id: 'dither', params: { strength: 1 } },
    ],
  },
  {
    id: 'edge-detect',
    label: 'Edge Detect',
    filters: [
      { id: 'emboss', params: { strength: 1.5 } },
      { id: 'threshold', params: { level: 0.45 } },
    ],
  },
]

export function applyPreset(data: Uint8ClampedArray, w: number, h: number, preset: PresetDef, overrides?: Record<string, Record<string, number>>): void {
  for (const f of preset.filters) {
    const filter = filters.find(fi => fi.id === f.id)
    if (filter) {
      const params = { ...f.params, ...(overrides?.[f.id] ?? {}) }
      filter.apply(data, w, h, params)
    }
  }
}

export function applyPresets(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  presetIds: string[],
  presetStrength: Record<string, number>,
): void {
  for (const id of presetIds) {
    const preset = presets.find(p => p.id === id)
    if (!preset) continue
    const s = presetStrength[id] ?? 1
    if (s <= 0) continue
    if (s >= 1) {
      applyPreset(data, w, h, preset)
    } else {
      const before = new Uint8ClampedArray(data)
      applyPreset(data, w, h, preset)
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.round(before[i] * (1 - s) + data[i] * s)
      }
    }
  }
}

export function applyIndividualFilters(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  activeFilters: string[],
  filterParams: Record<string, Record<string, number>>,
): void {
  for (const id of activeFilters) {
    const filter = filters.find(f => f.id === id)
    if (!filter) continue
    const defaults: Record<string, number> = {}
    if (filter.params) {
      for (const p of filter.params) defaults[p.key] = p.default
    }
    const params = { ...defaults, ...(filterParams[id] ?? {}) }
    const intensity = filterParams[id]?.intensity ?? 1
    if (intensity <= 0) continue
    if (intensity >= 1) {
      filter.apply(data, w, h, params)
    } else {
      const before = new Uint8ClampedArray(data)
      filter.apply(data, w, h, params)
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.round(before[i] * (1 - intensity) + data[i] * intensity)
      }
    }
  }
}

export function getFilter(id: string): FilterDef | undefined {
  return filters.find(f => f.id === id)
}

export function getPreset(id: string): PresetDef | undefined {
  return presets.find(p => p.id === id)
}
