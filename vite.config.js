import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/hw-tracker/', // ⚠️ 請務必加上這行，引號內填入您等一下要命名的 GitHub Repository 名稱
})