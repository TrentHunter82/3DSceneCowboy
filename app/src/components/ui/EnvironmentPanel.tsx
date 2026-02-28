import { useSceneStore } from '../../stores/useSceneStore'
import { CollapsibleSection } from './CollapsibleSection'

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
            <div>
              <label className="text-xs text-dust-300 mb-1 block">Near: {environment.fogNear}</label>
              <input
                type="range"
                min={1}
                max={50}
                value={environment.fogNear}
                aria-label="Fog near distance"
                onChange={e => updateEnvironment({ fogNear: parseInt(e.target.value) })}
                className="w-full accent-rust-500"
              />
            </div>
            <div>
              <label className="text-xs text-dust-300 mb-1 block">Far: {environment.fogFar}</label>
              <input
                type="range"
                min={10}
                max={200}
                value={environment.fogFar}
                aria-label="Fog far distance"
                onChange={e => updateEnvironment({ fogFar: parseInt(e.target.value) })}
                className="w-full accent-rust-500"
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
