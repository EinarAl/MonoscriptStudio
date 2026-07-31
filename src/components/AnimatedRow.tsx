import { type ReactNode, createContext, useContext, useState } from 'react'

const HoverCtx = createContext(false)

export function useRowHover() {
  return useContext(HoverCtx)
}

interface Props {
  children: ReactNode
  active: boolean
  onClick: () => void
  style?: React.CSSProperties
}

export default function AnimatedRow({ children, active, onClick, style }: Props) {
  const [hovered, setHovered] = useState(false)

  return (
    <HoverCtx.Provider value={hovered || active}>
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px',
          cursor: 'pointer', userSelect: 'none',
          background: active ? 'var(--color-accent-glow)' : hovered ? 'var(--color-surface-hover)' : 'transparent',
          transition: 'background 0.15s ease',
          borderBottom: '1px solid var(--color-border-subtle)',
          ...style,
        }}
      >
        {children}
      </div>
    </HoverCtx.Provider>
  )
}
