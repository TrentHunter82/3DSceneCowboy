import { useUIStore, type RightSidebarTab } from '../stores/useUIStore'
import { SidebarTabBar } from './ui/SidebarTabBar'
import { PropertiesPanel } from './PropertiesPanel'
import { ShotList } from './ShotList'
import { CameraPathEditor } from './CameraPathEditor'
import { EffectsPanel } from './EffectsPanel'
import { AssetBrowserPanel } from './AssetBrowserPanel'

const TABS = [
  { id: 'object' as const, icon: '\u25C7', label: 'Object' },      // ◇
  { id: 'render' as const, icon: '\u25CE', label: 'Render' },       // ◎
  { id: 'assets' as const, icon: '\u229A', label: 'Assets' },       // ⊚
]

function TabContent({ tab }: { tab: RightSidebarTab }) {
  switch (tab) {
    case 'render':
      return (
        <>
          <ShotList />
          <CameraPathEditor />
          <EffectsPanel />
        </>
      )
    case 'assets':
      return <AssetBrowserPanel />
    case 'object':
    default:
      return <PropertiesPanel />
  }
}

export function RightSidebar() {
  const activeTab = useUIStore(s => s.rightSidebarTab)
  const setActiveTab = useUIStore(s => s.setRightSidebarTab)

  return (
    <aside aria-label="Properties" className="flex shrink-0 overflow-hidden">
      <SidebarTabBar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as RightSidebarTab)}
      />
      <div
        className="w-72 flex flex-col overflow-y-auto sidebar-panel panel-viewport-right"
        role="tabpanel"
        aria-label={`${activeTab} panel`}
      >
        <TabContent tab={activeTab} />
      </div>
    </aside>
  )
}
