/**
 * SpatialKit — Asset Loader
 * Handles loading of GLTF/GLB 3D models and other assets.
 */

import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export interface LoadOptions {
  draco?: boolean;
  onProgress?: (progress: number) => void;
}

let gltfLoader: GLTFLoader | null = null;

function getLoader(draco: boolean): GLTFLoader {
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader();
    if (draco) {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(
        'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
      );
      gltfLoader.setDRACOLoader(dracoLoader);
    }
  }
  return gltfLoader;
}

/**
 * Load a GLTF or GLB model from a URL.
 * Returns the GLTF object with .scene containing the Three.js group.
 */
export function loadGLTF(
  url: string,
  options: LoadOptions = {}
): Promise<GLTF> {
  const { draco = false, onProgress } = options;
  const loader = getLoader(draco);

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf),
      (event) => {
        if (event.total > 0 && onProgress) {
          onProgress(event.loaded / event.total);
        }
      },
      (error) => reject(error)
    );
  });
}

/**
 * Center and normalize a 3D model to fit within a 1-unit bounding box.
 * Critical for displaying unknown models at a consistent scale in AR.
 */
export function normalizeModel(
  model: THREE.Object3D,
  targetSize: number = 1
): void {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = targetSize / maxDim;

  model.scale.setScalar(scale);
  model.position.sub(center.multiplyScalar(scale));
}

/**
 * Apply shadows recursively to all meshes in a model.
 */
export function applyModelShadows(model: THREE.Object3D): void {
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}
