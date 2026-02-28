import { describe, it, expect } from 'vitest'
import { CAMERA_PRESETS, findPreset } from './cameraPresets'

describe('cameraPresets', () => {
  describe('CAMERA_PRESETS', () => {
    it('contains 6 presets', () => {
      expect(CAMERA_PRESETS).toHaveLength(6)
    })

    it('has all expected preset names', () => {
      const names = CAMERA_PRESETS.map(p => p.name)
      expect(names).toContain('Front')
      expect(names).toContain('Back')
      expect(names).toContain('Top')
      expect(names).toContain('Right')
      expect(names).toContain('Left')
      expect(names).toContain('Perspective')
    })

    it('all presets have position as [number, number, number]', () => {
      for (const preset of CAMERA_PRESETS) {
        expect(preset.position).toHaveLength(3)
        preset.position.forEach(v => expect(typeof v).toBe('number'))
      }
    })

    it('all presets have target as [number, number, number]', () => {
      for (const preset of CAMERA_PRESETS) {
        expect(preset.target).toHaveLength(3)
        preset.target.forEach(v => expect(typeof v).toBe('number'))
      }
    })

    it('all presets target the origin [0, 0, 0]', () => {
      for (const preset of CAMERA_PRESETS) {
        expect(preset.target).toEqual([0, 0, 0])
      }
    })

    it('Front preset looks from z=10', () => {
      const front = findPreset('Front')!
      expect(front.position[2]).toBe(10)
      expect(front.position[0]).toBe(0)
    })

    it('Top preset looks from y=10', () => {
      const top = findPreset('Top')!
      expect(top.position[1]).toBe(10)
      // z=0.01 to avoid gimbal lock
      expect(top.position[2]).toBeCloseTo(0, 0)
    })

    it('Right preset looks from x=10', () => {
      const right = findPreset('Right')!
      expect(right.position[0]).toBe(10)
    })

    it('Perspective preset is at [5, 5, 5]', () => {
      const persp = findPreset('Perspective')!
      expect(persp.position).toEqual([5, 5, 5])
    })
  })

  describe('findPreset', () => {
    it('returns preset by name', () => {
      const preset = findPreset('Front')
      expect(preset).toBeDefined()
      expect(preset!.name).toBe('Front')
    })

    it('returns undefined for unknown name', () => {
      expect(findPreset('Unknown')).toBeUndefined()
    })

    it('is case-sensitive', () => {
      expect(findPreset('front')).toBeUndefined()
      expect(findPreset('FRONT')).toBeUndefined()
    })
  })
})
