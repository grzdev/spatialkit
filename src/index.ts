/**
 * SpatialKit — Public API
 * The main entry point for the framework. Export everything a consumer needs.
 */

// Core
export { SceneManager } from './core/SceneManager';
export type { SceneManagerOptions } from './core/SceneManager';

export { XRSessionManager } from './core/XRSession';
export type { XRSessionOptions, XRMode } from './core/XRSession';

export { EventBus, globalBus } from './core/EventBus';

// Components
export { ModelViewer } from './components/ModelViewer';
export type { ModelViewerOptions } from './components/ModelViewer';

export { SpatialPanel } from './components/SpatialPanel';
export type { SpatialPanelOptions } from './components/SpatialPanel';

export { GazeTarget } from './components/GazeTarget';
export type { GazeTargetOptions } from './components/GazeTarget';

// Webcam support lives in spatialkit/gestures (optional MediaPipe dependency).

// Utils
export { loadGLTF, normalizeModel, applyModelShadows } from './utils/Loader';
export {
  degToRad,
  radToDeg,
  lerp,
  clamp,
  positionInFrontOfCamera,
  billboardToCamera,
  smoothFollow,
  readableScale,
} from './utils/Math';

/** SpatialKit version */
export const VERSION = '0.1.0';

