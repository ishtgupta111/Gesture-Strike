
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This allows the app to access process.env.API_KEY at build time.
    // In Coolify, ensure you set API_KEY in the environment variables section.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
