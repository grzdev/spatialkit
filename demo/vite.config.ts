/**
 * SpatialKit — Demo Vite Config
 * Runs the showcase demo app. Imports directly from ../src so changes
 * to the library source are instantly reflected without a build step.
 */
import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  publicDir: path.resolve(__dirname, "../public"),
  plugins: [basicSsl()],
  server: {
    https: true,
    port: 5173,
    open: true,
  },
  resolve: {
    alias: {
      // Allows demo to import from 'spatialkit' just like a real consumer would
      spatialkit: path.resolve(__dirname, "../src/index.ts"),
    },
  },
});
