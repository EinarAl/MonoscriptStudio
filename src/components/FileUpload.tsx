import { useCallback, useRef, useState } from 'react'

interface Props {
  accept?: string
  onFile: (file: File, dataUrl: string) => void
  hasFile?: boolean
  compact?: boolean
}

export default function FileUpload({ accept, onFile, hasFile, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handle = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => onFile(file, reader.result as string)
    reader.readAsDataURL(file)
  }, [onFile])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handle(file)
  }, [handle])

  return (
    <div
      style={{
        border: `1px dashed ${dragOver ? 'var(--color-accent)' : 'var(--color-border-visible)'}`,
        borderRadius: 'var(--radius-btn)',
        padding: compact ? '8px 12px' : '3rem 2rem',
        textAlign: 'center',
        cursor: 'pointer',
        background: dragOver ? 'var(--color-accent-glow)' : 'transparent',
        transition: 'all 0.2s',
      }}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
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
        <span style={{ color: 'var(--color-text-tertiary)', fontSize: compact ? 11 : 14 }}>
          {compact ? 'Upload image' : 'Drop file here or click to upload'}
        </span>
      )}
    </div>
  )
}
