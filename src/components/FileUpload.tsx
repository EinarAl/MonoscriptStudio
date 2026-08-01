import { useCallback, useRef, useState } from 'react'
import GlowButton from './GlowButton'

interface Props {
  accept?: string
  onFile: (file: File, dataUrl: string) => void
  hasFile?: boolean
  compact?: boolean
  label?: string
  fill?: boolean
}

export default function FileUpload({ accept, onFile, hasFile, compact, label, fill }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handle = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => onFile(file, reader.result as string)
    reader.readAsDataURL(file)
  }, [onFile])

  const onDrop = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handle(file)
  }, [handle])

  const sharedStyle = {
    width: '100%',
    height: fill ? '100%' : undefined,
    display: fill ? 'flex' : undefined,
    flexDirection: fill ? 'column' : undefined,
    alignItems: fill ? 'center' : undefined,
    justifyContent: fill ? 'center' : undefined,
    border: `1px dashed ${dragOver ? 'var(--color-accent)' : 'var(--color-border-visible)'}`,
    padding: compact ? '8px 12px' : '3rem 2rem',
    textAlign: 'center',
    background: dragOver ? 'var(--color-accent-glow)' : 'transparent',
    fontSize: compact ? 11 : 14,
  }

  const content = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handle(file)
        }}
      />
      {hasFile ? (
        <svg width={compact ? 20 : 40} height={compact ? 20 : 40} viewBox="0 0 24 24" fill="none"
          stroke="var(--color-accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          style={{ display: 'block', margin: '0 auto' }}>
          <path d="M20 6 9 17l-5-5"/>
        </svg>
      ) : (
        <span>{label ?? (compact ? 'Upload image' : 'Drop file here or click to upload')}</span>
      )}
    </>
  )

  if (fill) {
    return (
      <button
        onClick={() => inputRef.current?.click()}
        style={{
          ...sharedStyle,
          borderRadius: 0,
        } as any}
        className="file-upload-fill"
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {content}
      </button>
    )
  }

  return (
    <GlowButton
      radius={0}
      textColor="var(--color-text-secondary)"
      lineColor="#ffffff"
      intensity={1.5}
      onClick={() => inputRef.current?.click()}
      style={sharedStyle as any}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {content}
    </GlowButton>
  )
}
