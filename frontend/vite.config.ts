import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    server: {
      host: '127.0.0.1', // Strictly localhost only, never 0.0.0.0
      port: 5173,
      strictPort: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/admin': {
          target: process.env.VITE_API_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: process.env.VITE_API_URL || 'http://127.0.0.1:8000',
          ws: true,
          changeOrigin: true,
        },
        '/ws': {
          target: process.env.VITE_API_URL || 'http://127.0.0.1:8000',
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
