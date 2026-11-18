import { useEffect, useMemo } from 'react';
import { useLoader, type ThreeEvent } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  AnimationMixer,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  LoopOnce,
  Mesh,
  Plane,
  Vector3,
  type AnimationClip,
  type MeshStandardMaterial,
  type Object3D,
  type Side,
  type Texture,
} from 'three';
import { compressAndOptimizeModelScene, createModelInstance, modelFit, type SpatialPart } from './model';
import { useSpatialContext } from './SpatialProvider';

const NOOP_RAYCAST = () => {};

export type SurfaceFinishMode = 'pbr' | 'wireframe' | 'clay' | 'chrome' | 'hologram' | 'glass';

export interface MaterialOverrideConfig {
  mode: SurfaceFinishMode;
  roughness?: number;
  metalness?: number;
  wireframeOverlay: boolean;
}

export interface ModelTelemetryStats {
  triangles: number;
  vertices: number;
  parts: number;
  /** World-space fitted dimensions [width (X), height (Y), depth (Z)] in meters */
  dimensions: [number, number, number];
}

export interface SelectableModelProps {
  src: string;
  /** Defaults to src. Supply a stable id when saving annotations or mounting a model twice. */
  modelId?: string;
  /** Optional display name used for semantic segmentation/materials (e.g. blender, drone, sneaker). */
  modelName?: string;
  /** Partition single-mesh models into semantic structural sub-meshes for exploded views. */
  segmentSingleMesh?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  highlightColor?: string;
  /** Fit the longest dimension to this size, centred on X/Z and grounded on Y=0. */
  fit?: number;
  /** Procedural exploded view factor (0 = collapsed/authored pose, 1 = fully exploded outward). */
  explode?: number;
  /** Whether to draw 3D holographic vector connector lines when exploded. */
  showExplodeVectors?: boolean;
  /** Live PBR / Surface finish overrides for Material Lab. */
  materialConfig?: MaterialOverrideConfig;
  /** Callback fired with triangle, vertex, part count, and fitted 3D dimensions. */
  onTelemetry?: (stats: ModelTelemetryStats) => void;
  /** Disable CPU triangle raycasting during high-speed 3D Gimbal flight for zero-lag 60fps movement. */
  fastFlight?: boolean;
  /** Fired once when the model instance has mounted and is ready on stage. */
  onReady?: () => void;
  /** Active Three.js clipping planes for cross-section rendering. */
  clippingPlanes?: readonly Plane[];
  /** Fires with a point in the selected mesh's local coordinates. Useful for persistent hotspots. */
  onSurfaceClick?: (hit: SurfaceHit) => void;
  /** Zero-to-one position in a glTF animation. Omit to leave the model at its authored pose. */
  animationProgress?: number;
  /** Animation clip name or index. Defaults to the first clip. */
  animation?: string | number;
  /** Configure decoders/plugins with your application's asset paths. Keep this callback stable. */
  configureLoader?: (loader: GLTFLoader) => void;
}

export interface SurfaceHit {
  part: SpatialPart;
  /** Position relative to the hit mesh, stable while the asset hierarchy is unchanged. */
  point: [number, number, number];
  /** Position in 3D world coordinates [x, y, z]. */
  worldPoint?: [number, number, number];
}

/** Suspense-compatible glTF loader with mesh selection and instance-owned highlighting. */
export function SelectableModel({ src, modelId = src, configureLoader, ...props }: SelectableModelProps) {
  const gltf = useLoader(GLTFLoader, src, configureLoader);
  useMemo(() => {
    if (!gltf.scene.userData?._skCompressed) {
      compressAndOptimizeModelScene(gltf.scene);
      gltf.scene.userData = { ...gltf.scene.userData, _skCompressed: true };
    }
  }, [gltf.scene]);
  return <SelectableObject object={gltf.scene} animations={gltf.animations} modelId={modelId} {...props} />;
}

export interface SelectableObjectProps extends Omit<SelectableModelProps, 'src' | 'configureLoader' | 'modelId'> {
  object: Object3D;
  modelId: string;
  /** Animation clips loaded alongside object. */
  animations?: readonly AnimationClip[];
}

