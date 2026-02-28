import { useAssetStore } from '../stores/useAssetStore'
import { AssetPreview } from './ui/AssetPreview'

const categories = ['all', 'primitives', 'furniture', 'nature', 'architecture', 'custom'] as const
type CategoryFilter = (typeof categories)[number]

export function AssetBrowserPanel() {
  const searchQuery = useAssetStore(s => s.filter.search ?? '')
  const selectedCategory = useAssetStore(s => s.filter.tags?.[0] as CategoryFilter | undefined ?? 'all')
  const viewMode = useAssetStore(s => s.viewMode)
  const selectedAssetId = useAssetStore(s => s.selectedAssetId)
  const setFilter = useAssetStore(s => s.setFilter)
  const setViewMode = useAssetStore(s => s.setViewMode)
  const selectAsset = useAssetStore(s => s.selectAsset)
  const getFilteredAssets = useAssetStore(s => s.getFilteredAssets)

  const setSearchQuery = (query: string) => setFilter({ search: query })
  const setSelectedCategory = (cat: CategoryFilter) =>
    setFilter({ tags: cat === 'all' ? undefined : [cat] })

  const filteredAssets = getFilteredAssets()

  return (
    <div className="w-60 bg-dust-800 border-l border-dust-600/25 flex flex-col shrink-0">
      {/* Header */}
      <div className="px-3 py-2 border-b border-dust-600/25 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-dust-100">
          Asset Library
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
            className={`px-1.5 py-0.5 text-xs rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 ${
              viewMode === 'grid'
                ? 'bg-dust-600 text-sand-200'
                : 'text-dust-400 hover:bg-dust-600'
            }`}
          >
            &#x25A6;
          </button>
          <button
            onClick={() => setViewMode('list')}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
            className={`px-1.5 py-0.5 text-xs rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 ${
              viewMode === 'list'
                ? 'bg-dust-600 text-sand-200'
                : 'text-dust-400 hover:bg-dust-600'
            }`}
          >
            &#x2630;
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-3 py-2 border-b border-dust-600/25">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search assets..."
          aria-label="Search assets"
          className="w-full px-2 py-1 text-xs bg-dust-900 border border-dust-600 rounded text-dust-200 placeholder-dust-500 focus:outline-none focus:ring-2 focus:ring-rust-500"
        />
      </div>

      {/* Category filter */}
      <div className="px-3 py-2 border-b border-dust-600/25 flex flex-wrap gap-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            aria-pressed={selectedCategory === cat}
            className={`px-2 py-0.5 text-[10px] rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 ${
              selectedCategory === cat
                ? 'bg-rust-500 text-white'
                : 'bg-dust-700 text-dust-400 hover:bg-dust-600'
            }`}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Asset grid/list */}
      <div className="flex-1 overflow-y-auto">
        {filteredAssets.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-dust-500">No assets found</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-2 p-3">
            {filteredAssets.map(asset => (
              <button
                key={asset.id}
                onClick={() => selectAsset(asset.id)}
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('application/x-asset-id', asset.id)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                aria-label={`${asset.name} (${asset.type})`}
                className={`flex flex-col items-center p-2 rounded border transition-colors cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 ${
                  selectedAssetId === asset.id
                    ? 'border-rust-500 bg-dust-700'
                    : 'border-dust-600/25 bg-dust-800 hover:border-dust-500'
                }`}
              >
                <AssetPreview asset={asset} size="sm" />
                <span className="text-[10px] text-dust-300 mt-1 truncate w-full text-center">
                  {asset.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredAssets.map(asset => (
              <button
                key={asset.id}
                onClick={() => selectAsset(asset.id)}
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('application/x-asset-id', asset.id)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                aria-label={`${asset.name} (${asset.type})`}
                className={`flex items-center gap-2 px-3 py-1.5 w-full text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 ${
                  selectedAssetId === asset.id
                    ? 'bg-dust-700'
                    : 'hover:bg-dust-750'
                }`}
              >
                <AssetPreview asset={asset} size="xs" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-dust-200 truncate">{asset.name}</div>
                  <div className="text-[10px] text-dust-500">
                    {asset.type} &middot; {asset.source}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Asset count */}
      <div className="px-3 py-1.5 border-t border-dust-600/25">
        <span className="text-[10px] text-dust-500">
          {filteredAssets.length} {filteredAssets.length === 1 ? 'asset' : 'assets'}
        </span>
      </div>
    </div>
  )
}
