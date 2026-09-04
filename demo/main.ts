/**
 * SpatialKit — Demo v3: Webcam Passthrough + Hand Gesture Control
 *
 * - Webcam as AR background (real room visible behind the 3D model)
 * - MediaPipe hand tracking for gesture interaction
 *   · Pinch + move up/down   → zoom
 *   · Pinch + move left/right → rotate
 *   · Both hands pinch + spread/close → scale
 */

import * as THREE from 'three';
import { SceneManager }       from '../src/core/SceneManager';
import { XRSessionManager }   from '../src/core/XRSession';
import { ModelViewer }        from '../src/components/ModelViewer';
import { SpatialPanel }       from '../src/components/SpatialPanel';
import { GestureController }  from '../src/components/GestureController';
import type { GestureEventData } from '../src/components/GestureController';
import { globalBus }          from '../src/core/EventBus';
import { positionInFrontOfCamera } from '../src/utils/Math';

// ─── DOM refs ────────────────────────────────────────────────────────────────
const container    = document.getElementById('sk-canvas-container') as HTMLElement;
const loader       = document.getElementById('sk-loader') as HTMLElement;
const loaderLabel  = document.getElementById('sk-loader-label') as HTMLElement;
const progressBar  = document.getElementById('sk-progress-bar') as HTMLElement;
const statusDot    = document.getElementById('sk-status-dot') as HTMLElement;
const statusText   = document.getElementById('sk-status-text') as HTMLElement;
const modelName    = document.getElementById('sk-model-name') as HTMLElement;
const modelDesc    = document.getElementById('sk-model-desc') as HTMLElement;
const hintText     = document.getElementById('sk-hint-text') as HTMLElement;
const btnRotate    = document.getElementById('btn-rotate') as HTMLButtonElement;
const btnPanel     = document.getElementById('btn-panel') as HTMLButtonElement;
const btnWireframe = document.getElementById('btn-wireframe') as HTMLButtonElement;
const btnReset     = document.getElementById('btn-reset') as HTMLButtonElement;
const bottomEl     = document.getElementById('sk-bottom') as HTMLElement;
const camBanner    = document.getElementById('sk-cam-banner') as HTMLElement;
const gestureOverlay = document.getElementById('sk-gesture-overlay') as HTMLCanvasElement;
const gestureStatus  = document.getElementById('sk-gesture-status') as HTMLElement;
const gestureLabel   = document.getElementById('sk-gesture-label') as HTMLElement;

// ─── Shared video element (webcam stream) ────────────────────────────────────
let webcamVideo: HTMLVideoElement | null = null;
let webcamActive = false;
let gestureController: GestureController | null = null;

// ─── Model transform state ───────────────────────────────────────────────────
let modelScale    = 1.5;
let modelRotY     = 0;
const MIN_SCALE   = 0.3;
const MAX_SCALE   = 5.0;

// ─── SceneManager ────────────────────────────────────────────────────────────
const sceneManager = new SceneManager({
  container,
  background: null,
  antialias: true,
  alpha: true,
});

sceneManager.scene.background = new THREE.Color(0x07071a);

// ─── Floor grid ──────────────────────────────────────────────────────────────
const gridHelper = new THREE.GridHelper(10, 20, 0x6c63ff, 0x1a1a3a);
gridHelper.position.y = -0.8;
(gridHelper.material as THREE.Material).opacity = 0.4;
(gridHelper.material as THREE.Material).transparent = true;
sceneManager.scene.add(gridHelper);

// ─── Pivot group for gesture-controlled transforms ───────────────────────────
const pivot = new THREE.Group();
sceneManager.scene.add(pivot);

