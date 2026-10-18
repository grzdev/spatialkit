import { Box3, Mesh, Vector3, type Material, type Object3D } from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

export interface SpatialPart {
  /** Stable, model-scoped identifier. Save this value as an annotation target. */
  id: string;
  modelId: string;
  name: string;
  /** JSON metadata from the glTF node's extras. */
  metadata: Record<string, unknown>;
}

export interface PartRecord { part: SpatialPart; object: Mesh }

/** Centre an asset on X/Z and rest its lowest point on Y=0, preserving proportions. */
export function modelFit(object: Object3D, size: number) {
  if (!Number.isFinite(size) || size <= 0) throw new Error('[SpatialKit] fit must be a positive finite number.');
  object.updateWorldMatrix(true, true);
  const box = new Box3().setFromObject(object);
  const dimensions = box.getSize(new Vector3());
  const largest = Math.max(dimensions.x, dimensions.y, dimensions.z);
  if (box.isEmpty() || !Number.isFinite(largest) || largest <= 0) throw new Error('This model has no visible mesh bounds.');
  const center = box.getCenter(new Vector3());
  const scale = size / largest;
  return { scale, position: [-center.x * scale, -box.min.y * scale, -center.z * scale] as [number, number, number] };
}

/** Clone transforms and materials; retain shared, loader-owned geometries/textures. */
export function createModelInstance(source: Object3D, modelId: string) {
  const root = clone(source);
  const records: PartRecord[] = [];
  const materials: Material[] = [];
  const names = new Map<string, number>();
  root.traverse((node) => {
    if (node instanceof Mesh && node.name) names.set(node.name, (names.get(node.name) ?? 0) + 1);
  });
  const ids = new Set<string>();
  const visit = (node: Object3D, path: string) => {
    if (node instanceof Mesh) {
      const explicit = node.userData.spatialId;
      const key = typeof explicit === 'string' && explicit.length > 0
        ? explicit
        : node.name && names.get(node.name) === 1 ? node.name : `node:${path}`;
      const id = `${modelId}/${key}`;
      if (ids.has(id)) throw new Error(`[SpatialKit] Duplicate part id "${id}". Set unique node extras.spatialId values.`);
      ids.add(id);
      const copy = (material: Material) => {
        const cloned = material.clone();
        materials.push(cloned);
        return cloned;
      };
      node.material = Array.isArray(node.material) ? node.material.map(copy) : copy(node.material);
      // Preserve baseline position for procedural exploded views
      if (!node.userData._skOriginalPosition) {
        node.userData._skOriginalPosition = node.position.clone();
      }
      records.push({ object: node, part: { id, modelId, name: node.name || key, metadata: { ...node.userData } } });
    }
    node.children.forEach((child, index) => visit(child, `${path}.${index}`));
  };
  visit(root, '0');
  return { root, records, dispose: () => materials.forEach((material) => material.dispose()) };
}

/** Exact scoped ids win; short names must resolve to exactly one mesh. */
export function resolvePart(records: readonly PartRecord[], target: string, modelId?: string): PartRecord | undefined {
  const scoped = modelId ? records.filter((record) => record.part.modelId === modelId) : records;
  const exact = scoped.find((record) => record.part.id === target);
  if (exact) return exact;
  const matches = scoped.filter((record) => record.part.name === target || record.part.id === `${record.part.modelId}/${target}`);
  return matches.length === 1 ? matches[0] : undefined;
}

const bounds = new Box3();
/** Compute an attachment point after all ancestor transforms, including model scaling. */
export function partCenter(object: Object3D, out = new Vector3()): Vector3 {
  object.updateWorldMatrix(true, true);
  return bounds.setFromObject(object).getCenter(out);
}
