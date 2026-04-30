import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@main': resolve(__dirname, 'src/main'),
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [['tests/renderer/**', 'jsdom']],
    setupFiles: [resolve(__dirname, 'tests/setup/vitest.setup.ts')],
    include: ['tests/**/*.spec.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      include: [
        'src/main/**/*.ts',
        'src/preload/**/*.ts',
        'src/renderer/src/**/*.ts',
        'src/renderer/src/**/*.tsx',
        'src/shared/**/*.ts'
      ],
      exclude: [
        'src/renderer/src/main.tsx',
        'src/renderer/src/App.tsx',
        'src/renderer/src/assets/**',
        'src/renderer/src/components/ui/**'
      ]
    }
  }
})
