/**
 * SpatialKit — SpatialPanel Component
 * A floating 3D UI panel that billboards toward the camera.
 * This is the core HUD primitive for smart glasses interfaces.
 *
 * Renders text/labels as canvas textures mapped to a flat plane in 3D space.
 */

import * as THREE from 'three';
import { billboardToCamera } from '../utils/Math';

export interface SpatialPanelOptions {
  width?: number;
  height?: number;
  text?: string;
  title?: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderRadius?: number;
  fontSize?: number;
  titleFontSize?: number;
  opacity?: number;
  billboard?: boolean;
}

export class SpatialPanel {
  mesh: THREE.Mesh;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private options: Required<SpatialPanelOptions>;
  private _billboard: boolean;

  constructor(options: SpatialPanelOptions = {}) {
    this.options = {
      width: options.width ?? 2,
      height: options.height ?? 1,
      text: options.text ?? '',
      title: options.title ?? '',
      backgroundColor: options.backgroundColor ?? 'rgba(10, 10, 30, 0.85)',
      textColor: options.textColor ?? '#ffffff',
      borderColor: options.borderColor ?? '#6c63ff',
      borderRadius: options.borderRadius ?? 24,
      fontSize: options.fontSize ?? 28,
      titleFontSize: options.titleFontSize ?? 36,
      opacity: options.opacity ?? 1,
      billboard: options.billboard ?? true,
    };

    this._billboard = this.options.billboard;

    // Canvas for rendering 2D text/graphics
    const canvasW = 512;
    const canvasH = 256;
    this.canvas = document.createElement('canvas');
    this.canvas.width = canvasW;
    this.canvas.height = canvasH;
    this.ctx = this.canvas.getContext('2d')!;

    this._renderCanvas();

    // Three.js texture + mesh
    this.texture = new THREE.CanvasTexture(this.canvas);
    const geo = new THREE.PlaneGeometry(this.options.width, this.options.height);
    const mat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: this.options.opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.name = 'SpatialPanel';
  }

  private _renderCanvas(): void {
    const { ctx, canvas, options } = this;
    const { width: w, height: h } = canvas;
    const r = options.borderRadius;

    ctx.clearRect(0, 0, w, h);

    // Background with rounded corners
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fillStyle = options.backgroundColor;
    ctx.fill();

    // Border stroke
    ctx.strokeStyle = options.borderColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Gradient accent bar at top
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, options.borderColor);
    grad.addColorStop(1, '#ff6584');
    ctx.fillStyle = grad;
    ctx.fillRect(r, 0, w - r * 2, 4);

    // Title text
    if (options.title) {
      ctx.fillStyle = options.textColor;
      ctx.font = `bold ${options.titleFontSize}px Inter, system-ui, sans-serif`;
      ctx.fillText(options.title, 24, 56);
    }

    // Body text (wrap at max width)
    if (options.text) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = `${options.fontSize}px Inter, system-ui, sans-serif`;
      this._wrapText(options.text, 24, options.title ? 96 : 56, w - 48, options.fontSize + 8);
    }
  }

  private _wrapText(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = this.ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        this.ctx.fillText(line, x, currentY);
        line = word + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    this.ctx.fillText(line, x, currentY);
  }

  /** Update panel text content */
  setText(text: string): void {
    this.options.text = text;
    this._renderCanvas();
    this.texture.needsUpdate = true;
  }

  /** Update panel title */
  setTitle(title: string): void {
    this.options.title = title;
    this._renderCanvas();
    this.texture.needsUpdate = true;
  }

  /** Set position in 3D space */
  setPosition(x: number, y: number, z: number): void {
    this.mesh.position.set(x, y, z);
  }

  /** Call in animation loop to maintain billboard effect */
  update(camera: THREE.Camera): void {
    if (this._billboard) {
      billboardToCamera(this.mesh, camera);
    }
  }

  /** Show or hide the panel */
  setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }
}
