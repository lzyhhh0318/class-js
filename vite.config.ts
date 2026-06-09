import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  server: {
    host: '0.0.0.0', // 允许局域网访问
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/oss-api': {
        target: 'http://192.168.244.236:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/oss-api/, '/app'),
      },
    }
  },
  preview: {
    host: '0.0.0.0', // 允许局域网访问
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/oss-api': {
        target: 'http://192.168.244.236:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/oss-api/, '/app'),
      },
    }
  }
})