interface SavedMaterialState {
  color: Color;
  emissive: Color;
  emissiveIntensity: number;
  roughness: number;
  metalness: number;
  map: Texture | null;
  emissiveMap: Texture | null;
  roughnessMap: Texture | null;
  metalnessMap: Texture | null;
  wireframe: boolean;
  transparent: boolean;
  opacity: number;
  depthWrite: boolean;
  side: Side;
}

function captureMaterialState(mat: MeshStandardMaterial): SavedMaterialState {
  return {
    color: mat.color ? mat.color.clone() : new Color('#ffffff'),
    emissive: mat.emissive ? mat.emissive.clone() : new Color('#000000'),
    emissiveIntensity: mat.emissiveIntensity ?? 0,
    roughness: mat.roughness ?? 0.5,
    metalness: mat.metalness ?? 0.2,
    map: mat.map ?? null,
    emissiveMap: mat.emissiveMap ?? null,
    roughnessMap: mat.roughnessMap ?? null,
    metalnessMap: mat.metalnessMap ?? null,
    wireframe: Boolean(mat.wireframe),
    transparent: Boolean(mat.transparent),
    opacity: mat.opacity ?? 1,
    depthWrite: mat.depthWrite ?? true,
    side: mat.side,
  };
}

function restoreMaterialState(mat: MeshStandardMaterial, saved: SavedMaterialState) {
  if (mat.color) mat.color.copy(saved.color);
  if (mat.emissive) mat.emissive.copy(saved.emissive);
  mat.emissiveIntensity = saved.emissiveIntensity;
  mat.map = saved.map;
  mat.emissiveMap = saved.emissiveMap;
  mat.roughnessMap = saved.roughnessMap;
  mat.metalnessMap = saved.metalnessMap;
  mat.roughness = saved.roughness;
  mat.metalness = saved.metalness;
  mat.transparent = saved.transparent;
  mat.opacity = saved.opacity;
  mat.depthWrite = saved.depthWrite;
  mat.side = saved.side;
  mat.wireframe = saved.wireframe;
}

