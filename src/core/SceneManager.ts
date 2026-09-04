/**
 * SpatialKit — SceneManager
 * Manages the Three.js scene, camera, renderer, and animation loop.
 * Acts as the foundation for all spatial content.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { globalBus } from './EventBus';

export interface SceneManagerOptions {
  container?: HTMLElement;
  background?: THREE.Color | string | null;
  fog?: boolean;
  antialias?: boolean;
  alpha?: boolean;
}

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock;

  private animationId: number = 0;
  private updateCallbacks: Array<(delta: number) => void> = [];

  constructor(options: SceneManagerOptions = {}) {
    const {
      container = document.body,
      background = null,
      antialias = true,
      alpha = true,
    } = options;

    // Scene
    this.scene = new THREE.Scene();
    if (background !== null) {
      this.scene.background = new THREE.Color(background);
    }

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      70,
      container.clientWidth / container.clientHeight,
      0.01,
      100
    );
    this.camera.position.set(0, 1.6, 3);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias, alpha });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.xr.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    // Clock
    this.clock = new THREE.Clock();

    // Default lighting
    this._setupLighting();

    // Resize handler
    window.addEventListener('resize', () => this._onResize(container));

    globalBus.emit('scene:ready', { scene: this.scene });
  }

  private _setupLighting(): void {
    // Ambient light for base illumination
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    // Key directional light with shadows
    const directional = new THREE.DirectionalLight(0xffffff, 1.2);
    directional.position.set(5, 10, 5);
    directional.castShadow = true;
    directional.shadow.mapSize.set(2048, 2048);
    directional.shadow.camera.near = 0.1;
    directional.shadow.camera.far = 50;
    this.scene.add(directional);

    // Subtle fill light from opposite side
    const fill = new THREE.DirectionalLight(0x8eaaff, 0.4);
    fill.position.set(-5, 3, -5);
    this.scene.add(fill);

    // Environment map for reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(
      new RoomEnvironment()
    ).texture;
    this.scene.environment = envTexture;
    pmremGenerator.dispose();
  }

  private _onResize(container: HTMLElement): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /** Register a callback to be called every animation frame */
  onUpdate(callback: (delta: number) => void): void {
    this.updateCallbacks.push(callback);
  }

  /** Start the render/animation loop */
  start(): void {
    this.renderer.setAnimationLoop(() => {
      const delta = this.clock.getDelta();
      this.updateCallbacks.forEach((cb) => cb(delta));
      this.renderer.render(this.scene, this.camera);
    });
  }

  /** Stop the render loop */
  stop(): void {
    this.renderer.setAnimationLoop(null);
    cancelAnimationFrame(this.animationId);
  }

  /** Add an object to the scene */
  add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /** Remove an object from the scene */
  remove(object: THREE.Object3D): void {
    this.scene.remove(object);
  }
}
