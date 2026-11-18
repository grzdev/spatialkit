import { Box3, BufferAttribute, BufferGeometry, Group, Mesh, Sphere, Texture, Vector3, type Material, type Object3D } from 'three';
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

export interface ModelInstanceOptions {
  modelName?: string;
  /** Partition single-mesh models into semantic structural sub-meshes for exploded inspection. */
  segmentSingleMesh?: boolean;
}

/**
 * Downscale oversized (>1024px) textures and precompute mesh bounds
 * so heavy GLBs render smoothly in interactive viewports.
 */
export function compressAndOptimizeModelScene(root: Object3D) {
  const seenTextures = new Set<Texture>();
  const MAX_TEX_DIM = 1024;

  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const geo = child.geometry;
    if (geo) {
      if (!geo.boundingBox) geo.computeBoundingBox();
      if (!geo.boundingSphere) geo.computeBoundingSphere();
    }

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (!mat) continue;
      for (const value of Object.values(mat)) {
        if (!(value instanceof Texture) || seenTextures.has(value)) continue;
        seenTextures.add(value);
        const img = value.image as { width?: number; height?: number; close?: () => void } | undefined;
        if (
          img &&
          typeof document !== 'undefined' &&
          typeof img.width === 'number' &&
          typeof img.height === 'number' &&
          (img.width > MAX_TEX_DIM || img.height > MAX_TEX_DIM)
        ) {
          try {
            const scale = MAX_TEX_DIM / Math.max(img.width, img.height);
            const targetW = Math.max(1, Math.round(img.width * scale));
            const targetH = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img as CanvasImageSource, 0, 0, targetW, targetH);
              if (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap) {
                img.close();
              }
              value.image = canvas;
              value.needsUpdate = true;
            }
          } catch {
            // Keep original texture if canvas draw fails
          }
        }
      }
    }
  });
}

interface CachedSubPart {
  name: string;
  geometry: BufferGeometry;
  localCenter: Vector3;
  explodeDir?: Vector3;
  isGlass?: boolean;
}

type SemanticProfile = 'blender' | 'drone' | 'headphone' | 'sneaker' | 'robot' | 'generic';

function detectSemanticProfile(modelName?: string): SemanticProfile {
  if (!modelName) return 'generic';
  const s = modelName.toLowerCase();
  if (/blender|pitcher|juicer|mixer/.test(s)) return 'blender';
  if (/drone|quad|rotor|uav/.test(s)) return 'drone';
  if (/headphone|headset|earphone/.test(s)) return 'headphone';
  if (/sneaker|shoe|boot|trainer/.test(s)) return 'sneaker';
  if (/robot|dog|quadruped|mech/.test(s)) return 'robot';
  return 'generic';
}

const STRUCTURAL_ZONES: ReadonlyArray<{ name: string; u: [number, number, number] }> = [
  { name: 'Apex_Crown_Module', u: [0.5, 0.88, 0.5] },
  { name: 'Forward_Prow_Assembly', u: [0.5, 0.58, 0.86] },
  { name: 'Aft_Stern_Assembly', u: [0.5, 0.58, 0.14] },
  { name: 'Port_Flank_Shell', u: [0.14, 0.56, 0.5] },
  { name: 'Starboard_Flank_Shell', u: [0.86, 0.56, 0.5] },
  { name: 'Central_Core_Chassis', u: [0.5, 0.52, 0.5] },
  { name: 'Front_Port_Strut', u: [0.24, 0.18, 0.78] },
  { name: 'Front_Starboard_Strut', u: [0.76, 0.18, 0.78] },
  { name: 'Rear_Port_Strut', u: [0.24, 0.18, 0.22] },
  { name: 'Rear_Starboard_Strut', u: [0.76, 0.18, 0.22] },
];

/**
 * Partition a single-mesh model into functional, semantic sub-meshes sharing
 * the original vertex/normal/UV buffers (zero seam when assembled, directional separation when split).
 */
