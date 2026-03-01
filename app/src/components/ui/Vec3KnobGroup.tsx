import { useCallback } from 'react'
import { RotaryKnob } from './RotaryKnob'
import type { Vec3 } from '../../types/scene'

interface Vec3KnobGroupProps {
  label: string
  value: Vec3
  onChange: (value: Vec3) => void
  step?: number
  min?: number
  max?: number
  disabled?: boolean
  className?: string
}

export function Vec3KnobGroup({
  label,
  value,
  onChange,
  step = 0.1,
  min = -100,
  max = 100,
  disabled = false,
  className = '',
}: Vec3KnobGroupProps) {
  const handleX = useCallback((v: number) => onChange({ ...value, x: v }), [value, onChange])
  const handleY = useCallback((v: number) => onChange({ ...value, y: v }), [value, onChange])
  const handleZ = useCallback((v: number) => onChange({ ...value, z: v }), [value, onChange])

  return (
    <div className={`mb-2.5 ${className}`} role="group" aria-label={label}>
      <span className="text-[10px] text-dust-300 uppercase tracking-[0.06em] mb-1 block font-medium label-engraved">
        {label}
      </span>
      <div className="flex items-center justify-around gap-1">
        <RotaryKnob
          value={value.x}
          onChange={handleX}
          min={min}
          max={max}
          step={step}
          label="X"
          size="sm"
          accent="rust"
          disabled={disabled}
          aria-label={`${label} X`}
        />
        <RotaryKnob
          value={value.y}
          onChange={handleY}
          min={min}
          max={max}
          step={step}
          label="Y"
          size="sm"
          accent="cyan"
          disabled={disabled}
          aria-label={`${label} Y`}
        />
        <RotaryKnob
          value={value.z}
          onChange={handleZ}
          min={min}
          max={max}
          step={step}
          label="Z"
          size="sm"
          accent="rust"
          disabled={disabled}
          aria-label={`${label} Z`}
        />
      </div>
    </div>
  )
}
