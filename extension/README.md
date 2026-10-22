# SpatialKit 3D Inspector Extension 🌐✨

A lightweight, powerful browser extension that sniffs 3D models (`.glb`, `.gltf`, `<model-viewer>`) across any webpage you browse, letting you inspect, play animations, and control them using SpatialKit's high-fidelity spatial controls.

---

## 🚀 Key Features

1. **Automatic 3D Model Sniffer**:
   - Detects `<model-viewer>`, `<three-d-model>`, and standard HTML elements embedding 3D models.
   - Scans DOM links pointing to `.glb` and `.gltf` assets.
   - Surfaces a non-intrusive floating glass badge at the bottom-right of the page indicating how many 3D models were found.

2. **In-Page Glass Drawer**:
   - Click the detected model or floating badge to slide open an in-page SpatialKit drawer without navigating away from the page.

3. **Open in Dedicated Tab**:
   - One-click button to open any detected 3D model in your full SpatialKit studio workspace with all spatial controls, lighting presets, timeline scrubbers, and exploded views.

4. **Right-Click Context Menu**:
   - Right-click any link or 3D element and choose **"Inspect 3D Model in SpatialKit"**.

5. **Popup Dashboard**:
   - Click the extension icon in the browser toolbar to see all 3D models detected on the current tab, paste any custom GLB/GLTF URL, or quickly launch the local SpatialKit Inspector / Controls Lab.

---

## 🛠️ How to Install (Chrome, Edge, Brave, Arc, Opera)

1. Open your Chromium-based browser and navigate to:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
2. Enable **Developer mode** (toggle switch in the top right or bottom left).
3. Click the **"Load unpacked"** button.
4. Select this directory:
   ```
   spatialkit/extension
   ```
5. You're all set! Pin the **SpatialKit 3D** icon to your toolbar.

---

## 🧪 Testing on Webpages

- **E-Commerce & Showcases**: Browse sites with 3D product previews (e.g. Shopify 3D stores, Apple AR previews, Sketchfab, Khronos glTF sample galleries).
- **Direct GLB Links**: Click on or right-click any direct link to a `.glb` or `.gltf` asset.
- **Local Dev Server**: Make sure your SpatialKit inspector is running (`npm run dev:example`) so that local preview tabs open seamlessly at `http://localhost:5173`.
