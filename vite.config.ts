import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 7070,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false
  }
});
