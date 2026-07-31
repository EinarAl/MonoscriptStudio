import { type ReactNode, useState, useCallback, useRef, useEffect } from 'react'
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

const MAXIMIZE_PATH = 'M0.5 9.7046 L0.5 21.7046 M0.5 21.7046 L12.5 21.7046 M21.5 12.7046 L21.5 0.7046 M21.4348 0.5 L9 0.5'
const MINIMIZE_PATH = 'M0.5 0.5 L0.5 21.5 M0.5 21.5 L21.5 21.5 M21.5 21.5 L21.5 0.5 M21.5 0.5 L0.5 0.5'

export default function StudioShell({ mode, onModeChange, leftSidebar, rightSidebar, children }: Props) {
  const [leftOpen, setLeftOpen] = useState(() => window.innerWidth > 768)
  const [rightOpen, setRightOpen] = useState(() => window.innerWidth > 768)
  const [leftW, setLeftW] = useState(LEFT_DEFAULT)
  const [rightW, setRightW] = useState(RIGHT_DEFAULT)
  const prevLeft = useRef(LEFT_DEFAULT)
  const prevRight = useRef(RIGHT_DEFAULT)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      /* fullscreen request rejected */
    }
  }, [])

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ModeToggle value={mode} onChange={onModeChange} />
        </div>
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
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            style={{
              position: 'absolute', top: 10, right: 12, zIndex: 30,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, padding: 0,
              background: 'transparent', border: 'none',
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer', transition: 'color 0.15s ease, opacity 0.15s ease',
              opacity: isFullscreen ? 0.9 : 0.5,
            }}
          >
            <svg width={16} height={16} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
              <motion.path
                initial={false}
                animate={{ d: isFullscreen ? MINIMIZE_PATH : MAXIMIZE_PATH }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              />
            </svg>
          </button>
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
