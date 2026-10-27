import { useEffect, useMemo, useState } from 'react';
import { useLoader, type ThreeEvent } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, Color, LoopOnce, Plane, Vector3, type AnimationClip, type MeshStandardMaterial, type Object3D } from 'three';
import { createModelInstance, modelFit, type SpatialPart } from './model';
import { useSpatialContext } from './SpatialProvider';

export interface SelectableModelProps {
  src: string;
  /** Defaults to src. Supply a stable id when saving annotations or mounting a model twice. */
  modelId?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  highlightColor?: string;
  /** Fit the longest dimension to this size, centred on X/Z and grounded on Y=0. */
  fit?: number;
  /** Procedural exploded view factor (0 = collapsed/authored pose, 1 = fully exploded outward). */
  explode?: number;
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
  return <SelectableObject object={gltf.scene} animations={gltf.animations} modelId={modelId} {...props} />;
}

export interface SelectableObjectProps extends Omit<SelectableModelProps, 'src' | 'configureLoader' | 'modelId'> {
  object: Object3D;
  modelId: string;
  /** Animation clips loaded alongside object. */
  animations?: readonly AnimationClip[];
}

/** Use an already loaded object. Its source geometry/textures remain owned by the caller. */
export function SelectableObject({
  object,
  modelId,
  animations = [],
  animation = 0,
  animationProgress,
  explode = 0,
  clippingPlanes,
  position,
  rotation,
  scale,
  fit,
  highlightColor = '#58ddba',
  onSurfaceClick,
}: SelectableObjectProps) {
  const instance = useMemo(() => createModelInstance(object, modelId), [object, modelId]);
  const framing = useMemo(() => fit === undefined ? { scale: 1, position: [0, 0, 0] as [number, number, number] } : modelFit(object, fit), [object, fit]);
  const { register, select, selectedPart } = useSpatialContext();
  const [hovered, setHovered] = useState<string | null>(null);
  useEffect(() => register(modelId, instance.records), [register, modelId, instance]);
  useEffect(() => () => instance.dispose(), [instance]);

  // Compute model bounding center in instance space for exploded view vectors
  const modelCenter = useMemo(() => {
    instance.root.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(instance.root);
    return box.getCenter(new Vector3());
  }, [instance]);

  // Procedural Exploded View effect
  useEffect(() => {
    const clampedExplode = Math.max(0, explode);
    const meshBox = new Box3();
    const meshCenter = new Vector3();
    const explodeDir = new Vector3();

    for (const record of instance.records) {
      const mesh = record.object;
      const basePos = mesh.userData._skOriginalPosition as Vector3 | undefined;
      if (!basePos) continue;

      if (clampedExplode === 0) {
        mesh.position.copy(basePos);
      } else {
        meshBox.setFromObject(mesh);
        meshBox.getCenter(meshCenter);
        explodeDir.subVectors(meshCenter, modelCenter);

        // If mesh is centered exactly at origin, bias along Y or X
        if (explodeDir.lengthSq() < 0.0001) {
          explodeDir.set(0, 1, 0);
        } else {
          explodeDir.normalize();
        }

        // Translate outwards proportional to explode parameter
        mesh.position.copy(basePos).addScaledVector(explodeDir, clampedExplode * 1.5);
      }
    }
  }, [instance, explode, modelCenter]);

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
    const restore: Array<() => void> = [];
    for (const { object, part } of instance.records) {
      const active = selectedPart?.id === part.id;
      if (!active && hovered !== part.id) continue;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        const surface = material as MeshStandardMaterial;
        if (surface.emissive) {
          const original = surface.emissive.clone();
          const intensity = surface.emissiveIntensity;
          surface.emissive.set(highlightColor);
          surface.emissiveIntensity = active ? 0.45 : 0.16;
          restore.push(() => { surface.emissive.copy(original); surface.emissiveIntensity = intensity; });
        } else if ('color' in material && material.color instanceof Color) {
          const color = material.color;
          const original = color.clone();
          color.lerp(new Color(highlightColor), active ? 0.5 : 0.2);
          restore.push(() => color.copy(original));
        }
      }
    }
    return () => restore.forEach((reset) => reset());
  }, [instance, selectedPart, hovered, highlightColor]);

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

  const hitId = (event: ThreeEvent<PointerEvent | MouseEvent>) => instance.records.find((record) => record.object === event.object)?.part.id;
  return <group position={position} rotation={rotation} scale={scale}>
    <group scale={framing.scale} position={framing.position}>
    <primitive object={instance.root} dispose={null}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); setHovered(hitId(event) ?? null); }}
      onPointerOut={() => setHovered(null)}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        if (event.delta > 7) return;
        event.stopPropagation();
        const record = instance.records.find((candidate) => candidate.object === event.object);
        if (record) {
          select(record.part.id);
          const point = event.object.worldToLocal(event.point.clone());
          onSurfaceClick?.({
            part: record.part,
            point: [point.x, point.y, point.z],
            worldPoint: [event.point.x, event.point.y, event.point.z],
          });
        }
      }}
    />
    </group>
  </group>;
}
