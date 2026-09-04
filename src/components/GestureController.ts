/**
 * SpatialKit — GestureController Component
 *
 * Real-time hand gesture recognition via MediaPipe Hand Landmarker.
 * Tracks 21 landmarks per hand at ~60fps using the webcam feed.
 *
 * Gestures:
 *  - Single hand pinch + vertical move   → zoom (pinch-zoom event)
 *  - Single hand pinch + horizontal move → rotate (pinch-rotate event)
 *  - Two hands both pinched + spread/close → scale (two-hand-scale event)
 *
 * All results are emitted on the globalBus as 'gesture:event'.
 */

import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { globalBus } from '../core/EventBus';

// Normalized pinch distance threshold (0-1 coordinate space)
const PINCH_THRESHOLD = 0.08;

// Hand landmark indices (MediaPipe convention)
const THUMB_TIP  = 4;
const INDEX_TIP  = 8;

export type GestureType = 'pinch-zoom' | 'pinch-rotate' | 'two-hand-scale';

export interface GestureEventData {
  type: GestureType;
  delta: number;   // signed delta for zoom/rotate
  scale?: number;  // multiplier for two-hand-scale
}

export interface GestureControllerOptions {
  video: HTMLVideoElement;
  overlayCanvas: HTMLCanvasElement;
  onReady?: () => void;
  onHandsDetected?: (count: number) => void;
}

export class GestureController {
  private landmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement;
  private overlay: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rafId = 0;
  private lastVideoTime = -1;
  private isReady = false;

  // Per-hand state (index 0 = first hand, 1 = second)
  private pinching   = [false, false];
  private pinchPos   = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  private lastTwoHandDist = 0;

  constructor(opts: GestureControllerOptions) {
    this.video   = opts.video;
    this.overlay = opts.overlayCanvas;
    this.ctx     = opts.overlayCanvas.getContext('2d')!;
    this._init(opts);
  }

  private async _init(opts: GestureControllerOptions): Promise<void> {
    try {
      globalBus.emit('gesture:loading', {});

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });

