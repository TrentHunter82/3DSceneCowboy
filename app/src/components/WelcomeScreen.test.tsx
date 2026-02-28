import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WelcomeScreen } from './WelcomeScreen'
import { useSceneStore } from '../stores/useSceneStore'
import { useStorageStore } from '../stores/useStorageStore'
import { useUIStore } from '../stores/useUIStore'
import type { SavedSceneMetadata } from '../types/storage'

// ── Store Reset ──────────────────────────────────────────────────────

function resetStores() {
  useSceneStore.setState({
    objects: [],
    selectedId: null,
    selectedIds: [],
    clipboard: [],
    toolMode: 'select',
    history: [{ objects: [], selectedId: null, selectedIds: [] }],
    historyIndex: 0,
  })
  useStorageStore.setState({
    scenes: [],
    activeSceneId: null,
    filter: {},
    autoSave: { enabled: true, intervalMs: 30000, maxVersions: 10 },
    saveStatus: 'saved',
    lastSavedAt: null,
  })
  useUIStore.setState({
    showWelcome: false,
    rightSidebarTab: 'object',
    bottomPanelTab: 'timeline',
    bottomPanelHeight: 240,
    bottomPanelCollapsed: true,
    assetPanelMode: 'tab',
  })
}

// ── Helpers ──────────────────────────────────────────────────────────

function makeScene(overrides: Partial<SavedSceneMetadata> = {}): SavedSceneMetadata {
  return {
    id: overrides.id ?? 'scene-1',
    name: overrides.name ?? 'Test Scene',
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00Z',
    updatedAt: overrides.updatedAt ?? '2026-02-27T12:00:00Z',
    version: overrides.version ?? 2,
    fileSize: overrides.fileSize ?? 1024,
    objectCount: overrides.objectCount ?? 5,
    tags: overrides.tags ?? [],
  }
}

// ── Tests ────────────────────────────────────────────────────────────

