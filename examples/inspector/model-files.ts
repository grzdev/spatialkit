import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LoadingManager, Mesh, Texture, type AnimationClip, type Object3D, type Material } from 'three';
import { createModelInstance, modelFit } from '../../src/react/model';

export const MAX_MODEL_MB = 500;
export const MAX_MODEL_BYTES = MAX_MODEL_MB * 1024 * 1024;
export const MODEL_FIT = 3.5;

export interface ModelUploadProgress {
  percent: number;
  stage: string;
}

export interface ModelAsset {
  id: string;
  name: string;
  filename: string;
  format: string;
  object?: Object3D;
  animations?: readonly AnimationClip[];
  hasAnimations?: boolean;
  file?: File;
  dispose?: () => void;
}
export const DEMO_MODEL: ModelAsset = { id: 'pump', name: 'PX–04 Pump', filename: 'pump.glb', format: 'GLB', hasAnimations: true };

/** Read and validate the container before GLTFLoader can fetch any referenced resources. */
export function validateModelFile(filename: string, bytes: ArrayBuffer): Record<string, any> {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext !== 'glb' && ext !== 'gltf') throw new Error('Choose a .glb or self-contained .gltf model. Export other formats as GLB first.');
  if (!bytes.byteLength || bytes.byteLength > MAX_MODEL_BYTES) throw new Error(`Choose a non-empty model smaller than ${MAX_MODEL_MB} MB.`);
  let json: string;
  if (ext === 'glb') {
    const view = new DataView(bytes);
    if (bytes.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.byteLength) throw new Error('This file is not a valid GLB 2.0 model. Please export it again.');
    const length = view.getUint32(12, true);
    if (view.getUint32(16, true) !== 0x4e4f534a || length > bytes.byteLength - 20) throw new Error('The GLB model has an invalid data header.');
    json = new TextDecoder().decode(new Uint8Array(bytes, 20, length));
  } else json = new TextDecoder().decode(bytes);
  let document: Record<string, any>;
  try { document = JSON.parse(json); } catch { throw new Error('The model contains invalid glTF data. Please export it again.'); }
  if (!document || document.asset?.version !== '2.0') throw new Error('Only glTF 2.0 models are supported.');
  for (const collection of ['buffers', 'images']) {
    if (document[collection] !== undefined && !Array.isArray(document[collection])) throw new Error('Invalid glTF resources. Please export as GLB.');
    for (const resource of document[collection] ?? []) {
      if (resource.uri !== undefined && (typeof resource.uri !== 'string' || !resource.uri.startsWith('data:'))) throw new Error('This model references separate files. Export as GLB with textures embedded, then try again.');
    }
  }
  const extensions = document.extensionsUsed ?? [];
  if (!Array.isArray(extensions)) throw new Error('Invalid glTF extensions.');
  if (extensions.some((name: string) => ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu'].includes(name))) throw new Error('This preview needs an uncompressed GLB. Export without Draco, Meshopt, or KTX2 compression.');
  return document;
}

export function disposeAsset(root: Object3D) {
  const geometries = new Set<Mesh['geometry']>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => { texture.dispose(); if (typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap) texture.image.close(); });
}

function readFileWithProgress(
  file: File,
  onProgress?: (progress: ModelUploadProgress) => void
): Promise<ArrayBuffer> {
  if (!onProgress || typeof FileReader === 'undefined') {
    return file.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const totalMB = (file.size / 1024 / 1024).toFixed(1);
    reader.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const ratio = Math.min(1, event.loaded / event.total);
        const loadedMB = (event.loaded / 1024 / 1024).toFixed(1);
        onProgress({
          percent: Math.max(2, Math.round(ratio * 45)),
          stage: `Reading file (${loadedMB} / ${totalMB} MB)…`,
        });
      }
    };
    reader.onerror = () => reject(new Error('Could not read the selected model file.'));
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read the selected model file.'));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

