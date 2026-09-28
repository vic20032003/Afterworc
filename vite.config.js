// Builds the account (/app) and the staff console (/admin) React apps into dist/app. The Express server serves them.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const api = 'http://localhost:' + (process.env.API_PORT || 3000);
export default defineConfig({
  root: resolve(__dirname, 'client'),
  base: '/app/',
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'dist/app'),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: { input: { index: resolve(__dirname, 'client/index.html'), admin: resolve(__dirname, 'client/admin.html') } }
  },
  server: {
    port: 5173,
    proxy: { '/api': api, '/assets': api, '/fonts': api, '/ws': { target: api.replace('http', 'ws'), ws: true } }
  }
});