function getOrBuildSegmentedParts(geo: BufferGeometry, profile: SemanticProfile = 'generic'): CachedSubPart[] | null {
  const cacheKey = `_skSegmentedParts_${profile}`;
  if (geo.userData?.[cacheKey]) {
    return geo.userData[cacheKey] as CachedSubPart[];
  }
  const posAttr = geo.attributes.position;
  if (!posAttr || posAttr.count < 36) return null;

  if (!geo.boundingBox) geo.computeBoundingBox();
  const bbox = geo.boundingBox;
  if (!bbox || bbox.isEmpty()) return null;

  const minX = bbox.min.x, minY = bbox.min.y, minZ = bbox.min.z;
  const spanX = Math.max(1e-5, bbox.max.x - minX);
  const spanY = Math.max(1e-5, bbox.max.y - minY);
  const spanZ = Math.max(1e-5, bbox.max.z - minZ);
  const invSpanX = 1 / spanX;
  const invSpanY = 1 / spanY;
  const invSpanZ = 1 / spanZ;

  const indexAttr = geo.index;
  const triCount = indexAttr ? Math.floor(indexAttr.count / 3) : Math.floor(posAttr.count / 3);
  if (triCount < 12) return null;

  const posArr = posAttr.array as ArrayLike<number>;
  const posStride = posAttr.itemSize || 3;
  const idxArr = indexAttr ? (indexAttr.array as ArrayLike<number>) : null;
  const oneThird = 1 / 3;

  interface ZoneSpec {
    name: string;
    isGlass?: boolean;
    dir?: [number, number, number];
  }
  let zones: ZoneSpec[] = [];
  const triZones = new Uint8Array(triCount);

  if (profile === 'blender') {
    let collarSumX = 0, collarSumZ = 0, collarCount = 0;
    for (let t = 0; t < triCount; t++) {
      const t3 = t * 3;
      const i0 = idxArr ? idxArr[t3] : t3;
      const i1 = idxArr ? idxArr[t3 + 1] : t3 + 1;
      const i2 = idxArr ? idxArr[t3 + 2] : t3 + 2;
      const cy = (posArr[i0 * posStride + 1] + posArr[i1 * posStride + 1] + posArr[i2 * posStride + 1]) * oneThird;
      const ny = (cy - minY) * invSpanY;
      if (ny >= 0.29 && ny <= 0.38) {
        const cx = (posArr[i0 * posStride] + posArr[i1 * posStride] + posArr[i2 * posStride]) * oneThird;
        const cz = (posArr[i0 * posStride + 2] + posArr[i1 * posStride + 2] + posArr[i2 * posStride + 2]) * oneThird;
        collarSumX += (cx - minX) * invSpanX;
        collarSumZ += (cz - minZ) * invSpanZ;
        collarCount++;
      }
    }
    const axisX = collarCount > 0 ? collarSumX / collarCount : 0.44;
    const axisZ = collarCount > 0 ? collarSumZ / collarCount : 0.5;

    let collarRadiusSum = 0;
    let baseAvgR = 0, baseCount = 0;
    for (let t = 0; t < triCount; t++) {
      const t3 = t * 3;
      const i0 = idxArr ? idxArr[t3] : t3;
      const i1 = idxArr ? idxArr[t3 + 1] : t3 + 1;
      const i2 = idxArr ? idxArr[t3 + 2] : t3 + 2;
      const cy = (posArr[i0 * posStride + 1] + posArr[i1 * posStride + 1] + posArr[i2 * posStride + 1]) * oneThird;
      const ny = (cy - minY) * invSpanY;
      const nx = ((posArr[i0 * posStride] + posArr[i1 * posStride] + posArr[i2 * posStride]) * oneThird - minX) * invSpanX;
      const nz = ((posArr[i0 * posStride + 2] + posArr[i1 * posStride + 2] + posArr[i2 * posStride + 2]) * oneThird - minZ) * invSpanZ;
      const r = Math.hypot(nx - axisX, nz - axisZ);
      if (ny >= 0.30 && ny <= 0.37) {
        collarRadiusSum += r;
      } else if (ny < 0.26) {
        baseAvgR += r;
        baseCount++;
      }
    }
    const collarR = collarCount > 0 ? collarRadiusSum / collarCount : 0.26;
    const jugWallCutoff = collarR * 1.32;
    const dialCutoff = baseCount > 0 ? (baseAvgR / baseCount) * 1.15 : 0.34;

    let handleX = 0, handleZ = 0, handleN = 0;
    let dialX = 0, dialZ = 0, dialN = 0;

    for (let t = 0; t < triCount; t++) {
      const t3 = t * 3;
      const i0 = idxArr ? idxArr[t3] : t3;
      const i1 = idxArr ? idxArr[t3 + 1] : t3 + 1;
      const i2 = idxArr ? idxArr[t3 + 2] : t3 + 2;
      const nx = ((posArr[i0 * posStride] + posArr[i1 * posStride] + posArr[i2 * posStride]) * oneThird - minX) * invSpanX;
      const ny = ((posArr[i0 * posStride + 1] + posArr[i1 * posStride + 1] + posArr[i2 * posStride + 1]) * oneThird - minY) * invSpanY;
      const nz = ((posArr[i0 * posStride + 2] + posArr[i1 * posStride + 2] + posArr[i2 * posStride + 2]) * oneThird - minZ) * invSpanZ;
      const dx = nx - axisX;
      const dz = nz - axisZ;
      const r = Math.hypot(dx, dz);

      if (ny >= 0.855) {
        triZones[t] = 0;
      } else if (ny >= 0.36) {
        if (r > jugWallCutoff) {
          triZones[t] = 2;
          handleX += dx;
          handleZ += dz;
          handleN++;
        } else {
          triZones[t] = 1;
        }
      } else if (ny >= 0.295) {
        triZones[t] = 3;
      } else if (ny >= 0.06 && ny <= 0.24 && r > dialCutoff) {
        triZones[t] = 4;
        dialX += dx;
        dialZ += dz;
        dialN++;
      } else {
        triZones[t] = 5;
      }
    }

    const hLen = Math.hypot(handleX, handleZ) || 1;
    const dLen = Math.hypot(dialX, dialZ) || 1;
    zones = [
      { name: 'Top_Lid_Cover', isGlass: false, dir: [0, 1.15, 0] },
      { name: 'Glass_Pitcher_Jug', isGlass: true, dir: [0, 0.32, 0] },
      { name: 'Pitcher_Side_Handle', isGlass: false, dir: handleN ? [(handleX / hLen) * 1.05, 0.22, (handleZ / hLen) * 1.05] : [1.0, 0.22, 0] },
      { name: 'Blade_Collar_Seal', isGlass: false, dir: [0, -0.18, 0] },
      { name: 'Rotary_Speed_Dial', isGlass: false, dir: dialN ? [(dialX / dLen) * 0.95, -0.35, (dialZ / dLen) * 0.95] : [0, -0.35, 0.95] },
      { name: 'Steel_Motor_Base', isGlass: false, dir: [0, -0.85, 0] },
    ];
  } else if (profile === 'drone') {
    const quadMinY = new Float64Array(4).fill(Infinity);
    const quadMaxY = new Float64Array(4).fill(-Infinity);
    const triCorner = new Int8Array(triCount);

    for (let t = 0; t < triCount; t++) {
      const t3 = t * 3;
      const i0 = idxArr ? idxArr[t3] : t3;
      const i1 = idxArr ? idxArr[t3 + 1] : t3 + 1;
      const i2 = idxArr ? idxArr[t3 + 2] : t3 + 2;
      const nx = ((posArr[i0 * posStride] + posArr[i1 * posStride] + posArr[i2 * posStride]) * oneThird - minX) * invSpanX;
      const ny = ((posArr[i0 * posStride + 1] + posArr[i1 * posStride + 1] + posArr[i2 * posStride + 1]) * oneThird - minY) * invSpanY;
      const nz = ((posArr[i0 * posStride + 2] + posArr[i1 * posStride + 2] + posArr[i2 * posStride + 2]) * oneThird - minZ) * invSpanZ;
      const dx = nx - 0.5;
      const dz = nz - 0.5;
      const r = Math.hypot(dx, dz);

      if (r < 0.21) {
        triCorner[t] = -1;
      } else {
        const q = (dx >= 0 ? 1 : 0) + (dz >= 0 ? 2 : 0);
        triCorner[t] = q;
        if (ny < quadMinY[q]) quadMinY[q] = ny;
        if (ny > quadMaxY[q]) quadMaxY[q] = ny;
      }
    }

    for (let t = 0; t < triCount; t++) {
      const t3 = t * 3;
      const i0 = idxArr ? idxArr[t3] : t3;
      const i1 = idxArr ? idxArr[t3 + 1] : t3 + 1;
      const i2 = idxArr ? idxArr[t3 + 2] : t3 + 2;
      const ny = ((posArr[i0 * posStride + 1] + posArr[i1 * posStride + 1] + posArr[i2 * posStride + 1]) * oneThird - minY) * invSpanY;
      const q = triCorner[t];
      if (q < 0) {
        triZones[t] = ny < 0.36 ? 1 : 0;
      } else {
        const qSpan = Math.max(1e-4, quadMaxY[q] - quadMinY[q]);
        const isBlade = ny >= quadMinY[q] + qSpan * 0.56;
        triZones[t] = 2 + q * 2 + (isBlade ? 1 : 0);
      }
    }

    zones = [
      { name: 'Central_Carbon_Body', dir: [0, 0.12, 0] },
      { name: 'Gimbal_Camera_Sensor', dir: [0, -0.95, 0] },
      { name: 'Rear_Left_Motor_Arm', dir: [-0.88, -0.05, -0.88] },
      { name: 'Rear_Left_Rotor_Blade', dir: [-0.52, 1.05, -0.52] },
      { name: 'Rear_Right_Motor_Arm', dir: [0.88, -0.05, -0.88] },
      { name: 'Rear_Right_Rotor_Blade', dir: [0.52, 1.05, -0.52] },
      { name: 'Front_Left_Motor_Arm', dir: [-0.88, -0.05, 0.88] },
      { name: 'Front_Left_Rotor_Blade', dir: [-0.52, 1.05, 0.52] },
      { name: 'Front_Right_Motor_Arm', dir: [0.88, -0.05, 0.88] },
      { name: 'Front_Right_Rotor_Blade', dir: [0.52, 1.05, 0.52] },
    ];
  } else if (profile === 'headphone') {
    let cMinX = 1, cMaxX = 0, cMinZ = 1, cMaxZ = 0;
    for (let t = 0; t < triCount; t++) {
      const t3 = t * 3;
      const i0 = idxArr ? idxArr[t3] : t3;
      const i1 = idxArr ? idxArr[t3 + 1] : t3 + 1;
      const i2 = idxArr ? idxArr[t3 + 2] : t3 + 2;
      const ny = ((posArr[i0 * posStride + 1] + posArr[i1 * posStride + 1] + posArr[i2 * posStride + 1]) * oneThird - minY) * invSpanY;
      if (ny < 0.48) {
        const nx = ((posArr[i0 * posStride] + posArr[i1 * posStride] + posArr[i2 * posStride]) * oneThird - minX) * invSpanX;
        const nz = ((posArr[i0 * posStride + 2] + posArr[i1 * posStride + 2] + posArr[i2 * posStride + 2]) * oneThird - minZ) * invSpanZ;
        if (nx < cMinX) cMinX = nx;
        if (nx > cMaxX) cMaxX = nx;
        if (nz < cMinZ) cMinZ = nz;
        if (nz > cMaxZ) cMaxZ = nz;
      }
    }
    const useXAxis = (cMaxX - cMinX) * spanX >= (cMaxZ - cMinZ) * spanZ;

    let leftUSum = 0, leftN = 0, rightUSum = 0, rightN = 0;
    for (let t = 0; t < triCount; t++) {
      const t3 = t * 3;
      const i0 = idxArr ? idxArr[t3] : t3;
      const i1 = idxArr ? idxArr[t3 + 1] : t3 + 1;
      const i2 = idxArr ? idxArr[t3 + 2] : t3 + 2;
      const ny = ((posArr[i0 * posStride + 1] + posArr[i1 * posStride + 1] + posArr[i2 * posStride + 1]) * oneThird - minY) * invSpanY;
      if (ny < 0.46) {
        const coord = useXAxis
          ? ((posArr[i0 * posStride] + posArr[i1 * posStride] + posArr[i2 * posStride]) * oneThird - minX) * invSpanX
          : ((posArr[i0 * posStride + 2] + posArr[i1 * posStride + 2] + posArr[i2 * posStride + 2]) * oneThird - minZ) * invSpanZ;
        if (coord < 0.5) {
          leftUSum += coord;
          leftN++;
        } else {
          rightUSum += coord;
          rightN++;
        }
      }
    }
    const leftSplitU = leftN > 0 ? leftUSum / leftN : 0.24;
    const rightSplitU = rightN > 0 ? rightUSum / rightN : 0.76;

    for (let t = 0; t < triCount; t++) {
      const t3 = t * 3;
      const i0 = idxArr ? idxArr[t3] : t3;
      const i1 = idxArr ? idxArr[t3 + 1] : t3 + 1;
      const i2 = idxArr ? idxArr[t3 + 2] : t3 + 2;
      const ny = ((posArr[i0 * posStride + 1] + posArr[i1 * posStride + 1] + posArr[i2 * posStride + 1]) * oneThird - minY) * invSpanY;
      const u = useXAxis
        ? ((posArr[i0 * posStride] + posArr[i1 * posStride] + posArr[i2 * posStride]) * oneThird - minX) * invSpanX
        : ((posArr[i0 * posStride + 2] + posArr[i1 * posStride + 2] + posArr[i2 * posStride + 2]) * oneThird - minZ) * invSpanZ;

      if (ny >= 0.60) {
        triZones[t] = 0;
      } else if (ny >= 0.46) {
        triZones[t] = u < 0.5 ? 1 : 2;
      } else if (u < 0.5) {
        triZones[t] = u >= leftSplitU ? 3 : 4;
      } else {
        triZones[t] = u <= rightSplitU ? 5 : 6;
      }
    }

    const axisDir = (mag: number): [number, number, number] =>
      useXAxis ? [mag, -0.05, 0] : [0, -0.05, mag];
    zones = [
      { name: 'Padded_Headband_Arch', dir: [0, 0.95, 0] },
      { name: 'Left_Hinge_Holder', dir: axisDir(-0.55).map((v, idx) => (idx === 1 ? 0.52 : v)) as [number, number, number] },
      { name: 'Right_Hinge_Holder', dir: axisDir(0.55).map((v, idx) => (idx === 1 ? 0.52 : v)) as [number, number, number] },
      { name: 'Left_Foam_Ear_Cushion', dir: axisDir(0.45) },
      { name: 'Left_Driver_Housing', dir: axisDir(-0.98) },
      { name: 'Right_Foam_Ear_Cushion', dir: axisDir(-0.45) },
      { name: 'Right_Driver_Housing', dir: axisDir(0.98) },
    ];
  } else if (profile === 'sneaker') {
    const useXLong = spanX >= spanZ;
    let lowMaxY = 0, highMaxY = 0;
    for (let t = 0; t < triCount; t++) {
      const t3 = t * 3;
      const i0 = idxArr ? idxArr[t3] : t3;
      const i1 = idxArr ? idxArr[t3 + 1] : t3 + 1;
      const i2 = idxArr ? idxArr[t3 + 2] : t3 + 2;
      const ny = ((posArr[i0 * posStride + 1] + posArr[i1 * posStride + 1] + posArr[i2 * posStride + 1]) * oneThird - minY) * invSpanY;
      const u = useXLong
        ? ((posArr[i0 * posStride] + posArr[i1 * posStride] + posArr[i2 * posStride]) * oneThird - minX) * invSpanX
        : ((posArr[i0 * posStride + 2] + posArr[i1 * posStride + 2] + posArr[i2 * posStride + 2]) * oneThird - minZ) * invSpanZ;
      if (u < 0.3 && ny > lowMaxY) lowMaxY = ny;
      if (u > 0.7 && ny > highMaxY) highMaxY = ny;
    }
    const heelIsLow = lowMaxY >= highMaxY;

    for (let t = 0; t < triCount; t++) {
      const t3 = t * 3;
      const i0 = idxArr ? idxArr[t3] : t3;
      const i1 = idxArr ? idxArr[t3 + 1] : t3 + 1;
      const i2 = idxArr ? idxArr[t3 + 2] : t3 + 2;
      const ny = ((posArr[i0 * posStride + 1] + posArr[i1 * posStride + 1] + posArr[i2 * posStride + 1]) * oneThird - minY) * invSpanY;
      const u = useXLong
        ? ((posArr[i0 * posStride] + posArr[i1 * posStride] + posArr[i2 * posStride]) * oneThird - minX) * invSpanX
        : ((posArr[i0 * posStride + 2] + posArr[i1 * posStride + 2] + posArr[i2 * posStride + 2]) * oneThird - minZ) * invSpanZ;
      const uAlong = heelIsLow ? u : 1 - u;

      if (ny < 0.34) {
        triZones[t] = 0;
      } else if (ny >= 0.65 && uAlong < 0.68) {
        triZones[t] = 1;
      } else if (uAlong < 0.45) {
        triZones[t] = 2;
      } else {
        triZones[t] = 3;
      }
    }

    const fwdSign = heelIsLow ? 1 : -1;
    const axisPush = (m: number): [number, number, number] =>
      useXLong ? [m * fwdSign, 0.12, 0] : [0, 0.12, m * fwdSign];
    zones = [
      { name: 'Sculpted_Lattice_Midsole', dir: [0, -0.88, 0] },
      { name: 'Collar_&_Lacing_Tongue', dir: [0, 0.92, 0] },
      { name: 'Heel_Stabilizer_Counter', dir: axisPush(-0.85) },
      { name: 'Breathable_Toe_Upper', dir: axisPush(0.9) },
    ];
  } else if (profile === 'robot') {
    const useZForward = spanZ >= spanX;
    let lowMaxY = 0, highMaxY = 0;
    for (let t = 0; t < triCount; t++) {
      const t3 = t * 3;
      const i0 = idxArr ? idxArr[t3] : t3;
      const i1 = idxArr ? idxArr[t3 + 1] : t3 + 1;
      const i2 = idxArr ? idxArr[t3 + 2] : t3 + 2;
      const ny = ((posArr[i0 * posStride + 1] + posArr[i1 * posStride + 1] + posArr[i2 * posStride + 1]) * oneThird - minY) * invSpanY;
      const fwd = useZForward
        ? ((posArr[i0 * posStride + 2] + posArr[i1 * posStride + 2] + posArr[i2 * posStride + 2]) * oneThird - minZ) * invSpanZ
        : ((posArr[i0 * posStride] + posArr[i1 * posStride] + posArr[i2 * posStride]) * oneThird - minX) * invSpanX;
      if (fwd < 0.35 && ny > lowMaxY) lowMaxY = ny;
      if (fwd > 0.65 && ny > highMaxY) highMaxY = ny;
    }
    const headAtHigh = highMaxY >= lowMaxY;

    for (let t = 0; t < triCount; t++) {
      const t3 = t * 3;
      const i0 = idxArr ? idxArr[t3] : t3;
      const i1 = idxArr ? idxArr[t3 + 1] : t3 + 1;
      const i2 = idxArr ? idxArr[t3 + 2] : t3 + 2;
      const nx = ((posArr[i0 * posStride] + posArr[i1 * posStride] + posArr[i2 * posStride]) * oneThird - minX) * invSpanX;
      const ny = ((posArr[i0 * posStride + 1] + posArr[i1 * posStride + 1] + posArr[i2 * posStride + 1]) * oneThird - minY) * invSpanY;
      const nz = ((posArr[i0 * posStride + 2] + posArr[i1 * posStride + 2] + posArr[i2 * posStride + 2]) * oneThird - minZ) * invSpanZ;
      const rawFwd = useZForward ? nz : nx;
      const lat = useZForward ? nx : nz;
      const f = headAtHigh ? rawFwd : 1 - rawFwd;

      if (ny >= 0.67 && f >= 0.56) {
        triZones[t] = 0;
      } else if (ny >= 0.49) {
        triZones[t] = f <= 0.24 ? 2 : 1;
      } else {
        const legIdx = (f >= 0.5 ? 0 : 2) + (lat < 0.5 ? 0 : 1);
        triZones[t] = 3 + legIdx;
      }
    }

    const fwdSign = headAtHigh ? 1 : -1;
    const toWorld = (f: number, y: number, l: number): [number, number, number] =>
      useZForward ? [l, y, f * fwdSign] : [f * fwdSign, y, l];
    zones = [
      { name: 'LiDAR_Head_Turret', dir: toWorld(0.42, 0.92, 0) },
      { name: 'Main_Armor_Chassis', dir: [0, 0.22, 0] },
      { name: 'Rear_Power_Module', dir: toWorld(-0.85, 0.3, 0) },
      { name: 'Front_Left_Leg', dir: toWorld(0.55, -0.58, -0.68) },
      { name: 'Front_Right_Leg', dir: toWorld(0.55, -0.58, 0.68) },
      { name: 'Rear_Left_Leg', dir: toWorld(-0.55, -0.58, -0.68) },
      { name: 'Rear_Right_Leg', dir: toWorld(-0.55, -0.58, 0.68) },
    ];
  } else {
    const zCount = STRUCTURAL_ZONES.length;
    const zoneU = new Float64Array(zCount * 3);
    for (let z = 0; z < zCount; z++) {
      zoneU[z * 3] = STRUCTURAL_ZONES[z].u[0];
      zoneU[z * 3 + 1] = STRUCTURAL_ZONES[z].u[1];
      zoneU[z * 3 + 2] = STRUCTURAL_ZONES[z].u[2];
    }
    for (let t = 0; t < triCount; t++) {
      const t3 = t * 3;
      const i0 = idxArr ? idxArr[t3] : t3;
      const i1 = idxArr ? idxArr[t3 + 1] : t3 + 1;
      const i2 = idxArr ? idxArr[t3 + 2] : t3 + 2;
      const nx = ((posArr[i0 * posStride] + posArr[i1 * posStride] + posArr[i2 * posStride]) * oneThird - minX) * invSpanX;
      const ny = ((posArr[i0 * posStride + 1] + posArr[i1 * posStride + 1] + posArr[i2 * posStride + 1]) * oneThird - minY) * invSpanY;
      const nz = ((posArr[i0 * posStride + 2] + posArr[i1 * posStride + 2] + posArr[i2 * posStride + 2]) * oneThird - minZ) * invSpanZ;
      let bestZone = 0;
      let bestDistSq = Infinity;
      for (let z = 0; z < zCount; z++) {
        const zu = z * 3;
        const dx = nx - zoneU[zu];
        const dy = ny - zoneU[zu + 1];
        const dz = nz - zoneU[zu + 2];
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestZone = z;
        }
      }
      triZones[t] = bestZone;
    }
    zones = STRUCTURAL_ZONES.map((z) => ({ name: z.name }));
  }

  const zoneCount = zones.length;
  const triCounts = new Int32Array(zoneCount);
  const centroidSumsX = new Float64Array(zoneCount);
  const centroidSumsY = new Float64Array(zoneCount);
  const centroidSumsZ = new Float64Array(zoneCount);
  const minBoundsX = new Float64Array(zoneCount).fill(Infinity);
  const minBoundsY = new Float64Array(zoneCount).fill(Infinity);
  const minBoundsZ = new Float64Array(zoneCount).fill(Infinity);
  const maxBoundsX = new Float64Array(zoneCount).fill(-Infinity);
  const maxBoundsY = new Float64Array(zoneCount).fill(-Infinity);
  const maxBoundsZ = new Float64Array(zoneCount).fill(-Infinity);

  for (let t = 0; t < triCount; t++) {
    const z = triZones[t];
    const t3 = t * 3;
    const i0 = idxArr ? idxArr[t3] : t3;
    const i1 = idxArr ? idxArr[t3 + 1] : t3 + 1;
    const i2 = idxArr ? idxArr[t3 + 2] : t3 + 2;

    const p0 = i0 * posStride, p1 = i1 * posStride, p2 = i2 * posStride;
    const x0 = posArr[p0], y0 = posArr[p0 + 1], z0 = posArr[p0 + 2];
    const x1 = posArr[p1], y1 = posArr[p1 + 1], z1 = posArr[p1 + 2];
    const x2 = posArr[p2], y2 = posArr[p2 + 1], z2 = posArr[p2 + 2];

    triCounts[z]++;
    centroidSumsX[z] += (x0 + x1 + x2) * oneThird;
    centroidSumsY[z] += (y0 + y1 + y2) * oneThird;
    centroidSumsZ[z] += (z0 + z1 + z2) * oneThird;

    const tMinX = x0 < x1 ? (x0 < x2 ? x0 : x2) : (x1 < x2 ? x1 : x2);
    const tMinY = y0 < y1 ? (y0 < y2 ? y0 : y2) : (y1 < y2 ? y1 : y2);
    const tMinZ = z0 < z1 ? (z0 < z2 ? z0 : z2) : (z1 < z2 ? z1 : z2);
    const tMaxX = x0 > x1 ? (x0 > x2 ? x0 : x2) : (x1 > x2 ? x1 : x2);
    const tMaxY = y0 > y1 ? (y0 > y2 ? y0 : y2) : (y1 > y2 ? y1 : y2);
    const tMaxZ = z0 > z1 ? (z0 > z2 ? z0 : z2) : (z1 > z2 ? z1 : z2);

    if (tMinX < minBoundsX[z]) minBoundsX[z] = tMinX;
    if (tMinY < minBoundsY[z]) minBoundsY[z] = tMinY;
    if (tMinZ < minBoundsZ[z]) minBoundsZ[z] = tMinZ;
    if (tMaxX > maxBoundsX[z]) maxBoundsX[z] = tMaxX;
    if (tMaxY > maxBoundsY[z]) maxBoundsY[z] = tMaxY;
    if (tMaxZ > maxBoundsZ[z]) maxBoundsZ[z] = tMaxZ;
  }

  const useUint32 = posAttr.count > 65535;
  const typedBuckets: Array<Uint16Array | Uint32Array | null> = new Array(zoneCount).fill(null);
  const writePos = new Int32Array(zoneCount);

  for (let z = 0; z < zoneCount; z++) {
    const c = triCounts[z];
    if (c > 0) {
      typedBuckets[z] = useUint32 ? new Uint32Array(c * 3) : new Uint16Array(c * 3);
    }
  }

  for (let t = 0; t < triCount; t++) {
    const z = triZones[t];
    const buf = typedBuckets[z];
    if (!buf) continue;
    const t3 = t * 3;
    const wp = writePos[z];
    buf[wp] = idxArr ? idxArr[t3] : t3;
    buf[wp + 1] = idxArr ? idxArr[t3 + 1] : t3 + 1;
    buf[wp + 2] = idxArr ? idxArr[t3 + 2] : t3 + 2;
    writePos[z] = wp + 3;
  }

  const parts: CachedSubPart[] = [];
  for (let z = 0; z < zoneCount; z++) {
    const typedIndices = typedBuckets[z];
    const count = triCounts[z];
    if (!typedIndices || count === 0) continue;

    const subGeo = new BufferGeometry();
    for (const attrName of Object.keys(geo.attributes)) {
      subGeo.setAttribute(attrName, geo.attributes[attrName]);
    }
    subGeo.setIndex(new BufferAttribute(typedIndices, 1));
    const zoneBox = new Box3(
      new Vector3(minBoundsX[z], minBoundsY[z], minBoundsZ[z]),
      new Vector3(maxBoundsX[z], maxBoundsY[z], maxBoundsZ[z])
    );
    subGeo.boundingBox = zoneBox;
    subGeo.boundingSphere = zoneBox.getBoundingSphere(new Sphere());

    const localCenter = new Vector3(
      centroidSumsX[z] / count,
      centroidSumsY[z] / count,
      centroidSumsZ[z] / count
    );

    const spec = zones[z];
    parts.push({
      name: spec.name.replace(/\s+/g, ''),
      geometry: subGeo,
      localCenter,
      explodeDir: spec.dir ? new Vector3(...spec.dir) : undefined,
      isGlass: Boolean(spec.isGlass),
    });
  }

  if (parts.length <= 1) return null;
  geo.userData = geo.userData || {};
  geo.userData[cacheKey] = parts;
  return parts;
}

