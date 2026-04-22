import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  appType: 'spa',
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/notifications': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/analytics': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.indexOf('text/html') !== -1) {
            return '/index.html';
          }
        },
      },
      '/accounts': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.indexOf('text/html') !== -1) {
            return '/index.html';
          }
        },
      },
      '/projects': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.indexOf('text/html') !== -1) {
            return '/index.html';
          }
        },
      },
      '/documents': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.indexOf('text/html') !== -1) {
            return '/index.html';
          }
        },
      },
      '/interns': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.indexOf('text/html') !== -1) {
            return '/index.html';
          }
        },
      },
      '/assessments': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.indexOf('text/html') !== -1) {
            return '/index.html';
          }
        },
      },
      '/feedback': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.indexOf('text/html') !== -1) {
            return '/index.html';
          }
        },
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Group 1: React Core & Router (Essential for resolving circularity)
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            // Group 2: Large UI & Charting libs
            if (id.includes('recharts') || id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            // Group 3: Backend & Data libs
            if (id.includes('axios')) {
              return 'vendor-data';
            }
            // Group 4: Markdown & Processing
            if (id.includes('react-markdown') || id.includes('remark')) {
              return 'vendor-markdown';
            }
            // Default: Everything else node_modules
            return 'vendor';
          }
        },
      },
    },
  },
})
