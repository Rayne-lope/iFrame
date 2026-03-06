import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/sports/openf1': {
        target: 'https://api.openf1.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sports\/openf1/, '/v1'),
      },
      '/api/sports/ergast': {
        target: 'https://api.jolpi.ca',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sports\/ergast/, '/ergast/f1'),
      },
      '/api/sports/streamed': {
        target: 'https://streamed.su',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sports\/streamed/, '/api'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
