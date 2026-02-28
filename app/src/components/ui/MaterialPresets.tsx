import type { MaterialData } from '../../types/scene'

interface MaterialPresetsProps {
  onApply: (preset: Partial<MaterialData>) => void
}

const MATERIAL_PRESETS: (Partial<MaterialData> & { name: string })[] = [
  { name: 'Default', color: '#808080', metalness: 0, roughness: 0.5, type: 'standard' },
  { name: 'Metal', color: '#C0C0C0', metalness: 1, roughness: 0.2, type: 'standard' },
  { name: 'Gold', color: '#FFD700', metalness: 1, roughness: 0.3, type: 'standard' },
  { name: 'Copper', color: '#B87333', metalness: 1, roughness: 0.35, type: 'standard' },
  { name: 'Plastic', color: '#FF6B6B', metalness: 0, roughness: 0.4, type: 'standard' },
  { name: 'Rubber', color: '#333333', metalness: 0, roughness: 0.9, type: 'standard' },
  { name: 'Glass', color: '#FFFFFF', metalness: 0, roughness: 0.05, opacity: 0.3, transparent: true, type: 'standard' },
  { name: 'Wood', color: '#8B6914', metalness: 0, roughness: 0.7, type: 'standard' },
  { name: 'Stone', color: '#808080', metalness: 0, roughness: 0.85, type: 'standard' },
  { name: 'Ceramic', color: '#F5F5DC', metalness: 0.1, roughness: 0.3, type: 'standard' },
  { name: 'Neon', color: '#00FF88', metalness: 0, roughness: 0.5, emissiveColor: '#00FF88', emissiveIntensity: 2, type: 'standard' },
  { name: 'Unlit', color: '#FFFFFF', type: 'basic' },
]

export function MaterialPresets({ onApply }: MaterialPresetsProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {MATERIAL_PRESETS.map((preset) => {
        const { name, ...materialData } = preset
        return (
          <button
            key={name}
            className="flex flex-col items-center gap-0.5 p-1.5 rounded hover:bg-dust-600/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/50"
            aria-label={`Apply ${name} preset`}
            onClick={() => onApply(materialData)}
          >
            <span
              className="w-5 h-5 rounded-full border border-dust-600/40 shrink-0"
              style={{
                backgroundColor: preset.color,
                ...(preset.transparent
                  ? {
                      background: `repeating-linear-gradient(
                        135deg,
                        ${preset.color},
                        ${preset.color} 3px,
                        transparent 3px,
                        transparent 6px
                      )`,
                    }
                  : {}),
              }}
            />
            <span className="text-[9px] text-dust-400">{name}</span>
          </button>
        )
      })}
    </div>
  )
}
