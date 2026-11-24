import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  // The portal is served under /vortex/ on the TechXpress domain; the train
  // site owns /. Asset URLs and the router basename (main.jsx) follow this.
  base: '/vortex/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      // Dev convenience — bypasses CORS during `npm run dev`. Production
      // build hits VITE_API_URL directly.
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
