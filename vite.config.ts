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
});
