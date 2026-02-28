# Lessons Learned

ALL AGENTS: Read this file at session start before writing any code.
After ANY correction, failed attempt, or discovery, add a lesson here.

## Format
### [Agent] Short description
- What happened: What went wrong or was discovered
- Root cause: Why it happened
- Rule: The rule to follow going forward

## Lessons

### [Claude-4] Use `visible` prop not conditional rendering in R3F
- What happened: SceneObject3D used `if (!obj.visible) return null` which unmounts/remounts meshes
- Root cause: React pattern doesn't apply to 3D - unmounting recompiles shaders and re-processes geometry
- Rule: Always use `visible={false}` prop on Three.js objects, never conditional return for visibility

### [Claude-4] TransformControls need ref timing awareness
- What happened: TransformControls needs `meshRef.current` to exist before it can attach
- Root cause: On first render, ref is null. TransformControls wrapping needs a conditional check
- Rule: Render TransformControls separately from mesh, check `meshRef.current` exists before rendering

### [Claude-4] errors.ts imported types from wrong schema
- What happened: errors.ts imported `Geometry`, `LightData`, `TransformData` which didn't exist in scene.ts
- Root cause: Claude-1 wrote errors.ts against a planned type schema before scene.ts was finalized
- Rule: Always verify imports compile before committing. Read target files before writing imports.

### [Claude-4] Tests must match actual components, not scaffolding
- What happened: App.test.tsx tested for "Vite + React" heading and count button from template
- Root cause: Claude-3 wrote tests before Claude-2 replaced the template with actual components
- Rule: Read the actual component before writing tests. Re-check tests after major component changes.

### [Claude-4] Don't create store files that duplicate existing ones
- What happened: Created stores/sceneStore.ts and stores/editorStore.ts while useSceneStore.ts already existed
- Root cause: Didn't check for existing store files before creating new ones
- Rule: Always glob for existing files in the target directory before creating new ones

### [Claude-4] `.js` extensions in TS imports work with bundler moduleResolution
- What happened: Core modules use `.js` extensions in imports, rest of project uses bare imports
- Root cause: TypeScript `moduleResolution: "bundler"` accepts both styles
- Rule: Inconsistent but functional - don't break working code for style consistency during a swarm

### [Claude-1] Flat scene graph is better for editors than nested
- What happened: Chose flat array for objects instead of tree structure
- Root cause: Trees complicate undo/redo, selection, and serialization
- Rule: Use flat arrays with optional parentId for hierarchy. Trees can be computed views.

### [All] Check other agents' work before creating files
- What happened: Multiple agents created overlapping files in parallel
- Root cause: Phase 1 all agents start at the same time with vague tasks
- Rule: Check AGENT_STATUS.md and heartbeats, glob for existing files before creating new ones

### [Claude-3] R3F Canvas requires ResizeObserver polyfill in jsdom
- What happened: App tests with R3F Canvas failed with "This browser does not support ResizeObserver"
- Root cause: jsdom doesn't have ResizeObserver, which react-use-measure (used by R3F Canvas) requires
- Rule: Install `resize-observer-polyfill` and add `globalThis.ResizeObserver = ResizeObserver` to test setup

### [Claude-3] Exclude test files from tsconfig.app.json
- What happened: Test files with `import userEvent` triggered `noUnusedLocals` TS errors during `tsc -b`
- Root cause: Test files included in app compilation via `"include": ["src"]` without exclusions
- Rule: Add `"exclude": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test"]` to tsconfig.app.json

### [Claude-3] Use `tsc -b --noEmit` not `tsc --noEmit` for project references
- What happened: `tsc --noEmit` showed no errors but `tsc -b --noEmit` revealed 50+ errors
- Root cause: Root tsconfig.json uses `"files": []` with references. `tsc` without `-b` had nothing to compile
- Rule: Always use `tsc -b --noEmit` when project uses tsconfig project references

### [Claude-3] Re-read source files before writing tests in swarm
- What happened: Wrote App tests against default Vite template, but App.tsx changed while tests were being written
- Root cause: Other agents actively modifying files during parallel development
- Rule: Always re-read the latest version of files right before writing tests that depend on them

### [Claude-4] Use getByRole not getByTitle in tests
- What happened: Tests used `getByTitle('Select')` which broke when another agent changed titles to include keyboard shortcuts `"Select (Q)"`
- Root cause: Title attributes are presentation text, not stable identifiers
- Rule: Use `getByRole('button', { name: 'Select' })` which matches aria-label. Add aria-label to all buttons.

