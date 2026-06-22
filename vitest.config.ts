import path from 'node:path';
import { defineConfig } from 'vitest/config';

// No Vite plugins here: Vitest transforms TSX via esbuild (automatic JSX runtime),
// and importing @vitejs/plugin-react would drag in Vitest's nested Vite copy,
// clashing types under exactOptionalPropertyTypes. Fast Refresh isn't needed in tests.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
});
