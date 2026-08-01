import AsciiPreview from '../components/AsciiPreview'
import FileUpload from '../components/FileUpload'
import { gridToPlainText } from '../lib/imageToAscii'
import type { AsciiOptions, AsciiGrid } from '../types'

interface Props {
  grid: AsciiGrid | null
  opts: AsciiOptions
  sourceImageData: ImageData | null
  onFile: (file: File, dataUrl: string) => void
}

export default function StaticAsciiPage({ grid, opts, sourceImageData, onFile }: Props) {
  if (!grid) {
    return (
      <FileUpload
        fill
        accept="image/png,image/jpeg,image/svg+xml"
        onFile={onFile}
        label="Tap or drop an image to start"
      />
    )
  }

  const fontSize = opts.lineHeight > 0.5 ? Math.min(1800 / opts.width, 60) : 8

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#000000', overflow: 'hidden',
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
