# 3D Scene Cowboy

A web-based 3D previz and storyboarding tool for framing camera shots in imported 3D environments. Import models, position characters, capture camera angles, and play back animated sequences — all in the browser.

Built with a brutalist dark aesthetic inspired by Teenage Engineering and Apple hardware design: deep blacks, warm amber/orange glow accents, cyan secondary highlights, and LED-style edge lighting.

![Tech Stack](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=white) ![Three.js](https://img.shields.io/badge/Three.js-000000?logo=three.js&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript_5.9-3178C6?logo=typescript&logoColor=white) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=white) ![Vite](https://img.shields.io/badge/Vite_7-646CFF?logo=vite&logoColor=white)

---

## Features

### Scene Editing
- **Multi-format model import** — GLTF, GLB, FBX, OBJ, and DAE via drag-and-drop or file picker
- **Primitive objects** — Box, sphere, cylinder, cone, plane, and torus
- **Transform gizmos** — Move, rotate, and scale with snapping support
- **Object hierarchy** — Parent/child relationships with drag-to-reparent in the scene tree
- **Multi-select** — Shift+click, Ctrl+click, select-all, with batch operations (duplicate, delete, copy/paste)
- **Undo/redo** — Full history stack (50 levels) with Ctrl+Z / Ctrl+Shift+Z

### Camera System
- **Camera shots** — Capture and save camera positions with one click (Ctrl+Shift+S)
- **Shot list** — Named camera positions with go-to, reorder, and notes
- **Camera presets** — Front, Back, Top, Right, Left, and Perspective views with smooth transitions
- **Camera path playback** — Catmull-Rom spline interpolation for cinematic camera moves

### Animation Timeline
- **Unified scene keyframes** — Single "Capture Keyframe" button snapshots camera + selected objects at the current time
- **Camera animation** — Camera position and target animated as a virtual track in the timeline
- **Object animation** — Position, rotation, and scale keyframes with easing curves (linear, easeIn, easeOut, easeInOut)
- **Playback controls** — Play/pause/stop, speed (0.25x-4x), loop, scrubbing
- **Easing curve editor** — Visual bezier curve editing per keyframe

### Materials & Rendering
- **PBR materials** — Standard, Basic, and Phong with metalness, roughness, opacity, wireframe
- **Texture maps** — Normal, roughness, metalness, emissive, and AO maps with UV tiling/offset
- **Post-processing** — Bloom, SSAO, and vignette with per-effect controls and master toggle
- **On-demand rendering** — `frameloop="demand"` for zero idle GPU usage

### Asset Management
- **Asset library** — Grid/list browser with search, filtering by category, and drag-to-add
- **Import pipeline** — File type detection, metadata extraction, and URL import
- **Scene templates** — Pre-built scene configurations

### Storage & Export
- **Save/load scenes** — JSON serialization with full state preservation (objects, camera, animation, effects)
- **Cloud storage** — IndexedDB-backed scene persistence with auto-save
- **Export pipeline** — glTF 2.0 export, screenshot capture, video recording
- **Scene versioning** — Save, load, and manage multiple scene versions

### UI/UX
- **Three-panel layout** — Object hierarchy (left), 3D viewport (center), properties/render/assets (right)
- **Bottom timeline** — Animation timeline and camera path editor
- **Welcome screen** — Getting-started overlay for new users
- **Keyboard shortcuts** — Full shortcut system with help modal (press `?`)
- **Context menus** — Right-click on objects for quick actions
- **Accessibility** — ARIA labels, keyboard navigation, focus indicators, semantic HTML

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Vite 7](https://vite.dev) + [React 19](https://react.dev) + [TypeScript 5.9](https://www.typescriptlang.org) |
| 3D Engine | [React Three Fiber 9](https://r3f.docs.pmnd.rs) + [@react-three/drei 10](https://drei.docs.pmnd.rs) + [@react-three/postprocessing 3](https://docs.pmnd.rs/react-postprocessing) |
| State | [Zustand 5](https://zustand.docs.pmnd.rs) (9 stores) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) with custom brutalist dark theme |
| Testing | [Vitest](https://vitest.dev) + [React Testing Library](https://testing-library.com/react) (1812 tests, 53 files) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- npm (comes with Node)

### Install & Run

```bash
# Clone the repository
git clone https://github.com/TrentHunter82/3DSceneCowboy.git
cd 3DSceneCowboy

# Install dependencies
cd app
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
cd app
npm run build
npm run preview
```

### Run Tests

```bash
cd app
npm test              # single run
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

### Type Check

```bash
cd app
npx tsc -b --noEmit
```

---

## Project Structure

```
app/
├── src/
│   ├── components/           # React components
│   │   ├── ui/               # Reusable UI widgets
│   │   ├── Viewport.tsx      # 3D Canvas with scene rendering
│   │   ├── Toolbar.tsx       # Top toolbar (tools, add, save/load)
│   │   ├── ObjectList.tsx    # Left sidebar scene tree
│   │   ├── RightSidebar.tsx  # Tabbed right panel (Object/Render/Assets)
│   │   ├── BottomPanel.tsx   # Timeline and camera path editor
│   │   ├── AnimationTimeline.tsx  # Keyframe timeline UI
│   │   ├── SceneObject3D.tsx # Individual 3D object renderer
│   │   ├── ShotList.tsx      # Camera shot management
│   │   └── ...
│   ├── core/                 # Pure functions (no React dependencies)
│   │   ├── animation.ts      # Keyframe interpolation, easing, camera tracks
│   │   ├── cameraPath.ts     # Catmull-Rom spline evaluation
│   │   ├── serialization.ts  # Scene save/load with migration
│   │   ├── sceneOperations.ts # Object CRUD, hierarchy, defaults
│   │   ├── exportPipeline.ts # glTF 2.0 export, screenshot, video
│   │   ├── storageEngine.ts  # IndexedDB adapter, auto-save
│   │   └── ...
│   ├── stores/               # Zustand state stores
│   │   ├── useSceneStore.ts  # Objects, selection, history, clipboard
│   │   ├── useAnimationStore.ts # Timeline, keyframes, playback
│   │   ├── useCameraStore.ts # Camera presets, shots, controls ref
│   │   ├── useUIStore.ts     # Sidebar, context menu, theme
│   │   └── ...
│   ├── types/                # TypeScript type definitions
│   ├── hooks/                # Custom React hooks
│   └── test/                 # Test setup and mocks
├── index.html
├── package.json
├── vite.config.ts
├── vitest.config.ts
└── tsconfig.json
```

---

## Architecture

### State Management

All shared state lives in **Zustand stores** — no prop drilling, no React Context for data. Local `useState` is only used for ephemeral UI like input values and modal visibility.

| Store | Responsibility |
|-------|---------------|
| `useSceneStore` | Objects, selection, tools, environment, history, clipboard |
| `useAnimationStore` | Timeline tracks, keyframes, playback, scene keyframe capture |
| `useCameraStore` | Camera presets, shots, CameraControls ref |
| `useCameraPathStore` | Camera paths, control points, path playback |
| `useUIStore` | Sidebar state, context menu, theme |
| `usePostProcessingStore` | Bloom, SSAO, vignette settings |
| `useAssetStore` | Asset library, filtering, search |
| `useExportStore` | Export format options, progress |
| `useStorageStore` | Saved scenes, auto-save config |

### 3D Performance

- **On-demand rendering** — Canvas uses `frameloop="demand"` with a `StoreInvalidator` that triggers re-renders only when state changes
- **Animation in useFrame** — Timeline playback and camera paths run in the render loop, writing directly to store state without React re-renders
- **Material/geometry memoization** — Shared via `useMemo` and `React.memo`
- **GPU resource cleanup** — Dispose geometry, materials, and textures on unmount

### Scene Keyframe System

The animation timeline treats the camera as a virtual animation track (`objectId = '__camera__'`). Two `AnimatableProperty` values — `cameraPosition` and `cameraTarget` — store camera state as regular keyframes.

**Workflow:**
1. Position camera and objects in the viewport
2. Set playhead to desired time (e.g., t=0)
3. Click **Capture Keyframe** — snapshots camera + all selected/tracked objects
4. Move playhead, reposition camera and objects
5. Click **Capture Keyframe** again
6. Press **Play** — camera and objects animate between keyframed states

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Q` | Select tool |
| `W` | Move tool |
| `E` | Rotate tool |
| `R` | Scale tool |
| `Delete` / `Backspace` | Delete selected |
| `Ctrl+D` | Duplicate |
| `Ctrl+C` / `Ctrl+V` | Copy / Paste |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / Redo |
| `Ctrl+A` | Select all |
| `Ctrl+Shift+S` | Capture camera shot |
| `Space` | Toggle animation playback |
| `H` | Toggle sidebars |
| `?` | Keyboard shortcuts help |

---

## Design System

The UI follows a **brutalist dark** aesthetic:

- **Backgrounds** — Deep blacks (`#080808` to `#222222`)
- **Text** — Light sand tones (`#e0e0e0`)
- **Primary accent** — Warm orange/rust (`#ff6600`) with glow effects
- **Secondary accent** — Cyan (`#00d4ff`) for camera-related UI
- **Panels** — Subtle semi-transparent borders (`border-dust-600/30`) with inset shadow depth
- **Typography** — Inter for UI, JetBrains Mono for data
- **Corner radius** — `rounded` (4px) throughout — brutalist but not sharp

---

## License

This project is private. All rights reserved.
