import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/config.json': 'http://localhost:8005',
      '/cameras.json': 'http://localhost:8005',
      '/recordings': 'http://localhost:8005',
      '/go2rtc': 'http://localhost:8005',
    }
  }
});