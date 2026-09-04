/**
 * SpatialKit — XRSession
 * Manages WebXR session lifecycle: start, end, and frame updates.
 * Handles the "Enter AR" button and fallback for non-XR browsers.
 */

import * as THREE from 'three';
import { globalBus } from './EventBus';

export type XRMode = 'immersive-ar' | 'immersive-vr' | 'inline';

export interface XRSessionOptions {
  mode?: XRMode;
  onStart?: () => void;
  onEnd?: () => void;
}

export class XRSessionManager {
  private renderer: THREE.WebGLRenderer;
  private mode: XRMode;
  private isActive: boolean = false;
  private referenceSpace: XRReferenceSpace | null = null;

  constructor(renderer: THREE.WebGLRenderer, options: XRSessionOptions = {}) {
    this.renderer = renderer;
    this.mode = options.mode ?? 'immersive-ar';

    if (options.onStart) globalBus.on('xr:start', options.onStart);
    if (options.onEnd) globalBus.on('xr:end', options.onEnd);
  }

  /** Check if WebXR AR is supported in this browser/device */
  async isSupported(): Promise<boolean> {
    if (!navigator.xr) return false;
    try {
      return await navigator.xr.isSessionSupported(this.mode);
    } catch {
      return false;
    }
  }

  /** Start an XR session */
  async startSession(): Promise<void> {
    if (!navigator.xr) {
      console.warn('[SpatialKit] WebXR not available in this browser.');
      return;
    }

    try {
      const session = await navigator.xr.requestSession(this.mode, {
        requiredFeatures: ['local'],
        optionalFeatures: ['dom-overlay', 'hand-tracking'],
        domOverlay: { root: document.body },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.renderer.xr.setSession(session as any);
      this.isActive = true;

      session.addEventListener('end', () => {
        this.isActive = false;
        this.referenceSpace = null;
        globalBus.emit('xr:end', {});
      });

      globalBus.emit('xr:start', { mode: this.mode });
    } catch (err) {
      console.error('[SpatialKit] Failed to start XR session:', err);
      globalBus.emit('xr:error', { error: err });
    }
  }

  /** Create an AR entry button and append to a container */
  createEnterARButton(
    container: HTMLElement,
    onUnsupported?: () => void
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = 'sk-enter-ar-btn';
    btn.textContent = 'Enter AR';
    btn.setAttribute('aria-label', 'Enter augmented reality mode');

    this.isSupported().then((supported) => {
      if (supported) {
        btn.addEventListener('click', () => this.startSession());
      } else {
        btn.textContent = 'AR Not Supported';
        btn.disabled = true;
        btn.style.opacity = '0.5';
        onUnsupported?.();
      }
    });

    container.appendChild(btn);
    return btn;
  }

  get active(): boolean {
    return this.isActive;
  }

  get currentReferenceSpace(): XRReferenceSpace | null {
    return this.referenceSpace;
  }
}

