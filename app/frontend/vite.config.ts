import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/owtracker/',
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.VITE_PORT || '12321'),
    strictPort: true,
    proxy: {
      // Proxy /api to /owtracker/api internally for Vite dev
      '^/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      // Also support explicit /owtracker/api routing
      '/owtracker/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/owtracker\/api/, '/api'),
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
