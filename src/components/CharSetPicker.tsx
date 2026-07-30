import { PRESETS } from '../types'

interface Props {
  value: string
  onChange: (v: string) => void
}

export default function CharSetPicker({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <label style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>Charset:</label>
      {Object.entries(PRESETS).map(([name, chars]) => (
        <button
          key={name}
          onClick={() => onChange(chars)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: `1px solid ${value === chars ? 'var(--color-accent)' : 'var(--color-border-visible)'}`,
            background: value === chars ? 'var(--color-accent-glow)' : 'transparent',
            color: value === chars ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          {name}
        </button>
      ))}
    </div>
  )
}