// ─── Webcam Passthrough ──────────────────────────────────────────────────────
async function startWebcamPassthrough(): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });

    webcamVideo = document.createElement('video');
    webcamVideo.srcObject = stream;
    webcamVideo.autoplay  = true;
    webcamVideo.playsInline = true;
    webcamVideo.muted     = true;
    webcamVideo.style.display = 'none';
    document.body.appendChild(webcamVideo);

    await new Promise<void>((res) => { webcamVideo!.onloadedmetadata = () => res(); });
    webcamVideo.play();

    const videoTex = new THREE.VideoTexture(webcamVideo);
    videoTex.colorSpace  = THREE.SRGBColorSpace;
    videoTex.minFilter   = THREE.LinearFilter;
    videoTex.magFilter   = THREE.LinearFilter;

    sceneManager.scene.background = videoTex;
    gridHelper.visible = false;
    webcamActive = true;

    camBanner.classList.add('hidden');
    hintText.textContent = '🤌 Pinch to zoom/rotate · 🤌🤌 Both hands to scale';
    setStatus('ready', 'Passthrough AR active');

    // Start gesture recognition
    initGestures();

  } catch (err) {
    console.warn('[SpatialKit] Camera denied:', err);
    camBanner.querySelector('p')!.textContent =
      'Camera access denied. Enable it in your browser settings.';
    camBanner.classList.add('denied');
  }
}

// ─── Gesture Controller ───────────────────────────────────────────────────────
function initGestures(): void {
  if (!webcamVideo) return;

  setStatus('loading', 'Loading hand tracking...');
  gestureStatus.classList.remove('hidden');
  gestureLabel.textContent = 'Loading hand tracking...';

  gestureController = new GestureController({
    video: webcamVideo,
    overlayCanvas: gestureOverlay,
    onReady: () => {
      setStatus('ready', 'Hand tracking ready ✋');
      gestureLabel.textContent = 'Show your hands to start';
      setTimeout(() => gestureStatus.classList.add('fade'), 3000);
    },
    onHandsDetected: (count) => {
      gestureStatus.classList.remove('fade');
      if (count === 0) {
        gestureLabel.textContent = 'No hands detected';
        gestureStatus.classList.add('fade');
      } else if (count === 1) {
        gestureLabel.textContent = '✋ 1 hand — Pinch to interact';
        gestureStatus.classList.remove('fade');
      } else {
        gestureLabel.textContent = '🤌🤌 Both hands — Spread/close to scale';
        gestureStatus.classList.remove('fade');
      }
    },
  });
}

// ─── Gesture event handler ────────────────────────────────────────────────────
let lastGestureType = '';
let gestureTimeout: ReturnType<typeof setTimeout> | null = null;

globalBus.on<GestureEventData>('gesture:event', (data) => {
  const model = modelViewer.getModel();
  if (!model) return;

  switch (data.type) {
    case 'pinch-zoom': {
      // Adjust camera Z distance for zoom feel
      const newZ = sceneManager.camera.position.z - data.delta * 0.3;
      sceneManager.camera.position.z = Math.max(0.5, Math.min(8, newZ));
      showGestureHint('🔍 Zoom');
      break;
    }
    case 'pinch-rotate': {
      modelRotY += data.delta * 0.05;
      pivot.rotation.y = modelRotY;
      showGestureHint('↩ Rotate');
      break;
    }
    case 'two-hand-scale': {
      modelScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, modelScale + data.delta * 0.5));
      pivot.scale.setScalar(modelScale / 1.5);
      showGestureHint('⇔ Scale');
      break;
    }
  }
});

function showGestureHint(text: string): void {
  if (text !== lastGestureType) {
    lastGestureType = text;
    gestureLabel.textContent = text;
    gestureStatus.classList.remove('fade', 'hidden');
  }
  if (gestureTimeout) clearTimeout(gestureTimeout);
  gestureTimeout = setTimeout(() => {
    gestureStatus.classList.add('fade');
    lastGestureType = '';
  }, 1200);
}

// ─── XR Session ──────────────────────────────────────────────────────────────
const xrManager = new XRSessionManager(sceneManager.renderer, {
  onStart: () => {
    sceneManager.scene.background = null;
    gridHelper.visible = false;
    hintText.textContent = 'Move around to explore the model in AR';
  },
  onEnd: () => {
    if (webcamActive) {
      hintText.textContent = '🤌 Pinch to zoom/rotate · 🤌🤌 Both hands to scale';
    } else {
      sceneManager.scene.background = new THREE.Color(0x07071a);
      gridHelper.visible = true;
    }
  },
});
xrManager.createEnterARButton(bottomEl);

