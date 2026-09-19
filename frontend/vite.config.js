import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Dev-time only: forwards /api/* to the FastAPI backend so the
      // browser never needs to know its port, and there's no CORS to deal
      // with. In production, serve the built frontend from behind the same
      // reverse proxy as the API instead.
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      // Enrollment/attendance thumbnails served by the attendance backend.
      '/data': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8001',
        ws: true,
      },
    },
  },
})
