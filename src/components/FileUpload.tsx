import { useCallback, useRef, useState } from 'react'

interface Props {
  accept?: string
  onFile: (file: File, dataUrl: string) => void
  hasFile?: boolean
}

export default function FileUpload({ accept, onFile, hasFile }: Props) {
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
        border: `2px dashed ${dragOver ? '#4f46e5' : '#444'}`,
        borderRadius: 12,
        padding: '3rem 2rem',
        textAlign: 'center',
        cursor: 'pointer',
        background: dragOver ? 'rgba(79,70,229,0.08)' : 'transparent',
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
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style={{ display: 'block', margin: '0 auto' }}>
          <path d="M20 6 9 17l-5-5"/>
        </svg>
      ) : (
        <>
          <p style={{ color: '#999', margin: 0 }}>Drop file here or click to upload</p>
          {accept && <p style={{ color: '#666', fontSize: 12, margin: '4px 0 0' }}>Accepts: {accept}</p>}
        </>
      )}
    </div>
  )
}
