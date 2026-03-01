import { useState, useEffect, useCallback } from 'react'
import { Toolbar } from './components/Toolbar'
import { ObjectList } from './components/ObjectList'
import { Viewport } from './components/Viewport'
import { CloudSaveModal } from './components/CloudSaveModal'
import { ExportDialog } from './components/ExportDialog'
import { WelcomeScreen } from './components/WelcomeScreen'
import { EnvironmentPanel } from './components/ui/EnvironmentPanel'
import { KeyboardShortcutModal } from './components/ui/KeyboardShortcutModal'
import { RightSidebar } from './components/RightSidebar'
import { BottomPanel } from './components/BottomPanel'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useUIStore } from './stores/useUIStore'
import './index.css'

function App() {
  useKeyboardShortcuts()
  const sidebarCollapsed = useUIStore(s => s.sidebarCollapsed)
  const toggleSidebar = useUIStore(s => s.toggleSidebar)
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const [cloudSaveOpen, setCloudSaveOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  const toggleShortcutHelp = useCallback(() => {
    setShortcutHelpOpen(prev => !prev)
  }, [])

  const toggleCloudSave = useCallback(() => {
    setCloudSaveOpen(prev => !prev)
  }, [])

  const toggleExportDialog = useCallback(() => {
    setExportDialogOpen(prev => !prev)
  }, [])

  useEffect(() => {
    window.addEventListener('toggle-shortcut-help', toggleShortcutHelp)
    return () => window.removeEventListener('toggle-shortcut-help', toggleShortcutHelp)
  }, [toggleShortcutHelp])

  useEffect(() => {
    window.addEventListener('toggle-cloud-save', toggleCloudSave)
    return () => window.removeEventListener('toggle-cloud-save', toggleCloudSave)
  }, [toggleCloudSave])

  useEffect(() => {
    window.addEventListener('toggle-export-dialog', toggleExportDialog)
    return () => window.removeEventListener('toggle-export-dialog', toggleExportDialog)
  }, [toggleExportDialog])

  return (
    <div className="w-full h-full flex flex-col bg-dust-900">
      {/* Top bar */}
      <header
        className="flex items-stretch shrink-0 border-b border-dust-600/30 led-strip-orange relative z-10"
        style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.6), 0 6px 24px rgba(0,0,0,0.4)' }}
      >
        <div className="flex-1 min-w-0">
          <Toolbar />
        </div>
      </header>

      {/* Main content — three-panel layout */}
      <main className="flex-1 flex overflow-hidden bg-dust-900">
        {/* Left sidebar — scene hierarchy */}
        {!sidebarCollapsed && (
          <aside
            aria-label="Scene sidebar"
            className="w-56 sidebar-panel border-r border-dust-600/20 flex flex-col shrink-0 led-strip-v-orange"
            style={{ boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.04), 4px 0 12px rgba(0,0,0,0.5), 8px 0 32px rgba(0,0,0,0.4)' }}
          >
            <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
              <ObjectList />
              <EnvironmentPanel />
            </div>
          </aside>
        )}

        {/* Center — viewport + tools */}
        <div className="flex-1 flex flex-col min-w-0 relative viewport-frame">
          <div className="flex-1 flex flex-col min-h-0 relative">
            <Viewport />
            <WelcomeScreen />
          </div>
          <BottomPanel />
        </div>

        {/* Right sidebar — tabbed panels */}
        {!sidebarCollapsed && <RightSidebar />}

        {/* Sidebar toggle (when collapsed) */}
        {sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="absolute top-2 left-2 z-10 w-8 h-8 bg-dust-800 border border-dust-600/40 rounded flex items-center justify-center text-dust-400 hover:border-rust-500/40 hover:text-rust-400 transition-all duration-150"
            title="Show sidebars"
            aria-label="Show sidebars"
            style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.06)' }}
          >
            ☰
          </button>
        )}
      </main>

      <KeyboardShortcutModal
        isOpen={shortcutHelpOpen}
        onClose={() => setShortcutHelpOpen(false)}
      />

      <CloudSaveModal
        isOpen={cloudSaveOpen}
        onClose={() => setCloudSaveOpen(false)}
      />

      <ExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
      />
    </div>
  )
}

export default App
