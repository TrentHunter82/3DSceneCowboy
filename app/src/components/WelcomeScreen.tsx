import { useMemo, useCallback } from 'react'
import { useSceneStore } from '../stores/useSceneStore'
import { useStorageStore } from '../stores/useStorageStore'
import { useUIStore } from '../stores/useUIStore'
import {
  createBasicSceneTemplate,
  createLightSetupTemplate,
  createArchitectureTemplate,
} from '../core/sceneTemplates'
import type { SavedSceneMetadata } from '../types/storage'

// ── Template Definitions ─────────────────────────────────────────────

interface SceneTemplate {
  id: string
  name: string
  description: string
  icon: string
  action: 'dismiss' | 'basic' | 'lights' | 'architecture'
}

const TEMPLATES: SceneTemplate[] = [
  {
    id: 'empty',
    name: 'Empty Scene',
    description: 'Start from scratch',
    icon: '\u25CB',  // ○
    action: 'dismiss',
  },
  {
    id: 'basic',
    name: 'Basic Scene',
    description: 'Ground plane + 3 objects',
    icon: '\u25A8',  // ▨
    action: 'basic',
  },
  {
    id: 'lights',
    name: 'Light Setup',
    description: 'Common light positions',
    icon: '\u2600',  // ☀
    action: 'lights',
  },
  {
    id: 'architecture',
    name: 'Architecture',
    description: 'Simple building layout',
    icon: '\u2302',  // ⌂
    action: 'architecture',
  },
]

// ── Onboarding Tips ──────────────────────────────────────────────────

const TIPS = [
  { icon: '\u2328', text: 'Press Q/W/E/R to switch tools' },         // ⌨
  { icon: '\u2630', text: 'Right-click objects for context menu' },   // ☰
  { icon: '\u21B6', text: 'Ctrl+Z to undo, Ctrl+Shift+Z to redo' }, // ↶
  { icon: '\u2B0D', text: 'Drag objects in the hierarchy to reparent' }, // ⬍
]

// ── Date Formatting ──────────────────────────────────────────────────

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// ── WelcomeScreen Component ──────────────────────────────────────────

export function WelcomeScreen() {
  const objects = useSceneStore(s => s.objects)
  const loadObjects = useSceneStore(s => s.loadObjects)
  const scenes = useStorageStore(s => s.scenes)
  const showWelcome = useUIStore(s => s.showWelcome)
  const setShowWelcome = useUIStore(s => s.setShowWelcome)

  // Sort by updatedAt descending, take last 4
  const recentProjects = useMemo(() => {
    if (scenes.length === 0) return []
    const sorted = [...scenes].sort(
      (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    )
    return sorted.slice(0, 4)
  }, [scenes])

  const handleTemplate = useCallback((action: SceneTemplate['action']) => {
    switch (action) {
      case 'dismiss':
        setShowWelcome(false)
        break
      case 'basic':
        loadObjects(createBasicSceneTemplate())
        setShowWelcome(false)
        break
      case 'lights':
        loadObjects(createLightSetupTemplate())
        setShowWelcome(false)
        break
      case 'architecture':
        loadObjects(createArchitectureTemplate())
        setShowWelcome(false)
        break
    }
  }, [loadObjects, setShowWelcome])

  const handleLoadProject = useCallback((_project: SavedSceneMetadata) => {
    // Open the cloud save modal's load tab
    window.dispatchEvent(new CustomEvent('toggle-cloud-save'))
    setShowWelcome(false)
  }, [setShowWelcome])

  const handleShowShortcuts = useCallback(() => {
    window.dispatchEvent(new Event('toggle-shortcut-help'))
  }, [])

  const handleClose = useCallback(() => {
    setShowWelcome(false)
  }, [setShowWelcome])

  // Hide when explicitly dismissed
  if (!showWelcome) return null

  const isManualOpen = objects.length > 0

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div
        className="pointer-events-auto max-w-2xl w-full mx-4 bg-dust-900/95 backdrop-blur-xl border border-rust-500/20 rounded-xl overflow-hidden relative"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.6), 0 12px 40px rgba(0,0,0,0.7), 0 24px 80px rgba(0,0,0,0.5)' }}
        role="region"
        aria-label="Welcome screen"
      >
        {/* Close button (when manually opened) */}
        {isManualOpen && (
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded text-dust-400 hover:text-sand-100 hover:bg-dust-600/40 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 z-10"
            aria-label="Close welcome screen"
          >
            {'✕'}
          </button>
        )}

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="px-8 pt-8 pb-4 text-center">
          <div className="inline-flex items-center gap-3 mb-2">
            <span className="text-3xl" aria-hidden="true">{'\u2726'}</span>
            <h1 className="text-2xl font-bold text-sand-50 tracking-wide">
              3D Scene Cowboy
            </h1>
            <span className="text-3xl" aria-hidden="true">{'\u2726'}</span>
          </div>
          <p className="text-sm text-dust-400 italic">
            Build your scene, partner
          </p>
          <div
            className="mt-3 mx-auto w-32 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, var(--color-rust-500), transparent)',
            }}
          />
        </div>

        <div className="px-8 pb-8 space-y-6">
          {/* ── Quick Start Templates ──────────────────────────── */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-dust-300 mb-3">
              Quick Start
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleTemplate(template.action)}
                  className="group template-card flex flex-col items-center gap-2 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500"
                  aria-label={`Create ${template.name}: ${template.description}`}
                >
                  <span
                    className="text-3xl text-dust-300 group-hover:text-rust-400 group-hover:scale-110 transition-all duration-200"
                    aria-hidden="true"
                  >
                    {template.icon}
                  </span>
                  <span className="text-sm font-medium text-sand-200 group-hover:text-sand-100 transition-colors duration-200">
                    {template.name}
                  </span>
                  <span className="text-[10px] text-dust-400 leading-tight text-center">
                    {template.description}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Recent Projects ────────────────────────────────── */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-dust-300 mb-3">
              Recent Projects
            </h2>
            {recentProjects.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs text-dust-400 italic">
                  No recent projects
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentProjects.map((project: SavedSceneMetadata) => (
                  <button
                    key={project.id}
                    onClick={() => handleLoadProject(project)}
                    className="w-full flex items-center gap-3 px-3 py-2 bg-dust-800/60 border border-dust-600/30 rounded-md hover:border-rust-500/40 hover:bg-dust-800/80 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 text-left"
                    aria-label={`Load project: ${project.name}`}
                  >
                    <span className="text-dust-400 text-sm" aria-hidden="true">
                      {'\u25A3'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-sand-200 truncate">
                        {project.name}
                      </p>
                    </div>
                    <span className="text-[10px] text-dust-400 shrink-0">
                      {project.objectCount} {project.objectCount === 1 ? 'object' : 'objects'}
                    </span>
                    <span className="text-[10px] text-dust-400 shrink-0 w-14 text-right">
                      {formatRelativeDate(project.updatedAt)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ── Onboarding Tips ────────────────────────────────── */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-dust-300 mb-3">
              Tips
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {TIPS.map((tip, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="text-xs text-rust-400 w-4 text-center shrink-0"
                    aria-hidden="true"
                  >
                    {tip.icon}
                  </span>
                  <span className="text-xs text-dust-300 leading-relaxed">
                    {tip.text}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Getting Started ────────────────────────────────── */}
          <div className="flex justify-center pt-1">
            <button
              onClick={handleShowShortcuts}
              className="text-xs text-rust-400 hover:text-rust-500 underline underline-offset-2 decoration-rust-400/30 hover:decoration-rust-500/50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 rounded px-1"
            >
              View all keyboard shortcuts
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
