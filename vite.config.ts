import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ include: ['src/**/*.ts', 'src/**/*.tsx'], outDir: 'dist' })],
  build: {
    lib: {
      entry: { spatialkit: resolve('src/index.ts'), react: resolve('src/react/index.ts'), gestures: resolve('src/gestures.ts') },
      formats: ['es', 'cjs'],
      fileName: (format, entry) => `${entry}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: (id) => /^(three|react|react-dom|@react-three\/fiber|@react-three\/drei|@mediapipe\/tasks-vision)(\/|$)/.test(id),
    },
    sourcemap: true,
  },
});
