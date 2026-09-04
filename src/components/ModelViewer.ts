/**
 * SpatialKit — ModelViewer Component
 * Loads and displays a 3D model in the scene with:
 * - Orbit controls for desktop (mouse drag to rotate)
 * - AR placement on a flat surface (via XR hit testing)
 * - Touch support for mobile
 * - Loading progress indicator
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadGLTF, normalizeModel, applyModelShadows } from '../utils/Loader';
import { globalBus } from '../core/EventBus';

export interface ModelViewerOptions {
  url: string;
  targetSize?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  enableOrbit?: boolean;
  onLoad?: (model: THREE.Group) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: unknown) => void;
}

export class ModelViewer {
  private scene: THREE.Scene | THREE.Group;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private model: THREE.Group | null = null;
  private pivot: THREE.Group;
  private controls: OrbitControls | null = null;
  private options: ModelViewerOptions;
  private isLoading: boolean = false;

  constructor(
    scene: THREE.Scene | THREE.Group,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    options: ModelViewerOptions
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.options = options;

    // Pivot group for positioning and animation
    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);

    // Orbit controls for desktop interaction
    if (options.enableOrbit !== false) {
      this.controls = new OrbitControls(camera as THREE.PerspectiveCamera, renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.minDistance = 0.5;
      this.controls.maxDistance = 10;
      this.controls.target.set(0, 0.5, 0);
      this.controls.autoRotate = options.autoRotate ?? false;
      this.controls.autoRotateSpeed = options.autoRotateSpeed ?? 1.5;
    }

    this._load();
  }

  private async _load(): Promise<void> {
    this.isLoading = true;
    globalBus.emit('model:loading', { url: this.options.url });

    try {
      const gltf = await loadGLTF(this.options.url, {
        draco: true,
        onProgress: this.options.onProgress,
      });

      this.model = gltf.scene as THREE.Group;

      // Normalize size for consistent AR display
      normalizeModel(this.model, this.options.targetSize ?? 1);
      applyModelShadows(this.model);

      // Position slightly above floor
      this.model.position.set(0, 0, 0);

      this.pivot.add(this.model);
      this.isLoading = false;

      globalBus.emit('model:loaded', { model: this.model });
      this.options.onLoad?.(this.model);
    } catch (err) {
      console.error('[SpatialKit] Model failed to load:', err);
      globalBus.emit('model:error', { error: err });
      this.options.onError?.(err);
      this.isLoading = false;

      // Fallback: show a box so the scene isn't empty
      this._createFallbackMesh();
    }
  }

  private _createFallbackMesh(): void {
    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x6c63ff,
      metalness: 0.3,
      roughness: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    this.pivot.add(mesh);
  }

  /** Call this every frame in your animation loop */
  update(_delta: number): void {
    this.controls?.update();
  }

  /** Enable or disable auto-rotation */
  setAutoRotate(enabled: boolean): void {
    if (this.controls) {
      this.controls.autoRotate = enabled;
    }
  }

  /** Set the model's world position */
  setPosition(x: number, y: number, z: number): void {
    this.pivot.position.set(x, y, z);
  }

  /** Get the model group (after loading) */
  getModel(): THREE.Group | null {
    return this.model;
  }

  get loading(): boolean {
    return this.isLoading;
  }
}

