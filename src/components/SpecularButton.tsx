import { type ReactNode } from 'react'

interface Props {
  children: ReactNode
  onClick: () => void
  style?: React.CSSProperties
  active?: boolean
}

export default function SpecularButton({ children, onClick, style, active }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative', overflow: 'hidden', isolation: 'isolate',
        flex: 1, background: 'none', border: '1px solid var(--color-border-visible)',
        borderRadius: 4, padding: '4px 0', color: active ? '#fff' : 'var(--color-text-secondary)',
        fontSize: 10, cursor: 'pointer',
        transition: 'color 0.2s, border-color 0.2s',
        ...style,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.borderColor = 'var(--color-accent)'
        const s = el.querySelector('.specular-shine') as HTMLDivElement
        if (s) { s.style.opacity = '1'; s.style.transform = 'translateX(100%)' }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        if (!active) el.style.borderColor = 'var(--color-border-visible)'
        const s = el.querySelector('.specular-shine') as HTMLDivElement
        if (s) { s.style.opacity = '0'; s.style.transform = 'translateX(-100%)' }
      }}
    >
      <div className="specular-shine" style={{
        position: 'absolute', inset: 0, zIndex: -1,
        opacity: 0, transform: 'translateX(-100%)',
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
        transition: 'opacity 0.25s, transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1)',
        pointerEvents: 'none',
      }} />
      {children}
    </button>
  )
}
