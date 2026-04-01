import { defineConfig } from 'vite'
import { resolve } from 'path'

// This file exists solely for shadcn CLI framework detection.
// shared/frontend is a library package and is not built with Vite directly.
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
