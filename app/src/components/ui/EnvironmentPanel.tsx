import { useSceneStore } from '../../stores/useSceneStore'
import { CollapsibleSection } from './CollapsibleSection'
import { RotaryKnob } from './RotaryKnob'

export function EnvironmentPanel() {
  const environment = useSceneStore(s => s.environment)
  const updateEnvironment = useSceneStore(s => s.updateEnvironment)

  return (
    <div className="border-t border-dust-600/25">
      <CollapsibleSection title="Environment" defaultOpen={false}>
        {/* Grid */}
        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={environment.gridVisible}
            onChange={e => updateEnvironment({ gridVisible: e.target.checked })}
            className="accent-rust-500"
          />
          <span className="text-xs text-dust-300">Show Grid</span>
        </label>

        {/* Fog */}
        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={environment.fogEnabled}
            onChange={e => updateEnvironment({ fogEnabled: e.target.checked })}
            className="accent-rust-500"
          />
          <span className="text-xs text-dust-300">Enable Fog</span>
        </label>

        {environment.fogEnabled && (
          <div className="space-y-2 ml-5 mb-2">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={environment.fogColor}
                aria-label="Fog color"
                onChange={e => updateEnvironment({ fogColor: e.target.value })}
                className="w-5 h-5 rounded border border-dust-600 cursor-pointer bg-transparent"
              />
              <span className="text-xs text-dust-500 font-mono">{environment.fogColor}</span>
            </div>
            <div className="flex items-center justify-around gap-1">
              <RotaryKnob
                value={environment.fogNear}
                onChange={v => updateEnvironment({ fogNear: Math.round(v) })}
                label="Near"
                size="sm"
                min={1}
                max={50}
                step={1}
                accent="cyan"
                aria-label="Fog near distance"
              />
              <RotaryKnob
                value={environment.fogFar}
                onChange={v => updateEnvironment({ fogFar: Math.round(v) })}
                label="Far"
                size="sm"
                min={10}
                max={200}
                step={1}
                accent="rust"
                aria-label="Fog far distance"
              />
            </div>
          </div>
        )}

        {/* Background */}
        <div>
          <label className="text-xs text-dust-300 mb-1 block">Background</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={environment.backgroundColor}
              aria-label="Background color"
              onChange={e => updateEnvironment({ backgroundColor: e.target.value })}
              className="w-6 h-6 rounded border border-dust-600 cursor-pointer bg-transparent"
            />
            <span className="text-xs text-dust-500 font-mono">{environment.backgroundColor}</span>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  )
}
