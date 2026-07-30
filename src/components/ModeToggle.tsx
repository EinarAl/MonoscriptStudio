import { motion } from 'framer-motion'

type Mode = '3d' | 'gif' | 'static'

const modes: { id: Mode; label: string }[] = [
  { id: '3d', label: '3D' },
  { id: 'gif', label: 'GIF' },
  { id: 'static', label: 'Static' },
]

interface Props {
  value: Mode
  onChange: (v: Mode) => void
}

export default function ModeToggle({ value, onChange }: Props) {
  return (
    <div style={{
      display: 'flex', gap: 2, padding: 2,
      background: 'var(--surface-raised)',
      borderRadius: 'var(--radius-pill)', isolation: 'isolate',
    }}>
      {modes.map(m => {
        const active = value === m.id
        return (
          <button key={m.id} onClick={() => onChange(m.id)} style={{
            position: 'relative', padding: '6px 16px', border: 'none',
            background: 'transparent', color: active ? '#000' : 'var(--color-text-secondary)',
            fontSize: 13, fontWeight: 500, borderRadius: 'var(--radius-pill)',
            cursor: 'pointer', transition: 'color 0.2s',
          }}>
            {active && (
              <motion.div layoutId="mode-bg" style={{
                position: 'absolute', inset: 0, borderRadius: 'var(--radius-pill)',
                background: 'var(--color-accent)', zIndex: -1,
              }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
            )}
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