### [Claude-4] Dead code in loadScene: typeof check on typed parameter
- What happened: `loadScene(data: SceneData)` had `typeof data === 'string'` check that could never be true
- Root cause: The function signature guarantees SceneData, so the string branch was dead code with an `as unknown as string` cast
- Rule: Trust TypeScript types. If a parameter is typed as X, don't check if it's Y. Remove dead branches.

### [Claude-4] Multiple concurrent agents modify shared files - always re-read before editing
- What happened: Read Toolbar.tsx, edited it, but between read and edit another agent had already modified it significantly (added save/load UI, scene name input)
- Root cause: Swarm agents run in parallel, touching overlapping files
- Rule: Always re-read the file immediately before editing. Expect files to change between operations.

### [Claude-3] Phase 2 component changes break Phase 1 tests
- What happened: Toolbar titles changed from 'Select' to 'Select (Q)', PropertiesPanel got CollapsibleSections and new aria-labels, new store properties added
- Root cause: Claude-1/Claude-2 Phase 2 work updated component HTML structure, aria labels, and store shape
- Rule: After other agents modify components, re-run tests immediately. Use aria-labels and roles for selectors. Always verify all tests pass after structural changes.

### [Claude-3] Exclude WebGL-dependent R3F components from jsdom coverage
- What happened: SceneObject3D.tsx and Viewport.tsx show near-0% coverage because they need WebGL context
- Root cause: jsdom doesn't support WebGL, so R3F components can't be rendered in unit tests
- Rule: Exclude WebGL-dependent components from coverage config. Test them with e2e/integration tests instead.

### [Claude-4] Object hierarchy needs cycle detection to prevent infinite loops
- What happened: setParent allowed creating circular parent chains (A->B->C->A) and self-parent (A->A)
- Root cause: No validation before assigning parentId - naive implementation allowed any parent assignment
- Rule: Always call wouldCreateCycle() before setParent. Walk ancestor chain with visited Set to detect cycles.

### [Claude-4] removeSelected needs visited Set to prevent infinite recursion
- What happened: removeSelected could loop infinitely when removing parent/child objects together
- Root cause: Removing a parent changes the object list, but iteration continued over stale references
- Rule: Use a visited/processed Set when doing recursive removals. Process each object at most once.

### [Claude-4] Test store resets must include ALL Phase 3 fields
- What happened: 200+ tests failed after Phase 3 because resetStore() was missing selectedIds, clipboard
- Root cause: Phase 3 added new fields to store state and HistoryEntry but old tests only reset Phase 2 fields
- Rule: When adding fields to store state/history, grep ALL test files for resetStore() and update them all.

### [Claude-4] Run vitest from app/ directory, not project root
- What happened: Running `npx vitest run` from project root gave "document is not defined" errors
- Root cause: vitest.config.ts is in app/ - running from root doesn't pick up jsdom environment config
- Rule: Always cd to app/ before running vitest, or use `cd app && npx vitest run`.

### [Claude-4] When features marked "coming soon" get implemented, update modal AND tests
- What happened: Ctrl+C/V were marked comingSoon:true in KeyboardShortcutModal even though they were fully implemented
- Root cause: Modal was written before implementation, and the implementer didn't update the modal flags
- Rule: When implementing a feature marked "coming soon", update the UI that marks it as such. Update corresponding tests.

### [Claude-3] Use v8 ignore comments for untestable code, not file exclusions
- What happened: SceneStats.tsx had 50% coverage because StatsCollector (R3F) and SceneStatsOverlay (testable) were in the same file
- Root cause: File-level coverage exclusions would remove coverage for testable code too
- Rule: Use `/* v8 ignore start */` and `/* v8 ignore stop */` around R3F/WebGL/browser-only functions. This excludes only the untestable code.

### [Claude-3] Phase 3 features evolve fast - always re-read source before writing tests
- What happened: Wrote test scaffolding assuming Phase 3 features weren't implemented, then discovered they were fully implemented
- Root cause: Other agents implemented features while exploration was happening
- Rule: Always read the ACTUAL store/component source immediately before writing tests. Don't rely on earlier exploration results.

### [Claude-4] Guard division by zero in keyframe interpolation
- What happened: `interpolateKeyframes` divided by `(kfB.time - kfA.time)` without checking if span was 0
- Root cause: Nothing prevents adding two keyframes at the same time for the same property
- Rule: Always guard division operations in interpolation code. Check span != 0 before dividing.

