import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { presets } from '../lib/filters'
import type { PresetDef } from '../lib/filters'
import AnimatedRow, { useRowHover } from './AnimatedRow'
import GlowButton from './GlowButton'
import RangeSlider from './RangeSlider'

interface Props {
  value: string[]
  strength: Record<string, number>
  onChange: (v: string[]) => void
  onStrengthChange: (id: string, val: number) => void
}

const STORAGE_KEY = 'ascii-studio-custom-presets'

function loadCustomPresets(): PresetDef[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

export default function PresetManager({ value, strength, onChange, onStrengthChange }: Props) {
  const [customPresets, setCustomPresets] = useState<PresetDef[]>(() => loadCustomPresets())
  const [saving, setSaving] = useState(false)
  const [saveName, setSaveName] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets)) }, [customPresets])

  function RowLabel({ children, on }: { children: string; on: boolean }) {
    const hovered = useRowHover()
    return (
      <span style={{ fontSize: 12, color: hovered ? 'var(--color-text-primary)' : on ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
        {children}
      </span>
    )
  }

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  }

  const deleteCustom = useCallback((id: string) => {
    setCustomPresets(prev => prev.filter(p => p.id !== id))
    if (value.includes(id)) onChange(value.filter(v => v !== id))
  }, [value, onChange])

  const saveCurrent = useCallback(() => {
    if (!saveName.trim()) return
    setCustomPresets(prev => [...prev, { id: 'custom-' + Date.now(), label: saveName.trim(), filters: [] }])
    setSaveName('')
    setSaving(false)
  }, [saveName])

  const handleExport = useCallback(() => {
    if (!customPresets.length) return
    const blob = new Blob([JSON.stringify(customPresets, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'ascii-studio-presets.json'; a.click()
    URL.revokeObjectURL(url)
  }, [customPresets])

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported: PresetDef[] = JSON.parse(reader.result as string)
        if (!Array.isArray(imported)) return
        setCustomPresets(prev => {
          const ids = new Set(prev.map(p => p.id))
          return [...prev, ...imported.filter(p => p.id && p.label && !ids.has(p.id))]
        })
      } catch {}
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '8px 16px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}>
        Presets
      </div>
      {presets.map(p => {
        const on = value.includes(p.id)
        return (
          <div key={p.id}>
            <AnimatedRow active={on} onClick={() => toggle(p.id)}>
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 7, flexShrink: 0 }}>
                {on ? '\u25CF' : '\u25CB'}
              </span>
              <RowLabel on={on}>{p.label}</RowLabel>
              {on && (
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: 9, marginLeft: 4 }}>
                  {((strength[p.id] ?? 1) * 100).toFixed(0)}%
                </span>
              )}
            </AnimatedRow>
            {on && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                transition={{ duration: 0.15 }}
                style={{ padding: '2px 16px 6px 31px', borderBottom: '1px solid var(--color-border-subtle)', overflow: 'hidden' }}
              >
                <RangeSlider label="Intensity" min={0} max={1} step={0.05}
                  value={strength[p.id] ?? 1}
                  onChange={v => onStrengthChange(p.id, v)}
                />
              </motion.div>
            )}
          </div>
        )
      })}
      {customPresets.map(p => (
        <div key={p.id}>
          <AnimatedRow active={value.includes(p.id)} onClick={() => toggle(p.id)}>
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 7, flexShrink: 0 }}>
              {value.includes(p.id) ? '\u25CF' : '\u25CB'}
            </span>
            <RowLabel on={value.includes(p.id)}>{p.label}</RowLabel>
            <button onClick={e => { e.stopPropagation(); deleteCustom(p.id) }}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', fontSize: 13, padding: '0 2px', lineHeight: 1 }}>
              ×
            </button>
            {value.includes(p.id) && (
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 9, marginLeft: 4 }}>
                {((strength[p.id] ?? 1) * 100).toFixed(0)}%
              </span>
            )}
          </AnimatedRow>
          {value.includes(p.id) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                transition={{ duration: 0.15 }}
                style={{ padding: '2px 16px 6px 31px', borderBottom: '1px solid var(--color-border-subtle)', overflow: 'hidden' }}
              >
                <RangeSlider label="Intensity" min={0} max={1} step={0.05}
                  value={strength[p.id] ?? 1}
                  onChange={v => onStrengthChange(p.id, v)}
                />
              </motion.div>
          )}
        </div>
      ))}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
        {saving ? (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <input value={saveName} onChange={e => setSaveName(e.target.value)}
              placeholder="Preset name"
              onKeyDown={e => e.key === 'Enter' && saveCurrent()}
              style={{ flex: 1, minWidth: 60, background: 'var(--color-surface-base)', border: '1px solid var(--color-border-visible)', borderRadius: 4, padding: '3px 6px', fontSize: 11, color: 'var(--color-text-primary)', outline: 'none' }}
              autoFocus />
            <GlowButton onClick={saveCurrent} active
              radius={0} textColor="var(--color-text-secondary)" style={{ padding: '4px 10px', fontSize: 11 }}>Save</GlowButton>
            <GlowButton onClick={() => { setSaving(false); setSaveName('') }}
              radius={0} textColor="var(--color-text-secondary)" style={{ padding: '4px 10px', fontSize: 11 }}>Cancel</GlowButton>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <GlowButton onClick={() => setSaving(true)}
              radius={0} textColor="var(--color-text-secondary)" lineColor="#ffffff" intensity={1.5} style={{ width: '100%', padding: '4px 10px', fontSize: 11 }}>Save Current</GlowButton>
            <GlowButton onClick={handleExport}
              radius={0} textColor="var(--color-text-secondary)" lineColor="#ffffff" intensity={1.5} style={{ flex: 1, padding: '4px 10px', fontSize: 11 }}>Export</GlowButton>
            <GlowButton onClick={() => importRef.current?.click()}
              radius={0} textColor="var(--color-text-secondary)" lineColor="#ffffff" intensity={1.5} style={{ flex: 1, padding: '4px 10px', fontSize: 11 }}>Import</GlowButton>
            <input ref={importRef} type="file" accept=".json" onChange={handleImport} hidden />
          </div>
        )}
      </div>
    </div>
  )
}
