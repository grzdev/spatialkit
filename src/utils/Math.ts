/**
 * SpatialKit — Spatial Math Utilities
 * Helper functions for 3D/AR spatial calculations.
 */

import * as THREE from 'three';

/** Convert degrees to radians */
export const degToRad = (deg: number): number => (deg * Math.PI) / 180;

/** Convert radians to degrees */
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

/** Lerp between two numbers */
export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

/** Clamp a value between min and max */
export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Calculate the position in front of a camera at a given distance.
 * Used for placing spatial objects in front of the user's view.
 */
export function positionInFrontOfCamera(
  camera: THREE.Camera,
  distance: number = 1.5,
  verticalOffset: number = 0
): THREE.Vector3 {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const pos = camera.position.clone();
  pos.addScaledVector(dir, distance);
  pos.y += verticalOffset;
  return pos;
}

/**
 * Make an object always face the camera (billboard effect).
 * Call this in the animation loop for HUD-style elements.
 */
export function billboardToCamera(
  object: THREE.Object3D,
  camera: THREE.Camera
): void {
  object.quaternion.copy(camera.quaternion);
}

/**
 * Smoothly move an object toward a target position.
 */
export function smoothFollow(
  object: THREE.Object3D,
  target: THREE.Vector3,
  speed: number = 0.05
): void {
  object.position.lerp(target, speed);
}

/**
 * Calculate appropriate text scale for a given viewing distance
 * (important for smart glasses readability).
 */
export function readableScale(distance: number, baseFontSize: number = 0.05): number {
  return baseFontSize * (distance / 1.5);
}
