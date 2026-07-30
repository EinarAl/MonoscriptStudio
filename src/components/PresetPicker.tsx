import { presets } from '../lib/filters'

interface Props {
  value: string[]
  strength: Record<string, number>
  onChange: (v: string[]) => void
  onStrengthChange: (id: string, val: number) => void
}

export default function PresetPicker({ value, strength, onChange, onStrengthChange }: Props) {
  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter(v => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {presets.map(p => {
        const on = value.includes(p.id)
        return (
          <div key={p.id} style={{
            display: 'flex', flexDirection: 'column', gap: 2,
            padding: '2px 6px', borderRadius: 4,
            background: on ? 'rgba(79,70,229,0.2)' : 'transparent',
            border: `1px solid ${on ? '#4f46e5' : '#333'}`,
          }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 3,
              color: '#999', fontSize: 10, cursor: 'pointer',
            }}>
              <input type="checkbox" checked={on} onChange={() => toggle(p.id)}
                style={{ accentColor: '#4f46e5', margin: 0 }} />
              {p.label}
            </label>
            {on && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#aaa', fontSize: 10, minWidth: 38 }}>Intensity:</span>
                <input type="range" min={0} max={1} step={0.05} value={strength[p.id] ?? 1}
                  onChange={e => onStrengthChange(p.id, +e.target.value)}
                  style={{ width: 60, accentColor: '#4f46e5', margin: 0 }} />
                <span style={{ color: '#aaa', fontSize: 10, minWidth: 24 }}>{((strength[p.id] ?? 1) * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
