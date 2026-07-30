import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import ModeToggle from './ModeToggle'

type Mode = '3d' | 'gif' | 'static'

interface Props {
  mode: Mode
  onModeChange: (v: Mode) => void
  sidebar: ReactNode
  children: ReactNode
}

export default function StudioShell({ mode, onModeChange, sidebar, children }: Props) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--color-void)', color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-sans)', overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        height: 'var(--topbar-height)', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 16px',
        borderBottom: '1px solid var(--color-border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>AsciiStudio</span>
          <span style={{
            fontSize: 10, color: 'var(--color-text-tertiary)', padding: '2px 6px',
            border: '1px solid var(--color-border-subtle)', borderRadius: 4,
          }}>beta</span>
        </div>
        <ModeToggle value={mode} onChange={onModeChange} />
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <motion.aside layout style={{
          width: 'var(--sidebar-width)', flexShrink: 0,
          background: 'var(--color-surface-base)',
          borderRight: '1px solid var(--color-border-subtle)',
          overflow: 'hidden auto', display: 'flex', flexDirection: 'column',
        }}>
          {sidebar}
        </motion.aside>

        {/* Preview */}
        <main style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative', background: '#000000',
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}
