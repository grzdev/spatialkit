import { useMemo, useRef, type ReactNode } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, Group, Line, LineBasicMaterial, Vector3 } from 'three';

export type MeasurementUnit = 'mm' | 'cm' | 'm' | 'in';

export interface MeasurementProps {
  /** First point in world coordinates [x, y, z]. */
  start: [number, number, number];
  /** Second point in world coordinates [x, y, z]. */
  end: [number, number, number];
  /** Unit of measurement for display. Defaults to 'cm'. */
  unit?: MeasurementUnit;
  /** Scale factor to convert 3D Three.js units (typically 1 unit = 1m) into the specified unit. Defaults to: m: 1, cm: 100, mm: 1000, in: 39.3701. */
  scaleFactor?: number;
  /** Visual theme color for line, ticks and endpoints. Defaults to #58ddba. */
  color?: string;
  /** Custom label renderer. */
  formatDistance?: (distance: number, unit: MeasurementUnit) => string;
  /** Optional custom React children for the label DOM. */
  children?: ReactNode;
  /** CSS class name for the distance badge. */
  className?: string;
}

const DEFAULT_SCALE: Record<MeasurementUnit, number> = {
  m: 1,
  cm: 100,
  mm: 1000,
  in: 39.3700787,
};

/**
 * An interactive 3D dimension caliper line with endpoints and a floating DOM distance badge.
 */
export function Measurement({
  start,
  end,
  unit = 'cm',
  scaleFactor,
  color = '#58ddba',
  formatDistance,
  children,
  className,
}: MeasurementProps) {
  const lineRef = useRef<Line>(null);
  const midpoint = useRef(new Vector3());
  const startVec = useMemo(() => new Vector3(...start), [start[0], start[1], start[2]]);
  const endVec = useMemo(() => new Vector3(...end), [end[0], end[1], end[2]]);

  const factor = scaleFactor ?? DEFAULT_SCALE[unit];
  const distance3D = startVec.distanceTo(endVec);
  const measuredValue = distance3D * factor;

  const defaultFormatted = formatDistance
    ? formatDistance(measuredValue, unit)
    : `${measuredValue < 10 ? measuredValue.toFixed(2) : measuredValue.toFixed(1)} ${unit}`;

  const geometry = useMemo(() => {
    const geom = new BufferGeometry();
    const positions = new Float32Array([
      start[0], start[1], start[2],
      end[0], end[1], end[2],
    ]);
    geom.setAttribute('position', new BufferAttribute(positions, 3));
    return geom;
  }, [start[0], start[1], start[2], end[0], end[1], end[2]]);

  useFrame(() => {
    midpoint.current.addVectors(startVec, endVec).multiplyScalar(0.5);
    if (lineRef.current) {
      const pos = lineRef.current.geometry.attributes.position;
      if (pos) {
        pos.setXYZ(0, start[0], start[1], start[2]);
        pos.setXYZ(1, end[0], end[1], end[2]);
        pos.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      {/* End point A */}
      <mesh position={start}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>

      {/* End point B */}
      <mesh position={end}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>

      {/* Dimension Line */}
      <primitive
        object={new Line(geometry, new LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.85 }))}
        ref={lineRef}
      />

      {/* Dimension Label Badge at midpoint */}
      <group position={[
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2 + 0.05,
        (start[2] + end[2]) / 2,
      ]}>
        <Html center zIndexRange={[35, 0]} style={{ pointerEvents: 'none' }}>
          <div
            className={className}
            style={{
              background: '#0d1d18',
              color: '#edfff8',
              border: `1px solid ${color}`,
              borderRadius: 6,
              padding: '4px 8px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.3,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}
          >
            {children ?? defaultFormatted}
          </div>
        </Html>
      </group>
    </group>
  );
}
