import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
      '@data-voyager/sdk': path.resolve(__dirname, '../../sdk/frontend/src'),
      '@data-voyager/extension-datasource-postgresql': path.resolve(__dirname, '../../extensions/datasources/postgresql/frontend/src'),
      '@data-voyager/extension-datasource-clickhouse': path.resolve(__dirname, '../../extensions/datasources/clickhouse/frontend/src'),
    },
  },
  optimizeDeps: {
    exclude: [
      '@data-voyager/shared-ui',
      '@data-voyager/sdk',
      '@data-voyager/extension-datasource-postgresql',
      '@data-voyager/extension-datasource-clickhouse',
    ],
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
