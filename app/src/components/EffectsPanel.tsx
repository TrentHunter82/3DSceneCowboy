import { usePostProcessingStore } from '../stores/usePostProcessingStore'
import { CollapsibleSection } from './ui/CollapsibleSection'
import { RotaryKnob } from './ui/RotaryKnob'

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
        <h2 className="text-[11px] font-semibold text-dust-100 uppercase tracking-[0.12em] label-engraved">
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
          <div className="flex items-center justify-around gap-1 mb-2">
            <RotaryKnob
              value={bloom.intensity}
              onChange={v => updateBloom({ intensity: v })}
              label="Intensity"
              size="sm"
              min={0}
              max={5}
              step={0.1}
              accent="rust"
              disabled={muted || !bloom.enabled}
            />
            <RotaryKnob
              value={bloom.threshold}
              onChange={v => updateBloom({ threshold: v })}
              label="Threshold"
              size="sm"
              min={0}
              max={1}
              step={0.01}
              accent="cyan"
              disabled={muted || !bloom.enabled}
            />
            <RotaryKnob
              value={bloom.radius}
              onChange={v => updateBloom({ radius: v })}
              label="Radius"
              size="sm"
              min={0}
              max={1}
              step={0.01}
              accent="rust"
              disabled={muted || !bloom.enabled}
            />
          </div>
        </CollapsibleSection>

        {/* SSAO */}
        <CollapsibleSection title="SSAO" defaultOpen={false}>
          <EffectToggle
            label="Enabled"
            enabled={ssao.enabled}
            onChange={v => updateSSAO({ enabled: v })}
            disabled={muted}
          />
          <div className="flex items-center justify-around gap-1 mb-2">
            <RotaryKnob
              value={ssao.intensity}
              onChange={v => updateSSAO({ intensity: v })}
              label="AO Int."
              size="sm"
              min={0}
              max={50}
              step={1}
              accent="rust"
              disabled={muted || !ssao.enabled}
            />
            <RotaryKnob
              value={ssao.radius}
              onChange={v => updateSSAO({ radius: v })}
              label="AO Radius"
              size="sm"
              min={0}
              max={10}
              step={0.1}
              accent="cyan"
              disabled={muted || !ssao.enabled}
            />
            <RotaryKnob
              value={ssao.bias}
              onChange={v => updateSSAO({ bias: v })}
              label="Bias"
              size="sm"
              min={0}
              max={0.1}
              step={0.001}
              accent="rust"
              disabled={muted || !ssao.enabled}
            />
          </div>
        </CollapsibleSection>

        {/* Vignette */}
        <CollapsibleSection title="Vignette" defaultOpen={false}>
          <EffectToggle
            label="Enabled"
            enabled={vignette.enabled}
            onChange={v => updateVignette({ enabled: v })}
            disabled={muted}
          />
          <div className="flex items-center justify-around gap-1 mb-2">
            <RotaryKnob
              value={vignette.offset}
              onChange={v => updateVignette({ offset: v })}
              label="Offset"
              size="sm"
              min={0}
              max={1}
              step={0.01}
              accent="cyan"
              disabled={muted || !vignette.enabled}
            />
            <RotaryKnob
              value={vignette.darkness}
              onChange={v => updateVignette({ darkness: v })}
              label="Darkness"
              size="sm"
              min={0}
              max={1}
              step={0.01}
              accent="rust"
              disabled={muted || !vignette.enabled}
            />
          </div>
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
