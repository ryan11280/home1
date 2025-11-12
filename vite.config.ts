import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // 關鍵設定：這裡要改成您在 GitHub 上的儲存庫名稱
  base: '/home1/', 
  plugins: [react()],
})