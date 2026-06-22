import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Base path is env-driven so the GitHub Pages subpath ('/QRP-dgby/') is a deploy
// concern, not hardcoded. Defaults to '/' for local dev and CI.
export default defineConfig({
  base: process.env.QRP_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: { port: 3000, host: true },
  build: {
    rollupOptions: {
      output: {
        // Split vendors into cacheable chunks (mediabunny is already lazy via
        // dynamic import). Keeps the initial app payload small for mobile.
        manualChunks: {
          vendor: [
            'react',
            'react-dom',
            'react-router-dom',
            '@tanstack/react-query',
            '@tanstack/react-virtual',
          ],
          data: ['dexie', 'dexie-react-hooks', 'zod', 'minisearch'],
        },
      },
    },
  },
});
