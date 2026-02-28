# Agent Plans

Agents write their implementation plans here before coding non-trivial tasks.
Format: ## [Agent] - [Task Name] followed by checkable steps.

## Claude-1 Research Findings

### Best Practices (R3F + Zustand 3D Editor)
- **Two-tier state**: Zustand for discrete/UI state, mutable refs for per-frame state
- **Flat scene graph**: Objects in a flat map/array, not nested trees
- **History via snapshots**: Use structuredClone for undo/redo entries
- **`frameloop="demand"`**: Editor should only re-render when things change
- **Never setState in useFrame**: Route per-frame via refs, commit on mouseup
- **Selective subscriptions**: Use Zustand selectors to prevent unnecessary re-renders
- **Reference impl**: Triplex (open-sourced by Poimandres) for R3F editor patterns

## Claude-1 Phase 4 Research Findings

### Post-Processing (@react-three/postprocessing v3)
- **ToneMapping must be last** in EffectComposer children
- **EffectComposer children must be Elements** - no `{cond && <Effect/>}` patterns, use wrapper components
- **Bloom needs toneMapped={false}** on emissive materials for glow to work
- **SSAO samples vs rings**: avoid samples being multiple of rings (artifacts)
- **frameloop="demand"**: Static effects (Bloom, SSAO, Vignette) work fine since they only run when a frame is rendered

### Animation Timeline
- **Separate data from playback**: keyframe data in Zustand store, currentTime read via getState() in useFrame
- **Never setState for currentTime in React components**: 60fps updates would kill performance
- **Easing per-keyframe pair**: apply easing between adjacent keyframes, not across whole timeline
- **Sort keyframes by time** after every mutation

### Camera Controls
- **CameraControls replaces OrbitControls entirely** - never mount both
- **normalizeRotations() before setLookAt()** prevents accumulated rotation bugs
- **onChange callback** needed to invalidate for frameloop="demand"

## Claude-1 - Core Implementation (COMPLETE)

- [x] Extend scene types (MaterialData, EnvironmentSettings, SceneMetadata, HistoryEntry, SceneData)
- [x] Create pure scene operations (sceneOperations.ts)
- [x] Create serialization module (serialization.ts)
- [x] Create error handling (errors.ts)
- [x] Upgrade Zustand store with undo/redo, environment settings, save/load/clear
- [x] Create barrel export (core/index.ts)

## Claude-2 - UI Scaffolding (COMPLETE)

- [x] Initialize Vite project with all dependencies
- [x] Create Tailwind v4 theme with western palette
- [x] Build App layout: Toolbar | Sidebar | Viewport | Properties
- [x] Build Toolbar with tool modes + add object buttons
- [x] Build ObjectList sidebar with visibility toggle
- [x] Build PropertiesPanel with Vec3 inputs + color picker
- [x] Build Viewport with 3D Canvas, OrbitControls, Grid, Environment, Gizmo
- [x] Build SceneObject3D with geometry switch

## Claude-4 - Review & Polish

### Code Review Findings
- **TransformControls**: Added transform gizmos to SceneObject3D (was missing)
- **Visibility pattern**: Fixed - now uses `visible` prop instead of conditional return
- **Material props**: Connected material properties from store to meshStandardMaterial
- **Keyboard shortcuts**: Added useKeyboardShortcuts hook (Q/W/E/R, Delete, Ctrl+Z/Y/D)
- **Undo/redo**: Added undo/redo buttons to Toolbar, wired shortcuts
- **Tests**: Rewrote App.test.tsx to test actual component (was testing old Vite template)
- **Build**: TypeScript and Vite build both pass

### Known Issues for Phase 2
1. Properties panel doesn't expose material properties (metalness, roughness, etc.)
2. No save/load UI (store has the logic, UI needs buttons)
3. Object hierarchy is flat - no parent/child nesting
4. No grid snap functionality (store has the state, not wired to gizmo)
5. Bundle size warning (1.2MB) - needs code splitting for Three.js
6. Tests are minimal - need unit tests for store, core modules, and component tests
7. TransformControls may need a second render to attach (ref timing)

## Claude-4 Research Findings

### Tech Stack & Architecture (confirmed)
- **React 19 + TypeScript 5.9 + Vite 7**: Modern, fast, well-supported
- **React Three Fiber 9 + Drei 10**: Declarative 3D with rich helpers
- **Zustand 5**: Lightweight state with undo/redo via snapshot pattern
- **Tailwind CSS 4**: Utility-first with custom @theme colors

### Key R3F Performance Rules
- Never setState in useFrame - mutate refs directly
- Share materials/geometries via useMemo
- Use visible prop, not conditional rendering (avoids shader recompile)
- Target < 100 draw calls, use InstancedMesh for repeats
- Cache assets with useLoader/useGLTF
- Always dispose GPU resources on unmount

## Claude-3 - Testing Infrastructure (COMPLETE)

### Setup
- [x] Install Vitest + React Testing Library + jsdom + coverage
- [x] Configure vitest.config.ts (jsdom, setupFiles, asset mocking, coverage)
- [x] Add ResizeObserver polyfill for R3F Canvas tests
- [x] Exclude test files from tsconfig.app.json compilation
- [x] Add test/test:watch/test:coverage scripts to package.json

