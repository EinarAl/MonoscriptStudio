import { useCallback, useRef, useState } from 'react'

interface Props {
  accept?: string
  onFile: (file: File, dataUrl: string) => void
  hasFile?: boolean
  compact?: boolean
  label?: string
}

export default function FileUpload({ accept, onFile, hasFile, compact, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const shineRef = useRef<HTMLDivElement>(null)

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

  const diagRef = useRef<HTMLDivElement>(null)
  const onHover = () => {
    const s = shineRef.current
    if (s) { s.style.opacity = '1'; s.style.transform = 'translateX(100%)' }
    const d = diagRef.current
    if (d) { d.style.opacity = '1'; d.style.transform = 'translate(100%, 100%)' }
  }
  const offHover = () => {
    const s = shineRef.current
    if (s) { s.style.opacity = '0'; s.style.transform = 'translateX(-100%)' }
    const d = diagRef.current
    if (d) { d.style.opacity = '0'; d.style.transform = 'translate(-100%, -100%)' }
  }

  return (
    <div
      style={{
        position: 'relative', overflow: 'hidden', isolation: 'isolate',
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
      onMouseEnter={onHover}
      onMouseLeave={offHover}
      onClick={() => inputRef.current?.click()}
    >
      <div ref={shineRef} style={{
        position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none',
        opacity: 0, transform: 'translateX(-100%)',
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.12) 55%, rgba(255,255,255,0.04) 80%, transparent 100%)',
        transition: 'opacity 0.25s, transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1)',
      }} />
      <div ref={diagRef} className="specular-shine-diag" style={{
        position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none',
        opacity: 0, transform: 'translate(-100%, -100%)',
        background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)',
        transition: 'opacity 0.3s, transform 0.7s cubic-bezier(0.2, 0.9, 0.3, 1)',
      }} />
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
          {label ?? (compact ? 'Upload image' : 'Drop file here or click to upload')}
        </span>
      )}
    </div>
  )
}
