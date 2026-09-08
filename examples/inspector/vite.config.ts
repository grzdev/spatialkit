import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ command }) => ({
  root: fileURLToPath(new URL('.', import.meta.url)),
  // Production deliberately resolves the package exports; dev uses source for hot reload.
  resolve: command === 'serve' ? { alias: { 'spatialkit/react': fileURLToPath(new URL('../../src/react/index.ts', import.meta.url)) } } : {},
  server: { host: '127.0.0.1', port: 5173 },
  build: { outDir: '../../dist-inspector', emptyOutDir: true },
}));
