import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // POST body for /api is streamed; if you get 413, set VITE_API_URL=http://localhost:3001 in .env to bypass proxy
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        timeout: 120000,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setTimeout(120000);
          });
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.setTimeout(120000);
          });
        },
      },
    },
  },
});
