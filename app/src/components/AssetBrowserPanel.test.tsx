import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { AssetBrowserPanel } from './AssetBrowserPanel'
import { useAssetStore, createDefaultAssetState } from '../stores/useAssetStore'
import type { MeshAsset, MaterialAsset, TextureAsset, PrefabAsset, Asset } from '../types/asset'

// ── Test Fixtures ─────────────────────────────────────────────────────

const baseMeta = {
  source: 'local' as const,
  tags: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

const meshAsset: MeshAsset = {
  ...baseMeta,
  id: 'mesh-1',
  name: 'Chair',
  type: 'mesh',
  data: { url: 'blob:mesh', filename: 'chair.glb', format: 'glb' },
}

const materialAsset: MaterialAsset = {
  ...baseMeta,
  id: 'mat-1',
  name: 'Red Metal',
  type: 'material',
  data: { materialType: 'standard', color: '#ff0000' },
}

const textureAsset: TextureAsset = {
  ...baseMeta,
  id: 'tex-1',
  name: 'Wood Grain',
  type: 'texture',
  data: { url: 'blob:tex', filename: 'wood.png', format: 'png' },
}

const prefabAsset: PrefabAsset = {
  ...baseMeta,
  id: 'prefab-1',
  name: 'Table Set',
  type: 'prefab',
  data: { objects: [{}, {}], objectCount: 2 },
}

const allAssets: Asset[] = [meshAsset, materialAsset, textureAsset, prefabAsset]

// ── Helpers ──────────────────────────────────────────────────────────

function resetStore() {
  useAssetStore.setState(createDefaultAssetState())
}

function populateAssets(assets: Asset[] = allAssets) {
  useAssetStore.setState({ assets })
}

// ── Tests ────────────────────────────────────────────────────────────

describe('AssetBrowserPanel', () => {
  beforeEach(resetStore)

  // ── Header ────────────────────────────────────────────────────────

  it('renders the Asset Library heading', () => {
    render(<AssetBrowserPanel />)
    expect(screen.getByText('Asset Library')).toBeInTheDocument()
  })

  // ── Empty state ────────────────────────────────────────────────────

  it('shows "No assets found" when no assets exist', () => {
    render(<AssetBrowserPanel />)
    expect(screen.getByText('No assets found')).toBeInTheDocument()
  })

  it('shows "0 assets" count when no assets exist', () => {
    render(<AssetBrowserPanel />)
    expect(screen.getByText('0 assets')).toBeInTheDocument()
  })

  // ── Asset rendering ────────────────────────────────────────────────

  it('renders all assets in grid view by default', () => {
    populateAssets()
    render(<AssetBrowserPanel />)
    expect(screen.getByLabelText('Chair (mesh)')).toBeInTheDocument()
    expect(screen.getByLabelText('Red Metal (material)')).toBeInTheDocument()
    expect(screen.getByLabelText('Wood Grain (texture)')).toBeInTheDocument()
    expect(screen.getByLabelText('Table Set (prefab)')).toBeInTheDocument()
  })

  it('shows asset count', () => {
    populateAssets()
    render(<AssetBrowserPanel />)
    expect(screen.getByText('4 assets')).toBeInTheDocument()
  })

  it('shows singular "asset" for single asset', () => {
    populateAssets([meshAsset])
    render(<AssetBrowserPanel />)
    expect(screen.getByText('1 asset')).toBeInTheDocument()
  })

  // ── View mode toggle ──────────────────────────────────────────────

  it('renders grid and list view buttons', () => {
    render(<AssetBrowserPanel />)
    expect(screen.getByRole('button', { name: 'Grid view' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'List view' })).toBeInTheDocument()
  })

  it('grid view is pressed by default', () => {
    render(<AssetBrowserPanel />)
    expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('switches to list view when list button is clicked', async () => {
    const user = userEvent.setup()
    populateAssets()
    render(<AssetBrowserPanel />)
    await user.click(screen.getByRole('button', { name: 'List view' }))
    expect(useAssetStore.getState().viewMode).toBe('list')
  })

  it('list view renders asset type and source info', async () => {
    const user = userEvent.setup()
    populateAssets([meshAsset])
    render(<AssetBrowserPanel />)
    await user.click(screen.getByRole('button', { name: 'List view' }))
    // In list view, each item shows "type · source"
    expect(screen.getByText(/mesh/)).toBeInTheDocument()
  })

  it('switches back to grid view', async () => {
    const user = userEvent.setup()
    useAssetStore.setState({ viewMode: 'list' })
    populateAssets()
    render(<AssetBrowserPanel />)
    await user.click(screen.getByRole('button', { name: 'Grid view' }))
    expect(useAssetStore.getState().viewMode).toBe('grid')
  })

  // ── Search ─────────────────────────────────────────────────────────

  it('renders search input', () => {
    render(<AssetBrowserPanel />)
    expect(screen.getByRole('textbox', { name: 'Search assets' })).toBeInTheDocument()
  })

  it('search filters assets', async () => {
    const user = userEvent.setup()
    populateAssets()
    render(<AssetBrowserPanel />)
    const searchInput = screen.getByRole('textbox', { name: 'Search assets' })
    await user.type(searchInput, 'Chair')
    expect(screen.getByLabelText('Chair (mesh)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Red Metal (material)')).not.toBeInTheDocument()
    expect(screen.getByText('1 asset')).toBeInTheDocument()
  })

  it('search is case-insensitive', async () => {
    const user = userEvent.setup()
    populateAssets()
    render(<AssetBrowserPanel />)
    const searchInput = screen.getByRole('textbox', { name: 'Search assets' })
    await user.type(searchInput, 'chair')
    expect(screen.getByLabelText('Chair (mesh)')).toBeInTheDocument()
  })

  it('shows "No assets found" when search matches nothing', async () => {
    const user = userEvent.setup()
    populateAssets()
    render(<AssetBrowserPanel />)
    const searchInput = screen.getByRole('textbox', { name: 'Search assets' })
    await user.type(searchInput, 'zzzznonexistent')
    expect(screen.getByText('No assets found')).toBeInTheDocument()
  })

  // ── Category filter ────────────────────────────────────────────────

  it('renders category filter buttons', () => {
    render(<AssetBrowserPanel />)
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Primitives' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Furniture' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nature' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Architecture' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Custom' })).toBeInTheDocument()
  })

  it('"All" category is pressed by default', () => {
    render(<AssetBrowserPanel />)
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Furniture' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking a category sets the filter', async () => {
    const user = userEvent.setup()
    populateAssets()
    render(<AssetBrowserPanel />)
    await user.click(screen.getByRole('button', { name: 'Furniture' }))
    const filter = useAssetStore.getState().filter
    expect(filter.tags).toEqual(['furniture'])
  })

  it('clicking "All" clears category filter', async () => {
    const user = userEvent.setup()
    useAssetStore.setState({ filter: { tags: ['furniture'] } })
    populateAssets()
    render(<AssetBrowserPanel />)
    await user.click(screen.getByRole('button', { name: 'All' }))
    const filter = useAssetStore.getState().filter
    expect(filter.tags).toBeUndefined()
  })

  // ── Asset selection ────────────────────────────────────────────────

  it('clicking an asset selects it', async () => {
    const user = userEvent.setup()
    populateAssets()
    render(<AssetBrowserPanel />)
    await user.click(screen.getByLabelText('Chair (mesh)'))
    expect(useAssetStore.getState().selectedAssetId).toBe('mesh-1')
  })

  it('selected asset has highlighted styling', () => {
    populateAssets()
    useAssetStore.setState({ selectedAssetId: 'mesh-1' })
    render(<AssetBrowserPanel />)
    const assetBtn = screen.getByLabelText('Chair (mesh)')
    expect(assetBtn.className).toContain('border-rust-500')
  })

  it('unselected asset does not have highlighted styling', () => {
    populateAssets()
    render(<AssetBrowserPanel />)
    const assetBtn = screen.getByLabelText('Chair (mesh)')
    expect(assetBtn.className).not.toContain('border-rust-500')
  })

  it('selected asset in list view has bg-dust-700', async () => {
    const user = userEvent.setup()
    populateAssets()
    useAssetStore.setState({ selectedAssetId: 'mesh-1', viewMode: 'list' })
    render(<AssetBrowserPanel />)
    const assetBtn = screen.getByLabelText('Chair (mesh)')
    expect(assetBtn.className).toContain('bg-dust-700')
  })

  // ── Drag and drop ──────────────────────────────────────────────────

  it('asset items are draggable in grid view', () => {
    populateAssets()
    render(<AssetBrowserPanel />)
    const assetBtn = screen.getByLabelText('Chair (mesh)')
    expect(assetBtn).toHaveAttribute('draggable', 'true')
  })

  it('asset items are draggable in list view', () => {
    populateAssets()
    useAssetStore.setState({ viewMode: 'list' })
    render(<AssetBrowserPanel />)
    const assetBtn = screen.getByLabelText('Chair (mesh)')
    expect(assetBtn).toHaveAttribute('draggable', 'true')
  })

  it('drag start sets asset id in dataTransfer', () => {
    populateAssets()
    render(<AssetBrowserPanel />)
    const assetBtn = screen.getByLabelText('Chair (mesh)')

    const dataTransferData: Record<string, string> = {}
    let effectAllowed = ''
    const dragEvent = new Event('dragstart', { bubbles: true })
    Object.defineProperty(dragEvent, 'dataTransfer', {
      value: {
        setData: (type: string, data: string) => { dataTransferData[type] = data },
        set effectAllowed(val: string) { effectAllowed = val },
        get effectAllowed() { return effectAllowed },
      },
    })
    fireEvent(assetBtn, dragEvent)

    expect(dataTransferData['application/x-asset-id']).toBe('mesh-1')
    expect(effectAllowed).toBe('copy')
  })

  it('drag start in list view also sets asset id', () => {
    populateAssets()
    useAssetStore.setState({ viewMode: 'list' })
    render(<AssetBrowserPanel />)
    const assetBtn = screen.getByLabelText('Red Metal (material)')

    const dataTransferData: Record<string, string> = {}
    let effectAllowed = ''
    const dragEvent = new Event('dragstart', { bubbles: true })
    Object.defineProperty(dragEvent, 'dataTransfer', {
      value: {
        setData: (type: string, data: string) => { dataTransferData[type] = data },
        set effectAllowed(val: string) { effectAllowed = val },
        get effectAllowed() { return effectAllowed },
      },
    })
    fireEvent(assetBtn, dragEvent)

    expect(dataTransferData['application/x-asset-id']).toBe('mat-1')
    expect(effectAllowed).toBe('copy')
  })

  // ── Asset names displayed ──────────────────────────────────────────

  it('shows asset names in grid view', () => {
    populateAssets()
    render(<AssetBrowserPanel />)
    expect(screen.getByText('Chair')).toBeInTheDocument()
    expect(screen.getByText('Red Metal')).toBeInTheDocument()
    expect(screen.getByText('Wood Grain')).toBeInTheDocument()
    expect(screen.getByText('Table Set')).toBeInTheDocument()
  })

  it('shows asset names in list view', () => {
    populateAssets()
    useAssetStore.setState({ viewMode: 'list' })
    render(<AssetBrowserPanel />)
    expect(screen.getByText('Chair')).toBeInTheDocument()
    expect(screen.getByText('Red Metal')).toBeInTheDocument()
  })
})
