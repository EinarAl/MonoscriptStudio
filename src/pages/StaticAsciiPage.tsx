import AsciiPreview from '../components/AsciiPreview'
import { gridToPlainText } from '../lib/imageToAscii'
import type { AsciiOptions, AsciiGrid } from '../types'

interface Props {
  grid: AsciiGrid | null
  opts: AsciiOptions
  sourceImageData: ImageData | null
  fileLoaded: boolean
}

export default function StaticAsciiPage({ grid, opts, sourceImageData, fileLoaded }: Props) {
  if (!fileLoaded || !grid) {
    return (
      <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>
        Upload an image in the sidebar to start
      </div>
    )
  }

  const fontSize = opts.lineHeight > 0.5 ? Math.min(1800 / opts.width, 60) : 8

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#000000', overflow: 'auto',
    }}>
      <AsciiPreview
        grid={grid}
        ascii={gridToPlainText(grid)}
        fontSize={fontSize}
        lineHeight={opts.lineHeight}
        bgColor={opts.bgColor}
        bgTransparent={opts.bgTransparent}
        sourceImageData={opts.overlayImage ? sourceImageData ?? undefined : undefined}
        outputScale={opts.outputScale}
      />
    </div>
  )
}
