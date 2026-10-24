import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Same-origin /api in dev, mirroring the nginx proxy used in Docker.
    proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3000' },
  },
});
