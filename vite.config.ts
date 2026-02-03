
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This allows the app to access process.env.API_KEY as requested
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
