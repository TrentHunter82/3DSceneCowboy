import type { Asset } from '../../types/asset'

interface AssetPreviewProps {
  asset: Asset
  size: 'xs' | 'sm' | 'md'
}

const sizeMap = {
  xs: 'w-6 h-6',
  sm: 'w-14 h-14',
  md: 'w-24 h-24',
} as const

export function AssetPreview({ asset, size }: AssetPreviewProps) {
  const sizeClasses = sizeMap[size]

  switch (asset.type) {
    case 'mesh':
      return (
        <div className={`${sizeClasses} bg-dust-700 rounded flex items-center justify-center`}>
          <svg
            viewBox="0 0 24 24"
            className="w-3/5 h-3/5 text-dust-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
      )

    case 'material':
      return (
        <div
          className={`${sizeClasses} rounded-full border-2 border-dust-600`}
          style={{ backgroundColor: asset.data.color || '#666' }}
        />
      )

    case 'texture':
      return (
        <div
          className={`${sizeClasses} bg-dust-700 rounded overflow-hidden`}
          style={{
            backgroundImage:
              'repeating-conic-gradient(#555 0% 25%, #444 0% 50%)',
            backgroundSize: '8px 8px',
          }}
        />
      )

    case 'prefab':
      return (
        <div className={`${sizeClasses} bg-dust-700 rounded flex items-center justify-center`}>
          <svg
            viewBox="0 0 24 24"
            className="w-3/5 h-3/5 text-sunset-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="8" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
      )

    default:
      return (
        <div className={`${sizeClasses} bg-dust-700 rounded flex items-center justify-center`}>
          <span className="text-dust-500 text-[10px]">?</span>
        </div>
      )
  }
}
