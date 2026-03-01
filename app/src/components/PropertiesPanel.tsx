import { useId, useRef, useCallback } from 'react'
import { useSceneStore } from '../stores/useSceneStore'
import { CollapsibleSection } from './ui/CollapsibleSection'
import { MaterialPresets } from './ui/MaterialPresets'
import { EmptyState } from './ui/EmptyState'
import type { Vec3, MaterialType, MaterialData, TextureMap, Vec2 } from '../types/scene'

const inputClass =
  'w-full bg-dust-900 border border-dust-600/50 rounded px-1.5 py-1 text-[11px] text-sand-200 hover:border-dust-500/70 focus:border-rust-500/50 focus:ring-1 focus:ring-rust-500/20 focus:outline-none transition-all duration-150'

function Vec3Input({
  label,
  value,
  onChange,
  step = 0.1,
}: {
  label: string
  value: Vec3
  onChange: (v: Vec3) => void
  step?: number
}) {
  const id = useId()
  return (
    <div className="mb-2.5" role="group" aria-label={label}>
      <span className="text-[10px] text-dust-300 uppercase tracking-[0.06em] mb-1 block font-medium">
        {label}
      </span>
      <div className="grid grid-cols-3 gap-1">
        {(['x', 'y', 'z'] as const).map(axis => (
          <div key={axis} className="flex items-center gap-1">
            <label htmlFor={`${id}-${axis}`} className="text-[10px] text-dust-500 w-3">{axis.toUpperCase()}</label>
            <input
              id={`${id}-${axis}`}
              type="number"
              value={value[axis]}
              step={step}
              aria-label={`${label} ${axis.toUpperCase()}`}
              onChange={e =>
                onChange({ ...value, [axis]: parseFloat(e.target.value) || 0 })
              }
              className={inputClass}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function SliderInput({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  const id = useId()
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-0.5">
        <label htmlFor={id} className="text-[10px] text-dust-300 font-medium">{label}</label>
        <span className="text-[10px] text-dust-400 font-mono w-8 text-right">
          {value.toFixed(2)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  )
}


function TextureMapInput({
  label,
  map,
  onChange,
  onClear,
}: {
  label: string
  map: TextureMap | undefined
  onChange: (map: TextureMap) => void
  onClear: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const defaultUV: Vec2 = { x: 1, y: 1 }
    const defaultOffset: Vec2 = { x: 0, y: 0 }
    onChange({ url, scale: map?.scale ?? defaultUV, offset: map?.offset ?? defaultOffset })
    e.target.value = ''
  }, [onChange, map])

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-dust-400">{label}</span>
        {map && (
          <button
            onClick={onClear}
            aria-label={`Remove ${label}`}
            className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
      {map ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded border border-dust-600 bg-dust-900 flex items-center justify-center text-[10px] text-dust-400 overflow-hidden">
              <img src={map.url} alt={label} className="w-full h-full object-cover" />
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 text-[10px] text-dust-300 bg-dust-700 rounded px-2 py-1 hover:bg-dust-600 transition-colors truncate"
            >
              Replace...
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div>
              <span className="text-[10px] text-dust-500">Tile U</span>
              <input
                type="number"
                value={map.scale.x}
                step={0.1}
                aria-label={`${label} tile U`}
                onChange={e => onChange({ ...map, scale: { ...map.scale, x: parseFloat(e.target.value) || 1 } })}
                className="w-full bg-dust-900 border border-dust-600 rounded px-1 py-0.5 text-[10px] text-sand-200 focus:border-rust-500 focus:outline-none"
              />
            </div>
            <div>
              <span className="text-[10px] text-dust-500">Tile V</span>
              <input
                type="number"
                value={map.scale.y}
                step={0.1}
                aria-label={`${label} tile V`}
                onChange={e => onChange({ ...map, scale: { ...map.scale, y: parseFloat(e.target.value) || 1 } })}
                className="w-full bg-dust-900 border border-dust-600 rounded px-1 py-0.5 text-[10px] text-sand-200 focus:border-rust-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full text-[10px] text-dust-400 bg-dust-900 border border-dashed border-dust-600 rounded px-2 py-2 hover:border-dust-500 hover:text-dust-300 transition-colors"
        >
          + Load texture...
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  )
}

const MATERIAL_TYPES: { value: MaterialType; label: string }[] = [
  { value: 'standard', label: 'Standard (PBR)' },
  { value: 'basic', label: 'Basic (Unlit)' },
  { value: 'phong', label: 'Phong (Classic)' },
]

export function PropertiesPanel() {
  const selectedId = useSceneStore(s => s.selectedId)
  const objects = useSceneStore(s => s.objects)
  const updateObject = useSceneStore(s => s.updateObject)

  const selected = objects.find(o => o.id === selectedId)

  if (!selected) {
    return (
      <div className="w-60 flex flex-col shrink-0">
        <div className="px-3 py-3 border-b border-dust-600/25 section-header">
          <h2 className="text-[11px] font-semibold text-dust-100 uppercase tracking-[0.12em] label-engraved">
            Properties
          </h2>
        </div>
        <EmptyState
          icon={'\u25C7'}
          title="No Selection"
          description="Select an object to view its properties"
        />
      </div>
    )
  }

  const material = selected.material

  const updateMaterial = (updates: Partial<MaterialData>) => {
    updateObject(selected.id, {
      material: { ...material, ...updates },
      ...(updates.color ? { color: updates.color } : {}),
    })
  }

  return (
    <div className="w-60 flex flex-col shrink-0">
      <div className="px-3 py-3 border-b border-dust-600/25 section-header">
        <h2 className="text-[11px] font-semibold text-dust-100 uppercase tracking-[0.12em] label-engraved">
          Properties
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Object Info (always visible) */}
        <div className="px-3 py-2.5 border-b border-dust-600/25">
          <input
            id="obj-name"
            type="text"
            value={selected.name}
            maxLength={64}
            aria-label="Object name"
            onChange={e => updateObject(selected.id, { name: e.target.value })}
            className="w-full bg-dust-900/80 border border-dust-600/50 rounded px-2 py-1 text-[12px] text-sand-200 hover:border-dust-500/70 focus:border-rust-500/50 focus:ring-1 focus:ring-rust-500/20 focus:outline-none transition-all duration-150"
          />
          <div className="text-[10px] text-dust-500 capitalize mt-1 tracking-wide">{selected.type}</div>
        </div>

        {/* Transform Section (collapsible) */}
        <CollapsibleSection title="Transform" variant="primary">
          <Vec3Input
            label="Position"
            value={selected.position}
            onChange={pos => updateObject(selected.id, { position: pos })}
          />
          <Vec3Input
            label="Rotation"
            value={selected.rotation}
            onChange={rot => updateObject(selected.id, { rotation: rot })}
            step={5}
          />
          <Vec3Input
            label="Scale"
            value={selected.scale}
            onChange={scl => updateObject(selected.id, { scale: scl })}
          />
        </CollapsibleSection>

        {/* Material Presets (collapsible) */}
        <CollapsibleSection title="Material Presets" variant="tertiary">
          <MaterialPresets onApply={updates => updateMaterial(updates)} />
        </CollapsibleSection>

        {/* Material Section (collapsible) */}
        <CollapsibleSection title="Material" variant="primary">
          {/* Material Type */}
          <div className="mb-2.5">
            <label htmlFor="mat-type" className="text-[10px] text-dust-300 mb-1 block font-medium">Type</label>
            <select
              id="mat-type"
              value={material.type}
              onChange={e => updateMaterial({ type: e.target.value as MaterialType })}
              className="w-full bg-dust-900/80 border border-dust-600/50 rounded px-2 py-1 text-[11px] text-sand-200 hover:border-dust-500/70 focus:border-rust-500/50 focus:ring-1 focus:ring-rust-500/20 focus:outline-none transition-all duration-150"
            >
              {MATERIAL_TYPES.map(mt => (
                <option key={mt.value} value={mt.value}>
                  {mt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div className="mb-2.5">
            <label className="text-[10px] text-dust-300 mb-1 block font-medium">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={material.color}
                aria-label="Material color picker"
                onChange={e => updateMaterial({ color: e.target.value })}
                className="w-7 h-7 rounded border border-dust-600 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={material.color}
                aria-label="Material color hex"
                pattern="#[0-9a-fA-F]{6}"
                maxLength={7}
                onChange={e => {
                  const val = e.target.value
                  if (val === '' || /^#[0-9a-fA-F]{0,6}$/.test(val)) {
                    updateMaterial({ color: val })
                  }
                }}
                className="flex-1 bg-dust-900/80 border border-dust-600 rounded px-2 py-1 text-[11px] text-sand-200 font-mono focus:border-rust-500/50 focus:ring-1 focus:ring-rust-500/20 focus:outline-none transition-all duration-150"
              />
            </div>
          </div>

          {/* Metalness & Roughness (standard material only) */}
          {material.type === 'standard' && (
            <>
              <SliderInput
                label="Metalness"
                value={material.metalness}
                onChange={v => updateMaterial({ metalness: v })}
              />
              <SliderInput
                label="Roughness"
                value={material.roughness}
                onChange={v => updateMaterial({ roughness: v })}
              />
            </>
          )}

          {/* Opacity */}
          <SliderInput
            label="Opacity"
            value={material.opacity}
            onChange={v => updateMaterial({ opacity: v, transparent: v < 1 })}
          />

          {/* Wireframe */}
          <div className="mb-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={material.wireframe}
                onChange={e => updateMaterial({ wireframe: e.target.checked })}
                className="accent-rust-500"
              />
              <span className="text-[11px] text-dust-300">Wireframe</span>
            </label>
          </div>
        </CollapsibleSection>

        {/* PBR Textures (standard material only) */}
        {material.type === 'standard' && (
          <CollapsibleSection title="PBR Textures" variant="tertiary">
            <TextureMapInput
              label="Normal Map"
              map={material.normalMap}
              onChange={m => updateMaterial({ normalMap: m })}
              onClear={() => updateMaterial({ normalMap: undefined })}
            />
            <TextureMapInput
              label="Roughness Map"
              map={material.roughnessMap}
              onChange={m => updateMaterial({ roughnessMap: m })}
              onClear={() => updateMaterial({ roughnessMap: undefined })}
            />
            <TextureMapInput
              label="Metalness Map"
              map={material.metalnessMap}
              onChange={m => updateMaterial({ metalnessMap: m })}
              onClear={() => updateMaterial({ metalnessMap: undefined })}
            />
            <TextureMapInput
              label="AO Map"
              map={material.aoMap}
              onChange={m => updateMaterial({ aoMap: m })}
              onClear={() => updateMaterial({ aoMap: undefined })}
            />

            {/* Emissive */}
            <div className="mt-2 pt-2 border-t border-dust-600/20">
              <TextureMapInput
                label="Emissive Map"
                map={material.emissiveMap}
                onChange={m => updateMaterial({ emissiveMap: m })}
                onClear={() => updateMaterial({ emissiveMap: undefined })}
              />
              <div className="mb-2">
                <span className="text-xs text-dust-400 mb-1 block">Emissive Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={material.emissiveColor ?? '#000000'}
                    aria-label="Emissive color picker"
                    onChange={e => updateMaterial({ emissiveColor: e.target.value })}
                    className="w-6 h-6 rounded border border-dust-600 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={material.emissiveColor ?? '#000000'}
                    aria-label="Emissive color hex"
                    maxLength={7}
                    onChange={e => {
                      const val = e.target.value
                      if (val === '' || /^#[0-9a-fA-F]{0,6}$/.test(val)) {
                        updateMaterial({ emissiveColor: val })
                      }
                    }}
                    className="flex-1 bg-dust-900 border border-dust-600 rounded px-1.5 py-0.5 text-[10px] text-sand-200 font-mono focus:border-rust-500 focus:outline-none"
                  />
                </div>
              </div>
              <SliderInput
                label="Emissive Intensity"
                value={material.emissiveIntensity ?? 0}
                onChange={v => updateMaterial({ emissiveIntensity: v })}
                min={0}
                max={5}
                step={0.1}
              />
            </div>

            {/* Environment Map Intensity */}
            <SliderInput
              label="Env Map Intensity"
              value={material.envMapIntensity ?? 1}
              onChange={v => updateMaterial({ envMapIntensity: v })}
              min={0}
              max={2}
              step={0.05}
            />
          </CollapsibleSection>
        )}

        {/* Display Section (collapsible) */}
        <CollapsibleSection title="Display">
          <label className="flex items-center gap-2 cursor-pointer mb-1.5">
            <input
              type="checkbox"
              checked={selected.visible}
              onChange={e =>
                updateObject(selected.id, { visible: e.target.checked })
              }
              className="accent-rust-500"
            />
            <span className="text-[11px] text-dust-300">Visible</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.locked}
              onChange={e =>
                updateObject(selected.id, { locked: e.target.checked })
              }
              className="accent-rust-500"
            />
            <span className="text-[11px] text-dust-300">Locked</span>
          </label>
        </CollapsibleSection>
      </div>
    </div>
  )
}
