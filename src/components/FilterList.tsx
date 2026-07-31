import { motion } from 'framer-motion'
import { filters } from '../lib/filters'
import AnimatedRow, { useRowHover } from './AnimatedRow'
import AnimatedSlider from './AnimatedSlider'

interface Props {
  activeFilters: string[]
  filterParams: Record<string, Record<string, number>>
  onChange: (active: string[]) => void
  onParamChange: (filterId: string, key: string, value: number) => void
}

function RowLabel({ children, on }: { children: string; on: boolean }) {
  const hovered = useRowHover()
  return (
    <span style={{
      fontSize: 12,
      color: hovered ? 'var(--color-text-primary)' : on ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
    }}>
      {children}
    </span>
  )
}

export default function FilterList({ activeFilters, filterParams, onChange, onParamChange }: Props) {
  const toggle = (id: string) => {
    onChange(activeFilters.includes(id)
      ? activeFilters.filter(v => v !== id)
      : [...activeFilters, id])
  }

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
              <RowLabel on={on}>{f.label}</RowLabel>
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
                  <AnimatedSlider key={p.key}
                    label={p.label} labelWidth={40} min={p.min} max={p.max} step={p.step}
                    value={filterParams[f.id]?.[p.key] ?? p.default}
                    onChange={v => onParamChange(f.id, p.key, v)}
                  />
                )}
                <AnimatedSlider label="Int." labelWidth={40} min={0} max={1} step={0.05}
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
