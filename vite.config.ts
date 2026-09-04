/**
 * SpatialKit — Library Build Config
 *
 * Builds the library for npm distribution.
 * - Outputs ESM + CJS bundles
 * - Three.js and MediaPipe are externals (peerDependencies — users bring their own)
 * - TypeScript declarations are emitted to dist/
 *
 * To build: npm run build
 * To run demo: npm run dev
 */
import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dts from "vite-plugin-dts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    dts({
      include: ["src/**/*.ts"],
      outDir: "dist",
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "SpatialKit",
      formats: ["es", "cjs"],
      fileName: (format) => `spatialkit.${format}.js`,
    },
    rollupOptions: {
      // Don't bundle peer dependencies — consumers supply these
      external: [
        "three",
        "three/addons/loaders/GLTFLoader.js",
        "three/addons/loaders/DRACOLoader.js",
        "three/addons/controls/OrbitControls.js",
        "three/addons/environments/RoomEnvironment.js",
        "@mediapipe/tasks-vision",
      ],
      output: {
        globals: {
          three: "THREE",
          "@mediapipe/tasks-vision": "MediaPipeTasksVision",
        },
        // Keep internal chunks clean
        chunkFileNames: "chunks/[name]-[hash].js",
      },
    },
    sourcemap: true,
    // Clean previous build
    emptyOutDir: true,
  },
});
