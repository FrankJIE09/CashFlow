import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages: https://FrankJIE09.github.io/CashFlow/
  base: '/CashFlow/',
  server: {
    host: '0.0.0.0',     // 允许局域网设备访问
    port: 5173,           // 默认端口，可改为 5500 等
  },
})
