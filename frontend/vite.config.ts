import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Only compress files larger than 10kb
      deleteOriginFile: false,
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false,
    })
  ],
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
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Removed manualChunks as it can cause execution order issues and 'undefined' errors in production builds
      },
    },
  },
})