### Unit Tests (101 tests)
- [x] useSceneStore: 31 tests (CRUD, undo/redo, environment, serialization)
- [x] core/errors: 31 tests (error classes, Vec3/color/opacity validation, object/scene validation)
- [x] core/sceneOperations: 24 tests (factories, defaults, duplicate, update, remove, vec3 helpers)
- [x] core/serialization: 15 tests (round-trip, validation, migration, defaults)

### Component Tests (25 tests)
- [x] Toolbar: 11 tests (tool modes, add objects, disabled states, undo/redo)
- [x] ObjectList: 7 tests (empty state, rendering, selection, counts)
- [x] PropertiesPanel: 8 tests (placeholder, editing, position/rotation/scale labels)

### Integration Tests (7 tests)
- [x] App: 6 tests (full render with all components, toolbar, sidebar, properties)

### Results: 133 tests all passing. TypeScript compiles cleanly.

## Claude-3 - Phase 4 Testing (COMPLETE)

### Store Tests (74 tests)
- [x] usePostProcessingStore: 20 tests (defaults, toggles, partial updates, load/reset, getSettings)
- [x] useAnimationStore: 39 tests (tracks CRUD, keyframes CRUD/sort, playback, queries, serialization)
- [x] useCameraStore: 15 tests (presets, mock controls, normalizeRotations order, reset)

### Core Module Tests (68 tests)
- [x] animation: 28 tests (easing functions, lerpVec3, interpolateKeyframes, evaluateTrack, ID generation)
- [x] cameraPresets: 12 tests (preset data, findPreset, positions, targets)
- [x] serialization.phase4: 28 tests (PP round-trip, animation migration, keyframe validation, backward compatibility)

### Component Tests (68 tests)
- [x] EffectsPanel: 13 tests (master toggle, reset, collapsible sections, slider updates)
- [x] CloudSaveModal: 18 tests (dialog, tabs, escape/backdrop close, save form, load panel)
- [x] AnimationCurvesEditor: 9 tests (easing buttons, SVG preview, close, aria-pressed)
- [x] AnimationTimeline: 28 tests (collapsed/expanded, play/pause/stop, speed, loop, tracks, duration, keyboard)

### E2E Integration Tests (7 tests)
- [x] workflow.phase4: 7 tests (full create→animate→save→load cycle, object deletion cleanup, undo independence)

### Results: 662 tests across 33 files. 88.95% coverage. TypeScript clean.

## Claude-1 - Phase 9 Core Plan

### Stream A: WebSocket + Session Recovery (Task 1)
- [x] Enhance wsClient.ts: add jitter to backoff, configurable max delay, offline message queue
- [x] Add session recovery: sessionId tracking, rejoin with last-seen version
- [x] Add message acknowledgment tracking: pending acks map, retry unacked
- [x] Add message batching: batch window, flush on timer or threshold

### Stream B: Undo/Redo Optimization (Task 6)
- [x] Create core/historyCompression.ts: delta-based snapshots
- [x] Delta computation: diff old/new objects, store only changed fields
- [x] Delta application: apply forward/reverse deltas for undo/redo
- [x] Integrate into useSceneStore: replace structuredClone with delta snapshots

### Stream C: Performance Profiler (Task 7)
- [x] Create core/performanceProfiler.ts: FPS ring buffer, draw call counter, memory watermark
- [x] Create stores/useProfilerStore.ts: profiler state, start/stop, sample collection
- [x] Implement ring buffer data structure for FPS/frame time sampling

### Stream D: OT Layer (Task 2)
- [x] Create core/operationalTransform.ts: operation types, transform functions
- [x] Implement transform(op1, op2) for concurrent operation resolution
- [x] Implement compose(op1, op2) for operation compaction

### Stream E: Scene Versioning (Task 3)
- [x] Create core/sceneVersioning.ts: version/branch/merge data model
- [x] Implement branch creation: snapshot current state as branch point
- [x] Implement merge: three-way merge with conflict detection

### Stream F: Touch Gestures (Task 8)
- [x] Create core/touchGestures.ts: gesture recognizer for pinch/rotate/pan
- [x] Implement gesture state machine: idle → tracking → recognized

### Stream G: Asset CDN (Task 4)
- [x] Create core/assetCdn.ts: CDN provider interface, URL resolution
- [x] Implement upload protocol: file → CDN → URL mapping

### Stream H: Batch Export (Task 5)
- [x] Create core/batchExport.ts: multi-scene ZIP assembly
- [x] Integrate with exportPipeline for individual scene conversion

## Claude-1 - Phase 4 Core (COMPLETE)

- [x] Post-processing pipeline: EffectComposer with Bloom/SSAO/Vignette + usePostProcessingStore
- [x] Animation timeline data model: AnimationKeyframe/Track types + useAnimationStore + core/animation.ts
- [x] Animation playback engine: TimelinePlayback (useFrame) + TimelineScrubInvalidator + easing
- [x] Cloud save backend: SceneData v2 with postProcessing + animationTracks + migration functions
- [x] Camera presets: CameraControls + useCameraStore + 6 presets with smooth transitions
- [x] Verified: TypeScript clean, 447 tests pass, production build OK

