/** Core module barrel export */

export {
  generateId,
  resetIdCounter,
  createDefaultMaterial,
  createDefaultEnvironment,
  createSceneObject,
  createModelObject,
  duplicateSceneObject,
  updateSceneObject,
  removeSceneObject,
  findSceneObject,
  vec3,
  addVec3,
  scaleVec3,
  vec3Equal,
  getChildren,
  getDescendants,
  removeWithDescendants,
  setParentId,
  OBJECT_DEFAULTS,
  OBJECT_LABELS,
} from './sceneOperations'

export {
  createSceneData,
  serializeScene,
  deserializeScene,
  downloadScene,
  uploadScene,
  uploadGltf,
} from './serialization'

export {
  SceneError,
  ObjectNotFoundError,
  DuplicateObjectError,
  ValidationError,
  SerializationError,
  isValidVec3,
  isValidHexColor,
  isValidOpacity,
  validateVec3,
  validateMaterial,
  validateSceneObject,
  validateSceneData,
} from './errors'

export {
  applyEasing,
  lerpVec3,
  interpolateKeyframes,
  getPropertyKeyframes,
  evaluateTrack,
  generateKeyframeId,
  generateTrackId,
  resetKeyframeIdCounter,
} from './animation'

export {
  CAMERA_PRESETS,
  findPreset,
} from './cameraPresets'

export {
  SpatialIndex,
  createAABB,
  aabbIntersects,
  aabbContains,
  sphereIntersectsAABB,
  objectToAABB,
  planeDistanceToPoint,
} from './spatialIndex'

// Camera Paths
export {
  catmullRom,
  catmullRomVec3,
  evaluatePath as evaluateCameraPath,
  createCameraPath,
  addPathPoint,
  removePathPoint,
  updatePathPoint,
  reorderPathPoints,
  getPathLength,
  getPathDuration,
  samplePath,
  validateCameraPath,
  dolly,
  truck,
  pedestal,
  orbit,
  orbit3D,
  generateOrbitPath,
  generateDollyZoomPath,
  generateFlyThroughPath,
  generatePathId,
  generatePointId,
  resetPathIdCounters,
} from './cameraPath'

// Export Pipeline
export {
  createGltfDocument,
  generateBoxGeometry,
  generateSphereGeometry,
  generateCylinderGeometry,
  generateConeGeometry,
  generatePlaneGeometry,
  generateTorusGeometry,
  hexToGltfColor,
  materialToGltf,
  sceneObjectToGltf,
  sceneToGltf,
  packBufferData,
  serializeGltfJson,
  assembleGlb,
  captureScreenshot,
  startVideoRecording,
  validateGltfOptions,
  validateScreenshotOptions,
  validateVideoOptions,
  DEFAULT_GLTF_OPTIONS,
  DEFAULT_SCREENSHOT_OPTIONS,
  DEFAULT_VIDEO_OPTIONS,
  eulerToQuaternion,
  formatFileSize,
  generateExportFileName,
} from './exportPipeline'

// Storage Engine
export {
  generateSceneId,
  createSceneMetadata as createStorageMetadata,
  updateSceneMetadata as updateStorageMetadata,
  searchScenes,
  sortScenes,
  filterScenes,
  createDebouncedSave,
  createVersionEntry,
  pruneVersions,
  validateAutoSaveConfig,
  validateSceneMetadata as validateStorageMetadata,
  MAX_SCENE_SIZE,
  estimateSceneSize,
  formatStorageSize,
  IndexedDBAdapter,
  InMemoryAdapter,
} from './storageEngine'