/** Clone transforms and materials; retain shared, loader-owned geometries/textures. */
export function createModelInstance(source: Object3D, modelId: string, options?: string | ModelInstanceOptions) {
  const resolvedOptions: ModelInstanceOptions = typeof options === 'string'
    ? { modelName: options, segmentSingleMesh: true }
    : options ?? {};
  let root = clone(source);

  if (resolvedOptions.segmentSingleMesh) {
    const profile = detectSemanticProfile(resolvedOptions.modelName || modelId);
    const allMeshes: Mesh[] = [];
    root.traverse((n) => {
      if (n instanceof Mesh) allMeshes.push(n);
    });

    if (allMeshes.length === 1) {
      const singleMesh = allMeshes[0];
      const segmented = getOrBuildSegmentedParts(singleMesh.geometry, profile);
      if (segmented && segmented.length > 1) {
        const container = new Group();
        container.name = singleMesh.name || 'SegmentedAssembly';
        container.position.copy(singleMesh.position);
        container.rotation.copy(singleMesh.rotation);
        container.scale.copy(singleMesh.scale);
        container.userData = { ...singleMesh.userData };

        for (const part of segmented) {
          const subMesh = new Mesh(part.geometry, singleMesh.material);
          subMesh.name = part.name;
          subMesh.castShadow = singleMesh.castShadow;
          subMesh.receiveShadow = singleMesh.receiveShadow;
          subMesh.userData = {
            ...singleMesh.userData,
            label: part.name.replace(/_/g, ' '),
            _skLocalCenter: part.localCenter.clone(),
            _skExplodeDir: part.explodeDir ? part.explodeDir.clone() : undefined,
            _skSyntheticSplit: true,
            _skGlassZone: Boolean(part.isGlass),
          };
          container.add(subMesh);
        }

        if (singleMesh.parent) {
          const parent = singleMesh.parent;
          const idx = parent.children.indexOf(singleMesh);
          if (idx !== -1) {
            parent.children[idx] = container;
            container.parent = parent;
          } else {
            parent.remove(singleMesh);
            parent.add(container);
          }
        } else if (root === singleMesh) {
          root = container;
        }
      }
    }
  }

  const records: PartRecord[] = [];
  const materials: Material[] = [];
  const names = new Map<string, number>();
  root.traverse((node) => {
    if (node instanceof Mesh && node.name) names.set(node.name, (names.get(node.name) ?? 0) + 1);
  });
  const ids = new Set<string>();
  const opaqueMaterialMap = new Map<Material, Material>();
  const glassMaterialMap = new Map<Material, Material>();
  const copy = (material: Material, isGlass = false) => {
    const map = isGlass ? glassMaterialMap : opaqueMaterialMap;
    let cloned = map.get(material);
    if (!cloned) {
      cloned = material.clone();
      map.set(material, cloned);
      materials.push(cloned);
    }
    return cloned;
  };
  const visit = (node: Object3D, path: string) => {
    if (node instanceof Mesh) {
      const explicit = node.userData.spatialId;
      const key = typeof explicit === 'string' && explicit.length > 0
        ? explicit
        : node.name && names.get(node.name) === 1 ? node.name : `node:${path}`;
      const id = `${modelId}/${key}`;
      if (ids.has(id)) throw new Error(`[SpatialKit] Duplicate part id "${id}". Set unique node extras.spatialId values.`);
      ids.add(id);
      const isGlass = Boolean(node.userData._skGlassZone);
      node.material = Array.isArray(node.material)
        ? node.material.map((m) => copy(m, isGlass))
        : copy(node.material, isGlass);
      // Preserve baseline position for procedural exploded views
      if (!node.userData._skOriginalPosition) {
        node.userData._skOriginalPosition = node.position.clone();
      }
      // Ensure bounding sphere and box are precomputed for fast raycast culling and O(1) centers
      if (node.geometry) {
        if (!node.geometry.boundingSphere) {
          node.geometry.computeBoundingSphere();
        }
        if (!node.geometry.boundingBox) {
          node.geometry.computeBoundingBox();
        }
        if (node.geometry.boundingBox && !node.userData._skLocalCenter) {
          node.userData._skLocalCenter = node.geometry.boundingBox.getCenter(new Vector3());
        }
      }
      records.push({ object: node, part: { id, modelId, name: node.name || key, metadata: { ...node.userData } } });
      node.userData._skPartId = id;
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
  object.updateWorldMatrix(true, false);
  const mesh = object as Mesh;
  if (mesh.userData?._skLocalCenter) {
    out.copy(mesh.userData._skLocalCenter as Vector3);
    return object.localToWorld(out);
  }
  if (mesh.geometry) {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    if (mesh.geometry.boundingBox) {
      const center = mesh.geometry.boundingBox.getCenter(new Vector3());
      mesh.userData._skLocalCenter = center;
      out.copy(center);
      return object.localToWorld(out);
    }
  }
  return bounds.setFromObject(object).getCenter(out);
}
