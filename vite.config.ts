// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 這裡必須改成您的 GitHub 儲存庫名稱！
  // 範例：'/my-property-app/'
  base: '/home1/', 
  plugins: [react()],
})