import { memo, useRef, useMemo, useCallback, useEffect, useState, Suspense } from 'react'
import { TransformControls, useGLTF } from '@react-three/drei'
import { useSceneStore } from '../stores/useSceneStore'
import { useUIStore } from '../stores/useUIStore'
import { isGltfFormat } from '../core/modelLoader'
import type { SceneObject, MaterialData } from '../types/scene'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'

const ObjectGeometry = memo(function ObjectGeometry({ type }: { type: SceneObject['type'] }) {
  switch (type) {
    case 'box':
      return <boxGeometry args={[1, 1, 1]} />
    case 'sphere':
      return <sphereGeometry args={[1, 32, 32]} />
    case 'cylinder':
      return <cylinderGeometry args={[1, 1, 1, 32]} />
    case 'cone':
      return <coneGeometry args={[1, 1, 32]} />
    case 'plane':
      return <planeGeometry args={[1, 1]} />
    case 'torus':
      return <torusGeometry args={[1, 0.4, 16, 32]} />
    default:
      return <boxGeometry args={[1, 1, 1]} />
  }
})

const DEG2RAD = Math.PI / 180
const RAD2DEG = 180 / Math.PI

const ObjectMaterial = memo(function ObjectMaterial({ material, fallbackColor }: { material: MaterialData; fallbackColor: string }) {
  const color = material.color ?? fallbackColor
  const { opacity, transparent, wireframe } = material

  switch (material.type) {
    case 'basic':
      return (
        <meshBasicMaterial
          color={color}
          opacity={opacity}
          transparent={transparent}
          wireframe={wireframe}
        />
      )
    case 'phong':
      return (
        <meshPhongMaterial
          color={color}
          opacity={opacity}
          transparent={transparent}
          wireframe={wireframe}
          shininess={80}
        />
      )
    case 'standard':
    default:
      return (
        <meshStandardMaterial
          color={color}
          metalness={material.metalness}
          roughness={material.roughness}
          opacity={opacity}
          transparent={transparent}
          wireframe={wireframe}
        />
      )
  }
})

// Default material values for models - used to detect user customization
const MODEL_DEFAULT_COLOR = '#c49a5c'
const MODEL_DEFAULT_MATERIAL: MaterialData = {
  type: 'standard',
  color: MODEL_DEFAULT_COLOR,
  opacity: 1,
  transparent: false,
  wireframe: false,
  metalness: 0.1,
  roughness: 0.7,
}

function isMaterialCustomized(material: MaterialData): boolean {
  return (
    material.color !== MODEL_DEFAULT_MATERIAL.color ||
    material.type !== MODEL_DEFAULT_MATERIAL.type ||
    material.opacity !== MODEL_DEFAULT_MATERIAL.opacity ||
    material.transparent !== MODEL_DEFAULT_MATERIAL.transparent ||
    material.wireframe !== MODEL_DEFAULT_MATERIAL.wireframe ||
    material.metalness !== MODEL_DEFAULT_MATERIAL.metalness ||
    material.roughness !== MODEL_DEFAULT_MATERIAL.roughness
  )
}

// Apply material overrides to all meshes in a cloned GLTF scene
function applyMaterialOverrides(root: THREE.Object3D, material: MaterialData) {
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      // Dispose old material(s) before replacing
      const oldMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      oldMaterials.forEach((m) => m.dispose())

      const color = material.color
      switch (material.type) {
        case 'basic':
          mesh.material = new THREE.MeshBasicMaterial({
            color,
            opacity: material.opacity,
            transparent: material.transparent,
            wireframe: material.wireframe,
          })
          break
        case 'phong':
          mesh.material = new THREE.MeshPhongMaterial({
            color,
            opacity: material.opacity,
            transparent: material.transparent,
            wireframe: material.wireframe,
            shininess: 80,
          })
          break
        case 'standard':
        default:
          mesh.material = new THREE.MeshStandardMaterial({
            color,
            metalness: material.metalness,
            roughness: material.roughness,
            opacity: material.opacity,
            transparent: material.transparent,
            wireframe: material.wireframe,
          })
          break
      }
    }
  })
}

// GLTF model renderer - loaded via useGLTF with Suspense
function GltfModel({ url, material }: { url: string; material: MaterialData }) {
  const { scene } = useGLTF(url)
  const clonedScene = useMemo(() => scene.clone(), [scene])
  const customized = isMaterialCustomized(material)

  // Apply material overrides when user has customized material properties
  useEffect(() => {
    if (customized) {
      applyMaterialOverrides(clonedScene, material)
    }
  }, [
    clonedScene,
    customized,
    material.type,
    material.color,
    material.opacity,
    material.transparent,
    material.wireframe,
    material.metalness,
    material.roughness,
  ])

  return <primitive object={clonedScene} />
}

// Generic model renderer for FBX/OBJ/DAE formats
function GenericModel({ url, format, material }: { url: string; format: string; material: MaterialData }) {
  const [loadedScene, setLoadedScene] = useState<THREE.Object3D | null>(null)

  useEffect(() => {
    let cancelled = false
    const loader =
      format === 'fbx' ? new FBXLoader() :
      format === 'obj' ? new OBJLoader() :
      format === 'dae' ? new ColladaLoader() : null

    if (!loader) return

    loader.load(
      url,
      (result: unknown) => {
        if (cancelled || !result) return
        // ColladaLoader returns { scene }, others return the object directly
        const scene = (result as Record<string, unknown>).scene
          ? ((result as Record<string, unknown>).scene as THREE.Object3D)
          : result as THREE.Object3D
        setLoadedScene(scene)
      },
      undefined,
      (error) => {
        if (!cancelled) console.error(`Failed to load ${format} model:`, error)
      },
    )

    return () => { cancelled = true }
  }, [url, format])

  const clonedScene = useMemo(() => loadedScene?.clone() ?? null, [loadedScene])
  const customized = isMaterialCustomized(material)

  useEffect(() => {
    if (clonedScene && customized) {
      applyMaterialOverrides(clonedScene, material)
    }
  }, [
    clonedScene,
    customized,
    material.type,
    material.color,
    material.opacity,
    material.transparent,
    material.wireframe,
    material.metalness,
    material.roughness,
  ])

  if (!clonedScene) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#c49a5c" wireframe />
      </mesh>
    )
  }

  return <primitive object={clonedScene} />
}

