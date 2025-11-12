// vite.config.ts (V7.0)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // 1. 您的 GitHub Pages 路徑
  base: '/home1/', // <--- 請再次確認這是您的 repo 名稱

  plugins: [react()],

  // 2. V7.0 移除 proxy：
  // GitHub Pages 是靜態託管，不支援 server-side 代理。
  // API 功能將改為提示模式。
  server: {
    proxy: {} // 保持為空
  }
})