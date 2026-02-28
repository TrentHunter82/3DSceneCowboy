import { useEffect } from 'react'
import { useSceneStore } from '../stores/useSceneStore'
import { useCameraStore } from '../stores/useCameraStore'

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const state = useSceneStore.getState()

      // Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+Shift+S — capture camera shot
        if (e.shiftKey && e.key.toLowerCase() === 's') {
          e.preventDefault()
          useCameraStore.getState().captureShot()
          return
        }

        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault()
            if (e.shiftKey) {
              state.redo()
            } else {
              state.undo()
            }
            return
          case 'y':
            e.preventDefault()
            state.redo()
            return
          case 'd':
            e.preventDefault()
            if (state.selectedIds.length > 0) {
              state.duplicateSelected()
            } else if (state.selectedId) {
              state.duplicateObject(state.selectedId)
            }
            return
          case 'c':
            e.preventDefault()
            state.copySelected()
            return
          case 'v':
            e.preventDefault()
            state.pasteClipboard()
            return
          case 'a':
            e.preventDefault()
            state.selectAll()
            return
        }
      }

      // Plain key shortcuts (use e.key, not lowercased, to detect '?')
      switch (e.key) {
        case '?':
          window.dispatchEvent(new Event('toggle-shortcut-help'))
          break
        case 'q':
        case 'Q':
          state.setToolMode('select')
          break
        case 'w':
        case 'W':
          state.setToolMode('move')
          break
        case 'e':
        case 'E':
          state.setToolMode('rotate')
          break
        case 'r':
        case 'R':
          state.setToolMode('scale')
          break
        case 'Delete':
        case 'Backspace':
          if (state.selectedIds.length > 0) {
            state.removeSelected()
          } else if (state.selectedId) {
            state.removeObject(state.selectedId)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
