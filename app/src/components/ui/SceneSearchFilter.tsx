import type { ObjectType } from '../../types/scene'

interface SceneSearchFilterProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  typeFilter: string | null
  onTypeFilterChange: (type: string | null) => void
  showHidden: boolean
  onShowHiddenChange: (show: boolean) => void
  showLocked: boolean
  onShowLockedChange: (show: boolean) => void
  objectCount: number
  filteredCount: number
}

const OBJECT_TYPES: ObjectType[] = ['box', 'sphere', 'cylinder', 'cone', 'plane', 'torus', 'model']

export function SceneSearchFilter({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  showHidden,
  onShowHiddenChange,
  showLocked,
  onShowLockedChange,
  objectCount,
  filteredCount,
}: SceneSearchFilterProps) {
  return (
    <div className="px-2 py-2 border-b border-dust-600/25 space-y-1.5">
      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-dust-500 text-[11px] pointer-events-none select-none">
          &#x2315;
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search objects..."
          aria-label="Search objects"
          className="bg-dust-900 border border-dust-600/50 rounded text-[11px] text-sand-200 w-full pl-6 pr-6 py-1 placeholder:text-dust-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-1 top-1/2 -translate-y-1/2 text-dust-400 hover:text-sand-300 text-[11px] px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 rounded"
          >
            &#x2715;
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-1.5">
        {/* Type dropdown */}
        <select
          value={typeFilter ?? ''}
          onChange={(e) => onTypeFilterChange(e.target.value || null)}
          aria-label="Filter by type"
          className="bg-dust-900 border border-dust-600/50 rounded text-[10px] text-sand-200 px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 min-w-0 flex-1"
        >
          <option value="">All Types</option>
          {OBJECT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>

        {/* Hidden toggle */}
        <button
          onClick={() => onShowHiddenChange(!showHidden)}
          aria-label={showHidden ? 'Hide hidden objects' : 'Show hidden objects'}
          aria-pressed={showHidden}
          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 ${
            showHidden
              ? 'bg-rust-500/20 text-rust-400 border-rust-500/30'
              : 'text-dust-400 hover:text-sand-300 border-transparent'
          }`}
        >
          &#x1F441;
        </button>

        {/* Locked toggle */}
        <button
          onClick={() => onShowLockedChange(!showLocked)}
          aria-label={showLocked ? 'Hide locked objects' : 'Show locked objects'}
          aria-pressed={showLocked}
          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 ${
            showLocked
              ? 'bg-rust-500/20 text-rust-400 border-rust-500/30'
              : 'text-dust-400 hover:text-sand-300 border-transparent'
          }`}
        >
          &#x1F512;
        </button>
      </div>

      {/* Object count */}
      <div className="text-[10px] text-dust-400">
        {filteredCount} of {objectCount} objects
      </div>
    </div>
  )
}
