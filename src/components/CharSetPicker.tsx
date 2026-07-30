import { PRESETS } from '../types'

interface Props {
  value: string
  onChange: (v: string) => void
}

export default function CharSetPicker({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <label style={{ color: '#999', fontSize: 12 }}>Charset:</label>
      {Object.entries(PRESETS).map(([name, chars]) => (
        <button
          key={name}
          onClick={() => onChange(chars)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: `1px solid ${value === chars ? '#4f46e5' : '#333'}`,
            background: value === chars ? 'rgba(79,70,229,0.2)' : 'transparent',
            color: value === chars ? '#fff' : '#999',
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
