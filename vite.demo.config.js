// Clickable demo: the same account, staff console and public site as one static folder (dist/demo), with an in-browser
// demo backend (client/src/demo/mock.js). Built by scripts/build-demo.js; never used by the real server.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'client'),
  base: './',
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'dist/demo'),
    emptyOutDir: true,
    assetsDir: 'app',
    rollupOptions: {
      input: { 'demo-app': resolve(__dirname, 'client/demo-app.html'), 'demo-admin': resolve(__dirname, 'client/demo-admin.html'), 'demo-site': resolve(__dirname, 'client/src/demo/site-main.js') },
      output: { entryFileNames: 'app/[name].js', chunkFileNames: 'app/[name]-[hash].js', assetFileNames: 'app/[name]-[hash][extname]' }
    }
  }
});
