import { type ReactNode, createContext, useContext, useState } from 'react'
import { motion } from 'framer-motion'

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
      <motion.div
        onClick={onClick}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileHover={{ scale: 1.015 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px',
          cursor: 'pointer', userSelect: 'none',
          background: active ? 'var(--color-accent-glow)' : 'transparent',
          borderBottom: '1px solid var(--color-border-subtle)',
          ...style,
        }}
      >
        {children}
      </motion.div>
    </HoverCtx.Provider>
  )
}
