import type { AnimationMode } from '../types'

interface Props {
  value: AnimationMode
  onChange: (v: AnimationMode) => void
}

const MODES: { value: AnimationMode; label: string; desc: string }[] = [
  { value: 'spin', label: 'Auto-Spin', desc: 'Continuous rotation only' },
  { value: 'tilt', label: 'Mouse Tilt', desc: 'Tilt with mouse, no spin' },
  { value: 'drag', label: 'Click-Drag', desc: 'Hold + drag to orbit, release to hold' },
]

export default function AnimationModePicker({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <label style={{ color: '#999', fontSize: 12 }}>Animation:</label>
      {MODES.map(m => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          title={m.desc}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: `1px solid ${value === m.value ? 'var(--color-accent)' : 'var(--color-border-visible)'}`,
            background: value === m.value ? 'var(--color-accent-glow)' : 'transparent',
            color: value === m.value ? '#fff' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
