import { useId } from 'react'
import { usePostProcessingStore } from '../stores/usePostProcessingStore'
import { CollapsibleSection } from './ui/CollapsibleSection'

function SliderInput({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  disabled = false,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-xs text-dust-400">{label}</label>
        <span className="text-xs text-dust-500 font-mono w-12 text-right">
          {value.toFixed(step < 0.01 ? 3 : 2)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-dust-700 rounded-lg appearance-none cursor-pointer accent-rust-500 disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </div>
  )
}

function EffectToggle({
  label,
  enabled,
  onChange,
  disabled = false,
}: {
  label: string
  enabled: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer mb-2">
      <input
        type="checkbox"
        checked={enabled}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        className="accent-rust-500 disabled:opacity-40 disabled:cursor-not-allowed"
      />
      <span className={`text-xs ${disabled ? 'text-dust-600' : 'text-dust-300'}`}>{label}</span>
    </label>
  )
}

export function EffectsPanel() {
  const enabled = usePostProcessingStore(s => s.enabled)
  const bloom = usePostProcessingStore(s => s.bloom)
  const ssao = usePostProcessingStore(s => s.ssao)
  const vignette = usePostProcessingStore(s => s.vignette)
  const setEnabled = usePostProcessingStore(s => s.setEnabled)
  const updateBloom = usePostProcessingStore(s => s.updateBloom)
  const updateSSAO = usePostProcessingStore(s => s.updateSSAO)
  const updateVignette = usePostProcessingStore(s => s.updateVignette)
  const resetDefaults = usePostProcessingStore(s => s.resetDefaults)

  const muted = !enabled

  return (
    <div className="w-60 bg-dust-800 border-l border-dust-600/25 flex flex-col shrink-0">
      <div className="px-3 py-2 border-b border-dust-600/25">
        <h2 className="text-xs font-bold text-dust-100 uppercase tracking-wider">
          Effects
        </h2>
      </div>

      <div className={`flex-1 overflow-y-auto ${muted ? 'opacity-50' : ''} transition-opacity`}>
        {/* Master toggle */}
        <div className="px-3 py-2 border-b border-dust-600/25">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              aria-label="Enable post-processing"
              className="accent-rust-500"
            />
            <span className="text-xs text-dust-300 font-semibold uppercase tracking-wider">
              Post-Processing
            </span>
          </label>
          {!enabled && (
            <p className="text-[10px] text-dust-500 mt-1">
              Enable to apply effects to the scene
            </p>
          )}
        </div>

        {/* Bloom */}
        <CollapsibleSection title="Bloom" defaultOpen={false}>
          <EffectToggle
            label="Enabled"
            enabled={bloom.enabled}
            onChange={v => updateBloom({ enabled: v })}
            disabled={muted}
          />
          <SliderInput
            label="Intensity"
            value={bloom.intensity}
            onChange={v => updateBloom({ intensity: v })}
            min={0}
            max={5}
            step={0.1}
            disabled={muted || !bloom.enabled}
          />
          <SliderInput
            label="Threshold"
            value={bloom.threshold}
            onChange={v => updateBloom({ threshold: v })}
            min={0}
            max={1}
            step={0.01}
            disabled={muted || !bloom.enabled}
          />
          <SliderInput
            label="Radius"
            value={bloom.radius}
            onChange={v => updateBloom({ radius: v })}
            min={0}
            max={1}
            step={0.01}
            disabled={muted || !bloom.enabled}
          />
        </CollapsibleSection>

        {/* SSAO */}
        <CollapsibleSection title="SSAO" defaultOpen={false}>
          <EffectToggle
            label="Enabled"
            enabled={ssao.enabled}
            onChange={v => updateSSAO({ enabled: v })}
            disabled={muted}
          />
          <SliderInput
            label="AO Intensity"
            value={ssao.intensity}
            onChange={v => updateSSAO({ intensity: v })}
            min={0}
            max={50}
            step={1}
            disabled={muted || !ssao.enabled}
          />
          <SliderInput
            label="AO Radius"
            value={ssao.radius}
            onChange={v => updateSSAO({ radius: v })}
            min={0}
            max={10}
            step={0.1}
            disabled={muted || !ssao.enabled}
          />
          <SliderInput
            label="Bias"
            value={ssao.bias}
            onChange={v => updateSSAO({ bias: v })}
            min={0}
            max={0.1}
            step={0.001}
            disabled={muted || !ssao.enabled}
          />
        </CollapsibleSection>

        {/* Vignette */}
        <CollapsibleSection title="Vignette" defaultOpen={false}>
          <EffectToggle
            label="Enabled"
            enabled={vignette.enabled}
            onChange={v => updateVignette({ enabled: v })}
            disabled={muted}
          />
          <SliderInput
            label="Offset"
            value={vignette.offset}
            onChange={v => updateVignette({ offset: v })}
            min={0}
            max={1}
            step={0.01}
            disabled={muted || !vignette.enabled}
          />
          <SliderInput
            label="Darkness"
            value={vignette.darkness}
            onChange={v => updateVignette({ darkness: v })}
            min={0}
            max={1}
            step={0.01}
            disabled={muted || !vignette.enabled}
          />
        </CollapsibleSection>
      </div>

      {/* Reset button */}
      <div className="px-3 py-2 border-t border-dust-600/25">
        <button
          onClick={resetDefaults}
          aria-label="Reset effects to defaults"
          className="w-full px-3 py-1.5 text-xs text-dust-300 bg-dust-700 rounded hover:bg-dust-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}
