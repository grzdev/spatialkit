# SpatialKit 3D Picker — Chrome Extension 🎯✨

A color-picker-style browser extension that lets you pick any 3D model (`.glb`, `.gltf`, Three.js `<canvas>`, or `<model-viewer>`) on any webpage and immediately open it in a dedicated **[SpatialKit](https://spatialkit.netlify.app)** tab with all interactive rigs, hotspots, lighting presets, and cross-section slicers.

---

## 🚀 How It Works

1. **🎯 Pick 3D Model from Page (Color-Picker Style)**:
   - Click the **SpatialKit** extension icon and hit **🎯 Pick 3D Model from Page** (or right-click anywhere on a webpage and choose **Pick 3D Model on Page with SpatialKit 🎯**).
   - Hover over any 3D model, `<canvas>`, or `<model-viewer>` on the site — it highlights with a glowing teal frame.
   - Click it, and it opens a brand-new tab at `https://spatialkit.netlify.app/?modelUrl=...` with that exact 3D model loaded and ready to inspect!

2. **Automatic 3D Asset Sniffer**:
   - Automatically detects `<model-viewer>` tags, `.glb` / `.gltf` links, and `.glb` / `.gltf` network assets loaded by Three.js / React Three Fiber `<canvas>` scenes.
   - Click **Open in SpatialKit ↗** from the popup list or floating badge to launch the model in a full SpatialKit tab.

---

## 🛠️ How to Install Locally in Chrome / Edge / Brave / Arc

1. Open your browser and go to **`chrome://extensions`** (or `edge://extensions` / `brave://extensions`).
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the [`extension`](.) folder inside this repository (`spatialkit/extension`).
5. Pin the **SpatialKit 3D** icon to your toolbar and try it on any site with 3D models!
