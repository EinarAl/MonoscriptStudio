import { motion } from 'framer-motion'
import { filters } from '../lib/filters'
import AnimatedRow from './AnimatedRow'
import RangeSlider from './RangeSlider'

interface Props {
  activeFilters: string[]
  filterParams: Record<string, Record<string, number>>
  onChange: (active: string[]) => void
  onParamChange: (filterId: string, key: string, value: number) => void
}

export default function FilterList({ activeFilters, filterParams, onChange, onParamChange }: Props) {
  const toggle = (id: string) => {
    onChange(activeFilters.includes(id)
      ? activeFilters.filter(v => v !== id)
      : [...activeFilters, id])
  }

  const labelStyle = (on: boolean): React.CSSProperties => ({
    fontSize: 12,
    color: on ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '8px 16px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}>
        Effects
      </div>
      {filters.map(f => {
        const on = activeFilters.includes(f.id)
        return (
          <div key={f.id}>
            <AnimatedRow active={on} onClick={() => toggle(f.id)}>
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 7, flexShrink: 0 }}>
                {on ? '\u25CF' : '\u25CB'}
              </span>
              <motion.span
                whileHover={{ color: 'var(--color-text-primary)' }}
                style={labelStyle(on)}
              >
                {f.label}
              </motion.span>
              {on && (
                <span style={{ marginLeft: 'auto', color: 'var(--color-text-tertiary)', fontSize: 9 }}>
                  {(filterParams[f.id]?.intensity ?? 1) * 100}%
                </span>
              )}
            </AnimatedRow>
            {on && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                transition={{ duration: 0.15 }}
                style={{ padding: '4px 16px 6px 31px', borderBottom: '1px solid var(--color-border-subtle)', overflow: 'hidden' }}
              >
                {f.params?.map(p =>
                  <RangeSlider key={p.key}
                    label={p.label} min={p.min} max={p.max} step={p.step}
                    value={filterParams[f.id]?.[p.key] ?? p.default}
                    onChange={v => onParamChange(f.id, p.key, v)}
                  />
                )}
                <RangeSlider label="Intensity" min={0} max={1} step={0.05}
                  value={filterParams[f.id]?.intensity ?? 1}
                  onChange={v => onParamChange(f.id, 'intensity', v)}
                />
              </motion.div>
            )}
          </div>
        )
      })}
    </div>
  )
}
