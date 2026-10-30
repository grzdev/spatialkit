<div align="center">

<img src="./demo/readme%20videos/spatialkit-3d-hero.svg" alt="SpatialKit 3D Playground & Interactive Rig Banner" width="100%" />

<br />

# ✦ SpatialKit

**The interactive 3D playground, model inspector, and tactile control kit for React Three Fiber.**

[![Live Playground](https://img.shields.io/badge/▶_Live_Playground-spatialkit.netlify.app-58ddba?style=for-the-badge&labelColor=070b14)](https://spatialkit.netlify.app/)
[![Controls Lab](https://img.shields.io/badge/🎛️_Controls_Lab-8_Tactile_Rigs-38bdf8?style=for-the-badge&labelColor=070b14)](https://spatialkit.netlify.app/#controls)
[![License: MIT](https://img.shields.io/badge/License-MIT-f8fafc?style=for-the-badge&labelColor=070b14)](./LICENSE)

<p align="center">
  <b>Drop in any <code>.glb</code> / <code>.gltf</code> model · Pin 3D hotspots · Fly guided camera tours · Drive animations with skeuomorphic levers, dials &amp; joysticks.</b>
</p>

</div>

---

## 🎮 Welcome to the Playground

**SpatialKit** started from a real headache: building custom tactile controls (levers, dials, scrubbers, and camera rigs) from scratch just to drive 3D models and scroll-driven animations on the web.

So we turned it into both a **developer toolkit** and an **interactive 3D sandbox** you can play around with right in your browser. Every rig below runs live at **[spatialkit.netlify.app](https://spatialkit.netlify.app/)** — upload your own `.glb` model in any tab and test it out!

---

### 🔍 1. 3D Inspector — *Pin Hotspots & Fly Guided Camera Tours*

Drop in any `.glb` or self-contained `.gltf` model (100% client-side — your file never leaves your browser), click any mesh part to inspect its hierarchy, and pin **surface hotspots** directly onto exact 3D coordinates. Once you have a couple of stops pinned, hit **Start Guided Feature Tour** to fly the camera smoothly from point to point, or export a ready-to-run `ModelViewer.tsx` component in one click.

<div align="center">
  <a href="./demo/readme%20videos/inspector.mp4">
    <img src="./demo/readme%20videos/inspector.gif" alt="3D Inspector — Surface Hotspots & Guided Camera Tour" width="92%" />
  </a>
  <br />
  <sub>🎬 <a href="./demo/readme%20videos/inspector.mp4">Watch full-res clip (<code>inspector.mp4</code>)</a> · Drop in your own GLB, pin notes, and switch backdrop colors on the fly.</sub>
</div>

---

### 🔦 2. Spotlight Rig — *360° Darkroom Inspection*

Need a dramatic product reveal or just want to inspect surface normal details in the dark? The **Spotlight Rig** drops your model into a pitch-black darkroom equipped with a tactile **360° Beam Orbit Dial** and a mechanical **Beam Intensity Lever** so you can sweep focused lighting around your mesh in real time.

<div align="center">
  <a href="./demo/readme%20videos/spotlight.mp4">
    <img src="./demo/readme%20videos/spotlight.gif" alt="Spotlight Rig — 360° Orbit Dial & Beam Intensity Lever" width="92%" />
  </a>
  <br />
  <sub>🎬 <a href="./demo/readme%20videos/spotlight.mp4">Watch full-res clip (<code>spotlight.mp4</code>)</a> · Spin the rotary dial to orbit the beam 360° and pull the lever to crank brightness.</sub>
</div>

---

### 🎯 3. Flight Gimbal Tracker — *The 5-Second Target Lock Challenge*

Our personal favorite. The **Flight Gimbal Tracker** puts you inside a fighter-jet HUD overlay with a live target-lock seeker reticle. Grab the **2-Axis Tactile Joystick** and try to keep the roaming 3D target locked inside your crosshairs.

> 🏆 **Challenge:** If you can hold a continuous target lock for more than **5 seconds**, screen-record it and drop proof!

<div align="center">
  <a href="./demo/readme%20videos/gimbal.mp4">
    <img src="./demo/readme%20videos/gimbal.gif" alt="Flight Gimbal Tracker — Fighter-Jet HUD & 2-Axis Joystick" width="92%" />
  </a>
  <br />
  <sub>🎬 <a href="./demo/readme%20videos/gimbal.mp4">Watch full-res clip (<code>gimbal.mp4</code>)</a> · Steer the turret with the 2-axis joystick or upload your own model as the flying target.</sub>
</div>

---

### 🏗️ 4. Hydraulic Lift Platform & Mechanical Scrubber — *Tactile Levers for 3D Web*

Whether you are elevating a product off the 3D floor grid or scrubbing forward and backward through a complex glTF skeletal animation / procedural exploded view, our **Vertical Pull-Lever** and **Horizontal Mechanical Scrubber** give users physical, spring-loaded feedback.

<div align="center">
  <a href="./demo/readme%20videos/lift.mp4">
    <img src="./demo/readme%20videos/lift.gif" alt="Hydraulic Lift Platform — Vertical Pull-Lever Rig" width="92%" />
  </a>
  <br />
  <sub>🎬 <a href="./demo/readme%20videos/lift.mp4">Watch full-res clip (<code>lift.mp4</code>)</a> · Pull the hydraulic lever to hoist any 3D model with live metric elevation readouts.</sub>
</div>

---

### 📸 5. Studio Lighting & Backdrop — *High-DPI Product Snapshots*

Switch between curated studio lighting presets (`Showroom`, `Studio`, `Blueprint`, `Warm Clay`), dial in any custom hex backdrop color, toggle the 3D floor grid, and hit **Take Studio Snapshot** to capture, preview, and download a crisp PNG render for your docs, pitch decks, or landing pages.

<div align="center">
  <a href="./demo/readme%20videos/studio.mp4">
    <img src="./demo/readme%20videos/studio.gif" alt="Studio Lighting & Backdrop — Custom Hex Colors & Instant PNG Snapshot" width="92%" />
  </a>
  <br />
  <sub>🎬 <a href="./demo/readme%20videos/studio.mp4">Watch full-res clip (<code>studio.mp4</code>)</a> · Customize your backdrop, snap a studio render, and download it immediately.</sub>
</div>

---

### 🪚 6. Section Slicer — *Real-Time Cross-Section Clipping Planes*

Slice straight through your 3D model along the **X, Y, or Z axis** using an interactive clipping-plane slider to expose internal assemblies, hidden valves, and inner geometry without leaving the browser.

<div align="center">
  <a href="./demo/readme%20videos/slicer.mp4">
    <img src="./demo/readme%20videos/slicer.gif" alt="Section Slicer — Real-Time X/Y/Z Cross-Section Clipping Plane" width="92%" />
  </a>
  <br />
  <sub>🎬 <a href="./demo/readme%20videos/slicer.mp4">Watch full-res clip (<code>slicer.mp4</code>)</a> · Cut through any uploaded model along X, Y, or Z to inspect internal geometry.</sub>
</div>

---

## 🎛️ The Controls Lab — *8 Copy-Pasteable Skeuomorphic Rigs*

<div align="center">
  <img src="./demo/readme%20videos/controls-lab-3d.svg" alt="SpatialKit Controls Lab — Tactile 3D UI Rigs" width="100%" />
</div>

Switch to the **[Controls Lab](https://spatialkit.netlify.app/#controls)** in the top navigation bar to explore **8 standalone interactive controls**—each with a 2D/3D mode toggle and copyable React code:

1. **Timeline Scrubber Lever** — Bidirectional mechanical lever for glTF animations & exploded views.
2. **Hydraulic Lift Pull-Lever** — Vertical spring/position lever with metric elevation readouts.
3. **Surgical Robotic Gripper** — Precision dual-jaw clamping lever.
4. **Medical Dosing Plunger** — Calibrated syringe barrel & plunger control.
5. **Pressure Valve Crank Dial** — Multi-stop rotary dial with graduation ticks.
6. **Turbine Throttle** — Heavy-duty industrial thrust quadrant.
7. **Flight Gimbal Joystick** — 2-axis unit-circle joystick with optional spring return.
8. **Overhead Inspection Light** — Real-time specular spotlight rig over Blender’s Suzanne mesh.

---

## ⚡ Quick Start (Human or LLM-Friendly)

### Run the Playground Locally

```bash
git clone https://github.com/grzdev/spatialkit.git
cd spatialkit
npm install
npm run dev
```

Open **`http://127.0.0.1:5173`** in your browser.

### 🤖 One-Prompt Install for Your AI Coding Assistant (Cursor / Claude / Antigravity)

Want your LLM to wire SpatialKit into your existing React app automatically? Copy and paste this prompt into your AI editor:

```text
Install SpatialKit from https://github.com/grzdev/spatialkit into my React project (React 18 + @react-three/fiber + @react-three/drei + three) and set up a 3D <SpatialProvider> scene with <SelectableModel>, surface <Annotation> hotspots, and <BlenderControls>.
```

*(Or click **Integration guide** in the top bar of the [live app](https://spatialkit.netlify.app/) after pinning hotspots on your model to download a complete, pre-configured `ModelViewer.tsx` file!)*

---

## 🧩 React Integration & API Reference

The tested peer versions are React `18.3`, React Three Fiber `8.18`, Drei `9.122`, and Three.js `0.167`.

```bash
# In this repository
npm run build
npm pack

# In your React application (replace the path with the generated tarball)
npm install /path/to/spatialkit-0.1.0.tgz
npm install three@0.167 react@18 react-dom@18 @react-three/fiber@8 @react-three/drei@9
```

```tsx
import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  SpatialProvider,
  SelectableModel,
  Annotation,
  BlenderControls,
  type SpatialPart,
} from 'spatialkit/react';

export function Inspector() {
  const [selectedPart, setSelectedPart] = useState<SpatialPart | null>(null);

  return (
    <>
      <div style={{ height: 500 }}>
        <Canvas camera={{ position: [5, 4, 5] }}>
          <ambientLight intensity={1.5} />
          <directionalLight position={[4, 7, 5]} intensity={3} />
          <Suspense fallback={null}>
            <SpatialProvider onSelectionChange={setSelectedPart}>
              <SelectableModel src="/pump.glb" modelId="pump" />
              <Annotation
                target="pressure-valve"
                label="Inspect this seal"
              />
            </SpatialProvider>
          </Suspense>
          <BlenderControls target={[0, 1, 0]} />
        </Canvas>
      </div>
      <p>{selectedPart?.name ?? 'Select a part'}</p>
    </>
  );
}
```

### `SpatialProvider`

Place inside your existing `<Canvas>`. Each provider owns an isolated part registry and selection state; no global event bus is used by the React entry point. `onSelectionChange(part)` fires on selection changes, including `null` when selection is cleared or the selected model unmounts.

```ts
interface SpatialPart {
  id: string;       // e.g. "pump/pressure-valve"
  modelId: string;  // "pump"
  name: string;     // mesh name from glTF
  metadata: Record<string, unknown>; // node extras
}
```

### `SelectableModel` & `SelectableObject`

| Prop | Behavior |
| --- | --- |
| `src` | Required GLB/GLTF URL. Suspends while loading; loader failures reach the enclosing error boundary. |
| `modelId` | Defaults to `src`. Use a stable, unique id when saving notes or mounting multiple instances of a model. |
| `position`, `rotation` | Optional `[x, y, z]`; rotations are radians. |
| `scale` | Optional number or `[x, y, z]`. Asset units are preserved. |
| `highlightColor` | Hover/selection color; defaults to `#58ddba`. |
| `fit` | Optional positive size for the longest dimension. Centres X/Z and places the model's bottom at `Y=0`. |
| `explode` | Optional `0`–`1` factor to procedurally explode all meshes outward from the model centroid. |
| `clippingPlanes` | Optional array of `THREE.Plane` instances for cross-section rendering. |
| `animationProgress` | Optional `0`–`1` position in a glTF animation. Updates in either direction as this value changes. |
| `animation` | Optional clip name or index; defaults to the first clip. |
| `onSurfaceClick` | Receives the selected part and a persistent mesh-local point for exact surface hotspots. |
| `configureLoader` | Optional stable `(loader: GLTFLoader) => void` to configure decoders/plugins. |

`SelectableObject` provides the same interaction behavior for an already parsed `THREE.Object3D` (used for local browser uploads).

### `Annotation`

| Prop | Behavior |
| --- | --- |
| `target` | Required scoped part id, unique mesh name, or explicit part key. |
| `modelId` | Optional qualifier when names occur in more than one model. |
| `label` | Text content. |
| `children` | Custom React content, taking precedence over `label`. |
| `offset` | World-space `[x, y, z]` offset from the mesh bounding-box centre; defaults to `[0, 0.3, 0]`. |
| `point` | Optional mesh-local `[x, y, z]` point captured by `onSurfaceClick` for exact surface hotspots. |
| `selectedOnly` | Show only while the target is selected; defaults to `false`. |
| `pin` | Render a visual 3D pin at the anchor position; defaults to `true` for surface hotspots. |
| `pinColor` | Pin and anchor dot color hex; defaults to `#58ddba`. |
| `line` | Draw a leader line connecting the 3D surface anchor to the floating label. |
| `lineColor` | Leader line color hex; defaults to `pinColor`. |

### `Measurement` (3D Calipers)

Render 3D point-to-point dimension caliper lines with a floating midpoint HTML badge:

```tsx
<Measurement
  start={[-0.5, 1.2, 0]}
  end={[0.5, 1.2, 0]}
  unit="cm"
  color="#f6ad55"
/>
```

### Interaction Timelines & Gesture Controls

`TimelineScrubber`, `DialControl`, and `JoystickControl` are controlled, accessible interaction primitives for mouse, touch, and keyboard users:

```tsx
const [pressure, setPressure] = useState(35);
const [direction, setDirection] = useState({ x: 0, y: 0 });

<DialControl
  min={0}
  max={100}
  step={1}
  value={pressure}
  onChange={setPressure}
  label="Pressure valve"
/>

<JoystickControl
  value={direction}
  onChange={setDirection}
  springToCenter
  label="Robot direction"
/>
```

### `useSpatial()`

Call inside `SpatialProvider` to programmatically select or inspect parts from custom toolbars:

```tsx
const { parts, selectedPart, select, clearSelection } = useSpatial();
select('pump/pressure-valve');
clearSelection();
```

---

## 📦 Package Entry Points

| Import | Purpose |
| --- | --- |
| `spatialkit/react` | React components (`SpatialProvider`, `SelectableModel`, `Annotation`, `Measurement`, `BlenderControls`, `TimelineScrubber`, `DialControl`, `JoystickControl`) and `useSpatial` hook. |
| `spatialkit` | Vanilla Three.js scene/model/panel and WebXR helpers. |
| `spatialkit/gestures` | Optional webcam gesture adapter (`@mediapipe/tasks-vision`). |

---

## 🛠️ Develop & Verify

```bash
npm run typecheck
npm test
npm run build:example
npm run test:package
```

---

<div align="center">
  <p>If you found <b>SpatialKit</b> fun to play around with or useful for your 3D web projects, drop a ⭐ on the repo!</p>
  <p><sub>MIT Licensed · Built with React Three Fiber &amp; Three.js</sub></p>
</div>
