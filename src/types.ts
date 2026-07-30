export const DEFAULT_CHARSET = ' .:-=+*#%@'

export const PRESETS: Record<string, string> = {
  'Standard': ' .:-=+*#%@',
  'Block': ' ░▒▓█',
  'Dense': ' .\'`^",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  'Neofetch': ' .,:;i|/+l!-?=*@#$%&g8BWMo0QOUYyXxzcuvnrajft/\\|()1{}[]',
  'Minimal': ' .oO#',
  'Mixed': ' .oO$%@#',
  'Numbers': ' 0123456789',
}

export type AnimationMode = 'spin' | 'tilt' | 'drag'

export type ColorMode = 'mono' | 'multi' | 'original'

export interface AsciiOptions {
  width: number
  charset: string
  invert: boolean
  heightScale: number
  densityBias: number
  brightness: number
  contrast: number
  gamma: number
  pixelate: number
  colorMode: ColorMode
  bgColor: string
  bgTransparent: boolean
  fgColor: string
  cutDarks: number
  cutLights: number
  overlayImage: boolean
  presets: string[]
  presetStrength: Record<string, number>
  activeFilters: string[]
  filterParams: Record<string, Record<string, number>>
  gifAnim: 'none' | 'rotation' | 'radioWaves'
  waveOriginX: number
  waveOriginY: number
  waveRange: number
  waveRadius: number
  waveSquareness: number
  waveGap: number
  waveVisible: boolean
  waveLineThickness: number
  waveLineColor: string
  waveAmplitude: number
  waveSpeed: number
  waveSharpness: number
  waveWarmth: number
  waveInward: boolean
  outputScale: number
  duration: number
  fps: number
  removeBg: boolean
  lineHeight: number
}

export const DEFAULT_ASCII_OPTIONS: AsciiOptions = {
  width: 50,
  charset: DEFAULT_CHARSET,
  invert: false,
  heightScale: 0.5,
  densityBias: 1.0,
  brightness: 0,
  contrast: 1.0,
  gamma: 1.0,
  pixelate: 0,
  colorMode: 'original',
  bgColor: '#000000',
  bgTransparent: false,
  fgColor: '#cccccc',
  cutDarks: 0,
  cutLights: 0,
  overlayImage: false,
  presets: [],
  presetStrength: {},
  activeFilters: [],
  filterParams: {},
  gifAnim: 'radioWaves',
  waveOriginX: 0.5,
  waveOriginY: 0.5,
  waveRange: 0.8,
  waveRadius: 0.15,
  waveSquareness: 0,
  waveGap: 0.12,
  waveVisible: true,
  waveLineThickness: 3,
  waveLineColor: '#ffffff',
  waveAmplitude: 2,
  waveSpeed: 0.2,
  waveSharpness: 1.0,
  waveWarmth: 0,
  waveInward: false,
  outputScale: 1,
  duration: 2,
  fps: 10,
  removeBg: false,
  lineHeight: 1.0,
}

export interface AsciiCell {
  char: string
  r: number
  g: number
  b: number
  a: number
}

export interface AsciiGrid {
  cells: AsciiCell[][]
  cols: number
  rows: number
}

export interface ExportedPoint {
  x: number
  y: number
  z: number
  nx: number
  ny: number
  nz: number
  l?: number
}