// ─── Spatial Panel ───────────────────────────────────────────────────────────
const panel = new SpatialPanel({
  title: '🔬 Astronaut Suit',
  text: 'NASA EMU — Extravehicular Mobility Unit. Floating in YOUR space via SpatialKit.',
  width: 2.2,
  height: 1.0,
  fontSize: 24,
  titleFontSize: 32,
});
panel.setPosition(-1.6, 1.4, 0);
panel.setVisible(false);
sceneManager.scene.add(panel.mesh);

// ─── Model Viewer ─────────────────────────────────────────────────────────────
setStatus('loading', 'Loading 3D model...');

const modelViewer = new ModelViewer(
  pivot,  // parent = pivot group so gestures affect it
  sceneManager.camera,
  sceneManager.renderer,
  {
    url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
    targetSize: 1.5,
    autoRotate: true,
    autoRotateSpeed: 1.5,
    enableOrbit: true,
    onProgress: (p) => {
      progressBar.style.width = `${Math.round(p * 100)}%`;
      loaderLabel.textContent = `Loading model... ${Math.round(p * 100)}%`;
    },
    onLoad: () => {
      loaderLabel.textContent = 'Ready!';
      setTimeout(() => loader.classList.add('hidden'), 400);
      setStatus('ready', 'Model loaded — requesting camera...');
      modelName.textContent = '🧑‍🚀 Astronaut (NASA EMU)';
      modelDesc.textContent = 'Gesture-controlled AR model. Grant camera to see in your real space.';
      startWebcamPassthrough();
    },
    onError: () => {
      loaderLabel.textContent = 'Using fallback model';
      setTimeout(() => loader.classList.add('hidden'), 600);
      setStatus('error', 'Model failed — using fallback');
      modelName.textContent = '⬡ SpatialKit Cube';
      startWebcamPassthrough();
    },
  }
);

// ─── Animation loop ───────────────────────────────────────────────────────────
let time = 0;
sceneManager.onUpdate((delta) => {
  time += delta;
  modelViewer.update(delta);
  panel.update(sceneManager.camera);

  if (!webcamActive) {
    const gridMat = gridHelper.material as THREE.Material;
    gridMat.opacity = 0.3 + Math.sin(time * 0.5) * 0.1;
  }
});

sceneManager.start();

// ─── UI Controls ─────────────────────────────────────────────────────────────
let autoRotating = true;
let panelVisible = false;
let wireframe    = false;

btnRotate.addEventListener('click', () => {
  autoRotating = !autoRotating;
  modelViewer.setAutoRotate(autoRotating);
  btnRotate.classList.toggle('active', autoRotating);
  btnRotate.setAttribute('aria-pressed', String(autoRotating));
});

btnPanel.addEventListener('click', () => {
  panelVisible = !panelVisible;
  panel.setVisible(panelVisible);
  if (panelVisible) {
    const pos = positionInFrontOfCamera(sceneManager.camera, 2, 0.6);
    panel.setPosition(pos.x - 1.2, pos.y, pos.z);
  }
  btnPanel.classList.toggle('active', panelVisible);
  btnPanel.setAttribute('aria-pressed', String(panelVisible));
});

btnWireframe.addEventListener('click', () => {
  wireframe = !wireframe;
  const model = modelViewer.getModel();
  if (model) {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => { (m as THREE.MeshStandardMaterial).wireframe = wireframe; });
      }
    });
  }
  btnWireframe.classList.toggle('active', wireframe);
  btnWireframe.setAttribute('aria-pressed', String(wireframe));
});

btnReset.addEventListener('click', () => {
  sceneManager.camera.position.set(0, 1.6, 3);
  sceneManager.camera.lookAt(0, 0.5, 0);
  pivot.scale.setScalar(1);
  pivot.rotation.y = 0;
  modelScale = 1.5;
  modelRotY  = 0;
});

// ─── Event bus ───────────────────────────────────────────────────────────────
globalBus.on('model:loaded', () => statusDot.classList.remove('loading'));

function setStatus(state: 'loading' | 'ready' | 'error', text: string): void {
  statusText.textContent = text;
  statusDot.className = 'sk-dot';
  if (state === 'loading') statusDot.classList.add('loading');
  if (state === 'error')   statusDot.classList.add('error');
}

