interface EmptyStateProps {
  icon: string
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center flex-col py-8">
      <span className="text-2xl text-dust-400/60 animate-pulse">{icon}</span>
      <span className="text-[10px] uppercase tracking-[0.15em] text-dust-300 font-semibold mt-3">
        {title}
      </span>
      <span className="text-[11px] text-dust-500 mt-1.5 text-center max-w-[200px] leading-relaxed">
        {description}
      </span>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-3 py-1.5 text-[10px] text-rust-400 border border-rust-500/30 rounded hover:bg-rust-500/10 hover:text-rust-300 transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
