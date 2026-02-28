# 3D Scene Cowboy - Project Conventions

## Overview
3D Scene Cowboy is a web-based 3D scene editor with a western/cowboy aesthetic. Users can add, select, transform, and arrange 3D objects in a scene. Supports GLTF model import, object hierarchy (parent/child), multi-select with batch operations, copy/paste, performance-optimized on-demand rendering, post-processing effects (bloom/SSAO/vignette), animation timeline with keyframe interpolation, camera presets with smooth transitions, real-time collaboration (CRDT-based with scene diffing), asset library with import pipeline, a plugin system with lifecycle hooks and dependency resolution, terrain generation with brush sculpting, particle systems with presets, spatial audio with reverb zones, cinematic camera paths with Catmull-Rom splines, glTF 2.0 export pipeline with screenshot/video capture, IndexedDB cloud storage with auto-save, advanced snapping (vertex/edge/face/grid), measurement tools (distance/angle/area), and scene optimization (mesh merging, draw call reduction).

## Tech Stack
- **Runtime**: Vite 7 + React 19 + TypeScript 5.9
- **3D Engine**: React Three Fiber 9 + @react-three/drei 10 + @react-three/postprocessing 3
- **State**: Zustand 5 (with zundo for undo/redo)
- **Styling**: Tailwind CSS 4
- **Theme**: Brutalist dark — Teenage Engineering × Apple inspired. Deep blacks (#080808), warm amber/orange glow accents, cyan secondary. Industrial/hardware aesthetic with LED-style edge highlights.

## Project Structure
```
app/
├── src/
│   ├── components/
│   │   ├── ui/           # Reusable UI widgets (CollapsibleSection, ContextMenu, EnvironmentPanel, KeyboardShortcutModal, SceneStats)
│   │   ├── Toolbar.tsx   # Top toolbar with tools, add objects, save/load, snap, import model, pivot mode, theme toggle
│   │   ├── ObjectList.tsx # Left sidebar with scene object hierarchy tree (expand/collapse, drag-to-reparent)
│   │   ├── PropertiesPanel.tsx # Right sidebar with object properties, material editing
│   │   ├── Viewport.tsx  # 3D Canvas with on-demand rendering, StoreInvalidator, SceneStats, PostProcessing, Camera
│   │   ├── SceneObject3D.tsx   # Individual 3D object with transform controls, GLTF support, multi-select
│   │   ├── PostProcessing.tsx  # EffectComposer with Bloom/SSAO/Vignette effects
│   │   ├── TimelinePlayback.tsx # Animation driver (useFrame) and scrub invalidator
│   │   ├── CollaborationUI.tsx  # User avatars, presence indicators, online count
│   │   ├── ConflictResolutionUI.tsx # Visual merge conflict resolution dialog
│   │   ├── ChatPanel.tsx        # In-app messaging with object references
│   │   ├── AssetBrowserPanel.tsx # Grid/list asset browser with search, filter, drag-to-add
│   │   ├── PluginMarketplaceUI.tsx # Plugin discovery, install/uninstall, enable/disable
│   │   ├── PluginSettingsPanel.tsx # Per-plugin configuration with dynamic settings
│   │   ├── TerrainEditorPanel.tsx  # Terrain brush tools, texture painting, heightmap import
│   │   ├── ParticleEditorPanel.tsx # Particle emitter config, presets, visual curves
│   │   ├── AudioPanel.tsx          # Spatial audio sources, reverb zones, master controls
│   │   └── CloudSaveModal.tsx      # Cloud storage save/load dialog with tabs
│   ├── core/             # Pure functions (sceneOperations, serialization, errors, animation, cameraPresets, sceneDiff, crdt, assetLibrary, assetPipeline, pluginApi, pluginRegistry, terrainEngine, particleEngine, audioEngine, cameraPath, exportPipeline, storageEngine, snapping, measurement, sceneOptimizer)
│   ├── stores/           # Zustand stores (useSceneStore, useUIStore, usePostProcessingStore, useAnimationStore, useCameraStore, useCollaborationStore, useAssetStore, usePluginStore, useChatStore, useTerrainStore, useParticleStore, useAudioStore, useCameraPathStore, useExportStore, useStorageStore, useSnappingStore)
│   ├── types/            # TypeScript type definitions (scene.ts, collaboration.ts, asset.ts, plugin.ts, terrain.ts, particle.ts, audio.ts, cameraPath.ts, export.ts, storage.ts, snapping.ts)
│   ├── hooks/            # Custom React hooks (useKeyboardShortcuts)
│   ├── test/             # Test setup and mocks
│   ├── App.tsx           # Root layout with semantic HTML landmarks
│   └── main.tsx          # Entry point
```

## Architecture Rules

### State Management
- Use Zustand stores, NOT React useState for shared state
- `useSceneStore`: objects, selection (selectedId + selectedIds), tools, environment, history, clipboard
- `useUIStore`: ephemeral UI (sidebar collapse, context menu, pivot mode, theme)
- `usePostProcessingStore`: post-processing effect settings (bloom, SSAO, vignette)
- `useAnimationStore`: animation timeline (tracks, keyframes, playback state)
- `useCameraStore`: camera preset state and controls ref
- `useCollaborationStore`: connection state, user presence, peers (Map), conflicts, sync ops
- `useAssetStore`: asset library with filtering/sorting, categories, search, view mode
- `usePluginStore`: plugin registry (Map<string, PluginInstance>), lifecycle management
- `useChatStore`: chat messages, typing indicators, unread count
- `useTerrainStore`: terrain settings, brush tools, texture painting, heightmap state
- `useParticleStore`: particle system CRUD, emitter config, presets, playback
- `useAudioStore`: audio sources, reverb zones, master volume, spatial audio params
- `useCameraPathStore`: camera paths, control points, playback state
- `useExportStore`: export format options (glTF/screenshot/video), progress tracking, format-specific clamping
- `useStorageStore`: saved scenes list, active scene, filtering/sorting, auto-save config with clamping
- `useSnappingStore`: snap config (grid/vertex/edge/face/center), measurement CRUD, guide lines
- Local component state (useState) only for ephemeral UI like scene name, dialog visibility
- Never call setState inside useFrame - mutate refs directly
- Undo/redo via custom snapshot pattern (structuredClone), MAX_HISTORY = 50
- Multi-select: `selectedIds: string[]` for batch ops, `selectedId` for active/primary object
- Clipboard: `clipboard: SceneObject[]` in store for copy/paste operations

### 3D Performance
- Canvas uses `frameloop="demand"` with StoreInvalidator for on-demand rendering
- Share materials and geometries via useMemo
- Memoize geometry/material components with React.memo (ObjectGeometry, ObjectMaterial)
- Keep Three.js mutations in useFrame, not React state
- Always dispose GPU resources (geometry, material, texture) on unmount
- Use instancing for repeated objects
- Target < 100 draw calls per frame
- Cache assets with useLoader/useGLTF
- Transform debouncing: push history on mouseUp, not during gizmo drag

### Component Patterns
- Reusable UI widgets go in `components/ui/` (CollapsibleSection, ContextMenu, etc.)
- Scene-related components live directly in `components/`
- One component per file, named export matching filename
- Props interfaces defined inline above component
- Use semantic HTML landmarks (header, main, aside) in App layout

### Styling
- Use Tailwind utility classes for all UI styling
- No inline styles except for dynamic 3D positioning and boxShadow glow effects
- Custom @theme colors: dust (deep blacks #080808-#222222), sand (text #e0e0e0), rust (accent #ff6600), sunset (amber), cyan (secondary #00d4ff)
- Panel borders: `border-dust-600/30` (subtle, semi-transparent)
- Panel depth: Use inline `boxShadow` with `inset` for inner bevel/glow effects
- Hover states: `hover:bg-dust-600/40` or `hover:bg-dust-600/15` (lighter)
- Active/selected states: `bg-rust-500 text-white` with orange glow boxShadow
- Corner radius: use `rounded` (4px) not `rounded-sm` (2px) — brutalist but not sharp
- Focus indicators: `focus-visible:ring-1 focus-visible:ring-rust-500/60`
- Glow utilities: `.glow-orange`, `.glow-cyan`, `.glow-orange-strong`, `.glow-border-*`, `.glow-edge-*`
- Panel classes: `.panel`, `.panel-elevated`, `.panel-brutalist`

### TypeScript
- Strict mode enabled
- All scene objects must conform to `SceneObject` type
- Use discriminated unions for object types
- No `any` types - use `unknown` if truly needed
- Use `tsc -b --noEmit` (not `tsc --noEmit`) due to project references
- Exclude test files from tsconfig.app.json compilation

### Accessibility
- All icon buttons must have aria-label attributes
- Use focus-visible for keyboard focus indicators
- Listbox items need role="option" and aria-selected
- Form inputs need proper label/htmlFor connections
- Color hex inputs: validate with regex, maxLength=7
- Name inputs: maxLength=64 to prevent abuse
- Context menus: role="menu" with role="menuitem", arrow key navigation, auto-focus on mount
- Collapsible sections: aria-expanded on toggle buttons
- Viewport: role="region" with aria-label
- Modal dialogs: Escape to close, backdrop click to close, focus trap

### Testing
- Vitest with jsdom environment, ResizeObserver polyfill for R3F
- **Run tests from `app/` directory** (not project root) - jsdom won't load from wrong cwd
- Query buttons by role/name (getByRole) not title for resilience
- Reset Zustand store in beforeEach - **must include all store fields**: selectedIds, clipboard, history entries with selectedIds
- Tests live alongside source files (*.test.tsx)
- 1148 tests across 44 files at end of Phase 5, 1686 tests across 53 files at end of Phase 6, 1898 tests across 59 files at end of Phase 7

### Object Hierarchy
- `parentId` field on SceneObject for parent/child relationships
- `wouldCreateCycle()` in sceneOperations.ts prevents circular hierarchies
- Always validate before setParent: self-parent and ancestor loops are blocked
- Recursive operations: getChildren, getDescendants, removeWithDescendants
- ObjectList renders as indented tree with expand/collapse

### GLTF Import
- Model objects: type='model' with gltfUrl field (Blob URL from file picker)
- `addModelObject(name, url)` in store creates model SceneObject
- `GltfModel` component in SceneObject3D.tsx renders via useGLTF with Suspense fallback
- Revoke Blob URLs on unmount to prevent memory leaks

### Post-Processing Effects
- `usePostProcessingStore`: per-effect settings (bloom/SSAO/vignette) with master enabled toggle
- `PostProcessingEffects` component wraps `EffectComposer` from `@react-three/postprocessing`
- Conditional rendering: EffectComposer only mounts when master + at least one effect enabled
- StoreInvalidator watches PP settings to trigger demand-mode re-renders
- `loadSettings` / `resetDefaults` for serialization; `getSettings` returns clean copies

### Animation Timeline
- `useAnimationStore`: tracks, keyframes, playback state (currentTime, isPlaying, speed, loop)
- Pure interpolation in `core/animation.ts`: easing, lerpVec3, evaluateTrack
- `TimelinePlayback` drives animation via useFrame, `TimelineScrubInvalidator` for manual scrubbing
- Animation updates bypass undo history (ephemeral during playback)
- Keyframe time clamped to [0, duration]; playback speed clamped to [0.1, 4x]
- Hot-path optimization: use Map for object lookups, avoid Object.keys allocations in useFrame

### Camera Presets
- `useCameraStore`: stores CameraControls ref (via callback ref in Viewport) and active preset
- `core/cameraPresets.ts`: 6 presets (Front/Back/Top/Right/Left/Perspective) targeting origin
- Smooth transitions via `controlsRef.setLookAt(..., true)`
- `CameraControlsBridge` in Viewport manages ref lifecycle with callback ref pattern

### Scene Serialization v2
- `SCENE_VERSION = 2`: includes optional `postProcessing` and `animationTracks` fields
- Full v1-to-v2 migration: missing fields default gracefully, version bumped on load
- `loadScene` resets external stores (PP, animation) when fields absent in loaded scene
- `clearScene` resets all stores including PP and animation
- Object type validated against known set; material type validated against union
- Cross-store coordination: `saveScene` reads from PP and animation stores

### Collaboration System (Phase 5)
- **CRDT**: LWW (Last-Writer-Wins) registers per field with vector clocks in `core/crdt.ts`
- **Scene Diffing**: Pure diff/patch/compress functions in `core/sceneDiff.ts` - uses Maps for O(1) lookups
- **Collaboration Store**: `useCollaborationStore` with factory pattern (`createCollaborationStore`) for testability
- **Conflict Management**: `conflicts: ConflictInfo[]` in store with `addConflict`, `resolveConflict`, `clearResolvedConflicts`
- **Presence Protocol**: `UserPresence` with cursor position, selected objects, last-seen timestamp
- **Chat**: `useChatStore` with messages, typing indicators, unread count, object references
- **Mock Data**: MOCK_PEERS defined in components (not stores) for demo mode
- **Type Separation**: `types/collaboration.ts` defines protocol types; `AssetListItem`/`PluginListItem` are UI-only types

### Asset Library (Phase 5)
- **Type System**: Discriminated union `Asset = MeshAsset | MaterialAsset | TextureAsset | PrefabAsset` in `types/asset.ts`
- **Pure Functions**: `core/assetLibrary.ts` for creation, filtering, sorting, validation, tag operations
- **Import Pipeline**: `core/assetPipeline.ts` for file type detection, metadata extraction, URL import
- **Store**: `useAssetStore` with filtered views, category/search filtering, grid/list view modes
- **Blob URL Cleanup**: `revokeAssetUrls()` for memory management on unmount
- **Validation**: `validateAssetMetadata()` type guard for deserialized data

### Plugin System (Phase 5)
- **Architecture**: Registry pattern with lifecycle hooks (onInit, onActivate, onDeactivate, onDestroy)
- **Types**: `PluginManifest` (metadata + permissions + config schema), `PluginInstance` (runtime state), `PluginLifecycle` (hooks)
- **Permissions**: `PluginPermission` enum (scene:read/write, ui:toolbar/panel/contextmenu, storage:read/write)
- **Plugin Context**: `createPluginContext()` enforces permissions, provides scene API, subscription hooks
- **Scene API**: `SceneApi` interface decouples plugin context from store implementation
- **Dependency Resolution**: `resolveDependencies()` with topological sort and cycle detection
- **Registry**: Pure functions in `core/pluginRegistry.ts` for register/unregister/activate/deactivate
- **Store**: `usePluginStore` wraps registry with async lifecycle hook execution
- **Config Validation**: `validateConfig()` checks values against configSchema field constraints
- **Security**: Plugin API validates object types before addObject, returns defensive copies of selections

### Physics Engine (Phase 6)
- **Core**: Pure functions in `core/physicsEngine.ts` for physics data validation, material presets, volume/mass estimation
- **Types**: `PhysicsData` on SceneObject (optional), `RigidBodyType` (fixed/dynamic/kinematic), `ColliderShape`, `PhysicsWorldSettings`
- **Store**: `usePhysicsStore` with factory pattern, simulation state (stopped/playing/paused), pre-simulation snapshot for position restore
- **Material Presets**: default, rubber, metal, wood, ice, stone, glass, bouncy with friction/restitution/density
- **Collision Groups**: Constants for DEFAULT, STATIC, DYNAMIC, KINEMATIC, TRIGGER with bitfield filtering
- **Validation**: `validatePhysicsData` checks coefficient ranges, mass > 0, trimesh+dynamic constraint
- **Integration**: `createDefaultPhysics()`, `createDefaultPhysicsWorld()` in sceneOperations.ts

### Instanced Rendering (Phase 6)
- **Core**: Pure functions in `core/instanceManager.ts` for instance group management
- **Matrix Math**: `composeMatrix` writes column-major 4x4 TRS matrices (XYZ Euler order) into Float32Array for InstancedMesh
- **Instance Groups**: `buildInstanceGroups` scans objects, groups slaves by masterId, returns `InstanceGroup[]`
- **Master/Slave**: `InstanceConfig.enabled + masterId` - undefined masterId = master, set masterId = slave
- **Performance**: `updateInstanceMatrix` mutates Float32Array in place with bounds checking; no allocations in hot path
- **UI**: `InstanceManagerUI` component for master/slave management with add/remove/detach actions

### LOD System (Phase 6)
- **Core**: Pure functions in `core/lodManager.ts` for LOD level selection, validation, triangle count estimation
- **Presets**: high-quality, balanced, performance presets with 3-4 LOD levels each
- **Level Selection**: `getActiveLODLevel` finds highest distance threshold <= cameraDistance (sort-order independent)
- **Validation**: `validateLODConfig` checks sorted distances, no duplicates, at least one level
- **Triangle Estimation**: `estimateTriangleCount` for box/sphere/cylinder/cone/plane/torus/billboard/simplified/model
- **UI**: `LODEditor` component with preset buttons, level editing, savings percentage display

### Script Runtime (Phase 6)
- **Architecture**: Web Worker-based sandbox with `ScriptWorkerHost` class managing lifecycle
- **Sandbox Security**: Dangerous globals removed via `delete + Object.defineProperty` (not just assignment), including Worker, SharedArrayBuffer, Atomics, close, setInterval
- **API Bridge**: Script-to-host async request/response pattern with 5s timeout per request
- **Scene API**: 14 methods (getObject, setPosition, addObject, removeObject, etc.) validated by host-side handler
- **Validation**: `validateScriptSource` checks syntax, dangerous patterns (eval, Function, constructor.constructor, __proto__)
- **Error Handling**: Capped error array (MAX_ERRORS=100), errors cleared on restart, message fields validated at runtime
- **Script Store**: `useScriptStore` with factory pattern, script CRUD, console management (capped at 500 entries)
- **Templates**: 4 built-in templates (Hello World, Rotate Object, Random Scatter, Object Grid)
- **Types**: `types/script.ts` with discriminated unions for HostToScriptMessage/ScriptToHostMessage, ScriptApiMethod

### PBR Materials (Phase 6)
- **Type Extensions**: `MaterialData` extended with normalMap, roughnessMap, metalnessMap, emissiveMap, aoMap, envMapIntensity
- **TextureMap**: Interface with url, scale (Vec2), offset (Vec2) for UV control
- **Emissive**: emissiveColor (hex) + emissiveIntensity (0-5) on MaterialData

### Terrain System (Phase 7)
- **Types**: `types/terrain.ts` with TerrainBrushTool, TerrainSettings, TerrainTexture, TerrainChunk, TerrainData
- **Engine**: `core/terrainEngine.ts` - seeded PRNG, gradient noise, fBm, heightmap/splatmap generation, 5 brush tools
- **Store**: `useTerrainStore` with factory pattern, settings validation (width 10-500, segments 32-512), brush clamping (radius 1-50, strength 0-1)
- **Texture Slots**: 4 slots (grass/rock/dirt/snow) with import, tiling, enable/disable
- **Blob URL Cleanup**: `setTextureUrl` revokes old blob URL; `resetTerrain` revokes all
- **UI**: `TerrainEditorPanel` with brush tools, texture painting, heightmap import (20MB limit)

### Particle System (Phase 7)
- **Types**: `types/particle.ts` with EmitterConfig, EmitterShape (point/sphere/cone/box), ColorStop, ScalarCurve
- **Engine**: `core/particleEngine.ts` - particle pool, emission point generation, force application, lifecycle management
- **Store**: `useParticleStore` with factory pattern, 8 presets (fire/smoke/sparks/rain/snow/dust/magic/explosion)
- **Validation**: maxParticles 1-10000, gravity -2 to 2, drag 0-1, spread 0-180
- **UI**: `ParticleEditorPanel` with preset buttons, shape selectors, color gradient preview, curve preview

### Audio System (Phase 7)
- **Types**: `types/audio.ts` with AudioSourceData, ReverbZone, DistanceModel, PanningModel
- **Engine**: `core/audioEngine.ts` - distance attenuation, 3D panning, cone attenuation, reverb influence, dB/linear conversions
- **Store**: `useAudioStore` with factory pattern, validation (volume 0-1, playbackRate 0.25-4, rolloff 0-5, coneAngles 0-360)
- **Reverb Validation**: radius >= 0.1, wet 0-1, decay 0.1-10
- **Blob URL Cleanup**: `revokeAllUrls()` checks blob: prefix; `resetAudio()` calls it before reset
- **File Size Limit**: Audio imports capped at 50MB; texture/heightmap at 20MB
- **UI**: `AudioPanel` with master volume, source list, spatial audio settings, directional cone visualization, reverb zones

### Camera Paths (Phase 7)
- **Types**: `types/cameraPath.ts` with CameraPathPoint, CameraPath, CameraPathEasing, CameraPathPlaybackState
- **Engine**: `core/cameraPath.ts` - Catmull-Rom spline evaluation, easing functions, path length estimation
- **Store**: `useCameraPathStore` with path/point CRUD, playback state (stopped/playing/paused), preview toggle

### Store Validation Pattern (Phase 7)
- All Phase 7 stores clamp numeric inputs in setters (matching audioStore's `setMasterVolume` pattern)
- Validation happens at the store level, not the UI level - stores are the source of truth
- Pattern: merge updates with spread, then clamp each numeric field inline
- Example: `maxParticles: Math.max(1, Math.min(10000, merged.maxParticles))`

### Keyboard Accessibility on role="button" Elements (Phase 7)
- All `div[role="button"]` elements must have `tabIndex={0}` and `onKeyDown` handler
- Handler checks `e.key === 'Enter' || e.key === ' '`, calls `e.preventDefault()`, then triggers action
- This applies to: texture slot selection, particle system list items, audio source list items

### Export Pipeline (Phase 8)
- **Types**: `types/export.ts` with ExportFormat, GltfExportOptions, ScreenshotOptions, VideoRecordingOptions, ExportProgress
- **Engine**: `core/exportPipeline.ts` - glTF 2.0 document assembly, geometry generation (box/sphere/cylinder/cone/plane/torus), binary GLB packing, sRGB-to-linear color conversion, Euler-to-quaternion
- **Store**: `useExportStore` with factory pattern, format-specific option clamping (resolution max 8192, bitrate 100K-50M, FPS snap to 24/30/60)
- **Validation**: `validateGltfOptions`, `validateScreenshotOptions`, `validateVideoOptions` return error arrays
- **Filename Sanitization**: `generateExportFileName` strips non-alphanumeric chars from scene name, sanitizes format extension
- **Geometry Limits**: Uses Uint16Array for indices (max 65535 vertices per mesh) - segment counts must stay within this limit
- **Visibility**: Both root-level and recursive `convertObject` skip invisible objects
- **Browser APIs**: Screenshot (OffscreenCanvas), video recording (MediaRecorder) wrapped in `/* v8 ignore */` blocks

### Cloud Storage (Phase 8)
- **Types**: `types/storage.ts` with StorageAdapter interface, SavedSceneMetadata, AutoSaveConfig, SaveStatus
- **Engine**: `core/storageEngine.ts` - pure filtering/sorting/validation functions, debounced auto-save, version management, IndexedDB adapter
- **Store**: `useStorageStore` with factory pattern, autoSave clamping (intervalMs >= 5000, maxVersions 1-100)
- **Blob URL Cleanup**: `removeScene` and `clearAll` revoke thumbnail blob URLs before clearing
- **Validation**: `validateSceneMetadata` and `validateAutoSaveConfig` return error arrays
- **Debounce Pattern**: `createDebouncedSave(saveFn, intervalMs)` returns `{ save, cancel, flush }` with proper async handling

### Advanced Snapping (Phase 8)
- **Types**: `types/snapping.ts` with SnapTarget, SnapConfig, SnapResult, MeasurementType, Measurement
- **Engine**: `core/snapping.ts` - vertex/edge/face/grid/object-center snapping, guide line calculation
- **Store**: `useSnappingStore` with factory pattern, gridSize/snapDistance clamping, measurement CRUD
- **Snap Priority**: Closest-distance-wins across all snap targets; grid is fallback only
- **Edge Degenerate Handling**: Uses epsilon `1e-10` check (not exact `=== 0`) for floating-point robustness
- **Guide Lines**: Axis-aligned guide lines extend `guideExtent` (50 units) in both directions for X/Y/Z alignment

### Measurement Tools (Phase 8)
- **Engine**: `core/measurement.ts` - distance (Euclidean), angle (acos with clamp), area (cross-product shoelace in 3D)
- **Segment-to-Segment**: Full Ericson/Eberly closest-point algorithm with degenerate case handling
- **Bounding Box**: `boundingBoxDimensions` estimates per object type with scale; planes use XZ convention (scale.y → Z)

### Scene Optimization (Phase 8)
- **Engine**: `core/sceneOptimizer.ts` - material grouping, hidden object detection, mesh merging, LOD auto-generation, draw call estimation
- **Analysis vs Application**: `analyzeOptimization` (read-only metrics) separated from `applyOptimization` (produces new objects)
- **LOD Auto-generation**: Uses `'simplified'` literal for far LOD level (not type assertion)
- **Instancing Awareness**: Draw call estimation deduplicates master/slave instance groups
- **Known Limitation**: `objectAABB` ignores rotation; `findHiddenObjects` is O(n²)

### Testing (Phase 8)
- 3688 tests across 82 files
- Test files renamed "Browse" → "Load" for CloudSaveModal tab
- `generateExportFileName` format sanitization: strips non-alphanumeric chars from extension

### WebSocket Reconnection (Phase 9)
- **Module**: `core/wsReconnect.ts` - pure utility functions complementing WSClient class
- **Backoff**: Exponential backoff with configurable jitter (decorrelated jitter strategy), max delay cap
- **Session Recovery**: `SessionState` tracks sessionId, lastVersion, reconnectCount, isReconnection flag
- **Offline Queue**: `MessageQueue` with priority levels (low/normal/high), bounded size, expired message pruning
- **Message Batching**: `MessageBatcher` with configurable batch size, flush delay, immediate types bypass
- **Pattern**: Queue messages while disconnected, drain queue (priority-sorted) on reconnect

### Operational Transform (Phase 9)
- **Module**: `core/operationalTransform.ts` - OT operations, transform, compose, buffer
- **Operation Types**: `set` (field update), `add` (new object), `remove` (delete), `move` (delta position)
- **Transform**: `transformOp(op1, op2)` produces op1' applicable after op2; handles same-field conflicts via LWW
- **Compose**: `composeOps(op1, op2)` collapses sequential ops on same object (set+set, add+remove, move+move)
- **Buffer**: `OperationBuffer` tracks pending (sent, unacked) and outgoing (unsent) operations
- **Validation**: `validateOperation` type guard for deserialized OT operations

### Scene Versioning (Phase 9)
- **Module**: `core/sceneVersioning.ts` - version/branch/fork/merge with three-way merge
- **Data Model**: `SceneVersion` (snapshot with parentId chain), `Branch` (name + headVersionId)
- **Three-Way Merge**: `threeWayMerge(base, source, target)` with field-level conflict detection
- **Conflict Resolution**: `MergeConflict` with source/target/base values, `applyResolutions` for manual resolution
- **Version History**: `VersionHistory` with commit, fork, switch, getVersionLog operations
- **Ancestor Finding**: `findCommonAncestor` walks parent chains with visited set

### Asset CDN (Phase 9)
- **Module**: `core/assetCdn.ts` - CDN provider interface, upload pipeline, URL resolution
- **Provider Interface**: `CDNProvider` with upload/delete/exists/getSignedUrl methods
- **Validation**: File size limits (100MB default), MIME type allowlist, filename sanitization
- **Upload Manager**: `UploadBatch` with per-file progress tracking, sequential processing
- **Local Provider**: `createLocalCdnProvider()` for development (blob URL-based)
- **Security**: Path traversal prevention, filename sanitization, length limits

### Batch Export (Phase 9)
- **Module**: `core/batchExport.ts` - multi-scene ZIP assembly without compression dependencies
- **ZIP Implementation**: Store-only ZIP format (no compression), CRC32 calculation, cross-platform compatible
- **Manifest**: `manifest.json` listing all exported scenes with metadata
- **Entries**: `createJsonEntry`, `createBinaryEntry` for text/binary ZIP entries
- **Download**: `downloadBlob` helper wrapped in v8 ignore for browser-only code

### History Compression (Phase 9)
- **Module**: `core/historyCompression.ts` - delta-based undo/redo snapshots
- **Delta Types**: `FieldDelta` (old/new value per field), `ObjectDelta` (add/remove/update per object)
- **Computation**: `computeDeltas` diffs two scene states using Map for O(1) lookup
- **Application**: `applyDeltaForward` (redo), `applyDeltaReverse` (undo) with selection state
- **DeltaHistory**: Baseline snapshot + delta stack with re-baselining when entries exceed maxEntries
- **Memory Savings**: `estimateMemorySavings` compares delta vs full snapshot sizes

### Performance Profiler (Phase 9)
- **Module**: `core/performanceProfiler.ts` - FPS ring buffer, draw call counter, memory watermark
- **Ring Buffer**: `RingBuffer` with Float64Array, O(1) push, average/min/max/percentile queries
- **FPS Calculator**: `FPSCalculator` with initialization flag (not sentinel value), configurable sample interval
- **Watermark Tracker**: Current + peak value tracking with reset
- **Budget System**: `DrawCallBudget` with target/warning/critical thresholds, status classification
- **Profiler Session**: Combines all metrics, `recordFrame` for per-frame sampling, `getSessionSummary`
- **Store**: `useProfilerStore` with factory pattern, snapshot history for graphs, budget clamping

### Touch Gestures (Phase 9)
- **Module**: `core/touchGestures.ts` - gesture recognition for mobile 3D viewport
- **Gesture Types**: tap, pan (single finger), pinch (two finger), rotate (two finger), three-finger-pan
- **State Machine**: idle → possible → began → changed → ended/cancelled
- **Recognizer**: `GestureRecognizer` with configurable thresholds (pan/pinch/rotate/tap)
- **Camera Mapping**: `gestureToCameraDeltas` converts gestures to orbit/zoom/pan/roll deltas
- **Inertia**: Velocity tracking for post-gesture momentum (friction-based decay)

### Testing (Phase 9)
- 4309 tests across 96 files
