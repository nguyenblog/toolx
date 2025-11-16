import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Base path for GitHub Pages under repo nguyenblog/toolx
  // This ensures assets are resolved correctly at https://nguyenblog.github.io/toolx/
  base: '/toolx/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    cors: true,
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
    // Cho phép truy cập từ domain ngrok trên thiết bị di động
    allowedHosts: ['56586e2101f9.ngrok-free.app'],
    // Proxy API để frontend dùng đường dẫn tương đối `/api` hoạt động trên mobile/ngrok
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
    // Nếu dùng HTTPS/ngrok và gặp lỗi HMR, cân nhắc bật cấu hình dưới:
    // hmr: { protocol: 'wss', host: '56586e2101f9.ngrok-free.app', port: 443 },
  },
  // Build: tắt sourcemap và drop console/debugger để giảm lộ thông tin
  build: {
    sourcemap: false,
    minify: 'esbuild',
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
})