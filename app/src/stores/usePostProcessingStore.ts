import { create } from 'zustand'
import type { PostProcessingSettings, BloomSettings, SSAOSettings, VignetteSettings } from '../types/scene'

interface PostProcessingState extends PostProcessingSettings {
  // Actions
  setEnabled: (enabled: boolean) => void
  updateBloom: (updates: Partial<BloomSettings>) => void
  updateSSAO: (updates: Partial<SSAOSettings>) => void
  updateVignette: (updates: Partial<VignetteSettings>) => void
  loadSettings: (settings: PostProcessingSettings) => void
  resetDefaults: () => void
  getSettings: () => PostProcessingSettings
}

function createDefaultPostProcessing(): PostProcessingSettings {
  return {
    enabled: false,
    bloom: {
      enabled: false,
      intensity: 1,
      threshold: 0.9,
      radius: 0.4,
    },
    ssao: {
      enabled: false,
      intensity: 15,
      radius: 5,
      bias: 0.025,
    },
    vignette: {
      enabled: false,
      offset: 0.5,
      darkness: 0.5,
    },
  }
}

export { createDefaultPostProcessing }

export const usePostProcessingStore = create<PostProcessingState>((set, get) => {
  const defaults = createDefaultPostProcessing()

  return {
    ...defaults,

    setEnabled: (enabled) => set({ enabled }),

    updateBloom: (updates) => set(state => ({
      bloom: { ...state.bloom, ...updates },
    })),

    updateSSAO: (updates) => set(state => ({
      ssao: { ...state.ssao, ...updates },
    })),

    updateVignette: (updates) => set(state => ({
      vignette: { ...state.vignette, ...updates },
    })),

    loadSettings: (settings) => set({
      enabled: settings.enabled,
      bloom: { ...settings.bloom },
      ssao: { ...settings.ssao },
      vignette: { ...settings.vignette },
    }),

    resetDefaults: () => set(createDefaultPostProcessing()),

    getSettings: (): PostProcessingSettings => {
      const state = get()
      return {
        enabled: state.enabled,
        bloom: { ...state.bloom },
        ssao: { ...state.ssao },
        vignette: { ...state.vignette },
      }
    },
  }
})
