import path, { basename } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      base: '/NdaY-Radoko-3.0/',
      server: {
        port: 4000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Never bundle a provider secret into browser code. A future live
        // model integration must call a protected server-side endpoint.
        'process.env.API_KEY': JSON.stringify(''),
        'process.env.GEMINI_API_KEY': JSON.stringify('')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
