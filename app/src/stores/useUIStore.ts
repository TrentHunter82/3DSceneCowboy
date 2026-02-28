import { create } from 'zustand'

export type PivotMode = 'individual' | 'median' | 'active'
export type ThemeMode = 'dark' | 'light'
export type RightSidebarTab = 'object' | 'render' | 'assets'
export type BottomPanelTab = 'timeline'
export type AssetPanelMode = 'tab' | 'column'

interface ContextMenuState {
  x: number
  y: number
  objectId: string
}

interface UIState {
  contextMenu: ContextMenuState | null
  sidebarCollapsed: boolean
  pivotMode: PivotMode
  theme: ThemeMode
  rightSidebarTab: RightSidebarTab
  showWelcome: boolean
  bottomPanelTab: BottomPanelTab
  bottomPanelHeight: number
  bottomPanelCollapsed: boolean
  assetPanelMode: AssetPanelMode
  showContextMenu: (x: number, y: number, objectId: string) => void
  hideContextMenu: () => void
  toggleSidebar: () => void
  setPivotMode: (mode: PivotMode) => void
  toggleTheme: () => void
  setRightSidebarTab: (tab: RightSidebarTab) => void
  setShowWelcome: (show: boolean) => void
  setBottomPanelTab: (tab: BottomPanelTab) => void
  setBottomPanelHeight: (height: number) => void
  setBottomPanelCollapsed: (collapsed: boolean) => void
  setAssetPanelMode: (mode: AssetPanelMode) => void
}

export const useUIStore = create<UIState>((set) => ({
  contextMenu: null,
  sidebarCollapsed: false,
  pivotMode: 'individual',
  theme: 'dark',
  rightSidebarTab: 'object',
  showWelcome: false,
  bottomPanelTab: 'timeline',
  bottomPanelHeight: 240,
  bottomPanelCollapsed: true,
  assetPanelMode: 'tab',
  showContextMenu: (x, y, objectId) => set({ contextMenu: { x, y, objectId } }),
  hideContextMenu: () => set({ contextMenu: null }),
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setPivotMode: (mode) => set({ pivotMode: mode }),
  toggleTheme: () => set(s => {
    const next = s.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    return { theme: next }
  }),
  setRightSidebarTab: (tab) => set({ rightSidebarTab: tab }),
  setShowWelcome: (show) => set({ showWelcome: show }),
  setBottomPanelTab: (tab) => set({ bottomPanelTab: tab, bottomPanelCollapsed: false }),
  setBottomPanelHeight: (height) => set({ bottomPanelHeight: Math.max(120, Math.min(500, height)) }),
  setBottomPanelCollapsed: (collapsed) => set({ bottomPanelCollapsed: collapsed }),
  setAssetPanelMode: (mode) => set({ assetPanelMode: mode }),
}))
