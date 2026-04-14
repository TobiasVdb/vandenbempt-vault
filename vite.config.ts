import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? process.env.VITE_BASE_PATH ?? '/' : '/',
  server: {
    port: 5174,
    strictPort: true,
  },
  preview: {
    allowedHosts: ['kube-qz2b5.ondigitalocean.app'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
}))