### [Claude-3] CollapsibleSection defaultOpen={false} means children aren't rendered in DOM
- What happened: Test tried `getByRole('slider', { name: 'Intensity' })` which failed because collapsible sections were collapsed
- Root cause: EffectsPanel uses CollapsibleSection with defaultOpen={false}, so sliders aren't in the DOM until expanded
- Rule: When testing components with CollapsibleSection, first expand the section by clicking the header before querying children

### [Claude-3] Serialization migration sorts ALL keyframes by time across properties
- What happened: Test assumed keyframes[1] was the second position keyframe, but it was a rotation keyframe
- Root cause: `migrateAnimationTrack` sorts ALL keyframes by time, not grouped by property
- Rule: When testing serialized keyframes, find by id (`.find(k => k.id === 'kf_X')`) not by array index

### [Claude-4] loadScene/clearScene must reset ALL external stores
- What happened: Loading a v1 scene (no PP/animation) left stale post-processing/animation state from previously loaded scene
- Root cause: `loadScene` only set external stores when data was present, didn't reset when absent
- Rule: When loading/clearing scenes, always reset ALL external stores (PP, animation) to defaults if data is absent.

### [Claude-4] Validate deserialized type strings against known sets
- What happened: `obj.type as SceneObject['type']` cast without validating the string was a valid ObjectType
- Root cause: Migration code trusted string values from JSON without checking against the discriminated union
- Rule: After confirming typeof === 'string', validate against the known valid set before casting. Throw/reject for unknown values.

### [Claude-4] Use callback refs for R3F component refs, not useRef + useEffect
- What happened: CameraControlsBridge used useRef + useEffect to sync ref to store, but timing was fragile
- Root cause: useEffect runs after render, but CameraControls ref assignment timing is an implementation detail
- Rule: Use callback ref pattern for R3F components whose refs need to be stored in external state.

### [Claude-4] Avoid Object.keys() and .find() in useFrame hot paths
- What happened: TimelinePlayback used Object.keys() and Array.find() inside useFrame, creating GC pressure at 60fps
- Root cause: Convenience patterns that allocate on every call, used in per-frame code
- Rule: In useFrame: use Map for lookups, check properties directly instead of Object.keys(), avoid array allocations.

### [Claude-1] UI components may assume different store API shape during parallel development
- What happened: PluginMarketplaceUI and PluginSettingsPanel cast `Map<string, PluginInstance>` as `PluginListItem[]`, and used store methods (installPlugin, togglePlugin, pluginSettings) that didn't exist
- Root cause: Frontend agent (Claude-2) designed UI against an assumed API that differed from the actual store implementation by backend agent (Claude-1)
- Rule: When building stores, check if UI components already exist that reference the store. Add compatibility methods/types to bridge the gap. Export the store state interface.

### [Claude-4] Type duplication across type files causes silent incompatibilities
- What happened: types/collaboration.ts defined simplified Asset and Plugin types alongside types/asset.ts and types/plugin.ts which had proper discriminated unions. Stores and components imported from different files.
- Root cause: Multiple agents creating type definitions for the same concept in different files
- Rule: Each domain concept should have ONE canonical type definition file. Other files should re-export, not redefine. Use AssetListItem/PluginListItem for UI-only simplified versions.

### [Claude-1] Export store state interfaces for cross-agent visibility
- What happened: PluginStoreState and CollaborationStoreState were private interfaces, making it hard for UI components to type-check against them
- Root cause: Store interfaces were unexported, forcing UI to cast or use `any`
- Rule: Always export store state interfaces (e.g. `export interface PluginStoreState`) so UI components can properly type selectors.

### [Claude-3] TDD approach works well when implementation agents haven't started
- What happened: Phase 5 features were assigned to Claude-1/2 but only type definitions existed. Implemented core modules AND tests in TDD style.
- Root cause: Parallel swarm timing - testing agent started before implementation agents finished
- Rule: When testing agent starts before implementations exist, write the core pure-function modules yourself (TDD) rather than waiting. Tests + implementation together is more productive than tests alone.

### [Claude-3] WSClient class needs v8 ignore for WebSocket-dependent code
- What happened: wsClient.ts had low coverage (41%) because WSClient class has connect/disconnect/send using WebSocket API
- Root cause: jsdom doesn't have WebSocket, so class methods that use it can't be tested in unit tests
- Rule: Use `/* v8 ignore start/stop */` around WebSocket-dependent methods. Test the pure functions and message handling methods that don't need actual WebSocket.

