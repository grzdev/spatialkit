/**
 * SpatialKit — GazeTarget Component
 * Enables gaze-based interaction for objects in AR space.
 * Uses raycasting from camera center (simulating eye gaze on smart glasses).
 */

import * as THREE from 'three';
import { globalBus } from '../core/EventBus';

export interface GazeTargetOptions {
  objects: THREE.Object3D[];
  dwellTime?: number; // ms to hold gaze before triggering
  onGazeEnter?: (object: THREE.Object3D) => void;
  onGazeExit?: (object: THREE.Object3D) => void;
  onGazeSelect?: (object: THREE.Object3D) => void;
  highlightColor?: THREE.Color;
}

export class GazeTarget {
  private raycaster: THREE.Raycaster;
  private objects: THREE.Object3D[];
  private currentTarget: THREE.Object3D | null = null;
  private dwellTime: number;
  private dwellTimer: ReturnType<typeof setTimeout> | null = null;
  private options: GazeTargetOptions;

  constructor(options: GazeTargetOptions) {
    this.options = options;
    this.objects = options.objects;
    this.dwellTime = options.dwellTime ?? 2000;
    this.raycaster = new THREE.Raycaster();
    // Center of screen (where eyes look on smart glasses)
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), new THREE.PerspectiveCamera());
  }

  /** Call each frame, passing the camera to cast ray from its center */
  update(camera: THREE.PerspectiveCamera): void {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = this.raycaster.intersectObjects(this.objects, true);

    if (intersects.length > 0) {
      const hit = intersects[0].object.parent ?? intersects[0].object;

      if (hit !== this.currentTarget) {
        // Gaze exited previous target
        if (this.currentTarget) {
          this._clearDwell();
          this.options.onGazeExit?.(this.currentTarget);
          globalBus.emit('gaze:exit', { object: this.currentTarget });
        }

        // Gaze entered new target
        this.currentTarget = hit;
        this.options.onGazeEnter?.(hit);
        globalBus.emit('gaze:enter', { object: hit });

        // Start dwell timer
        this.dwellTimer = setTimeout(() => {
          if (this.currentTarget) {
            this.options.onGazeSelect?.(this.currentTarget);
            globalBus.emit('gaze:select', { object: this.currentTarget });
          }
        }, this.dwellTime);
      }
    } else if (this.currentTarget) {
      this._clearDwell();
      this.options.onGazeExit?.(this.currentTarget);
      globalBus.emit('gaze:exit', { object: this.currentTarget });
      this.currentTarget = null;
    }
  }

  private _clearDwell(): void {
    if (this.dwellTimer) {
      clearTimeout(this.dwellTimer);
      this.dwellTimer = null;
    }
  }

  /** Add objects to the gaze target list */
  addObjects(objects: THREE.Object3D[]): void {
    this.objects.push(...objects);
  }

  /** Remove an object from gaze targets */
  removeObject(object: THREE.Object3D): void {
    this.objects = this.objects.filter((o) => o !== object);
  }
}
