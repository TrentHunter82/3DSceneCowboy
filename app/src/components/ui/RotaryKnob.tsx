import { useCallback, useRef, useMemo } from 'react'

interface RotaryKnobProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  size?: 'sm' | 'md' | 'lg'
  accent?: 'rust' | 'cyan'
  disabled?: boolean
  'aria-label'?: string
  precision?: number
  showValue?: boolean
  unit?: string
  className?: string
}

const SIZES = { sm: 28, md: 40, lg: 56 } as const
const KNURL_COUNTS = { sm: 20, md: 28, lg: 36 } as const

// 270° sweep with gap at bottom
const START_ANGLE = 135  // degrees from 12 o'clock (bottom-left)
const END_ANGLE = 405    // bottom-right (135 + 270)
const SWEEP = END_ANGLE - START_ANGLE

function angleToXY(angleDeg: number, radius: number, cx: number, cy: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = angleToXY(startDeg, r, cx, cy)
  const end = angleToXY(endDeg, r, cx, cy)
  const sweep = endDeg - startDeg
  const largeArc = sweep > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

function snapToStep(value: number, step: number): number {
  const result = Math.round(value / step) * step
  // Fix floating-point precision (e.g. 0.5 + 0.1 = 0.6000000000000001)
  const decimals = step.toString().split('.')[1]?.length ?? 0
  return Number(result.toFixed(decimals + 2))
}

export function RotaryKnob({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  label,
  size = 'md',
  accent = 'rust',
  disabled = false,
  'aria-label': ariaLabel,
  precision,
  showValue = true,
  unit = '',
  className = '',
}: RotaryKnobProps) {
  const knobRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null)

  const px = SIZES[size]
  const knurlCount = KNURL_COUNTS[size]
  const svgSize = px + 12 // padding for arc track
  const cx = svgSize / 2
  const cy = svgSize / 2
  const knobRadius = px / 2
  const trackRadius = knobRadius + 4
  const accentColor = accent === 'rust' ? '#ff7a2e' : '#34c6e0'
  const accentGlow = accent === 'rust' ? '#ff6600' : '#00d4ff'

  // Determine precision from step if not provided
  const displayPrecision = useMemo(() => {
    if (precision !== undefined) return precision
    const stepStr = step.toString()
    const dotIdx = stepStr.indexOf('.')
    return dotIdx === -1 ? 0 : stepStr.length - dotIdx - 1
  }, [precision, step])

  // Normalized 0-1 position
  const range = max - min
  const norm = range === 0 ? 0 : Math.max(0, Math.min(1, (value - min) / range))

  // Current angle
  const currentAngle = START_ANGLE + norm * SWEEP

  // Indicator dot position (on knob body)
  const indicatorR = knobRadius * 0.65
  const dot = angleToXY(currentAngle, indicatorR, cx, cy)

  // Knurling ticks
  const knurlTicks = useMemo(() => {
    const ticks = []
    for (let i = 0; i < knurlCount; i++) {
      const angle = (i / knurlCount) * 360
      const inner = angleToXY(angle, knobRadius - 2, cx, cy)
      const outer = angleToXY(angle, knobRadius, cx, cy)
      ticks.push({ x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y })
    }
    return ticks
  }, [knurlCount, knobRadius, cx, cy])

  const clampAndSnap = useCallback(
    (v: number) => {
      const snapped = snapToStep(v, step)
      return Math.max(min, Math.min(max, snapped))
    },
    [min, max, step]
  )

  // Pointer-based drag
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return
      e.preventDefault()
      const el = e.target as HTMLElement
      el.setPointerCapture?.(e.pointerId)
      dragRef.current = { startY: e.clientY, startValue: value }
    },
    [disabled, value]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || disabled) return
      const sensitivity = e.shiftKey ? 0.1 : 1
      const dy = dragRef.current.startY - e.clientY // up = increase
      const delta = (dy / 150) * range * sensitivity
      const newVal = clampAndSnap(dragRef.current.startValue + delta)
      if (newVal !== value) onChange(newVal)
    },
    [disabled, range, clampAndSnap, onChange, value]
  )

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  // Keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return
      const bigStep = step * 10
      let newVal: number | null = null
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowRight':
          e.preventDefault()
          newVal = clampAndSnap(value + (e.shiftKey ? bigStep : step))
          break
        case 'ArrowDown':
        case 'ArrowLeft':
          e.preventDefault()
          newVal = clampAndSnap(value - (e.shiftKey ? bigStep : step))
          break
        case 'Home':
          e.preventDefault()
          newVal = min
          break
        case 'End':
          e.preventDefault()
          newVal = max
          break
        case 'PageUp':
          e.preventDefault()
          newVal = clampAndSnap(value + bigStep)
          break
        case 'PageDown':
          e.preventDefault()
          newVal = clampAndSnap(value - bigStep)
          break
      }
      if (newVal !== null && newVal !== value) onChange(newVal)
    },
    [disabled, value, step, min, max, clampAndSnap, onChange]
  )

  const valueText = `${value.toFixed(displayPrecision)}${unit}`
  const filterId = `knob-glow-${accent}-${size}`

  return (
    <div
      className={`inline-flex flex-col items-center ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      {/* Engraved label */}
      {label && (
        <span className="text-[9px] text-dust-400 uppercase tracking-[0.08em] mb-0.5 font-medium label-engraved select-none">
          {label}
        </span>
      )}

      {/* Knob SVG */}
      <div
        ref={knobRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel || label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText}
        aria-disabled={disabled || undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className={`outline-none ${disabled ? '' : 'cursor-grab active:cursor-grabbing'} focus-visible:ring-1 focus-visible:ring-rust-500/60 rounded-full`}
        style={{ touchAction: 'none', width: svgSize, height: svgSize }}
      >
        <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          <defs>
            {/* Glow filter for active arc + indicator */}
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Radial gradient for knob body */}
            <radialGradient id={`knob-body-${size}`} cx="40%" cy="35%">
              <stop offset="0%" stopColor="#4a4a4a" />
              <stop offset="70%" stopColor="#2a2a2a" />
              <stop offset="100%" stopColor="#1a1a1a" />
            </radialGradient>
          </defs>

          {/* Layer 1: Knob body */}
          <circle
            cx={cx}
            cy={cy}
            r={knobRadius}
            fill={`url(#knob-body-${size})`}
          />

          {/* Layer 2: Knurling ticks */}
          {knurlTicks.map((tick, i) => (
            <line
              key={i}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="0.5"
            />
          ))}

          {/* Layer 3: Track arc (background groove) */}
          <path
            d={describeArc(cx, cy, trackRadius, START_ANGLE, END_ANGLE)}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Layer 4: Active arc */}
          {norm > 0.005 && (
            <path
              d={describeArc(cx, cy, trackRadius, START_ANGLE, currentAngle)}
              fill="none"
              stroke={accentColor}
              strokeWidth="3"
              strokeLinecap="round"
              filter={`url(#${filterId})`}
            />
          )}

          {/* Layer 5: Indicator dot */}
          <circle
            cx={dot.x}
            cy={dot.y}
            r={size === 'sm' ? 2 : size === 'md' ? 2.5 : 3}
            fill={accentColor}
            filter={`url(#${filterId})`}
          />

          {/* Layer 6: Edge bevel highlight */}
          <circle
            cx={cx}
            cy={cy}
            r={knobRadius}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="0.5"
          />
        </svg>
      </div>

      {/* LED value readout */}
      {showValue && (
        <span
          className="text-[9px] font-mono text-dust-300 mt-0.5 select-none"
          style={{ textShadow: `0 0 4px ${accentGlow}40` }}
        >
          {valueText}
        </span>
      )}
    </div>
  )
}