### [Claude-3] Store factory pattern enables isolated testing
- What happened: useCollaborationStore exported both singleton and createCollaborationStore() factory
- Root cause: Good design pattern from Claude-1
- Rule: Export a createXStore() factory function alongside the singleton for Zustand stores. Tests use the factory to get isolated instances in beforeEach.

### [Claude-3] Performance tests need generous time budgets to avoid CI flakiness
- What happened: Performance tests pass locally but may flake on slower CI runners
- Root cause: Tight time bounds + variable CI performance
- Rule: Use 2-3x expected runtime as the budget. Goal is catching severe regressions, not micro-benchmarking.

### [Claude-4] Web Worker sandbox: assignment-based global removal is insecure
- What happened: `self[name] = undefined` doesn't actually remove globals -- they're recoverable via prototype chain
- Root cause: Setting to undefined doesn't delete the property from the object or its prototype
- Rule: Use `delete self[name]` followed by `Object.defineProperty` with writable:false, configurable:false to truly lock out globals.

### [Claude-4] Script sandbox: `new Function` doesn't isolate scope from worker internals
- What happened: User scripts via `new Function` can still access `self`, `self.postMessage`, `_pendingRequests`, etc.
- Root cause: `new Function` creates a new function scope but doesn't create a new realm -- all worker globals are accessible
- Rule: Wrap internal worker variables in an IIFE closure so user code can't reference them. Override `self.postMessage` after init.

### [Claude-4] LOD getActiveLODLevel must not break early on sorted assumption
- What happened: `getActiveLODLevel` used `break` assuming levels were sorted, producing wrong results for unsorted input
- Root cause: Runtime invariant (sorted levels) not enforced at the type level
- Rule: Make algorithms robust against input order. Scan all levels instead of breaking early -- n=3-4 so cost is negligible.

### [Claude-4] Float32Array writes are silently ignored on out-of-bounds indices
- What happened: `updateInstanceMatrix` could write past array bounds without any error
- Root cause: Float32Array silently ignores out-of-range writes (unlike regular arrays which grow)
- Rule: Always bounds-check index before writing to typed arrays. `if (offset < 0 || offset + 15 >= arr.length) return`.

### [Claude-4] Module-level state defeats Zustand factory pattern for testing
- What happened: `scriptIdCounter` was module-level, shared across all factory-created store instances
- Root cause: Factory pattern creates isolated stores but module closures are shared singletons
- Rule: Move mutable counters/state inside the factory function so each store instance gets its own copy.

### [Claude-3] createDefaultPhysics() omits optional axis lock properties
- What happened: Test expected `lockTranslationX` to be `false`, but it was `undefined`
- Root cause: PhysicsData has optional lock properties; createDefaultPhysics() omits them for brevity
- Rule: For types with optional fields, use toBeFalsy() not toBe(false) unless the field is guaranteed to exist.

### [Claude-3] SceneData version is nested at metadata.version, not top-level
- What happened: Test checked `loaded.version` which was undefined; actual field is `loaded.metadata.version`
- Root cause: Assumed version was a top-level SceneData field from TASKS.md description
- Rule: Always read the actual type definition before writing field path assertions.

### [Claude-3] v8 ignore comments for Worker-dependent code
- What happened: scriptRuntime.ts went from 14% to 100% coverage after v8 ignore around ScriptWorkerHost
- Root cause: Web Worker API not in jsdom, making the class untestable in unit tests
- Rule: Use `/* v8 ignore start/stop */` around Web Worker, WebGL, browser-only code. Test pure functions separately.

### [Claude-4] Store setters must validate/clamp numeric inputs
- What happened: Phase 7 stores (terrain, particle, audio) accepted any numeric values without clamping
- Root cause: Stores were written without defensive validation, unlike audioStore's `setMasterVolume` which clamped correctly
- Rule: All store setters that accept numeric values must clamp to valid ranges. Pattern: merge updates, then clamp each field inline.

### [Claude-4] div[role="button"] requires tabIndex and keyboard handler
- What happened: TerrainEditorPanel texture slots, particle system list items, audio source items had role="button" but no keyboard support
- Root cause: Using div with onClick and role="button" but missing tabIndex={0} and onKeyDown handler
- Rule: Every div[role="button"] must have tabIndex={0} and onKeyDown checking Enter/Space with preventDefault.

### [Claude-4] File imports must validate file size before creating blob URLs
- What happened: Audio, texture, and heightmap imports had no file size limits
- Root cause: File picker only validated file type via `accept` attribute, not size
- Rule: Always check `file.size` before `URL.createObjectURL`. Use reasonable limits: 50MB for audio, 20MB for images.

