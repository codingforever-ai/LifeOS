import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Single-origin wiring: the browser only talks to :3000; /api is proxied to the API service (cookies stay first-party).
const target = process.env.API_PROXY_TARGET ?? 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    watch: { usePolling: true, interval: 300 },
    proxy: { '/api': { target, changeOrigin: false } },
  },
});
