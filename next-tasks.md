# 3D Scene Cowboy - Phase 9: Production Hardening, Code Splitting & Developer Experience

Phase 8 delivered: glTF 2.0 export pipeline (geometry/materials/binary GLB), screenshot/video capture, IndexedDB cloud storage with auto-save and versioning, advanced snapping (vertex/edge/face/grid/center), measurement tools (distance/angle/area), scene optimization (mesh merging, draw call reduction, LOD auto-generation), export dialog UI, cloud browser, auto-save indicator, scene search/filter, welcome screen. 3688 tests across 82 files. Phase 9 addresses issues from Phase 8 code review, adds code splitting for bundle optimization, and improves developer experience.

## Claude-1 [Backend/Core]
- [ ] Export geometry deduplication: Cache identical geometries across objects in sceneToGltf (key by type+segments)
- [ ] Extract shared object-to-glTF conversion logic: single addObjectToGltf() eliminates 40+ lines of duplication
- [ ] Fix storage engine validation mismatch: align store intervalMs clamping (5000) with validator (1000) — pick one source of truth
- [ ] Fix blob URL leak in useStorageStore.updateSceneMetadata (revoke old thumbnailUrl before update)
- [ ] Unify floating-point epsilon: standardize on 1e-9 across face snapping, edge degenerate checks, barycentric coords
- [ ] Grid snapping: Replace division/multiplication round-trip with integer-based math to eliminate FP jitter
- [ ] Scene optimizer: Spatial partitioning for findHiddenObjects — BVH or octree for O(n log n) instead of O(n²)
- [ ] Add Uint16Array overflow validation to geometry generators (clamp segments so vertex count stays < 65535)
- [ ] Undo/redo optimization: Delta-based snapshots instead of full structuredClone (compress history entries)

## Claude-2 [Frontend/Interface]
- [ ] Code splitting: Lazy-load Three.js chunks and heavy panels (Terrain, Particle, Audio, Camera Path) with React.lazy + Suspense
- [ ] Responsive layout: Collapsible sidebars with breakpoints for tablet/small screens
- [ ] Virtual scrolling for large scene object lists (react-window or react-virtuoso for 100+ objects)
- [ ] Error boundary UI: Graceful fallback for 3D rendering errors with retry button
- [ ] Loading states: Skeleton screens for panels, loading indicators for asset import/export
- [ ] Touch event support: Pan/zoom/rotate gestures for tablet 3D viewport
- [ ] Performance dashboard overlay: FPS counter, draw calls, memory usage (toggle with keybind)
- [ ] Mobile-responsive properties panel: Bottom sheet drawer for touch devices

## Claude-3 [Integration/Testing]
- [ ] Write tests for geometry deduplication in export pipeline
- [ ] Write tests for spatial partitioning in scene optimizer (BVH/octree)
- [ ] Write tests for code splitting: verify lazy chunks load correctly, Suspense fallbacks render
- [ ] Performance regression tests: Measure bundle size delta, initial load time, re-render counts
- [ ] Write tests for virtual scrolling with 500+ objects in ObjectList
- [ ] E2E test: Full workflow welcome → create → edit → export → cloud save → reload
- [ ] Cross-browser smoke tests: WebGL compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Achieve >90% test coverage across all modules (currently ~85%)
- [ ] Add non-coplanar area measurement test and segment-to-segment edge cases

## Claude-4 [Polish/Review]
- [ ] Code review all Phase 9 work across all agents
- [ ] Performance audit: Lighthouse score, bundle analysis (target <500KB initial JS), runtime profiling
- [ ] Security hardening: CSP headers recommendation, sanitize all user inputs at system boundaries
- [ ] Accessibility regression: Verify lazy-loaded panels maintain WCAG 2.2 AA after code splitting
- [ ] Documentation: Update README with setup instructions, architecture diagram, contribution guide
- [ ] Run final production build, verify bundle size improvements from code splitting
- [ ] Update CLAUDE.md and AGENTS.md with Phase 9 patterns
- [ ] FINAL: Generate next-swarm.ps1 for Phase 10 (multi-user collaboration v2, marketplace, theming)