### [Claude-2] Adding new CollapsibleSections breaks tests matching section titles by regex
- What happened: Adding "Material Presets" CollapsibleSection caused `/material/i` regex to match both "Material" and "Material Presets" buttons
- Root cause: Existing tests used loose regex patterns like `/material/i` to match section toggle buttons
- Rule: Use negative lookahead regex `/material(?! presets)/i` or exact name matching when multiple CollapsibleSections have overlapping title prefixes.

### [Claude-3] Scope getAllByRole('option') within listbox when filter dropdowns exist
- What happened: ObjectList tests broke when SceneSearchFilter added a `<select>` with 8 `<option>` elements alongside `role="option"` list items
- Root cause: `getAllByRole('option')` picks up BOTH native `<option>` elements AND elements with `role="option"`
- Rule: Always use `within(screen.getByRole('listbox', { name: '...' })).getAllByRole('option')` to scope queries

### [Claude-3] Query toolbars by name when multiple toolbar regions exist
- What happened: Toolbar tests broke when Phase 8 split one toolbar into 5 `role="toolbar"` sections
- Root cause: `getByRole('toolbar')` finds multiple, `getByRole('toolbar', { name: 'Transform tools' })` is specific
- Rule: Always query toolbar by name when component may have multiple toolbar regions

### [Claude-4] Type assertions (`as`) that lie about runtime values create silent bugs
- What happened: `obj.type as 'simplified'` in sceneOptimizer.ts made TypeScript think the value was 'simplified' when it was actually 'box'/'sphere'/etc.
- Root cause: Using `as` to force a type that doesn't match the runtime value
- Rule: Never use `as` to assert a value is something it isn't at runtime. Use literal values directly.

### [Claude-4] Floating-point degenerate checks must use epsilon, not exact zero
- What happened: `edgeLenSq === 0` missed near-zero degenerate edges, causing unstable division
- Root cause: Floating-point drift from transforms makes values tiny but not exactly zero
- Rule: Use `< 1e-10` (or appropriate epsilon) for degenerate geometry checks, never `=== 0`.

### [Claude-4] Store blob URL cleanup must happen in removeScene AND clearAll
- What happened: Removing or clearing scenes leaked blob URLs held in thumbnailUrl
- Root cause: Only data references were cleared, not the underlying blob URLs
- Rule: Any store action that removes entries with blob URLs must `URL.revokeObjectURL` first.

### [Claude-4] When renaming UI elements, grep ALL test files for the old name
- What happened: Renamed "Browse" → "Load" in CloudSaveModal, but 2 test files still referenced old names
- Root cause: Component was changed but tests in multiple files weren't updated
- Rule: After renaming any user-visible string, run grep across all test files and update ALL occurrences.

### [Claude-4] Export filename format parameter is a security boundary
- What happened: `generateExportFileName(name, format)` accepted unsanitized format strings
- Root cause: Only sceneName was sanitized, format was passed through
- Rule: Sanitize ALL user-provided strings used in file paths. Strip non-alphanumeric chars from extensions.

### [Claude-4] Video/screenshot validation must cap dimensions to prevent OOM
- What happened: Video recording accepted unbounded width/height, risking canvas allocation crashes
- Root cause: Screenshot had max 8192 but video had no upper bound
- Rule: Apply consistent dimension caps (max 8192) to both screenshot AND video recording options.

### [Claude-3] Performance benchmarks need 3-5x budgets when running in full suite
- What happened: materialKey (104ms vs 100ms) and performSnap tests failed only during full-suite runs
- Root cause: Full suite creates resource contention that inflates timing by 2-3x vs isolation
- Rule: Set perf budgets at 3-5x expected solo runtime. Goal is catching severe regressions, not micro-benchmarking.

### [Claude-2] Adding clickable elements to Toolbar shifts tab order
- What happened: Adding AutoSaveIndicator (with tabIndex=0) between scene name input and tool buttons broke keyboard navigation test
- Root cause: Test assumed exact tab order: scene name → Select button. New element inserted between them.
- Rule: When adding focusable elements to the Toolbar, update the keyboard navigation test in accessibility.test.tsx to account for the new tab stop.

### [Claude-2] Component rewrites need store resets in test beforeEach
- What happened: CloudSaveModal tests failed when run in suite but passed individually after rewriting to use stores
- Root cause: Component was rewritten to use useStorageStore/useSceneStore, but test beforeEach didn't reset those stores
- Rule: When rewriting a component to use new Zustand stores, update the test's beforeEach to reset all newly-referenced stores.
