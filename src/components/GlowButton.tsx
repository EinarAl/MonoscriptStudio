import { useRef, useEffect, type CSSProperties, type ReactNode, type MouseEventHandler } from 'react'
import './GlowButton.css'

type ButtonSize = 'sm' | 'md' | 'lg'

export interface GlowButtonProps {
  children?: ReactNode
  size?: ButtonSize
  radius?: number
  tint?: string
  tintOpacity?: number
  blur?: number
  textColor?: string
  lineColor?: string
  baseColor?: string
  intensity?: number
  disabled?: boolean
  onClick?: MouseEventHandler<HTMLButtonElement>
  className?: string
  type?: 'button' | 'submit' | 'reset'
  style?: CSSProperties
  active?: boolean
  onDragOver?: (e: React.DragEvent<HTMLButtonElement>) => void
  onDragLeave?: (e: React.DragEvent<HTMLButtonElement>) => void
  onDrop?: (e: React.DragEvent<HTMLButtonElement>) => void
}

const GlowButton = ({
  children = 'Get Started',
  size = 'lg',
  radius = 18,
  textColor = '#f5f5f5',
  lineColor = '#ffffff',
  intensity = 1,
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  style,
  active = false,
  onDragOver,
  onDragLeave,
  onDrop,
}: GlowButtonProps) => {
  const btnRef = useRef<HTMLButtonElement>(null)
  const fxRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const btn = btnRef.current
    const fx = fxRef.current
    if (!btn || !fx) return

    fx.style.opacity = '0'

    let pointerAngle: number | null = null
    let proximityT = 0
    let angle = 2.4
    let bright = 0
    let last = performance.now()
    let raf = 0

    const onPointerMove = (e: PointerEvent) => {
      const rect = btn.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right)
      const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom)
      const dist = Math.hypot(dx, dy)
      if (dist === 0) {
        const px = e.clientX - cx
        const py = cy - e.clientY
        pointerAngle = Math.atan2(px, py)
        proximityT = 1
      } else {
        proximityT = 0
      }
    }
    window.addEventListener('pointermove', onPointerMove)

    const update = (now: number) => {
      raf = requestAnimationFrame(update)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      const steer = pointerAngle != null && proximityT > 0
      const target = steer ? pointerAngle! : angle
      const diff = ((target - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
      angle += diff * (1 - Math.exp(-dt * 7))

      if (proximityT > 0) {
        bright = 1
      } else if (bright > 0) {
        bright += (0 - bright) * (1 - Math.exp(-dt * 8))
      }

      fx.style.setProperty('--glow-angle', angle + 'rad')
      fx.style.opacity = String(Math.min(1, bright * intensity * 0.35))
    }
    raf = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [intensity])

  const effectiveTextColor = active ? '#fff' : textColor

  return (
    <button
      ref={btnRef}
      type={type}
      disabled={disabled}
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`specular-button specular-button--${size}${active ? ' specular-button--active' : ''}${className ? ` ${className}` : ''}`}
      style={{
        '--sb-radius': `${radius}px`,
        '--sb-line-color': lineColor,
        '--sb-intensity': intensity,
        '--sb-text-color': effectiveTextColor,
        ...style,
      } as CSSProperties}
    >
      <span ref={fxRef} className="specular-button__fx" aria-hidden="true" />
      <span className="specular-button__label">{children}</span>
    </button>
  )
}

export default GlowButton
