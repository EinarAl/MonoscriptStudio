import { motion } from 'framer-motion'

interface Props {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  format?: (v: number) => string
}

export default function AnimatedSlider({ label, value, min, max, step = 1, onChange, format }: Props) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label style={{
        color: 'var(--color-text-secondary)', fontSize: 11, minWidth: 48,
        textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 500,
      }}>{label}</label>
      <div style={{ flex: 1, position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2,
          background: 'var(--color-surface-hover)', overflow: 'hidden',
        }}>
          <motion.div layout style={{
            width: `${pct}%`, height: '100%',
            background: 'var(--color-accent)', borderRadius: 2,
          }} />
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(+e.target.value)}
          style={{
            position: 'absolute', left: 0, right: 0, height: 20, margin: 0, padding: 0,
            opacity: 0, cursor: 'pointer', zIndex: 2,
          }} />
        <motion.div style={{
          position: 'absolute', width: 14, height: 14, borderRadius: '50%',
          background: 'var(--color-text-primary)',
          boxShadow: '0 0 6px var(--color-accent-glow)',
          left: `calc(${pct}% - 7px)`, pointerEvents: 'none', zIndex: 1,
        }} />
      </div>
      <span style={{
        color: 'var(--color-text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)',
        minWidth: 36, textAlign: 'right',
      }}>{format ? format(value) : value}</span>
    </div>
  )
}
