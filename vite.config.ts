import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // 确保生产环境正确识别
  define: {
    'import.meta.env.PROD': JSON.stringify(mode === 'production'),
    'import.meta.env.MODE': JSON.stringify(mode),
    'import.meta.env.VITE_API_BASE_URL': mode === 'production' ? JSON.stringify('') : undefined,
  },
  // 生产环境构建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  // 服务器配置（开发环境）
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
}))