      this.isReady = true;
      globalBus.emit('gesture:ready', {});
      opts.onReady?.();
      this._loop(opts.onHandsDetected);
    } catch (err) {
      console.error('[SpatialKit GestureController] Init failed:', err);
      globalBus.emit('gesture:error', { error: err });
    }
  }

  private _loop(onHandsDetected?: (count: number) => void): void {
    const tick = () => {
      if (this.isReady && this.landmarker && this.video.readyState >= 2) {
        // Sync overlay canvas size to video dimensions
        if (this.overlay.width  !== this.video.videoWidth)
          this.overlay.width  = this.video.videoWidth  || 640;
        if (this.overlay.height !== this.video.videoHeight)
          this.overlay.height = this.video.videoHeight || 480;

        if (this.video.currentTime !== this.lastVideoTime) {
          this.lastVideoTime = this.video.currentTime;
          const result = this.landmarker.detectForVideo(this.video, performance.now());
          this._processResult(result);
          onHandsDetected?.(result.landmarks.length);
        }
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private _processResult(result: HandLandmarkerResult): void {
    const { landmarks } = result;
    const w = this.overlay.width;
    const h = this.overlay.height;

    this.ctx.clearRect(0, 0, w, h);

    if (landmarks.length === 0) {
      if (this.pinching[0] || this.pinching[1]) {
        this.pinching      = [false, false];
        this.lastTwoHandDist = 0;
        globalBus.emit('gesture:pinch-end', {});
      }
      return;
    }

    // Draw skeleton for all detected hands
    for (const hand of landmarks) this._drawSkeleton(hand, w, h);

    // Compute per-hand pinch state
    const pinchPoints: Array<{ x: number; y: number; active: boolean }> = [];

    for (let i = 0; i < Math.min(landmarks.length, 2); i++) {
      const hand     = landmarks[i];
      const thumb    = hand[THUMB_TIP];
      const index    = hand[INDEX_TIP];

      const dx   = thumb.x - index.x;
      const dy   = thumb.y - index.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const isPinching = dist < PINCH_THRESHOLD;

      // Midpoint of pinch
      const mx = (thumb.x + index.x) / 2;
      const my = (thumb.y + index.y) / 2;
      pinchPoints.push({ x: mx, y: my, active: isPinching });

      // Draw pinch indicator ring
      this._drawPinchRing(mx * w, my * h, isPinching, dist);

      // ── Single-hand gesture ──────────────────────────────
      if (isPinching && this.pinching[i]) {
        const ddx = mx - this.pinchPos[i].x;
        const ddy = my - this.pinchPos[i].y;

        if (Math.abs(ddy) > Math.abs(ddx)) {
          // Vertical movement → zoom
          globalBus.emit<GestureEventData>('gesture:event', {
            type: 'pinch-zoom',
            delta: -ddy * 10,
          });
        } else {
          // Horizontal movement → rotate
          globalBus.emit<GestureEventData>('gesture:event', {
            type: 'pinch-rotate',
            delta: -ddx * 10,
          });
        }
      }

      if (isPinching && !this.pinching[i]) globalBus.emit('gesture:pinch-start', { hand: i });
      if (!isPinching && this.pinching[i]) globalBus.emit('gesture:pinch-end', { hand: i });

      this.pinching[i]   = isPinching;
      this.pinchPos[i]   = { x: mx, y: my };
    }

    // ── Two-hand scale gesture ───────────────────────────
    if (pinchPoints.length === 2 && pinchPoints[0].active && pinchPoints[1].active) {
      const adx  = pinchPoints[0].x - pinchPoints[1].x;
      const ady  = pinchPoints[0].y - pinchPoints[1].y;
      const dist = Math.sqrt(adx * adx + ady * ady);

      if (this.lastTwoHandDist > 0) {
        const scaleDelta = (dist - this.lastTwoHandDist) * 6;
        globalBus.emit<GestureEventData>('gesture:event', {
          type: 'two-hand-scale',
          delta: scaleDelta,
          scale: 1 + scaleDelta,
        });
      }
      this.lastTwoHandDist = dist;

      // Draw connection line between both pinch points
      this._drawTwoHandLine(
        pinchPoints[0].x * w, pinchPoints[0].y * h,
        pinchPoints[1].x * w, pinchPoints[1].y * h
      );
    } else {
      this.lastTwoHandDist = 0;
    }
  }

  // ── Visual helpers ─────────────────────────────────────────────────────────

  private _drawSkeleton(
    hand: Array<{ x: number; y: number; z: number }>,
    w: number, h: number
  ): void {
    const connections = [
      [0,1],[1,2],[2,3],[3,4],
      [0,5],[5,6],[6,7],[7,8],
      [0,9],[9,10],[10,11],[11,12],
      [0,13],[13,14],[14,15],[15,16],
      [0,17],[17,18],[18,19],[19,20],
      [5,9],[9,13],[13,17],
    ];

    this.ctx.strokeStyle = 'rgba(108,99,255,0.55)';
    this.ctx.lineWidth   = 1.5;
    this.ctx.lineCap     = 'round';

    for (const [a, b] of connections) {
      this.ctx.beginPath();
      this.ctx.moveTo(hand[a].x * w, hand[a].y * h);
      this.ctx.lineTo(hand[b].x * w, hand[b].y * h);
      this.ctx.stroke();
    }

    for (const lm of hand) {
      this.ctx.beginPath();
      this.ctx.arc(lm.x * w, lm.y * h, 3.5, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255,101,132,0.85)';
      this.ctx.fill();
    }
  }

  private _drawPinchRing(px: number, py: number, active: boolean, dist: number): void {
    const radius = active ? 18 : Math.max(6, (PINCH_THRESHOLD - dist) * 120 + 6);
    this.ctx.beginPath();
    this.ctx.arc(px, py, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = active ? '#6c63ff' : 'rgba(108,99,255,0.35)';
    this.ctx.lineWidth   = active ? 2.5 : 1.5;
    this.ctx.stroke();

    if (active) {
      this.ctx.fillStyle = 'rgba(108,99,255,0.18)';
      this.ctx.fill();
    }
  }

  private _drawTwoHandLine(x1: number, y1: number, x2: number, y2: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.strokeStyle = 'rgba(255,101,132,0.5)';
    this.ctx.lineWidth   = 2;
    this.ctx.setLineDash([6, 4]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.landmarker?.close();
    this.isReady = false;
  }
}
