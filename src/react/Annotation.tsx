import { useRef, type CSSProperties, type ReactNode } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import { partCenter, resolvePart } from './model';
import { useSpatialContext } from './SpatialProvider';

export interface AnnotationProps {
  /** A scoped part id, unique mesh name, or glTF extras.spatialId. */
  target: string;
  modelId?: string;
  label?: string;
  children?: ReactNode;
  /** World-space offset from the mesh bounding-box centre. */
  offset?: [number, number, number];
  selectedOnly?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** A browser DOM label tracking a mesh. This is not an immersive WebXR UI component. */
export function Annotation({ target, modelId, label, children, offset = [0, 0.3, 0], selectedOnly = false, className, style }: AnnotationProps) {
  const { records, selectedPart } = useSpatialContext();
  const record = resolvePart(records, target, modelId);
  const group = useRef<Group>(null);
  const point = useRef(new Vector3());
  useFrame(() => {
    if (!record || !group.current) return;
    partCenter(record.object, point.current);
    point.current.x += offset[0];
    point.current.y += offset[1];
    point.current.z += offset[2];
    group.current.parent?.updateWorldMatrix(true, false);
    group.current.parent?.worldToLocal(point.current);
    group.current.position.copy(point.current);
  });
  if (!record || (selectedOnly && selectedPart?.id !== record.part.id)) return null;
  return <group ref={group}>
    <Html center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <div className={className} style={{
        background: '#10251f', color: '#edfff8', border: '1px solid #58ddba',
        borderRadius: 8, padding: '8px 12px', font: '12px/1.4 system-ui, sans-serif',
        maxWidth: 240, width: 'max-content', overflowWrap: 'anywhere', ...style,
      }}>{children ?? label}</div>
    </Html>
  </group>;
}
