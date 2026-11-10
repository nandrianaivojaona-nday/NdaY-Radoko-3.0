// vite.config.ts
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  base: '/NdaY-Radoko-3.0/',
  server: {
    port: 4000,
    host: '0.0.0.0',
    proxy: {
      '/api': { target: 'http://localhost:4001', changeOrigin: true },
    },
  },
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(''),
    'process.env.GEMINI_API_KEY': JSON.stringify(''),
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
}));
