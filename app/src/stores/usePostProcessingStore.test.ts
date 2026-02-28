import { describe, it, expect, beforeEach } from 'vitest'
import { usePostProcessingStore, createDefaultPostProcessing } from './usePostProcessingStore'

function resetStore() {
  usePostProcessingStore.setState(createDefaultPostProcessing())
}

describe('usePostProcessingStore', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('initial state', () => {
    it('starts with post-processing disabled', () => {
      const state = usePostProcessingStore.getState()
      expect(state.enabled).toBe(false)
    })

    it('starts with bloom disabled and default values', () => {
      const { bloom } = usePostProcessingStore.getState()
      expect(bloom.enabled).toBe(false)
      expect(bloom.intensity).toBe(1)
      expect(bloom.threshold).toBe(0.9)
      expect(bloom.radius).toBe(0.4)
    })

    it('starts with SSAO disabled and default values', () => {
      const { ssao } = usePostProcessingStore.getState()
      expect(ssao.enabled).toBe(false)
      expect(ssao.intensity).toBe(15)
      expect(ssao.radius).toBe(5)
      expect(ssao.bias).toBe(0.025)
    })

    it('starts with vignette disabled and default values', () => {
      const { vignette } = usePostProcessingStore.getState()
      expect(vignette.enabled).toBe(false)
      expect(vignette.offset).toBe(0.5)
      expect(vignette.darkness).toBe(0.5)
    })
  })

  describe('setEnabled', () => {
    it('enables post-processing', () => {
      usePostProcessingStore.getState().setEnabled(true)
      expect(usePostProcessingStore.getState().enabled).toBe(true)
    })

    it('disables post-processing', () => {
      usePostProcessingStore.getState().setEnabled(true)
      usePostProcessingStore.getState().setEnabled(false)
      expect(usePostProcessingStore.getState().enabled).toBe(false)
    })
  })

  describe('updateBloom', () => {
    it('updates bloom intensity', () => {
      usePostProcessingStore.getState().updateBloom({ intensity: 3.5 })
      expect(usePostProcessingStore.getState().bloom.intensity).toBe(3.5)
    })

    it('enables bloom', () => {
      usePostProcessingStore.getState().updateBloom({ enabled: true })
      expect(usePostProcessingStore.getState().bloom.enabled).toBe(true)
    })

    it('updates multiple bloom properties at once', () => {
      usePostProcessingStore.getState().updateBloom({
        enabled: true,
        intensity: 2,
        threshold: 0.5,
        radius: 0.8,
      })
      const { bloom } = usePostProcessingStore.getState()
      expect(bloom.enabled).toBe(true)
      expect(bloom.intensity).toBe(2)
      expect(bloom.threshold).toBe(0.5)
      expect(bloom.radius).toBe(0.8)
    })

    it('preserves other bloom properties when updating one', () => {
      usePostProcessingStore.getState().updateBloom({ intensity: 4 })
      const { bloom } = usePostProcessingStore.getState()
      expect(bloom.threshold).toBe(0.9) // unchanged
      expect(bloom.radius).toBe(0.4) // unchanged
    })
  })

  describe('updateSSAO', () => {
    it('updates SSAO intensity', () => {
      usePostProcessingStore.getState().updateSSAO({ intensity: 30 })
      expect(usePostProcessingStore.getState().ssao.intensity).toBe(30)
    })

    it('updates multiple SSAO properties at once', () => {
      usePostProcessingStore.getState().updateSSAO({
        enabled: true,
        intensity: 25,
        radius: 8,
        bias: 0.05,
      })
      const { ssao } = usePostProcessingStore.getState()
      expect(ssao.enabled).toBe(true)
      expect(ssao.intensity).toBe(25)
      expect(ssao.radius).toBe(8)
      expect(ssao.bias).toBe(0.05)
    })

    it('preserves other SSAO properties when updating one', () => {
      usePostProcessingStore.getState().updateSSAO({ radius: 7 })
      const { ssao } = usePostProcessingStore.getState()
      expect(ssao.intensity).toBe(15) // unchanged
      expect(ssao.bias).toBe(0.025) // unchanged
    })
  })

  describe('updateVignette', () => {
    it('updates vignette offset', () => {
      usePostProcessingStore.getState().updateVignette({ offset: 0.8 })
      expect(usePostProcessingStore.getState().vignette.offset).toBe(0.8)
    })

    it('updates multiple vignette properties at once', () => {
      usePostProcessingStore.getState().updateVignette({
        enabled: true,
        offset: 0.3,
        darkness: 0.9,
      })
      const { vignette } = usePostProcessingStore.getState()
      expect(vignette.enabled).toBe(true)
      expect(vignette.offset).toBe(0.3)
      expect(vignette.darkness).toBe(0.9)
    })
  })

  describe('loadSettings', () => {
    it('loads complete settings', () => {
      const settings = {
        enabled: true,
        bloom: { enabled: true, intensity: 3, threshold: 0.5, radius: 0.6 },
        ssao: { enabled: true, intensity: 20, radius: 7, bias: 0.04 },
        vignette: { enabled: true, offset: 0.2, darkness: 0.8 },
      }
      usePostProcessingStore.getState().loadSettings(settings)

      const state = usePostProcessingStore.getState()
      expect(state.enabled).toBe(true)
      expect(state.bloom).toEqual(settings.bloom)
      expect(state.ssao).toEqual(settings.ssao)
      expect(state.vignette).toEqual(settings.vignette)
    })

    it('loaded settings are independent copies (no shared references)', () => {
      const settings = {
        enabled: true,
        bloom: { enabled: true, intensity: 3, threshold: 0.5, radius: 0.6 },
        ssao: { enabled: false, intensity: 15, radius: 5, bias: 0.025 },
        vignette: { enabled: false, offset: 0.5, darkness: 0.5 },
      }
      usePostProcessingStore.getState().loadSettings(settings)

      // Mutate original - should not affect store
      settings.bloom.intensity = 999
      expect(usePostProcessingStore.getState().bloom.intensity).toBe(3)
    })
  })

  describe('resetDefaults', () => {
    it('resets all settings to defaults', () => {
      usePostProcessingStore.getState().setEnabled(true)
      usePostProcessingStore.getState().updateBloom({ enabled: true, intensity: 5 })
      usePostProcessingStore.getState().updateSSAO({ enabled: true, intensity: 40 })
      usePostProcessingStore.getState().updateVignette({ enabled: true, darkness: 1 })

      usePostProcessingStore.getState().resetDefaults()

      const state = usePostProcessingStore.getState()
      expect(state.enabled).toBe(false)
      expect(state.bloom.enabled).toBe(false)
      expect(state.bloom.intensity).toBe(1)
      expect(state.ssao.enabled).toBe(false)
      expect(state.ssao.intensity).toBe(15)
      expect(state.vignette.enabled).toBe(false)
      expect(state.vignette.offset).toBe(0.5)
    })
  })

  describe('getSettings', () => {
    it('returns current settings as immutable copy', () => {
      usePostProcessingStore.getState().setEnabled(true)
      usePostProcessingStore.getState().updateBloom({ intensity: 2.5 })

      const settings = usePostProcessingStore.getState().getSettings()
      expect(settings.enabled).toBe(true)
      expect(settings.bloom.intensity).toBe(2.5)

      // Mutate returned object - should not affect store
      settings.bloom.intensity = 999
      expect(usePostProcessingStore.getState().bloom.intensity).toBe(2.5)
    })

    it('returns all effect groups', () => {
      const settings = usePostProcessingStore.getState().getSettings()
      expect(settings).toHaveProperty('enabled')
      expect(settings).toHaveProperty('bloom')
      expect(settings).toHaveProperty('ssao')
      expect(settings).toHaveProperty('vignette')
    })
  })
})
