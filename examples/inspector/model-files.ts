import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LoadingManager, Mesh, Texture, type AnimationClip, type Object3D, type Material } from 'three';
import { createModelInstance, modelFit } from '../../src/react/model';

export const MAX_MODEL_BYTES = 50 * 1024 * 1024;
export const MODEL_FIT = 3.5;
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
export const DEMO_MODEL: ModelAsset = { id: 'pump', name: 'PX–04 Pump', filename: 'pump.glb', format: 'Demo assembly · GLB', hasAnimations: true };

/** Read and validate the container before GLTFLoader can fetch any referenced resources. */
export function validateModelFile(filename: string, bytes: ArrayBuffer): Record<string, any> {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext !== 'glb' && ext !== 'gltf') throw new Error('Choose a .glb or self-contained .gltf model. Export other formats as GLB first.');
  if (!bytes.byteLength || bytes.byteLength > MAX_MODEL_BYTES) throw new Error('Choose a non-empty model smaller than 50 MB.');
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

export async function prepareModel(file: File): Promise<ModelAsset> {
  if (file.size > MAX_MODEL_BYTES) throw new Error('Choose a model smaller than 50 MB.');
  const bytes = await file.arrayBuffer();
  validateModelFile(file.name, bytes);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const id = `model-${Array.from(new Uint8Array(digest)).map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  const manager = new LoadingManager();
  manager.setURLModifier((url) => {
    if (!url.startsWith('data:') && !url.startsWith('blob:')) throw new Error('External model resources are not supported. Export an embedded GLB.');
    return url;
  });
  const gltf = await new GLTFLoader(manager).parseAsync(bytes, '');
  try {
    modelFit(gltf.scene, MODEL_FIT);
    // Reject duplicate explicit IDs before replacing the current working model.
    const instance = createModelInstance(gltf.scene, id);
    const count = instance.records.length;
    instance.dispose();
    if (!count) throw new Error('This model does not contain selectable meshes.');
  } catch (error) { disposeAsset(gltf.scene); throw error; }
  return {
    id, name: file.name.replace(/\.(glb|gltf)$/i, ''), filename: file.name,
    format: `Your model · ${(file.size / 1024 / 1024).toFixed(1)} MB`,
    object: gltf.scene, animations: gltf.animations, hasAnimations: gltf.animations.length > 0, file, dispose: () => disposeAsset(gltf.scene),
  };
}
