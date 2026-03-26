import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const sharedRoot = path.resolve(__dirname, '../../shared/frontend/src')

// Resolve @/ alias within shared/frontend files to shared's own src/
const sharedAliasPlugin: Plugin = {
  name: 'shared-alias',
  resolveId(id, importer) {
    if (id.startsWith('@/') && importer?.includes('/shared/frontend/src/')) {
      return path.resolve(sharedRoot, id.slice(2))
    }
  },
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    sharedAliasPlugin,
  ],
  base: '/ui/',
  build: {
    outDir: 'out',
    emptyOutDir: true,
    sourcemap: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@data-voyager/shared-ui': path.resolve(__dirname, '../../shared/frontend/src'),
    },
  },
  optimizeDeps: {
    exclude: ['@data-voyager/shared-ui'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.API_SERVER_URL || 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
