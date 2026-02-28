import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AssetPreview } from './AssetPreview'
import type { MeshAsset, MaterialAsset, TextureAsset, PrefabAsset } from '../../types/asset'

// ── Test Fixtures ─────────────────────────────────────────────────────

const baseMeta = {
  id: 'test-1',
  name: 'Test Asset',
  source: 'local' as const,
  tags: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

const meshAsset: MeshAsset = {
  ...baseMeta,
  type: 'mesh',
  data: { url: 'blob:mesh', filename: 'model.glb', format: 'glb' },
}

const materialAsset: MaterialAsset = {
  ...baseMeta,
  type: 'material',
  data: { materialType: 'standard', color: '#ff6600' },
}

const materialAssetNoColor: MaterialAsset = {
  ...baseMeta,
  id: 'mat-no-color',
  type: 'material',
  data: { materialType: 'standard', color: '' },
}

const textureAsset: TextureAsset = {
  ...baseMeta,
  type: 'texture',
  data: { url: 'blob:tex', filename: 'tex.png', format: 'png' },
}

const prefabAsset: PrefabAsset = {
  ...baseMeta,
  type: 'prefab',
  data: { objects: [{}], objectCount: 1 },
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('AssetPreview', () => {
  // ── Mesh type ──────────────────────────────────────────────────────

  describe('mesh asset', () => {
    it('renders an SVG with a mesh icon path', () => {
      const { container } = render(<AssetPreview asset={meshAsset} size="sm" />)
      const svg = container.querySelector('svg')
      expect(svg).toBeTruthy()
      const path = container.querySelector('path')
      expect(path).toBeTruthy()
      expect(path?.getAttribute('d')).toContain('12 2')
    })

    it('applies sm size classes', () => {
      const { container } = render(<AssetPreview asset={meshAsset} size="sm" />)
      const wrapper = container.firstElementChild as HTMLElement
      expect(wrapper.className).toContain('w-14')
      expect(wrapper.className).toContain('h-14')
    })
  })

  // ── Material type ──────────────────────────────────────────────────

  describe('material asset', () => {
    it('renders a rounded circle with the material color', () => {
      const { container } = render(<AssetPreview asset={materialAsset} size="md" />)
      const el = container.firstElementChild as HTMLElement
      expect(el.className).toContain('rounded-full')
      expect(el.style.backgroundColor).toBe('rgb(255, 102, 0)')
    })

    it('falls back to #666 when color is empty', () => {
      const { container } = render(<AssetPreview asset={materialAssetNoColor} size="sm" />)
      const el = container.firstElementChild as HTMLElement
      // '' || '#666' = '#666'
      expect(el.style.backgroundColor).toBe('rgb(102, 102, 102)')
    })

    it('applies md size classes', () => {
      const { container } = render(<AssetPreview asset={materialAsset} size="md" />)
      const el = container.firstElementChild as HTMLElement
      expect(el.className).toContain('w-24')
      expect(el.className).toContain('h-24')
    })
  })

  // ── Texture type ───────────────────────────────────────────────────

  describe('texture asset', () => {
    it('renders a checkerboard-pattern background', () => {
      const { container } = render(<AssetPreview asset={textureAsset} size="sm" />)
      const el = container.firstElementChild as HTMLElement
      expect(el.style.backgroundImage).toContain('repeating-conic-gradient')
    })

    it('does not render SVG', () => {
      const { container } = render(<AssetPreview asset={textureAsset} size="sm" />)
      expect(container.querySelector('svg')).toBeNull()
    })
  })

  // ── Prefab type ────────────────────────────────────────────────────

  describe('prefab asset', () => {
    it('renders an SVG with rect elements', () => {
      const { container } = render(<AssetPreview asset={prefabAsset} size="sm" />)
      const svg = container.querySelector('svg')
      expect(svg).toBeTruthy()
      const rects = container.querySelectorAll('rect')
      expect(rects.length).toBe(3)
    })

    it('uses sunset-400 color for the prefab icon', () => {
      const { container } = render(<AssetPreview asset={prefabAsset} size="sm" />)
      const svg = container.querySelector('svg')
      expect(svg?.className.baseVal).toContain('text-sunset-400')
    })
  })

  // ── Size variants ──────────────────────────────────────────────────

  describe('size variants', () => {
    it('applies xs size (w-6 h-6)', () => {
      const { container } = render(<AssetPreview asset={meshAsset} size="xs" />)
      const el = container.firstElementChild as HTMLElement
      expect(el.className).toContain('w-6')
      expect(el.className).toContain('h-6')
    })

    it('applies sm size (w-14 h-14)', () => {
      const { container } = render(<AssetPreview asset={meshAsset} size="sm" />)
      const el = container.firstElementChild as HTMLElement
      expect(el.className).toContain('w-14')
      expect(el.className).toContain('h-14')
    })

    it('applies md size (w-24 h-24)', () => {
      const { container } = render(<AssetPreview asset={meshAsset} size="md" />)
      const el = container.firstElementChild as HTMLElement
      expect(el.className).toContain('w-24')
      expect(el.className).toContain('h-24')
    })
  })
})