/** Use an already loaded object. Its source geometry/textures remain owned by the caller. */
export function SelectableObject({
  object,
  modelId,
  modelName,
  segmentSingleMesh = false,
  animations = [],
  animation = 0,
  animationProgress,
  explode = 0,
  showExplodeVectors = true,
  materialConfig,
  onTelemetry,
  fastFlight = false,
  onReady,
  clippingPlanes,
  position,
  rotation,
  scale,
  fit,
  highlightColor = '#58ddba',
  onSurfaceClick,
}: SelectableObjectProps) {
  const instance = useMemo(
    () => createModelInstance(object, modelId, { modelName, segmentSingleMesh }),
    [object, modelId, modelName, segmentSingleMesh]
  );
  const framing = useMemo(() => fit === undefined ? { scale: 1, position: [0, 0, 0] as [number, number, number] } : modelFit(object, fit), [object, fit]);
  const { register, select, selectedPart } = useSpatialContext();
  useEffect(() => register(modelId, instance.records), [register, modelId, instance]);
  useEffect(() => () => instance.dispose(), [instance]);
  useEffect(() => {
    const id = requestAnimationFrame(() => onReady?.());
    return () => cancelAnimationFrame(id);
  }, [instance, onReady]);

  // Disable expensive per-pointermove CPU triangle raycasting during high-mobility Gimbal flight
  useEffect(() => {
    for (const { object: mesh } of instance.records) {
      mesh.raycast = fastFlight ? NOOP_RAYCAST : Mesh.prototype.raycast;
    }
    return () => {
      for (const { object: mesh } of instance.records) {
        mesh.raycast = Mesh.prototype.raycast;
      }
    };
  }, [instance, fastFlight]);

  // Compute model bounding box, center, and telemetry stats
  const { modelCenter, modelSpan, telemetryStats } = useMemo(() => {
    instance.root.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(instance.root);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const maxSpan = Math.max(0.001, size.x, size.y, size.z);

    let triangles = 0;
    const seenPositionAttrs = new Set<unknown>();
    let vertices = 0;

    for (const { object: mesh } of instance.records) {
      const geo = mesh.geometry;
      if (!geo) continue;
      if (geo.index) {
        triangles += Math.floor(geo.index.count / 3);
      } else if (geo.attributes.position) {
        triangles += Math.floor(geo.attributes.position.count / 3);
      }
      if (geo.attributes.position && !seenPositionAttrs.has(geo.attributes.position)) {
        seenPositionAttrs.add(geo.attributes.position);
        vertices += geo.attributes.position.count;
      }
    }

    const fittedDims: [number, number, number] = [
      Number((size.x * framing.scale).toFixed(2)),
      Number((size.y * framing.scale).toFixed(2)),
      Number((size.z * framing.scale).toFixed(2)),
    ];

    return {
      modelCenter: center,
      modelSpan: maxSpan,
      telemetryStats: {
        triangles,
        vertices,
        parts: instance.records.length,
        dimensions: fittedDims,
      } satisfies ModelTelemetryStats,
    };
  }, [instance, framing.scale]);

  useEffect(() => {
    onTelemetry?.(telemetryStats);
  }, [onTelemetry, telemetryStats]);

  // Precompute explode directions and local centers once per instance
  const explodeData = useMemo(() => {
    const vectors = new Map<Mesh, Vector3>();
    const localCenters = new Map<Mesh, Vector3>();
    const meshBox = new Box3();
    const meshCenter = new Vector3();

    for (const record of instance.records) {
      const mesh = record.object;
      const basePos = mesh.userData._skOriginalPosition as Vector3 | undefined;
      if (!basePos) continue;

      if (mesh.userData._skLocalCenter) {
        meshCenter.copy(mesh.userData._skLocalCenter as Vector3);
        localCenters.set(mesh, meshCenter.clone());
        mesh.localToWorld(meshCenter);
      } else {
        meshBox.setFromObject(mesh);
        meshBox.getCenter(meshCenter);
        localCenters.set(mesh, mesh.worldToLocal(meshCenter.clone()));
      }

      const customDir = mesh.userData._skExplodeDir as Vector3 | undefined;
      const explodeDir = customDir
        ? customDir.clone()
        : new Vector3().subVectors(meshCenter, modelCenter);
      if (explodeDir.lengthSq() < 0.0001) {
        explodeDir.set(0, 1, 0);
      } else {
        explodeDir.normalize().multiplyScalar(customDir ? customDir.length() : 1);
      }
      explodeDir.multiplyScalar(modelSpan * 0.44);
      vectors.set(mesh, explodeDir);
    }
    return { vectors, localCenters };
  }, [instance, modelCenter, modelSpan]);

  const connectorLineGeometry = useMemo(() => {
    const clampedExplode = Math.max(0, explode);
    if (clampedExplode <= 0.01 || !showExplodeVectors || instance.records.length <= 1) {
      return null;
    }
    const positions: number[] = [];
    for (const record of instance.records) {
      const mesh = record.object;
      const explodeDir = explodeData.vectors.get(mesh);
      const localCenter = explodeData.localCenters.get(mesh);
      if (!explodeDir || !localCenter) continue;

      const start = localCenter.clone();
      const end = localCenter.clone().addScaledVector(explodeDir, clampedExplode);
      positions.push(start.x, start.y, start.z, end.x, end.y, end.z);
    }
    if (positions.length === 0) return null;
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    return geo;
  }, [instance, explode, showExplodeVectors, explodeData]);

  useEffect(() => {
    return () => {
      connectorLineGeometry?.dispose();
    };
  }, [connectorLineGeometry]);

  // Procedural Exploded View effect - pure O(1) vector translation per mesh
  useEffect(() => {
    const clampedExplode = Math.max(0, explode);
    for (const record of instance.records) {
      const mesh = record.object;
      const basePos = mesh.userData._skOriginalPosition as Vector3 | undefined;
      const explodeDir = explodeData.vectors.get(mesh);
      if (!basePos || !explodeDir) continue;

      if (clampedExplode === 0) {
        mesh.position.copy(basePos);
      } else {
        mesh.position.copy(basePos).addScaledVector(explodeDir, clampedExplode);
      }
    }
  }, [instance, explode, explodeData]);

  // Material & Surface Lab Override Effect (only modifies materials when materialConfig is active)
  useEffect(() => {
    for (const { object: mesh } of instance.records) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const rawMat of mats) {
        const mat = rawMat as MeshStandardMaterial;
        if (!mat || typeof mat !== 'object') continue;

        if (!materialConfig) {
          const saved = mat.userData._skSavedPBR as SavedMaterialState | undefined;
          if (saved) {
            restoreMaterialState(mat, saved);
            mat.needsUpdate = true;
          }
          continue;
        }

        if (!mat.userData._skSavedPBR) {
          mat.userData._skSavedPBR = captureMaterialState(mat);
        }

        const saved = mat.userData._skSavedPBR as SavedMaterialState;
        const isGlassZone = Boolean(mesh.userData?._skGlassZone);
        const roughness = materialConfig.roughness ?? saved.roughness;
        const metalness = materialConfig.metalness ?? saved.metalness;

        if (materialConfig.mode === 'pbr') {
          if (isGlassZone) {
            if (mat.color) mat.color.set('#dff2ff');
            if (mat.emissive) mat.emissive.set('#38bdf8');
            mat.emissiveIntensity = 0.08;
            mat.map = saved.map;
            mat.emissiveMap = null;
            mat.roughnessMap = saved.roughnessMap;
            mat.metalnessMap = saved.metalnessMap;
            mat.roughness = Math.min(0.22, (materialConfig.roughness ?? 0.45) * 0.42);
            mat.metalness = 0.1;
            mat.transparent = true;
            mat.opacity = 0.46;
            mat.depthWrite = false;
            mat.side = DoubleSide;
            mat.wireframe = Boolean(materialConfig.wireframeOverlay);
          } else {
            restoreMaterialState(mat, saved);
            mat.roughness = roughness;
            mat.metalness = metalness;
            mat.wireframe = Boolean(materialConfig.wireframeOverlay);
          }
        } else if (materialConfig.mode === 'wireframe') {
          if (mat.color) mat.color.set('#38bdf8');
          if (mat.emissive) mat.emissive.set('#0284c7');
          mat.emissiveIntensity = 0.65;
          mat.map = null;
          mat.emissiveMap = null;
          mat.roughnessMap = null;
          mat.metalnessMap = null;
          mat.roughness = 0.2;
          mat.metalness = 0.8;
          mat.transparent = false;
          mat.opacity = 1;
          mat.depthWrite = true;
          mat.side = saved.side;
          mat.wireframe = true;
        } else if (materialConfig.mode === 'clay') {
          if (mat.color) mat.color.set('#d8dee9');
          if (mat.emissive) mat.emissive.set('#0f172a');
          mat.emissiveIntensity = 0.08;
          mat.map = null;
          mat.emissiveMap = null;
          mat.roughnessMap = null;
          mat.metalnessMap = null;
          mat.roughness = materialConfig.roughness ?? 0.7;
          mat.metalness = 0.06;
          mat.transparent = false;
          mat.opacity = 1;
          mat.depthWrite = true;
          mat.side = saved.side;
          mat.wireframe = Boolean(materialConfig.wireframeOverlay);
        } else if (materialConfig.mode === 'chrome') {
          if (mat.color) mat.color.set('#f1f5f9');
          if (mat.emissive) mat.emissive.set('#0ea5e9');
          mat.emissiveIntensity = 0.12;
          mat.map = null;
          mat.emissiveMap = null;
          mat.roughnessMap = null;
          mat.metalnessMap = null;
          mat.roughness = Math.min(0.25, (materialConfig.roughness ?? 0.35) * 0.35);
          mat.metalness = 0.96;
          mat.transparent = false;
          mat.opacity = 1;
          mat.depthWrite = true;
          mat.side = saved.side;
          mat.wireframe = Boolean(materialConfig.wireframeOverlay);
        } else if (materialConfig.mode === 'hologram') {
          if (mat.color) mat.color.set('#38bdf8');
          if (mat.emissive) mat.emissive.set('#0ea5e9');
          mat.emissiveIntensity = 0.75;
          mat.map = saved.map;
          mat.emissiveMap = null;
          mat.roughness = 0.15;
          mat.metalness = 0.85;
          mat.transparent = true;
          mat.opacity = 0.64;
          mat.depthWrite = false;
          mat.side = DoubleSide;
          mat.wireframe = Boolean(materialConfig.wireframeOverlay);
        } else if (materialConfig.mode === 'glass') {
          if (mat.color) mat.color.set('#e0f2fe');
          if (mat.emissive) mat.emissive.set('#0284c7');
          mat.emissiveIntensity = 0.18;
          mat.map = null;
          mat.emissiveMap = null;
          mat.roughnessMap = null;
          mat.metalnessMap = null;
          mat.roughness = 0.12;
          mat.metalness = 0.15;
          mat.transparent = true;
          mat.opacity = 0.56;
          mat.depthWrite = false;
          mat.side = DoubleSide;
          mat.wireframe = Boolean(materialConfig.wireframeOverlay);
        }

        mat.needsUpdate = true;
      }
    }
  }, [instance, materialConfig]);

  const animationState = useMemo(() => {
    if (animationProgress === undefined) return null;
    const clip = typeof animation === 'string'
      ? animations.find((candidate) => candidate.name === animation)
      : animations[animation];
    if (!clip) return null;
    const mixer = new AnimationMixer(instance.root);
    const action = mixer.clipAction(clip);
    action.setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    return { mixer, clip, action };
  }, [instance, animations, animation, animationProgress === undefined]);
  useEffect(() => {
    if (!animationState || animationProgress === undefined) return;
    animationState.action.paused = false;
    animationState.mixer.setTime(Math.min(1, Math.max(0, animationProgress)) * animationState.clip.duration);
  }, [animationState, animationProgress]);
  useEffect(() => () => {
    if (!animationState) return;
    animationState.mixer.stopAllAction();
    animationState.mixer.uncacheRoot(instance.root);
  }, [animationState, instance]);
  useEffect(() => {
    if (!selectedPart) return;
    const restore: Array<() => void> = [];
    for (const { object, part } of instance.records) {
      if (selectedPart.id !== part.id) continue;
      const originalMaterial = object.material;
      const mats = Array.isArray(originalMaterial) ? originalMaterial : [originalMaterial];
      const isShared = instance.records.some(
        (r) => r.object !== object && (Array.isArray(r.object.material) ? r.object.material.some((m) => mats.includes(m)) : mats.includes(r.object.material))
      );

      const targetMats = isShared ? mats.map((m) => m.clone()) : mats;
      if (isShared) {
        object.material = Array.isArray(originalMaterial) ? targetMats : targetMats[0];
      }

      for (const material of targetMats) {
        const surface = material as MeshStandardMaterial;
        if (surface.emissive) {
          const original = surface.emissive.clone();
          const intensity = surface.emissiveIntensity;
          surface.emissive.set(highlightColor);
          surface.emissiveIntensity = 0.45;
          restore.push(() => {
            surface.emissive.copy(original);
            surface.emissiveIntensity = intensity;
          });
        } else if ('color' in material && material.color instanceof Color) {
          const color = material.color;
          const original = color.clone();
          color.lerp(new Color(highlightColor), 0.5);
          restore.push(() => color.copy(original));
        }
      }

      if (isShared) {
        restore.push(() => {
          object.material = originalMaterial;
          targetMats.forEach((m) => m.dispose());
        });
      }
    }
    return () => restore.forEach((reset) => reset());
  }, [instance, selectedPart, highlightColor]);

  // Apply clipping planes to instance materials with full cleanup on toggle
  useEffect(() => {
    const planesArray = clippingPlanes && clippingPlanes.length > 0 ? Array.from(clippingPlanes) : null;
    for (const { object } of instance.records) {
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        material.clippingPlanes = planesArray;
        material.clipShadows = Boolean(planesArray);
        material.needsUpdate = true;
      }
    }
    return () => {
      for (const { object } of instance.records) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          material.clippingPlanes = null;
          material.needsUpdate = true;
        }
      }
    };
  }, [instance, clippingPlanes]);

  return <group position={position} rotation={rotation} scale={scale}>
    <group scale={framing.scale} position={framing.position}>
    <primitive object={instance.root} dispose={null}
      onClick={fastFlight ? undefined : (event: ThreeEvent<MouseEvent>) => {
        if (event.delta > 7) return;
        event.stopPropagation();
        const record = instance.records.find((candidate) => candidate.object === event.object);
        if (record) {
          const nextTarget = selectedPart?.id === record.part.id ? null : record.part.id;
          select(nextTarget);
          const point = event.object.worldToLocal(event.point.clone());
          onSurfaceClick?.({
            part: record.part,
            point: [point.x, point.y, point.z],
            worldPoint: [event.point.x, event.point.y, event.point.z],
          });
        }
      }}
    />
    {connectorLineGeometry && (
      <lineSegments geometry={connectorLineGeometry}>
        <lineBasicMaterial color="#38bdf8" transparent opacity={0.65} depthTest={false} />
      </lineSegments>
    )}
    </group>
  </group>;
}