// Dispatches to the right loader based on model format
function ModelRenderer({ url, format, material }: { url: string; format?: string; material: MaterialData }) {
  if (!format || isGltfFormat(format as 'gltf' | 'glb')) {
    return <GltfModel url={url} material={material} />
  }
  return <GenericModel url={url} format={format} material={material} />
}

export const SceneObject3D = memo(function SceneObject3D({ obj }: { obj: SceneObject }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const selectedId = useSceneStore((s) => s.selectedId)

  const selectObject = useSceneStore((s) => s.selectObject)
  const toggleSelectObject = useSceneStore((s) => s.toggleSelectObject)
  const toolMode = useSceneStore((s) => s.toolMode)
  const updateObject = useSceneStore((s) => s.updateObject)
  const snapEnabled = useSceneStore((s) => s.snapEnabled)
  const snapValue = useSceneStore((s) => s.snapValue)
  const showContextMenu = useUIStore((s) => s.showContextMenu)
  const isActive = selectedId === obj.id

  // Map tool mode to TransformControls mode
  const transformMode = useMemo(() => {
    switch (toolMode) {
      case 'move': return 'translate' as const
      case 'rotate': return 'rotate' as const
      case 'scale': return 'scale' as const
      default: return null
    }
  }, [toolMode])

  // Sync transform back to store after gizmo interaction (history only on mouseUp)
  const handleTransformEnd = useCallback(() => {
    const ref = obj.type === 'model' ? groupRef.current : meshRef.current
    if (!ref) return
    const { position, rotation, scale } = ref
    updateObject(obj.id, {
      position: { x: position.x, y: position.y, z: position.z },
      rotation: {
        x: rotation.x * RAD2DEG,
        y: rotation.y * RAD2DEG,
        z: rotation.z * RAD2DEG,
      },
      scale: { x: scale.x, y: scale.y, z: scale.z },
    })
  }, [obj.id, obj.type, updateObject])

  // Handle click with Ctrl support for multi-select
  const handleClick = useCallback((e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation()
    const nativeEvent = (e as unknown as { nativeEvent?: MouseEvent }).nativeEvent
    if (nativeEvent?.ctrlKey || nativeEvent?.metaKey) {
      toggleSelectObject(obj.id)
    } else {
      selectObject(obj.id)
    }
  }, [obj.id, selectObject, toggleSelectObject])

  const handleContextMenu = useCallback((e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation()
    selectObject(obj.id)
    const nativeEvent = (e as unknown as { nativeEvent: MouseEvent }).nativeEvent
    showContextMenu(nativeEvent.clientX, nativeEvent.clientY, obj.id)
  }, [obj.id, selectObject, showContextMenu])

  // For GLTF models, use a group instead of mesh
  if (obj.type === 'model' && obj.gltfUrl) {
    const transformRef = groupRef
    const group = (
      <group
        ref={groupRef}
        position={[obj.position.x, obj.position.y, obj.position.z]}
        rotation={[
          obj.rotation.x * DEG2RAD,
          obj.rotation.y * DEG2RAD,
          obj.rotation.z * DEG2RAD,
        ]}
        scale={[obj.scale.x, obj.scale.y, obj.scale.z]}
        visible={obj.visible}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <Suspense fallback={
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#c49a5c" wireframe />
          </mesh>
        }>
          <ModelRenderer url={obj.gltfUrl} format={obj.modelFormat} material={obj.material} />
        </Suspense>
      </group>
    )

    if (isActive && transformMode && !obj.locked && transformRef.current) {
      return (
        <>
          {group}
          <TransformControls
            object={transformRef.current}
            mode={transformMode}
            translationSnap={snapEnabled ? snapValue : null}
            rotationSnap={snapEnabled ? (Math.PI / 12) : null}
            scaleSnap={snapEnabled ? snapValue : null}
            onMouseUp={handleTransformEnd}
          />
        </>
      )
    }

    return group
  }

  // Standard primitive rendering
  const mesh = (
    <mesh
      ref={meshRef}
      position={[obj.position.x, obj.position.y, obj.position.z]}
      rotation={[
        obj.rotation.x * DEG2RAD,
        obj.rotation.y * DEG2RAD,
        obj.rotation.z * DEG2RAD,
      ]}
      scale={[obj.scale.x, obj.scale.y, obj.scale.z]}
      visible={obj.visible}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      castShadow
      receiveShadow
    >
      <ObjectGeometry type={obj.type} />
      <ObjectMaterial material={obj.material} fallbackColor={obj.color} />
    </mesh>
  )

  // Wrap active object with TransformControls when a transform tool is active
  // Don't show transform gizmo for locked objects
  if (isActive && transformMode && !obj.locked) {
    return (
      <>
        {mesh}
        {meshRef.current && (
          <TransformControls
            object={meshRef.current}
            mode={transformMode}
            translationSnap={snapEnabled ? snapValue : null}
            rotationSnap={snapEnabled ? (Math.PI / 12) : null}
            scaleSnap={snapEnabled ? snapValue : null}
            onMouseUp={handleTransformEnd}
          />
        )}
      </>
    )
  }

  return mesh
})