describe('WelcomeScreen', () => {
  beforeEach(resetStores)

  // 1. Renders when no objects
  it('renders welcome screen when no objects exist', () => {
    render(<WelcomeScreen />)
    expect(screen.getByRole('region', { name: 'Welcome screen' })).toBeInTheDocument()
  })

  // 2. Returns null when objects exist
  it('does NOT render when objects exist', () => {
    useSceneStore.getState().addObject('box')
    const { container } = render(<WelcomeScreen />)
    expect(container.innerHTML).toBe('')
  })

  // 3. Shows heading
  it('shows the "3D Scene Cowboy" heading', () => {
    render(<WelcomeScreen />)
    expect(screen.getByRole('heading', { level: 1, name: /3D Scene Cowboy/i })).toBeInTheDocument()
  })

  // 4. Shows 4 template buttons
  it('shows 4 template buttons', () => {
    render(<WelcomeScreen />)
    expect(screen.getByRole('button', { name: /Create Empty Scene/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create Basic Scene/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create Light Setup/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create Architecture/i })).toBeInTheDocument()
  })

  // 5. Shows "Quick Start" section heading
  it('shows "Quick Start" section heading', () => {
    render(<WelcomeScreen />)
    expect(screen.getByRole('heading', { level: 2, name: /Quick Start/i })).toBeInTheDocument()
  })

  // 6. Shows "Recent Projects" section with "No recent projects" when empty
  it('shows "Recent Projects" with "No recent projects" when store has no scenes', () => {
    render(<WelcomeScreen />)
    expect(screen.getByRole('heading', { level: 2, name: /Recent Projects/i })).toBeInTheDocument()
    expect(screen.getByText('No recent projects')).toBeInTheDocument()
  })

  // 7. Shows tips section
  it('shows tips section with keyboard shortcut hints', () => {
    render(<WelcomeScreen />)
    expect(screen.getByRole('heading', { level: 2, name: /Tips/i })).toBeInTheDocument()
    expect(screen.getByText(/Press Q\/W\/E\/R to switch tools/)).toBeInTheDocument()
    expect(screen.getByText(/Right-click objects for context menu/)).toBeInTheDocument()
    expect(screen.getByText(/Ctrl\+Z to undo/)).toBeInTheDocument()
    expect(screen.getByText(/Drag objects in the hierarchy to reparent/)).toBeInTheDocument()
  })

  // 8. Clicking "Basic Scene" adds 4 pre-positioned objects
  it('clicking "Basic Scene" template adds 4 positioned objects (plane, box, sphere, cylinder)', async () => {
    const user = userEvent.setup()
    render(<WelcomeScreen />)

    await user.click(screen.getByRole('button', { name: /Create Basic Scene/i }))

    const objects = useSceneStore.getState().objects
    expect(objects).toHaveLength(4)
    expect(objects[0].type).toBe('plane')
    expect(objects[0].name).toBe('Ground')
    expect(objects[1].type).toBe('box')
    expect(objects[1].position.x).toBe(-1.5)
    expect(objects[2].type).toBe('sphere')
    expect(objects[2].position.x).toBe(0)
    expect(objects[3].type).toBe('cylinder')
    expect(objects[3].position.x).toBe(1.5)
  })

  // 9. Clicking "Empty Scene" dismisses welcome screen
  it('clicking "Empty Scene" keeps scene empty and dismisses welcome screen', async () => {
    const user = userEvent.setup()
    render(<WelcomeScreen />)

    await user.click(screen.getByRole('button', { name: /Create Empty Scene/i }))

    expect(useSceneStore.getState().objects).toHaveLength(0)
    expect(useUIStore.getState().showWelcome).toBe(false)
  })

  // 10. Clicking "Architecture" template adds 5 named objects
  it('clicking "Architecture" template adds 5 objects (4 boxes + 1 plane)', async () => {
    const user = userEvent.setup()
    render(<WelcomeScreen />)

    await user.click(screen.getByRole('button', { name: /Create Architecture/i }))

    const objects = useSceneStore.getState().objects
    expect(objects).toHaveLength(5)
    const types = objects.map(o => o.type)
    expect(types.filter(t => t === 'box')).toHaveLength(4)
    expect(types.filter(t => t === 'plane')).toHaveLength(1)
    // Verify named objects
    const names = objects.map(o => o.name)
    expect(names).toContain('Wall Left')
    expect(names).toContain('Wall Right')
    expect(names).toContain('Roof')
  })

  // 11. Recent projects are shown when storage store has scenes
  it('shows recent project names when storage store has scenes', () => {
    const scenes: SavedSceneMetadata[] = [
      makeScene({ id: 's1', name: 'My First Scene', updatedAt: '2026-02-27T10:00:00Z', objectCount: 3 }),
      makeScene({ id: 's2', name: 'My Second Scene', updatedAt: '2026-02-27T11:00:00Z', objectCount: 7 }),
    ]
    useStorageStore.setState({ scenes })

    render(<WelcomeScreen />)

    expect(screen.getByText('My First Scene')).toBeInTheDocument()
    expect(screen.getByText('My Second Scene')).toBeInTheDocument()
    expect(screen.getByText('3 objects')).toBeInTheDocument()
    expect(screen.getByText('7 objects')).toBeInTheDocument()
    expect(screen.queryByText('No recent projects')).not.toBeInTheDocument()
  })

  // 12. "View all keyboard shortcuts" dispatches event
  it('"View all keyboard shortcuts" button dispatches toggle-shortcut-help event', async () => {
    const user = userEvent.setup()
    const handler = vi.fn()
    window.addEventListener('toggle-shortcut-help', handler)

    render(<WelcomeScreen />)

    const btn = screen.getByRole('button', { name: /View all keyboard shortcuts/i })
    await user.click(btn)

    expect(handler).toHaveBeenCalledTimes(1)

    window.removeEventListener('toggle-shortcut-help', handler)
  })

  // 13. Region has aria-label "Welcome screen"
  it('has region with aria-label "Welcome screen"', () => {
    render(<WelcomeScreen />)
    const region = screen.getByRole('region', { name: 'Welcome screen' })
    expect(region).toBeInTheDocument()
  })

  // ── Additional edge-case tests ──────────────────────────────────────

  it('clicking "Light Setup" template adds 4 named objects (3 spheres + 1 plane)', async () => {
    const user = userEvent.setup()
    render(<WelcomeScreen />)

    await user.click(screen.getByRole('button', { name: /Create Light Setup/i }))

    const objects = useSceneStore.getState().objects
    expect(objects).toHaveLength(4)
    const types = objects.map(o => o.type)
    expect(types.filter(t => t === 'sphere')).toHaveLength(3)
    expect(types.filter(t => t === 'plane')).toHaveLength(1)
    // Verify light names
    const names = objects.map(o => o.name)
    expect(names).toContain('Key Light')
    expect(names).toContain('Fill Light')
    expect(names).toContain('Back Light')
  })

  it('recent projects list is capped to 4 most recent', () => {
    const scenes: SavedSceneMetadata[] = [
      makeScene({ id: 's1', name: 'Scene A', updatedAt: '2026-02-01T00:00:00Z' }),
      makeScene({ id: 's2', name: 'Scene B', updatedAt: '2026-02-02T00:00:00Z' }),
      makeScene({ id: 's3', name: 'Scene C', updatedAt: '2026-02-03T00:00:00Z' }),
      makeScene({ id: 's4', name: 'Scene D', updatedAt: '2026-02-04T00:00:00Z' }),
      makeScene({ id: 's5', name: 'Scene E', updatedAt: '2026-02-05T00:00:00Z' }),
      makeScene({ id: 's6', name: 'Scene F', updatedAt: '2026-02-06T00:00:00Z' }),
    ]
    useStorageStore.setState({ scenes })

    render(<WelcomeScreen />)

    // Sorted descending by updatedAt, top 4 are F, E, D, C
    expect(screen.getByText('Scene F')).toBeInTheDocument()
    expect(screen.getByText('Scene E')).toBeInTheDocument()
    expect(screen.getByText('Scene D')).toBeInTheDocument()
    expect(screen.getByText('Scene C')).toBeInTheDocument()
    expect(screen.queryByText('Scene B')).not.toBeInTheDocument()
    expect(screen.queryByText('Scene A')).not.toBeInTheDocument()
  })

  it('shows "1 object" (singular) for a project with 1 object', () => {
    const scenes = [makeScene({ id: 's1', name: 'Solo Scene', objectCount: 1 })]
    useStorageStore.setState({ scenes })

    render(<WelcomeScreen />)

    expect(screen.getByText('1 object')).toBeInTheDocument()
  })

  it('disappears after adding objects via a template', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<WelcomeScreen />)

    // Initially visible
    expect(screen.getByRole('region', { name: 'Welcome screen' })).toBeInTheDocument()

    // Click a template that adds objects
    await user.click(screen.getByRole('button', { name: /Create Basic Scene/i }))

    // Re-render to reflect updated store
    rerender(<WelcomeScreen />)

    // Should be gone now
    expect(screen.queryByRole('region', { name: 'Welcome screen' })).not.toBeInTheDocument()
  })
})
