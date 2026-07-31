import { useCallback, useRef, useState } from 'react'

interface Props {
  label: string
  value: number
  min: number
  max: number
  step?: number
  labelWidth?: number
  onChange: (v: number) => void
  format?: (v: number) => string
}

export default function AnimatedSlider({ label, value: propValue, min, max, step = 1, labelWidth = 48, onChange, format }: Props) {
  const [local, setLocal] = useState(propValue)
  const committed = useRef(propValue)
  const isDragging = useRef(false)
  const value = isDragging.current ? local : propValue
  const pct = ((value - min) / (max - min)) * 100

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = +e.target.value
    setLocal(v)
    isDragging.current = true
  }, [])

  const handleUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false
      if (local !== committed.current) {
        committed.current = local
        onChange(local)
      }
    }
  }, [local, onChange])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label style={{
        color: 'var(--color-text-secondary)', fontSize: 11, minWidth: labelWidth,
        textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 500,
      }}>{label}</label>
      <div style={{ flex: 1, position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2,
          background: 'var(--color-surface-hover)', overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: 'var(--color-accent)', borderRadius: 2,
            transition: 'width 0.05s',
          }} />
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={handleChange}
          onPointerUp={handleUp}
          onPointerLeave={handleUp}
          style={{
            position: 'absolute', left: 0, right: 0, height: 20, margin: 0, padding: 0,
            opacity: 0, cursor: 'pointer', zIndex: 2,
          }} />
      </div>
      <span style={{
        color: 'var(--color-text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)',
        minWidth: 36, textAlign: 'right',
      }}>{format ? format(value) : value}</span>
    </div>
  )
}
