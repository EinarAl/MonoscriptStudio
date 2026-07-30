import { filters } from '../lib/filters'

interface Props {
  activeFilters: string[]
  filterParams: Record<string, Record<string, number>>
  onChange: (active: string[]) => void
  onParamChange: (filterId: string, key: string, value: number) => void
}

export default function FilterPanel({ activeFilters, filterParams, onChange, onParamChange }: Props) {
  const toggle = (id: string) => {
    if (activeFilters.includes(id)) {
      onChange(activeFilters.filter(v => v !== id))
    } else {
      onChange([...activeFilters, id])
    }
  }

  const slider = (filterId: string, key: string, label: string, min: number, max: number, step: number, def: number) => {
    const val = filterParams[filterId]?.[key] ?? def
    return (
      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#777', fontSize: 10, minWidth: 32 }}>{label}:</span>
        <input type="range" min={min} max={max} step={step} value={val}
          onChange={e => onParamChange(filterId, key, +e.target.value)}
          style={{ width: 60, accentColor: '#4f46e5' }} />
        <span style={{ color: '#999', fontSize: 10, minWidth: 28 }}>{val.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
    )
  }

  const sliders = (filterId: string, params: NonNullable<typeof filters[number]['params']>) => {
    const result = params.map(p =>
      slider(filterId, p.key, p.label, p.min, p.max, p.step, p.default)
    )
    result.push(slider(filterId, 'intensity', 'Intensity', 0, 1, 0.05, 1))
    return result
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {filters.map(f => {
        const on = activeFilters.includes(f.id)
        return (
          <div key={f.id} style={{
            display: 'flex', flexDirection: 'column', gap: 2,
            padding: '3px 6px', borderRadius: 4,
            background: on ? 'rgba(79,70,229,0.2)' : 'transparent',
            border: `1px solid ${on ? '#4f46e5' : '#333'}`,
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#999', fontSize: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={on} onChange={() => toggle(f.id)}
                style={{ accentColor: '#4f46e5', margin: 0 }} />
              {f.label}
            </label>
            {on && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {f.params && f.params.length > 0 ? sliders(f.id, f.params) : slider(f.id, 'intensity', 'Intensity', 0, 1, 0.05, 1)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
