import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  label: string
  defaultOpen?: boolean
  children: ReactNode
}

export default function ControlSection({ label, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [hovered, setHovered] = useState(false)
  const lit = open || hovered

  return (
    <div style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
      <motion.button
        whileHover={{ scale: 1.015 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', border: 'none', background: 'transparent',
          color: lit ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          fontSize: 11, fontWeight: 600,
          letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
          transformOrigin: 'left center',
        }}>
        <motion.svg animate={{ rotate: open ? 90 : 0 }} width="10" height="10" viewBox="0 0 10 10" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ lineHeight: 1, flexShrink: 0 }}>
          <path d="M3.5 2L6.5 5L3.5 8"/>
        </motion.svg>
        {label}
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '4px 16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
