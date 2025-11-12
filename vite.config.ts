// vite.config.ts (V5.0)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // 1. 您的 GitHub Pages 路徑
  base: '/home1/', // <--- 請再次確認這是您的 repo 名稱

  plugins: [react()],

  // 2. V5.0 新增：設定 API 代理
  server: {
    proxy: {
      // 將 /api/geocode 請求轉發到 Google Geocoding API
      '/api/geocode': {
        target: 'https://maps.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/geocode/, '/maps/api/geocode/json'),
      },
      // 將 /api/distancematrix 請求轉發到 Google Distance Matrix API
      '/api/distancematrix': {
        target: 'https://maps.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/distancematrix/, '/maps/api/distancematrix/json'),
      },
    }
  }
})