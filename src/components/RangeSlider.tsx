import { useState, useCallback, useRef } from 'react'

interface Props {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  label?: string
  format?: (v: number) => string
  style?: React.CSSProperties
}

export default function RangeSlider({ value, min, max, step, onChange, label, format, style }: Props) {
  const [local, setLocal] = useState(value)
  const dragging = useRef(false)
  const commitRef = useRef(onChange)
  commitRef.current = onChange

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = +e.target.value
    setLocal(v)
    if (!dragging.current) {
      commitRef.current(v)
    }
  }, [])

  const handlePointerDown = useCallback(() => {
    dragging.current = true
  }, [])

  const handlePointerUp = useCallback(() => {
    dragging.current = false
    commitRef.current(local)
  }, [local])

  const display = local !== value && dragging.current ? local : value

  return (
    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', ...style }}>
      {label && <span style={{ color: 'var(--color-text-tertiary)', fontSize: 10, minWidth: 44, flexShrink: 0 }}>{label}</span>}
      <input type="range" min={min} max={max} step={step} value={dragging.current ? local : value}
        onChange={handleChange}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          flex: 1, height: 4, borderRadius: 2, cursor: 'pointer',
          accentColor: 'var(--color-accent)',
          WebkitAppearance: 'none', appearance: 'none',
          background: 'var(--color-border-visible)',
          outline: 'none',
        }} />
      <span style={{ color: 'var(--color-text-tertiary)', fontSize: 9, minWidth: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {format ? format(display) : step < 1 ? display.toFixed(2) : display.toFixed(0)}
      </span>
    </div>
  )
}
