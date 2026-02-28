import { usePostProcessingStore } from '../stores/usePostProcessingStore'
import { EffectComposer, Bloom, SSAO, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

function SSAOEffect() {
  const ssao = usePostProcessingStore(s => s.ssao)
  if (!ssao.enabled) return null
  return (
    <SSAO
      blendFunction={BlendFunction.MULTIPLY}
      samples={21}
      rings={4}
      radius={ssao.radius}
      intensity={ssao.intensity}
      bias={ssao.bias}
      luminanceInfluence={0.9}
    />
  )
}

function BloomEffect() {
  const bloom = usePostProcessingStore(s => s.bloom)
  if (!bloom.enabled) return null
  return (
    <Bloom
      luminanceThreshold={bloom.threshold}
      luminanceSmoothing={0.025}
      intensity={bloom.intensity}
      mipmapBlur
      radius={bloom.radius}
    />
  )
}

function VignetteEffect() {
  const vignette = usePostProcessingStore(s => s.vignette)
  if (!vignette.enabled) return null
  return (
    <Vignette
      offset={vignette.offset}
      darkness={vignette.darkness}
      blendFunction={BlendFunction.NORMAL}
    />
  )
}

export function PostProcessingEffects() {
  const enabled = usePostProcessingStore(s => s.enabled)
  const bloomEnabled = usePostProcessingStore(s => s.bloom.enabled)
  const ssaoEnabled = usePostProcessingStore(s => s.ssao.enabled)
  const vignetteEnabled = usePostProcessingStore(s => s.vignette.enabled)

  if (!enabled) return null

  const hasActiveEffect = bloomEnabled || ssaoEnabled || vignetteEnabled
  if (!hasActiveEffect) return null

  return (
    <EffectComposer multisampling={4}>
      <SSAOEffect />
      <BloomEffect />
      <VignetteEffect />
    </EffectComposer>
  )
}
