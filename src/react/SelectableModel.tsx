import { useEffect, useMemo, useState } from 'react';
import { useLoader, type ThreeEvent } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Color, type MeshStandardMaterial } from 'three';
import { createModelInstance } from './model';
import { useSpatialContext } from './SpatialProvider';

export interface SelectableModelProps {
  src: string;
  /** Defaults to src. Supply a stable id when saving annotations or mounting a model twice. */
  modelId?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  highlightColor?: string;
  /** Configure decoders/plugins with your application's asset paths. Keep this callback stable. */
  configureLoader?: (loader: GLTFLoader) => void;
}

/** Suspense-compatible glTF loader with mesh selection and instance-owned highlighting. */
export function SelectableModel({ src, modelId = src, position, rotation, scale, highlightColor = '#58ddba', configureLoader }: SelectableModelProps) {
  const gltf = useLoader(GLTFLoader, src, configureLoader);
  const instance = useMemo(() => createModelInstance(gltf.scene, modelId), [gltf.scene, modelId]);
  const { register, select, selectedPart } = useSpatialContext();
  const [hovered, setHovered] = useState<string | null>(null);
  useEffect(() => register(modelId, instance.records), [register, modelId, instance]);
  useEffect(() => () => instance.dispose(), [instance]);
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
  const hitId = (event: ThreeEvent<PointerEvent | MouseEvent>) => instance.records.find((record) => record.object === event.object)?.part.id;
  return <group position={position} rotation={rotation} scale={scale}>
    <primitive object={instance.root} dispose={null}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); setHovered(hitId(event) ?? null); }}
      onPointerOut={() => setHovered(null)}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        if (event.delta > 5) return;
        event.stopPropagation();
        const id = hitId(event);
        if (id) select(id);
      }}
    />
  </group>;
}
