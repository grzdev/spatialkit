import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Use live spatialkit source so HMR works
      'spatialkit/react': fileURLToPath(
        new URL('../../src/react/index.ts', import.meta.url)
      ),
    },
    // Ensure a single copy of every shared peer dep
    dedupe: ['three', '@react-three/fiber', '@react-three/drei', 'react', 'react-dom'],
  },
  server: { port: 5174 },
})
