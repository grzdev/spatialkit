import { useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, Group, Line, LineBasicMaterial, Vector3 } from 'three';
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
  /** Optional point in the target mesh's local coordinates. Anchors a hotspot to an exact surface location. */
  point?: [number, number, number];
  selectedOnly?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Whether to render a visual 3D pin at the anchor position. Default is true for hotspot points, false otherwise. */
  pin?: boolean;
  /** Pin color hex. Defaults to #58ddba. */
  pinColor?: string;
  /** Whether to draw a leader line between the 3D anchor and the floating label. Default is true when offset is non-zero. */
  line?: boolean;
  /** Leader line color hex. Defaults to pinColor or #58ddba. */
  lineColor?: string;
}

/** A browser DOM label tracking a mesh with optional 3D anchor pin and leader line. */
export function Annotation({
  target,
  modelId,
  label,
  children,
  offset = [0, 0.3, 0],
  point: localPoint,
  selectedOnly = false,
  className,
  style,
  pin,
  pinColor = '#58ddba',
  line,
  lineColor,
}: AnnotationProps) {
  const { records, selectedPart } = useSpatialContext();
  const record = resolvePart(records, target, modelId);
  const group = useRef<Group>(null);
  const labelGroup = useRef<Group>(null);
  const lineMesh = useRef<Line>(null);
  const anchorWorld = useRef(new Vector3());
  const labelWorld = useRef(new Vector3());

  const showPin = pin ?? (localPoint !== undefined);
  const showLine = line ?? (showPin && (offset[0] !== 0 || offset[1] !== 0 || offset[2] !== 0));
  const effectiveLineColor = lineColor ?? pinColor;

  useFrame(() => {
    if (!record || !group.current) return;
    if (localPoint) {
      anchorWorld.current.set(...localPoint);
      record.object.localToWorld(anchorWorld.current);
    } else {
      partCenter(record.object, anchorWorld.current);
    }

    labelWorld.current.copy(anchorWorld.current);
    labelWorld.current.x += offset[0];
    labelWorld.current.y += offset[1];
    labelWorld.current.z += offset[2];

    const parent = group.current.parent;
    if (parent) {
      parent.updateWorldMatrix(true, false);
      const anchorLocal = anchorWorld.current.clone();
      parent.worldToLocal(anchorLocal);
      group.current.position.copy(anchorLocal);

      if (labelGroup.current) {
        labelGroup.current.position.set(offset[0], offset[1], offset[2]);
      }

      if (lineMesh.current && showLine) {
        const positions = lineMesh.current.geometry.attributes.position;
        if (positions) {
          positions.setXYZ(0, 0, 0, 0);
          positions.setXYZ(1, offset[0], offset[1], offset[2]);
          positions.needsUpdate = true;
        }
      }
    }
  });

  const lineGeometry = useMemo(() => {
    const geom = new BufferGeometry();
    const positions = new Float32Array([0, 0, 0, offset[0], offset[1], offset[2]]);
    geom.setAttribute('position', new BufferAttribute(positions, 3));
    return geom;
  }, [offset[0], offset[1], offset[2]]);

  if (!record || (selectedOnly && selectedPart?.id !== record.part.id)) return null;

  return (
    <group ref={group}>
      {showPin && (
        <group>
          {/* Surface anchor point - outer glow pulse ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.022, 0.038, 32]} />
            <meshBasicMaterial color={pinColor} transparent opacity={0.65} depthTest={false} />
          </mesh>
          {/* Core dot */}
          <mesh>
            <sphereGeometry args={[0.018, 16, 16]} />
            <meshBasicMaterial color={pinColor} depthTest={false} />
          </mesh>
        </group>
      )}

      {showLine && (
        <primitive object={new Line(lineGeometry, new LineBasicMaterial({ color: effectiveLineColor, transparent: true, opacity: 0.5, depthTest: false }))} ref={lineMesh} />
      )}

      <group ref={labelGroup}>
        <Html center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
          <div
            className={className}
            style={{
              background: '#10251f',
              color: '#edfff8',
              border: `1px solid ${pinColor}`,
              borderRadius: 8,
              padding: '8px 12px',
              font: '12px/1.4 system-ui, sans-serif',
              maxWidth: 240,
              width: 'max-content',
              overflowWrap: 'anywhere',
              ...style,
            }}
          >
            {children ?? label}
          </div>
        </Html>
      </group>
    </group>
  );
}
