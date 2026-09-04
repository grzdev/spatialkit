<div align="center">

# 🥽 SpatialKit

**A lightweight WebXR spatial UI framework for smart glasses and AR experiences.**

Build gesture-controlled, 3D-augmented interfaces that overlay onto the real world —  
in any browser, with zero proprietary hardware required.

[![npm version](https://img.shields.io/npm/v/spatialkit?color=6c63ff&label=npm)](https://www.npmjs.com/package/spatialkit)
[![license](https://img.shields.io/github/license/grzdev/spatialkit?color=ff6584)](./LICENSE)
[![three.js](https://img.shields.io/badge/three.js-≥0.150-black)](https://threejs.org/)
[![WebXR](https://img.shields.io/badge/WebXR-ready-00c896)](https://immersiveweb.dev/)

</div>

---

## What is SpatialKit?

SpatialKit is an open-source JavaScript/TypeScript library that gives web developers a simple, composable API to build **spatial AR applications** — experiences where 3D objects appear to float in the user's real environment.

It was built with one use-case in mind: **smart glasses**. The kind where you look through transparent lenses and see your world overlaid with interactive 3D content. SpatialKit handles the hard parts:

- 🌐 **WebXR sessions** — enter/exit immersive AR with one line
- 📦 **3D model loading** — drop in any `.glb`/`.gltf` file
- 🖥️ **Webcam passthrough** — simulate AR on any desktop or laptop
- 🤌 **Hand gesture control** — real-time pinch-to-zoom, rotate, and two-hand scale via MediaPipe
- 🪟 **Spatial panels** — floating HUD elements that always face the user
- 👁️ **Gaze targeting** — raycast interaction from camera center (the smart glasses interaction model)

---

## Installation

```bash
npm install spatialkit three
```

> **Optional** — add MediaPipe for hand gesture support:
> ```bash
> npm install @mediapipe/tasks-vision
> ```

---

## Quick Start

Get a gesture-controlled 3D model floating in AR in under 15 lines:

```ts
import { SceneManager, ModelViewer } from 'spatialkit';

// 1. Initialize the scene
const scene = new SceneManager({
  container: document.getElementById('app')!,
  alpha: true,   // transparent background for AR overlay
});

// 2. Load a 3D model
const viewer = new ModelViewer(scene.scene, scene.camera, scene.renderer, {
  url: './my-model.glb',
  autoRotate: true,
  onLoad: () => console.log('Model ready!'),
});

// 3. Start the render loop
scene.onUpdate((delta) => viewer.update(delta));
scene.start();
```

---

## Webcam Passthrough (Desktop AR Preview)

Simulate smart-glasses passthrough on any laptop — your webcam feed becomes the background, and 3D objects float in your real room:

```ts
import { SceneManager } from 'spatialkit';
import * as THREE from 'three';

const scene = new SceneManager({ container: document.getElementById('app')!, alpha: true });

// Request webcam and use it as the scene background
const stream = await navigator.mediaDevices.getUserMedia({ video: true });
const video = Object.assign(document.createElement('video'), {
  srcObject: stream, autoplay: true, muted: true, playsInline: true,
});
await new Promise(r => video.onloadedmetadata = r);
video.play();

const videoTex = new THREE.VideoTexture(video);
scene.scene.background = videoTex;  // ← real room now visible behind your 3D model
```

---

## Hand Gesture Control

Add real-time hand tracking powered by MediaPipe — no API key, runs entirely in-browser:

```ts
import { GestureController } from 'spatialkit';
import { globalBus } from 'spatialkit';

const gestures = new GestureController({
  video: webcamVideoElement,
  overlayCanvas: document.getElementById('gesture-canvas') as HTMLCanvasElement,
  onReady: () => console.log('✋ Hand tracking active'),
});

// Listen for gesture events
globalBus.on('gesture:event', (data) => {
  if (data.type === 'pinch-zoom')   camera.position.z -= data.delta * 0.3;
  if (data.type === 'pinch-rotate') model.rotation.y   += data.delta * 0.05;
  if (data.type === 'two-hand-scale') model.scale.setScalar(currentScale + data.delta);
});
```

### Supported gestures

| Gesture | Action emitted |
|---|---|
| 🤌 Pinch + move up/down | `pinch-zoom` |
| 🤌 Pinch + move left/right | `pinch-rotate` |
| 🤌🤌 Both hands pinch + spread | `two-hand-scale` |

---

## Floating Spatial Panels

Create HUD panels that always face the camera — the core UI primitive for smart glasses:

```ts
import { SpatialPanel } from 'spatialkit';

const panel = new SpatialPanel({
  title: '🔬 Object Info',
  text: 'This panel floats in 3D space and always faces you.',
  width: 2.5,
  height: 1.0,
  backgroundColor: 'rgba(10, 10, 30, 0.85)',
  borderColor: '#6c63ff',
});

panel.setPosition(0, 1.5, -1.5);
scene.add(panel.mesh);

// In your animation loop:
panel.update(camera);  // ← keeps it facing the user
```

---

## WebXR — True AR on Supported Devices

On AR-capable devices (Android Chrome, Meta Quest Browser, Magic Leap), enter a true WebXR immersive session where the device hardware handles passthrough:

```ts
import { XRSessionManager } from 'spatialkit';

const xr = new XRSessionManager(renderer, {
  onStart: () => console.log('AR session started'),
  onEnd:   () => console.log('AR session ended'),
});

// Check if this device supports AR
const supported = await xr.isSupported();

// Auto-create an "Enter AR" button
xr.createEnterARButton(document.getElementById('controls')!);
```

---

## API Reference

### `SceneManager`

Core Three.js scene, camera, renderer, and animation loop.

| Option | Type | Default | Description |
|---|---|---|---|
| `container` | `HTMLElement` | `document.body` | Mount target for the canvas |
| `background` | `THREE.Color \| null` | `null` | Scene background color (null = transparent) |
| `antialias` | `boolean` | `true` | Enable antialiasing |
| `alpha` | `boolean` | `true` | Transparent canvas (required for AR overlay) |

| Method | Description |
|---|---|
| `start()` | Begin the render loop |
| `stop()` | Stop the render loop |
| `onUpdate(cb)` | Register frame callback `(delta: number) => void` |
| `add(object)` | Add a Three.js object to the scene |
| `remove(object)` | Remove an object |

---

### `ModelViewer`

Loads and displays a GLTF/GLB 3D model with orbit controls.

| Option | Type | Description |
|---|---|---|
| `url` | `string` | URL to a `.glb` or `.gltf` model |
| `targetSize` | `number` | Normalize model to this size (default: `1`) |
| `autoRotate` | `boolean` | Continuously rotate the model |
| `autoRotateSpeed` | `number` | Rotation speed (default: `1.5`) |
| `enableOrbit` | `boolean` | Mouse/touch orbit controls |
| `onLoad` | `(model) => void` | Called when model finishes loading |
| `onProgress` | `(0-1) => void` | Loading progress callback |
| `onError` | `(err) => void` | Called on load failure |

---

### `SpatialPanel`

Floating 3D panel rendered as a canvas texture.

| Option | Type | Description |
|---|---|---|
| `title` | `string` | Bold header text |
| `text` | `string` | Body text (auto word-wraps) |
| `width` / `height` | `number` | Panel dimensions in 3D units |
| `backgroundColor` | `string` | CSS color string |
| `borderColor` | `string` | Accent border color |
| `billboard` | `boolean` | Auto-face the camera (default: `true`) |

---

### `GestureController`

Real-time hand tracking via MediaPipe. Requires `@mediapipe/tasks-vision`.

| Option | Type | Description |
|---|---|---|
| `video` | `HTMLVideoElement` | The webcam video element |
| `overlayCanvas` | `HTMLCanvasElement` | Canvas for skeleton rendering |
| `onReady` | `() => void` | Fires when model is loaded |
| `onHandsDetected` | `(count: number) => void` | Fires every frame with hand count |

---

### `GazeTarget`

Raycasting from camera center — models the eye-gaze interaction pattern of smart glasses.

```ts
import { GazeTarget } from 'spatialkit';

const gaze = new GazeTarget({
  objects: [myMesh],
  dwellTime: 1500, // ms to hold gaze before selecting
  onGazeEnter: (obj) => highlightObject(obj),
  onGazeSelect: (obj) => activateObject(obj),
});

// In animation loop:
gaze.update(camera);
```

---

## Running the Demo Locally

```bash
git clone https://github.com/grzdev/spatialkit.git
cd spatialkit
npm install
npm run demo
```

Open **https://localhost:5173/** — grant camera access to see your real room as the AR background.

---

## Building for Production

```bash
npm run build
```

Outputs to `dist/`:
- `spatialkit.es.js` — ES module (Vite, Webpack, etc.)
- `spatialkit.cjs.js` — CommonJS (Node.js, older bundlers)
- `index.d.ts` — TypeScript declarations

---

## Project Structure

```
spatialkit/
├── src/                  # Library source (published to npm)
│   ├── core/
│   │   ├── SceneManager.ts    # Three.js scene + render loop
│   │   ├── XRSession.ts       # WebXR session management
│   │   └── EventBus.ts        # Internal pub/sub event system
│   ├── components/
│   │   ├── ModelViewer.ts     # GLTF/GLB model loader + controls
│   │   ├── SpatialPanel.ts    # Floating HUD panel
│   │   ├── GestureController.ts # MediaPipe hand tracking
│   │   └── GazeTarget.ts      # Gaze/raycast interaction
│   ├── utils/
│   │   ├── Loader.ts          # GLTF loader + normalizer
│   │   └── Math.ts            # Spatial math helpers
│   └── index.ts               # Public API entry point
├── demo/                 # Showcase app (not published)
│   ├── index.html
│   ├── main.ts
│   └── vite.config.ts
├── dist/                 # Build output
└── README.md
```

---

## Roadmap

- [ ] AR Navigation HUD module (floating compass, waypoints, distance rings)
- [ ] Spatial Radial Menu component
- [ ] Hit-test surface detection (place objects on real floors/tables)
- [ ] Voice command integration
- [ ] React wrapper (`@spatialkit/react`)
- [ ] CDN build (no bundler required)

---

## Contributing

Contributions are very welcome! SpatialKit was built to give the AR/WebXR community a free, open toolkit.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-component`
3. Make your changes in `src/`
4. Add an example in `demo/`
5. Open a pull request

Please open an issue first for large changes so we can discuss the approach.

---

## License

[MIT](./LICENSE) — free to use in personal and commercial projects.

---

<div align="center">

Built with ❤️ for the spatial computing community

[npm](https://www.npmjs.com/package/spatialkit) · [GitHub](https://github.com/grzdev/spatialkit) · [Demo](https://your-demo-url.com)

</div>

