import '@testing-library/jest-dom/vitest'
import ResizeObserver from 'resize-observer-polyfill'

// jsdom doesn't have ResizeObserver, required by @react-three/fiber's Canvas
globalThis.ResizeObserver = ResizeObserver