async function computeModelId(bytes: ArrayBuffer): Promise<string> {
  // For very large files (>16 MB), hash a 4 MB fingerprint + length to avoid duplicating hundreds of MB in WebCrypto
  const SAMPLE_THRESHOLD = 16 * 1024 * 1024;
  let hashInput: BufferSource = bytes;
  if (bytes.byteLength > SAMPLE_THRESHOLD) {
    const chunk = 2 * 1024 * 1024;
    const sample = new Uint8Array(chunk * 2 + 8);
    sample.set(new Uint8Array(bytes, 0, chunk), 0);
    sample.set(new Uint8Array(bytes, bytes.byteLength - chunk, chunk), chunk);
    new DataView(sample.buffer).setFloat64(chunk * 2, bytes.byteLength, true);
    hashInput = sample;
  }
  const digest = await crypto.subtle.digest('SHA-256', hashInput);
  return `model-${Array.from(new Uint8Array(digest)).map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

export async function prepareModel(
  file: File,
  onProgress?: (progress: ModelUploadProgress) => void
): Promise<ModelAsset> {
  if (file.size > MAX_MODEL_BYTES) throw new Error(`Choose a model smaller than ${MAX_MODEL_MB} MB.`);
  const totalMB = (file.size / 1024 / 1024).toFixed(1);
  onProgress?.({ percent: 2, stage: `Reading ${file.name} (${totalMB} MB)…` });

  const bytes = await readFileWithProgress(file, onProgress);

  onProgress?.({ percent: 48, stage: 'Validating GLB 2.0 container…' });
  validateModelFile(file.name, bytes);

  onProgress?.({ percent: 54, stage: 'Computing model content ID…' });
  const id = await computeModelId(bytes);

  onProgress?.({ percent: 60, stage: 'Parsing 3D meshes & decoding textures…' });
  if (onProgress && typeof window !== 'undefined') {
    await new Promise((r) => setTimeout(r, 16));
  }

  const manager = new LoadingManager();
  manager.setURLModifier((url) => {
    if (!url.startsWith('data:') && !url.startsWith('blob:')) throw new Error('External model resources are not supported. Export an embedded GLB.');
    return url;
  });
  manager.onProgress = (_url, itemsLoaded, itemsTotal) => {
    if (itemsTotal > 0) {
      const ratio = Math.min(1, itemsLoaded / itemsTotal);
      onProgress?.({
        percent: Math.round(60 + ratio * 28),
        stage: `Decoding 3D resources (${itemsLoaded}/${itemsTotal})…`,
      });
    }
  };

  const gltf = await new GLTFLoader(manager).parseAsync(bytes, '');
  try {
    onProgress?.({ percent: 92, stage: 'Fitting assembly to 3D viewport…' });
    if (onProgress && typeof window !== 'undefined') {
      await new Promise((r) => setTimeout(r, 16));
    }
    modelFit(gltf.scene, MODEL_FIT);
    // Reject duplicate explicit IDs before replacing the current working model.
    const instance = createModelInstance(gltf.scene, id);
    const count = instance.records.length;
    instance.dispose();
    if (!count) throw new Error('This model does not contain selectable meshes.');
    onProgress?.({ percent: 100, stage: 'Model ready!' });
  } catch (error) { disposeAsset(gltf.scene); throw error; }
  return {
    id, name: file.name.replace(/\.(glb|gltf)$/i, ''), filename: file.name,
    format: `Your model · ${totalMB} MB`,
    object: gltf.scene, animations: gltf.animations, hasAnimations: gltf.animations.length > 0, file, dispose: () => disposeAsset(gltf.scene),
  };
}

export async function prepareModelFromUrl(
  url: string,
  defaultName?: string,
  onProgress?: (progress: ModelUploadProgress) => void
): Promise<ModelAsset> {
  onProgress?.({ percent: 5, stage: 'Downloading 3D model…' });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load model from URL (${response.status})`);
  const blob = await response.blob();
  const cleanUrl = url.split('?')[0].split('#')[0];
  const urlFilename = cleanUrl.split('/').pop() || 'model.glb';
  const filename = defaultName || (urlFilename.endsWith('.glb') || urlFilename.endsWith('.gltf') ? urlFilename : `${urlFilename}.glb`);
  const file = new File([blob], filename, { type: blob.type || 'model/gltf-binary' });
  return prepareModel(file, onProgress);
}
