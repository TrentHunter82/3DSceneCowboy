import { useState, type ReactNode } from 'react'

type SectionVariant = 'primary' | 'secondary' | 'tertiary'

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  variant?: SectionVariant
  children: ReactNode
}

const VARIANT_CONFIG = {
  primary: {
    dotSize: 'w-2 h-2',
    textSize: 'text-[12px]',
    defaultOpen: true,
  },
  secondary: {
    dotSize: 'w-1.5 h-1.5',
    textSize: 'text-[11px]',
    defaultOpen: true,
  },
  tertiary: {
    dotSize: '',
    textSize: 'text-[10px]',
    defaultOpen: false,
  },
}

export function CollapsibleSection({
  title,
  defaultOpen,
  variant = 'secondary',
  children,
}: CollapsibleSectionProps) {
  const config = VARIANT_CONFIG[variant]
  const resolvedDefaultOpen = defaultOpen ?? config.defaultOpen
  const [isOpen, setIsOpen] = useState(resolvedDefaultOpen)
  const isTertiary = variant === 'tertiary'

  return (
    <div className="border-b border-dust-600/25 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-dust-600/15 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rust-500/60 group ${isOpen ? 'section-header' : ''}`}
      >
        {/* LED indicator dot (hidden for tertiary) */}
        {!isTertiary && (
          <span
            className={`${config.dotSize} rounded-full shrink-0 transition-all duration-200 ${
              isOpen ? 'bg-rust-400 shadow-[0_0_4px_rgba(255,122,46,0.5),0_0_8px_rgba(255,122,46,0.2)]' : 'bg-dust-500/40'
            }`}
          />
        )}
        <span
          className={`text-[8px] transition-transform duration-200 ${
            isTertiary ? 'text-dust-500' : 'text-dust-400'
          } ${isOpen ? 'rotate-90' : ''}`}
        >
          {'\u25B6'}
        </span>
        <span className={`${config.textSize} font-semibold uppercase tracking-[0.12em] label-engraved transition-colors ${
          isOpen
            ? isTertiary ? 'text-dust-300' : 'text-dust-100'
            : isTertiary ? 'text-dust-500' : 'text-dust-400'
        }`}>
          {title}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pt-2 pb-3">
          {children}
        </div>
      </div>
    </div>
  )
}