## Claude-1 - Phase 6 Core (COMPLETE)

### Stream A: Types + Serialization
- [x] 1. Extend types/scene.ts: Vec2, TextureMap, PhysicsData, LODConfig, InstanceConfig, PhysicsWorldSettings
- [x] 2. Update sceneOperations.ts: factory defaults for physics, LOD, instance helpers
- [x] 3. Update serialization.ts: v3 migration for all new fields

### Stream B: Physics Engine
- [x] 4. Install @dimforge/rapier3d-compat + @react-three/rapier
- [x] 5. Physics types in types/scene.ts (RigidBodyType, ColliderShape, PhysicsData)
- [x] 6. Create core/physicsEngine.ts: material presets, gravity presets, collision groups, validation
- [x] 7. Create stores/usePhysicsStore.ts: simulation state (play/pause/stop/step), snapshots

### Stream C: Instancing + LOD
- [x] 8. Create core/instanceManager.ts: buildInstanceGroups, createInstanceMatrices, updateInstanceMatrix
- [x] 9. Create core/lodManager.ts: LOD_PRESETS, getActiveLODLevel, calculateLODSavings

### Stream D: Script Runtime
- [x] 10. Create types/script.ts: Script, ScriptEvent, ScriptApiMethod, SandboxConfig
- [x] 11. Create core/scriptRuntime.ts: ScriptWorkerHost (Web Worker sandbox), templates
- [x] 12. Create core/scriptApi.ts: SceneApiForScripts interface, 15 API methods
- [x] 13. Create stores/useScriptStore.ts: script CRUD, console entries

### Stream E: Spatial Indexing
- [x] 14. Create core/spatialIndex.ts: SpatialIndex class (Octree), AABB helpers

### Verification
- [x] 15. TypeScript clean (tsc -b --noEmit) - 0 errors
- [x] 16. All 1266 tests pass across 47 files
- [x] 17. backend-ready.signal created

## Claude-1 - Phase 5 Core (COMPLETE)

### Architecture
- **Scene Diffing**: Pure functions in `core/sceneDiff.ts` - delta encoding between scene states
- **CRDT**: State-based LWW-Element-Set CRDT in `core/crdt.ts` - per-object conflict resolution with vector clocks
- **WebSocket Client**: `core/wsClient.ts` - client-side WebSocket protocol with auto-reconnect
- **WebSocket Server**: `server/wsServer.ts` - standalone Node.js signaling server (room management, relay)
- **Collaboration Store**: `stores/useCollaborationStore.ts` - presence, connection, sync state
- **Asset Types**: `types/asset.ts` - asset data model (mesh/material/texture/prefab)
- **Asset Pipeline**: `core/assetPipeline.ts` - import, thumbnail extraction, metadata
- **Asset Store**: `stores/useAssetStore.ts` - asset library state management
- **Plugin Types**: `types/plugin.ts` - plugin manifest, lifecycle hooks
- **Plugin API**: `core/pluginApi.ts` - scene access, tool registration, event hooks
- **Plugin Registry**: `core/pluginRegistry.ts` - registration, dependency resolution, state

### Execution Plan
Stream A (Collaboration - has dependencies):
- [x] 1. Scene diffing: `core/sceneDiff.ts` - pure diff/patch functions
- [x] 2. CRDT: `core/crdt.ts` - LWW register + vector clocks
- [x] 3. WebSocket client: `core/wsClient.ts` - connection, reconnect, message protocol
- [x] 4. WebSocket server: `server/wsServer.ts` - standalone Node.js server
- [x] 5. User presence: `stores/useCollaborationStore.ts` + presence protocol
- [x] 6. Collaboration types: `types/collaboration.ts`

Stream B (Assets - independent):
- [x] 7. Asset data model: `types/asset.ts` + `core/assetLibrary.ts`
- [x] 8. Asset import pipeline: `core/assetPipeline.ts`
- [x] 9. Asset store: `stores/useAssetStore.ts`

Stream C (Plugins - independent):
- [x] 10. Plugin API core: `types/plugin.ts` + `core/pluginApi.ts`
- [x] 11. Plugin registry: `core/pluginRegistry.ts`
- [x] 12. Plugin store: `stores/usePluginStore.ts`

Verification:
- [x] 13. TypeScript clean (`tsc -b --noEmit`) - 0 errors
- [x] 14. All existing tests pass - 1049 tests, 41 files
- [x] 15. Create backend-ready.signal - created

### Integration Fixes
- Fixed PluginMarketplaceUI.tsx: converted Map<string, PluginInstance> -> PluginListItem[] for rendering
- Fixed PluginSettingsPanel.tsx: same Map->array conversion + type cast for pluginSettings values
- Added MOCK_PEERS, conflict resolution (conflicts/resolveConflict/clearResolvedConflicts) to collaboration store
- Added installPlugin, uninstallPlugin, togglePlugin, pluginSettings, updatePluginSetting to plugin store
