/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '/vite.svg': new URL('./src/test/file-mock.ts', import.meta.url).pathname,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/main.tsx',
        'src/**/*.d.ts',
        'src/components/SceneObject3D.tsx',
        'src/components/Viewport.tsx',
        'src/components/PostProcessing.tsx',
        'src/components/TimelinePlayback.tsx',
        'src/types/**',
        'src/core/index.ts',
      ],
    },
  },
})
