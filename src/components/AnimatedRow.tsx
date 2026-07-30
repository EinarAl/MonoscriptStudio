import { type ReactNode } from 'react'
import { motion } from 'framer-motion'

interface Props {
  children: ReactNode
  active: boolean
  onClick: () => void
  style?: React.CSSProperties
}

export default function AnimatedRow({ children, active, onClick, style }: Props) {
  return (
    <motion.div
      onClick={onClick}
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
  )
}
