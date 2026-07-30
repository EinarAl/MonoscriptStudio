import { PRESETS } from '../types'
import GlowButton from './GlowButton'

interface Props {
  value: string
  onChange: (v: string) => void
}

export default function CharSetPicker({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <label style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>Charset:</label>
      {Object.entries(PRESETS).map(([name, chars]) => (
        <GlowButton key={name} onClick={() => onChange(chars)} active={value === chars}
          radius={0} textColor="var(--color-text-secondary)" style={{ padding: '4px 10px', fontSize: 11, flex: 'none' }}>
          {name}
        </GlowButton>
      ))}
    </div>
  )
}
