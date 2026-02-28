import { useAnimationStore } from '../stores/useAnimationStore'
import type { EasingType } from '../types/scene'

interface AnimationCurvesEditorProps {
  trackId: string
  keyframeId: string
  onClose: () => void
}

const EASING_OPTIONS: { type: EasingType; label: string }[] = [
  { type: 'linear', label: 'Linear' },
  { type: 'easeIn', label: 'Ease In' },
  { type: 'easeOut', label: 'Ease Out' },
  { type: 'easeInOut', label: 'Ease In-Out' },
]

const EASING_PATHS: Record<EasingType, string> = {
  linear: 'M 10,140 L 190,10',
  easeIn: 'M 10,140 C 100,140 180,30 190,10',
  easeOut: 'M 10,140 C 20,110 100,10 190,10',
  easeInOut: 'M 10,140 C 10,80 190,70 190,10',
}

const EASING_LABELS: Record<EasingType, string> = {
  linear: 'Linear easing curve: constant speed from start to end',
  easeIn: 'Ease in curve: starts slow and accelerates',
  easeOut: 'Ease out curve: starts fast and decelerates',
  easeInOut: 'Ease in-out curve: starts slow, speeds up, then slows down',
}

export function AnimationCurvesEditor({ trackId, keyframeId, onClose }: AnimationCurvesEditorProps) {
  const tracks = useAnimationStore(s => s.tracks)
  const updateKeyframe = useAnimationStore(s => s.updateKeyframe)

  const track = tracks.find(t => t.id === trackId)
  const keyframe = track?.keyframes.find(kf => kf.id === keyframeId)
  const currentEasing: EasingType = keyframe?.easing ?? 'linear'

  const handleSelect = (type: EasingType) => {
    updateKeyframe(trackId, keyframeId, { easing: type })
  }

  return (
    <div className="absolute z-50 w-64 bg-dust-800 border border-dust-600 rounded-lg shadow-xl p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-sand-200">Easing Curve</span>
        <button
          onClick={onClose}
          aria-label="Close easing editor"
          className="w-6 h-6 flex items-center justify-center rounded text-dust-300 hover:bg-dust-700 hover:text-sand-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500"
        >
          ✕
        </button>
      </div>

      {/* SVG Curve Preview */}
      <svg
        width={200}
        height={150}
        viewBox="0 0 200 150"
        role="img"
        aria-label={EASING_LABELS[currentEasing]}
        className="w-full bg-dust-900 rounded mb-2"
      >
        {/* Grid lines */}
        <line x1={10} y1={10} x2={10} y2={140} stroke="currentColor" strokeWidth={0.5} className="text-dust-700" />
        <line x1={190} y1={10} x2={190} y2={140} stroke="currentColor" strokeWidth={0.5} className="text-dust-700" />
        <line x1={10} y1={10} x2={190} y2={10} stroke="currentColor" strokeWidth={0.5} className="text-dust-700" />
        <line x1={10} y1={140} x2={190} y2={140} stroke="currentColor" strokeWidth={0.5} className="text-dust-700" />
        <line x1={100} y1={10} x2={100} y2={140} stroke="currentColor" strokeWidth={0.5} className="text-dust-700" />
        <line x1={10} y1={75} x2={190} y2={75} stroke="currentColor" strokeWidth={0.5} className="text-dust-700" />

        {/* Easing curve */}
        <path
          d={EASING_PATHS[currentEasing]}
          fill="none"
          className="stroke-rust-500"
          strokeWidth={2}
        />
      </svg>

      {/* Easing Type Buttons */}
      <div className="flex flex-col gap-1">
        {EASING_OPTIONS.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => handleSelect(type)}
            aria-pressed={currentEasing === type}
            className={`w-full text-xs px-3 py-1.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 ${
              currentEasing === type
                ? 'bg-rust-500 text-white'
                : 'text-dust-300 hover:bg-dust-700 hover:text-sand-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
