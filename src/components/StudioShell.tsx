import { type ReactNode, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import ModeToggle from './ModeToggle'

type Mode = '3d' | 'gif' | 'static'

interface Props {
  mode: Mode
  onModeChange: (v: Mode) => void
  leftSidebar: ReactNode
  rightSidebar: ReactNode
  children: ReactNode
}

const MIN_SIDEBAR = 80
const MAX_SIDEBAR = 500
const LEFT_DEFAULT = 220
const RIGHT_DEFAULT = 280

export default function StudioShell({ mode, onModeChange, leftSidebar, rightSidebar, children }: Props) {
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [leftW, setLeftW] = useState(LEFT_DEFAULT)
  const [rightW, setRightW] = useState(RIGHT_DEFAULT)
  const prevLeft = useRef(LEFT_DEFAULT)
  const prevRight = useRef(RIGHT_DEFAULT)

  const toggleLeft = useCallback(() => {
    if (leftOpen) {
      prevLeft.current = leftW
      setLeftOpen(false)
    } else {
      setLeftW(prevLeft.current)
      setLeftOpen(true)
    }
  }, [leftOpen, leftW])

  const toggleRight = useCallback(() => {
    if (rightOpen) {
      prevRight.current = rightW
      setRightOpen(false)
    } else {
      setRightW(prevRight.current)
      setRightOpen(true)
    }
  }, [rightOpen, rightW])

  const leftDrag = useRef(false)
  const onLeftResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    leftDrag.current = true
    const sx = e.clientX
    const sw = leftW
    const move = (ev: MouseEvent) => {
      if (!leftDrag.current) return
      setLeftW(Math.max(MIN_SIDEBAR, Math.min(MAX_SIDEBAR, sw + (ev.clientX - sx))))
    }
    const up = () => { leftDrag.current = false; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }, [leftW])

  const rightDrag = useRef(false)
  const onRightResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    rightDrag.current = true
    const sx = e.clientX
    const sw = rightW
    const move = (ev: MouseEvent) => {
      if (!rightDrag.current) return
      setRightW(Math.max(MIN_SIDEBAR, Math.min(MAX_SIDEBAR, sw - (ev.clientX - sx))))
    }
    const up = () => { rightDrag.current = false; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }, [rightW])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--color-void)', color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-sans)', overflow: 'hidden',
    }}>
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

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <motion.aside
          animate={{ width: leftOpen ? leftW : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
          style={{
            flexShrink: 0, overflow: 'hidden', position: 'relative',
            background: 'var(--color-surface-base)',
            borderRight: '1px solid var(--color-border-subtle)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ width: leftOpen ? leftW : prevLeft.current, height: '100%', overflow: 'hidden auto' }}>
            {leftSidebar}
          </div>
          {leftOpen && (
            <div
              onMouseDown={onLeftResize}
              style={{
                position: 'absolute', right: -3, top: 0, bottom: 0, width: 6,
                cursor: 'col-resize', zIndex: 10, background: 'transparent',
              }}
            />
          )}
        </motion.aside>

        <button onClick={toggleLeft}
          style={{
            position: 'absolute', left: leftOpen ? leftW - 1 : 0, top: '50%',
            translate: leftOpen ? '-100% -50%' : '0 -50%',
            zIndex: 20, padding: 0, border: 'none', background: 'none',
            color: 'var(--color-text-tertiary)', cursor: 'pointer',
            fontSize: 18, lineHeight: 1, opacity: 0.6,
          }}
        >
          {leftOpen ? '\u00AB' : '\u00BB'}
        </button>

        <main style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative', background: '#000000',
        }}>
          {children}
        </main>

        <button onClick={toggleRight}
          style={{
            position: 'absolute', right: rightOpen ? rightW - 1 : 0, top: '50%',
            translate: rightOpen ? '100% -50%' : '0 -50%',
            zIndex: 20, padding: 0, border: 'none', background: 'none',
            color: 'var(--color-text-tertiary)', cursor: 'pointer',
            fontSize: 18, lineHeight: 1, opacity: 0.6,
          }}
        >
          {rightOpen ? '\u00BB' : '\u00AB'}
        </button>

        <motion.aside
          animate={{ width: rightOpen ? rightW : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
          style={{
            flexShrink: 0, overflow: 'hidden', position: 'relative',
            background: 'var(--color-surface-base)',
            borderLeft: '1px solid var(--color-border-subtle)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ width: rightOpen ? rightW : prevRight.current, height: '100%', overflow: 'hidden auto' }}>
            {rightSidebar}
          </div>
          {rightOpen && (
            <div
              onMouseDown={onRightResize}
              style={{
                position: 'absolute', left: -3, top: 0, bottom: 0, width: 6,
                cursor: 'col-resize', zIndex: 10, background: 'transparent',
              }}
            />
          )}
        </motion.aside>
      </div>
    </div>
  )
}
