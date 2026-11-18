import {
  Suspense,
  useRef,
  useState,
  useEffect,
  useMemo,
  type ComponentRef,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, ContactShadows, Html } from '@react-three/drei';
import { Box3, BufferAttribute, BufferGeometry, Mesh, Plane, Vector3 } from 'three';
import {
  BlenderControls,
  SelectableModel,
  SelectableObject,
  SpatialProvider,
  useSpatial,
  type JoystickValue,
  type MaterialOverrideConfig,
  type ModelTelemetryStats,
  type SpatialPart,
  type SurfaceFinishMode,
  type SurfaceHit,
} from 'spatialkit/react';
import {
  ENVIRONMENT_PRESETS,
  InteractiveModelRig,
  type ActiveModelControl,
  type StudioEnvironmentPreset,
} from './main';
import { MAX_MODEL_MB, MODEL_FIT, downloadModelFromSource, type ModelAsset, type ModelUploadProgress } from './model-files';
import { generateComponent, publicFilename } from './integration';
import { type Note } from './notes';
import {
  HorizontalMechanicalLever,
  TactileDial,
  TactileJoystick,
} from './ControlsLab';
import { SmoothScrollArea } from './components/SmoothScrollArea';

function CanvasCaptureBridge({ captureRef }: { captureRef: React.MutableRefObject<(() => string | null) | null> }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    captureRef.current = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/png');
    };
    return () => { captureRef.current = null; };
  }, [gl, scene, camera, captureRef]);
  return null;
}

function SceneBridge({
  onParts,
  selectRef,
  onSelectedPartChange,
}: {
  onParts: (parts: SpatialPart[]) => void;
  selectRef: React.MutableRefObject<(target: string | null) => void>;
  onSelectedPartChange?: (partId: string | null) => void;
}) {
  const { parts, select, selectedPart } = useSpatial();
  const prevPartsLengthRef = useRef(-1);
  const onSelectedPartChangeRef = useRef(onSelectedPartChange);
  onSelectedPartChangeRef.current = onSelectedPartChange;

  useEffect(() => {
    if (parts.length !== prevPartsLengthRef.current) {
      prevPartsLengthRef.current = parts.length;
      onParts(parts);
    }
  }, [parts, onParts]);

  useEffect(() => {
    selectRef.current = select;
  }, [select, selectRef]);

  const prevSelectedPartIdRef = useRef<string | null>(null);
  useEffect(() => {
    const curId = selectedPart?.id ?? null;
    if (curId !== prevSelectedPartIdRef.current) {
      prevSelectedPartIdRef.current = curId;
      onSelectedPartChangeRef.current?.(curId);
    }
  }, [selectedPart]);

  return null;
}

// ─── Precision SVG Glyphs for Professional CAD/Blender UI ───────────────────
export function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function IconMaterialLab() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

export function IconPartSplit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function IconSpatialScale() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

// ─── 3D Holographic CAD Bounding Cage with Live W × H × D Telemetry Badges ──
function SpatialDimensionCage({
  dimensions,
  scaleMultiplier,
}: {
  dimensions: [number, number, number];
  scaleMultiplier: number;
}) {
  const W = Math.max(0.25, Number((dimensions[0] * scaleMultiplier).toFixed(2)));
  const H = Math.max(0.25, Number((dimensions[1] * scaleMultiplier).toFixed(2)));
  const D = Math.max(0.25, Number((dimensions[2] * scaleMultiplier).toFixed(2)));

  const { boxGeo, cornerGeo } = useMemo(() => {
    const hx = W / 2;
    const hy = H;
    const hz = D / 2;

    const edges = new Float32Array([
      -hx, 0, -hz,  hx, 0, -hz,
       hx, 0, -hz,  hx, 0,  hz,
       hx, 0,  hz, -hx, 0,  hz,
      -hx, 0,  hz, -hx, 0, -hz,
      -hx, hy, -hz,  hx, hy, -hz,
       hx, hy, -hz,  hx, hy,  hz,
       hx, hy,  hz, -hx, hy,  hz,
      -hx, hy,  hz, -hx, hy, -hz,
      -hx, 0, -hz, -hx, hy, -hz,
       hx, 0, -hz,  hx, hy, -hz,
       hx, 0,  hz,  hx, hy,  hz,
      -hx, 0,  hz, -hx, hy,  hz,
    ]);
    const bGeo = new BufferGeometry();
    bGeo.setAttribute('position', new BufferAttribute(edges, 3));

    const cLen = Math.min(W, H, D) * 0.16;
    const corners: number[] = [];
    const xs = [-hx, hx];
    const ys = [0, hy];
    const zs = [-hz, hz];
    for (const x of xs) {
      const sx = x < 0 ? 1 : -1;
      for (const y of ys) {
        const sy = y === 0 ? 1 : -1;
        for (const z of zs) {
          const sz = z < 0 ? 1 : -1;
          corners.push(x, y, z, x + sx * cLen, y, z);
          corners.push(x, y, z, x, y + sy * cLen, z);
          corners.push(x, y, z, x, y, z + sz * cLen);
        }
      }
    }
    const cGeo = new BufferGeometry();
    cGeo.setAttribute('position', new BufferAttribute(new Float32Array(corners), 3));

    return { boxGeo: bGeo, cornerGeo: cGeo };
  }, [W, H, D]);

  useEffect(() => {
    return () => {
      boxGeo.dispose();
      cornerGeo.dispose();
    };
  }, [boxGeo, cornerGeo]);

  return (
    <group>
      <lineSegments geometry={boxGeo}>
        <lineBasicMaterial color="#38bdf8" transparent opacity={0.34} />
      </lineSegments>
      <lineSegments geometry={cornerGeo}>
        <lineBasicMaterial color="#2dd4bf" transparent opacity={0.95} />
      </lineSegments>

      <Html position={[0, 0.04, D / 2 + 0.14]} center distanceFactor={8}>
        <div className="lux-3d-dim-badge">
          <span>W</span> <strong>{W.toFixed(2)}m</strong>
        </div>
      </Html>

      <Html position={[W / 2 + 0.14, H * 0.5, D / 2]} center distanceFactor={8}>
        <div className="lux-3d-dim-badge accent">
          <span>H</span> <strong>{H.toFixed(2)}m</strong>
        </div>
      </Html>

      <Html position={[-W / 2 - 0.14, 0.04, 0]} center distanceFactor={8}>
        <div className="lux-3d-dim-badge">
          <span>D</span> <strong>{D.toFixed(2)}m</strong>
        </div>
      </Html>
    </group>
  );
}

export function IconSpotlight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

export function IconGimbal() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </svg>
  );
}

export function IconLift() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M12 3l-4 4M12 3l4 4M5 21h14" />
    </svg>
  );
}

export function IconScrubber() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function IconPalette() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 0 0-10 10c0 5.52 4.48 10 10 10a2.5 2.5 0 0 0 2.5-2.5c0-.68-.28-1.3-.73-1.74-.44-.45-.73-1.07-.73-1.76 0-1.38 1.12-2.5 2.5-2.5H17c2.76 0 5-2.24 5-5 0-4.42-4.48-8.5-10-8.5z" />
      <circle cx="8" cy="9.5" r="1.2" fill="currentColor" />
      <circle cx="12" cy="7.5" r="1.2" fill="currentColor" />
      <circle cx="16" cy="9.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function IconCalipers() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 6H3M21 12H3M21 18H3M7 6v12M17 6v12" />
    </svg>
  );
}

export function IconSlicer() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 2l10 20M17 2L7 22" />
    </svg>
  );
}

export function IconTurntable() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  );
}

export function IconCamera() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export function IconReset() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export function IconOrbit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="12" rx="9" ry="4" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
    </svg>
  );
}

export function IconExpand() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

export function IconHotspot() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function IconNotes() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

export function IconChevronDown({ className = '' }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ─── Responsive Camera Framing: Centers Model by Default on Desktop, Laptop & Mobile ──
export function ResponsiveCameraFraming({
  controlsRef,
  basePosition = [3.55, 2.05, 3.70],
  target = [0, 1.02, 0],
  modelKey = '',
}: {
  controlsRef?: React.RefObject<ComponentRef<typeof BlenderControls> | null>;
  basePosition?: [number, number, number];
  target?: [number, number, number];
  modelKey?: string;
}) {
  const { camera, size } = useThree();
  const prevKeyRef = useRef<string>('');

  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const key = `${modelKey}-${Math.round(size.width)}x${Math.round(size.height)}-${basePosition.join(',')}-${target.join(',')}`;
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    const vTarget = new Vector3(...target);
    const vBase = new Vector3(...basePosition);
    const vOffset = vBase.clone().sub(vTarget);

    let factor = 1.0;
    if (aspect < 1.3) {
      // Mobile / portrait screens: pull camera distance back so full model fits horizontally
      factor = Math.min(2.35, Math.max(1.15, 1.48 / aspect));
    } else {
      // Desktop & laptop screens:
      // Side panels take 280px left and 280px right (560px total).
      // Available width between panels is (size.width - 560).
      // Ensure the model never gets clipped by side panels on compact laptop screens
      const availableCenterWidth = Math.max(320, size.width - 560);
      if (availableCenterWidth < 460) {
        factor = Math.max(1.0, 460 / availableCenterWidth);
      }
      // Ensure tall models do not clip topbar or bottom dock on short laptop screens
      if (size.height < 520) {
        const heightFactor = Math.max(1.0, 520 / Math.max(320, size.height));
        factor = Math.max(factor, Math.min(1.22, heightFactor));
      }
    }

    const newPos = vTarget.clone().add(vOffset.multiplyScalar(factor));

    const perspCam = camera as unknown as { fov?: number; updateProjectionMatrix: () => void };
    if (perspCam.fov && perspCam.fov !== 40) {
      perspCam.fov = 40;
    }
    camera.up.set(0, 1, 0);
    camera.position.copy(newPos);
    camera.lookAt(vTarget);
    camera.updateProjectionMatrix();

    if (controlsRef?.current) {
      controlsRef.current.target.copy(vTarget);
      controlsRef.current.update();
      const ctrl = controlsRef.current as unknown as { saveState?: () => void };
      ctrl.saveState?.();
    }
  }, [size.width, size.height, camera, controlsRef, basePosition, target, modelKey]);

  return null;
}

// ─── Fighter-Jet Camera Turret & Lock-On Seeker for Gimbal Basketball ───────
export function GimbalCameraTurret({
  active,
  aim,
  ballPosRef,
  onHUDUpdate,
  isMobile = false,
}: {
  active: boolean;
  aim: JoystickValue;
  ballPosRef: React.MutableRefObject<Vector3>;
  onHUDUpdate: (info: {
    isLocked: boolean;
    screenX: number;
    screenY: number;
    distMeters: number;
    inFrustum: boolean;
    angleDeg: number;
    heading: number;
    pitch: number;
  }) => void;
  isMobile?: boolean;
}) {
  const { camera, size } = useThree();
  const aimForward = useRef(new Vector3());
  const targetDir = useRef(new Vector3());
  const tempVec = useRef(new Vector3());
  const wasActive = useRef(false);

  useFrame(() => {
    if (!active) {
      wasActive.current = false;
      return;
    }

    // Determine tactical camera station in front of flight zone
    // Zoomed out 25-30% more for wider field of view to easily track target
    const aspect = size.width / Math.max(1, size.height);
    const baseZ = aspect < 1.2 ? 14.2 : 11.2;
    const baseY = aspect < 1.2 ? 3.0 : 2.2;
    const basePos = new Vector3(0, baseY, baseZ);

    const perspCam = camera as unknown as { fov: number; updateProjectionMatrix: () => void };
    if (perspCam.fov !== 48) {
      perspCam.fov = 48;
      perspCam.updateProjectionMatrix();
    }

    if (!wasActive.current) {
      camera.position.copy(basePos);
      wasActive.current = true;
    } else {
      camera.position.lerp(basePos, 0.12);
    }

    // THE CAMERA IS THE TRACKER: rotation steered smoothly by user flight joystick
    // Left/Right joystick turns Camera Yaw (horizontal pan)
    // Up/Down joystick tilts Camera Pitch (vertical pitch)
    // Left/Right also applies subtle tactical aircraft bank roll
    const targetYaw = -aim.x * 0.95;   // ~54° yaw left/right
    const targetPitch = aim.y * 0.62;  // ~35° pitch up/down
    const targetRoll = -aim.x * 0.10;  // fighter jet banking

    camera.rotation.y += (targetYaw - camera.rotation.y) * 0.20;
    camera.rotation.x += (targetPitch - camera.rotation.x) * 0.20;
    camera.rotation.z += (targetRoll - camera.rotation.z) * 0.20;

    // Angular check for missile lock: ray passing through camera bore-sight reticle
    targetDir.current.copy(ballPosRef.current).sub(camera.position).normalize();
    // On mobile, the bore-sight reticle is elevated to top 31% (NDC Y +0.38) so controls don't block it
    const reticleNdcY = isMobile ? 0.38 : 0;
    const aimRay = aimForward.current.set(0, reticleNdcY, 0.5).unproject(camera).sub(camera.position).normalize();
    const angleRad = aimRay.angleTo(targetDir.current);
    const angleDeg = (angleRad * 180) / Math.PI;

    // Lock cone: within 0.18 radians (~10.3 degrees) = TARGET MISSILE LOCK!
    const isLocked = angleRad < 0.18;

    // Real-time screen-space projection of basketball
    tempVec.current.copy(ballPosRef.current).project(camera);
    const inFrustum = tempVec.current.z < 1;
    const screenX = (tempVec.current.x * 0.5 + 0.5) * 100;
    const screenY = (-tempVec.current.y * 0.5 + 0.5) * 100;
    const distMeters = Math.round(camera.position.distanceTo(ballPosRef.current) * 10) / 10;
    const heading = Math.round(((camera.rotation.y * (180 / Math.PI) * -1) % 360 + 360) % 360);
    const pitch = Math.round(camera.rotation.x * (180 / Math.PI));

    onHUDUpdate({ isLocked, screenX, screenY, distMeters, inFrustum, angleDeg, heading, pitch });
  });

  return null;
}

// ─── Viewport Director: 360° Turntable & Camera Focus Flight Animator ──────
export interface CameraFocusRequest {
  partId: string;
  point?: [number, number, number];
  nonce: number;
}

export function ViewportDirector({
  turntable,
  focusRequest,
  controlsRef,
}: {
  turntable: boolean;
  focusRequest: CameraFocusRequest | null;
  controlsRef: React.RefObject<ComponentRef<typeof BlenderControls> | null>;
}) {
  const { scene, camera } = useThree();
  const flightRef = useRef<{
    goalTarget: Vector3;
    goalCamera: Vector3;
    elapsed: number;
  } | null>(null);
  const lastNonceRef = useRef<number>(0);

  // Cancel flight on user pointer interaction
  useEffect(() => {
    const cancelFlight = () => { flightRef.current = null; };
    window.addEventListener('pointerdown', cancelFlight, { passive: true });
    window.addEventListener('wheel', cancelFlight, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', cancelFlight);
      window.removeEventListener('wheel', cancelFlight);
    };
  }, []);

  useEffect(() => {
    if (!focusRequest || focusRequest.nonce === lastNonceRef.current) return;
    lastNonceRef.current = focusRequest.nonce;

    let targetMesh: Mesh | null = null;
    scene.traverse((node) => {
      if (
        node instanceof Mesh &&
        (node.userData._skPartId === focusRequest.partId ||
          node.name === focusRequest.partId ||
          node.userData?.spatialId === focusRequest.partId ||
          focusRequest.partId.endsWith(`/${node.name}`))
      ) {
        targetMesh = node;
      }
    });
    if (!targetMesh) return;

    const mesh = targetMesh as Mesh;
    mesh.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(mesh);
    const goalTarget = new Vector3();

    if (focusRequest.point) {
      goalTarget.set(...focusRequest.point);
      mesh.localToWorld(goalTarget);
    } else {
      box.getCenter(goalTarget);
    }

    const size = box.getSize(new Vector3());
    const radius = Math.max(size.x, size.y, size.z, 0.8);
    const ctrl = controlsRef.current;
    const currentTarget = ctrl?.target ?? new Vector3(0, 1, 0);
    const offsetDir = camera.position.clone().sub(currentTarget);
    if (offsetDir.lengthSq() < 0.001) offsetDir.set(1, 0.65, 1);
    offsetDir.normalize();

    const idealDist = Math.min(Math.max(radius * 2.6, 3.4), 7.8);
    const goalCamera = goalTarget.clone().addScaledVector(offsetDir, idealDist);
    goalCamera.y = Math.max(goalTarget.y + 0.55, goalCamera.y);

    flightRef.current = {
      goalTarget,
      goalCamera,
      elapsed: 0,
    };
  }, [focusRequest, scene, camera, controlsRef]);

  useFrame((_, delta) => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    const dt = Math.min(delta, 0.05);

    if (flightRef.current) {
      const flight = flightRef.current;
      flight.elapsed += dt;
      const damp = 1 - Math.exp(-8.5 * dt);
      ctrl.target.lerp(flight.goalTarget, damp);
      camera.position.lerp(flight.goalCamera, damp);
      ctrl.update();

      if (
        flight.elapsed > 0.85 ||
        (ctrl.target.distanceToSquared(flight.goalTarget) < 0.002 &&
          camera.position.distanceToSquared(flight.goalCamera) < 0.005)
      ) {
        flightRef.current = null;
      }
      return;
    }

    if (turntable) {
      const offset = camera.position.clone().sub(ctrl.target);
      const angle = dt * 0.55;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const nextX = offset.x * cos - offset.z * sin;
      const nextZ = offset.x * sin + offset.z * cos;
      offset.x = nextX;
      offset.z = nextZ;
      camera.position.copy(ctrl.target).add(offset);
      ctrl.update();
    }
  });

  return null;
}

const FIXED_GIMBAL_COLORS = [
  '#070b14',
  '#0f172a',
  '#1e293b',
  '#111a2c',
  '#18181b',
  '#262626',
  '#312e81',
  '#134e4a',
  '#fed7aa',
  '#e2e8f0',
  '#eef2f9',
  '#f8fafc',
];

function isLightHex(hex: string): boolean {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (full.length !== 6) return false;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
}

// True small mobile phone viewports (<= 640px). Laptops, desktop PCs and tablets start fully OPENED!
function isPhoneViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 640;
}

export function Playground({
  model,
  onUpload,
  onDemo,
  uploading,
  uploadProgress,
  uploadError,
  onClearUploadError,
  theme,
  notes: propNotes,
  onNotesChange,
  onOpenGuide,
  onDownloadModel,
}: {
  model: ModelAsset;
  onUpload: (file: File) => void;
  onDemo: () => void;
  uploading: boolean;
  uploadProgress?: ModelUploadProgress | null;
  uploadError: string;
  onClearUploadError?: () => void;
  theme: 'light' | 'dark';
  notes?: Note[];
  onNotesChange?: (notes: Note[]) => void;
  onOpenGuide?: () => void;
  onDownloadModel?: () => void | Promise<string | void>;
}) {
  const controlsRef = useRef<ComponentRef<typeof BlenderControls>>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  void onNotesChange;

  // Mobile screen detection for responsive camera framing, layout & initial collapse state
  const [isMobile, setIsMobile] = useState(() => isPhoneViewport());

  // Active Tool Selection & Responsive Sidebar: Default to 'material' (Material & Surface Lab)
  const [activeTool, setActiveTool] = useState<string | null>('material');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Control rigs & panels: start OPENED (false) on desktop/laptop screens (> 640px), collapsed ONLY on mobile phones (<= 640px)
  const [consoleMinimized, setConsoleMinimized] = useState(() => isPhoneViewport());

  useEffect(() => {
    const handleResize = () => {
      const mobile = isPhoneViewport();
      setIsMobile((prev) => {
        if (prev !== mobile) {
          setConsoleMinimized(mobile);
        }
        return mobile;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [parts, setParts] = useState<SpatialPart[]>([]);
  const selectRef = useRef<(target: string | null) => void>(() => {});
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<CameraFocusRequest | null>(null);

  function triggerCameraFocus(partId: string, point?: [number, number, number]) {
    setFocusRequest({ partId, point, nonce: Date.now() + Math.random() });
  }

  // Reset model-specific selection & physics when switching models without changing activeTool
  useEffect(() => {
    setSelectedPartId(null);
    setFocusRequest(null);
    setAutoExplodePulse(false);
    setProceduralExplode(0);
    setSurfaceMode('pbr');
    setSurfaceRoughness(0.42);
    setSurfaceMetalness(0.28);
    setPbrCustomized(false);
    setWireframeOverlay(false);
    setScaleMultiplier(1.0);
    setZeroGEnabled(false);
    setManualAltitude(0);
  }, [model.id]);

  const isMobileElevationTool = isMobile && Boolean(activeTool);
  const mobileModelYOffset = isMobileElevationTool ? 1.05 : 0;

  // Material & Surface Lab State ('material')
  const [surfaceMode, setSurfaceMode] = useState<SurfaceFinishMode>('pbr');
  const [surfaceRoughness, setSurfaceRoughness] = useState(0.42);
  const [surfaceMetalness, setSurfaceMetalness] = useState(0.28);
  const [pbrCustomized, setPbrCustomized] = useState(false);
  const [wireframeOverlay, setWireframeOverlay] = useState(false);

  const materialConfig = useMemo<MaterialOverrideConfig | undefined>(() => {
    if (surfaceMode === 'pbr' && !wireframeOverlay && !pbrCustomized) {
      return undefined;
    }
    return {
      mode: surfaceMode,
      roughness: pbrCustomized ? surfaceRoughness : undefined,
      metalness: pbrCustomized ? surfaceMetalness : undefined,
      wireframeOverlay,
    };
  }, [surfaceMode, surfaceRoughness, surfaceMetalness, pbrCustomized, wireframeOverlay]);

  // Spatial Scale, Telemetry & Zero-G Physics State ('spatial')
  const [scaleMultiplier, setScaleMultiplier] = useState(1.0);
  const [showDimensionCage, setShowDimensionCage] = useState(true);
  const [zeroGEnabled, setZeroGEnabled] = useState(false);
  const [manualAltitude, setManualAltitude] = useState(0.0);
  const [dropTestTrigger, setDropTestTrigger] = useState(0);
  const [telemetry, setTelemetry] = useState<ModelTelemetryStats>({
    triangles: 48200,
    vertices: 24100,
    parts: 10,
    dimensions: [1.85, 2.48, 2.35],
  });

  // Part Split & Radial 3D Explode State ('explode')
  const [showExplodeVectors, setShowExplodeVectors] = useState(true);
  const [autoExplodePulse, setAutoExplodePulse] = useState(false);
  const [downloadingModel, setDownloadingModel] = useState(false);

  async function handleDownloadModel() {
    if (downloadingModel) return;
    setDownloadingModel(true);
    try {
      let savedName: string | void;
      if (onDownloadModel) {
        savedName = await onDownloadModel();
      } else {
        savedName = await downloadModelFromSource({
          file: model.file,
          sourceUrl: model.sourceUrl,
          fallbackPath: `/${model.filename || 'pump.glb'}`,
          nameOrFilename: model.object ? (model.filename || model.name) : model.filename,
        });
      }
      setSnapshotToast(savedName ? `Downloaded ${savedName}` : 'Downloaded 3D model (.glb)');
      setTimeout(() => setSnapshotToast(null), 2600);
    } catch (e) {
      console.error('Failed to download model:', e);
      setSnapshotToast('Model download failed. Please try again.');
      setTimeout(() => setSnapshotToast(null), 2800);
    } finally {
      setDownloadingModel(false);
    }
  }

  function handleOpenGuide() {
    if (onOpenGuide) {
      onOpenGuide();
    } else {
      const snippet = generateComponent(model, propNotes ?? []);
      navigator.clipboard.writeText(snippet);
      setSnapshotToast('React component code copied to clipboard!');
      setTimeout(() => setSnapshotToast(null), 2500);
    }
  }

  // Mechanical Rig State
  // Default lightDial to 0.0 (0° at 12 o'clock) so turning clockwise orbits the spotlight clockwise
  const [lightDial, setLightDial] = useState(0.0);
  const [lightBrightness, setLightBrightness] = useState(0.55); // Default in the middle!
  const [lightHeight, setLightHeight] = useState(0.55); // Default spotlight elevation in the middle!
  const [targetAim, setTargetAim] = useState<JoystickValue>({ x: 0, y: 0 });
  const ballPositionRef = useRef(new Vector3(0, 2, 0));
  const [gimbalHUD, setGimbalHUD] = useState({
    isLocked: false,
    screenX: 50,
    screenY: 50,
    distMeters: 8.5,
    inFrustum: true,
    angleDeg: 0,
    heading: 0,
    pitch: 0,
  });
  const [gimbalBg, setGimbalBg] = useState(() => (theme === 'dark' ? '#070b14' : '#eef2f9'));

  const [proceduralExplode, setProceduralExplode] = useState(0);

  // Smooth Auto-Pulse Explode breathing animation loop when toggled ON
  useEffect(() => {
    if (!autoExplodePulse) return;
    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const val = 0.36 + Math.sin(elapsed * 2.1) * 0.32;
      setProceduralExplode(Number(Math.max(0.02, Math.min(0.95, val)).toFixed(3)));
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [autoExplodePulse]);

  // Studio Lighting & Custom Color Backdrop
  const [envPreset, setEnvPreset] = useState<StudioEnvironmentPreset>('showroom');
  const [customStudioBg, setCustomStudioBg] = useState<string | null>(null);
  const [hexInputText, setHexInputText] = useState(() => (theme === 'dark' ? '070b14' : 'eef2f9'));
  const [showGrid, setShowGrid] = useState(true);

  // Sync 3D space background with Light / Dark mode toggle
  useEffect(() => {
    const nextDefault =
      theme === 'dark'
        ? ENVIRONMENT_PRESETS[envPreset].bgDark
        : ENVIRONMENT_PRESETS[envPreset].bgLight;
    setCustomStudioBg(null);
    setGimbalBg(theme === 'dark' ? '#070b14' : '#eef2f9');
    setHexInputText(nextDefault.replace('#', ''));
  }, [theme, envPreset]);

  // Showcase Features
  const [turntable, setTurntable] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);
  const [snapshotPreview, setSnapshotPreview] = useState<{ url: string; filename: string } | null>(null);

  // Slicer Cross-Section Tool: Defaults to 1.00 so full model is 100% visible by default!
  // In CAD & 3D printing, Z is the vertical height axis (Top-to-Bottom slicing plane)
  const [crossSectionEnabled, setCrossSectionEnabled] = useState(false);
  const [sectionAxis, setSectionAxis] = useState<'x' | 'y' | 'z'>('z');
  const [sectionOffset, setSectionOffset] = useState(1.0);

  // Tool Selection with immediate single-tap activation
  function selectTool(toolName: string) {
    if (activeTool === toolName) {
      setConsoleMinimized((m) => !m);
      return;
    }
    if (toolName !== 'explode') {
      setAutoExplodePulse(false);
      if (selectedPartId) {
        setSelectedPartId(null);
        selectRef.current(null);
      }
    }
    setActiveTool(toolName);
    setConsoleMinimized(false);
    setCrossSectionEnabled(toolName === 'slicer');
    if (toolName === 'explode' && proceduralExplode === 0) {
      setProceduralExplode(0.35);
    }
  }

  const env = ENVIRONMENT_PRESETS[envPreset];
  const defaultBg = theme === 'dark' ? env.bgDark : env.bgLight;

  // Pitch black dark-room environment for spotlight inspection
  const isSpotlightMode = activeTool === 'light';
  const canvasBg = isSpotlightMode
    ? '#010408'
    : activeTool === 'gimbal'
      ? gimbalBg
      : (customStudioBg ?? defaultBg);
  const isLightCanvas = isLightHex(canvasBg);
  const gridPrimary = isLightCanvas
    ? envPreset === 'warm'
      ? '#d6d3d1'
      : '#b8c7e0'
    : env.gridPrimary;
  const gridSecondary = isLightCanvas
    ? envPreset === 'warm'
      ? '#e7e5e4'
      : '#d5e0f2'
    : env.gridSecondary;

  // Derive active model control from selected tool
  const activeModelControl: ActiveModelControl = useMemo(() => {
    if (activeTool === 'light') return 'light';
    if (activeTool === 'gimbal') return 'target';
    if (activeTool === 'spatial') return 'spatial';
    if (activeTool === 'explode') return 'scrub';
    return 'none';
  }, [activeTool]);

  // Slicing plane:
  // In CAD & 3D printing, Z is vertical height (slices top to bottom)
  // X is width (slices left to right)
  // Y is depth (slices front to back)
  const clippingPlanes = useMemo(() => {
    if (activeTool !== 'slicer' || !crossSectionEnabled) return undefined;
    if (sectionAxis === 'z') {
      const normal = new Vector3(0, -1, 0);
      // Default offset 1.0 shows 100% full unclipped model (including valve handwheel at top)
      const constant = sectionOffset * 2.45 + 2.4;
      return [new Plane(normal, constant)];
    }
    if (sectionAxis === 'x') {
      const normal = new Vector3(-1, 0, 0);
      const constant = sectionOffset * 2.6 + 0.6;
      return [new Plane(normal, constant)];
    }
    const normal = new Vector3(0, 0, -1);
    const constant = sectionOffset * 2.6 + 0.6;
    return [new Plane(normal, constant)];
  }, [activeTool, crossSectionEnabled, sectionAxis, sectionOffset]);

  // Target missile lock status derived directly from camera turret angular aim
  const isTargetLocked = gimbalHUD.isLocked;

  const canvasCaptureRef = useRef<(() => string | null) | null>(null);

  function captureStudioSnapshot() {
    const canvas = viewportRef.current?.querySelector('canvas');
    if (!canvas) return;
    try {
      setShutterFlash(true);
      setTimeout(() => setShutterFlash(false), 260);
      const captured = canvasCaptureRef.current ? canvasCaptureRef.current() : null;
      const url = captured || canvas.toDataURL('image/png');
      const filename = `${publicFilename(model.name)}-studio-snapshot.png`;
      setSnapshotPreview({ url, filename });
    } catch {
      setSnapshotToast('Snapshot capture unavailable.');
    }
  }

  function handleDownloadSnapshot() {
    if (!snapshotPreview) return;
    const a = document.createElement('a');
    a.href = snapshotPreview.url;
    a.download = snapshotPreview.filename;
    a.click();
    setSnapshotToast('Snapshot downloaded!');
  }

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        controlsRef.current?.reset();
      } else if (e.key === 'Escape') {
        if (snapshotPreview) {
          setSnapshotPreview(null);
          return;
        }
        if (selectedPartId) {
          setSelectedPartId(null);
          selectRef.current(null);
          return;
        }
        if (sidebarOpen) {
          setSidebarOpen(false);
          return;
        }
        setActiveTool(null);
        setCrossSectionEnabled(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen, snapshotPreview, selectedPartId]);

  function handleSurfaceClick(hit: SurfaceHit) {
    const partId = hit.part.id;
    if (selectedPartId === partId) {
      setSelectedPartId(null);
      selectRef.current(null);
    } else {
      setSelectedPartId(partId);
      selectRef.current(partId);
    }
  }

  return (
    <main className="playground-workspace" ref={viewportRef} aria-label="SpatialKit 3D Playground">
      {shutterFlash && <div className="viewport-shutter-flash" aria-hidden="true" />}

      {/* ─── Topbar HUD Overlay: Right Actions Only (Clean & Uncluttered Viewport) ─── */}
      <div className="playground-topbar" style={{ justifyContent: 'flex-end' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".glb,.gltf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onUpload(file);
          }}
        />

        <div className="playground-top-actions">
          {model.object && (
            <button
              type="button"
              className="playground-top-btn"
              onClick={onDemo}
              title="Switch back to default model"
            >
              <span>↶ Default Model</span>
            </button>
          )}
          <button
            type="button"
            className="playground-top-btn"
            onClick={() => controlsRef.current?.reset()}
            title="Reset Camera View [R]"
          >
            <IconReset />
            <span>Reset [R]</span>
          </button>
          <button
            type="button"
            className={`playground-top-btn ${sidebarOpen ? 'active' : ''}`}
            onClick={() => setSidebarOpen((s) => !s)}
            title="Tools & Rigs Sidebar"
          >
            <span>☰ Tools</span>
          </button>
        </div>
      </div>

      {/* ─── Bottom-Left 3D Model Credit Badge & Download Action ─── */}
      <div className="playground-credit-stack">
        <div className="playground-credit-badge" role="contentinfo" aria-label="3D Model Attribution">
          <span className="credit-icon">©</span>
          {model.object ? (
            <span className="credit-text" title={model.name}>
              <span>Model:</span> <strong className="credit-name">{model.name}</strong>
            </span>
          ) : activeTool === 'gimbal' ? (
            <span className="credit-text">
              <span>Model from</span> <a href="https://sketchfab.com/ikagogava" target="_blank" rel="noreferrer">Ika Gogava</a>
            </span>
          ) : (
            <span className="credit-text">
              <span>Model from</span> <strong className="credit-name">SpatialKit</strong>
            </span>
          )}
        </div>
        <button
          type="button"
          className="playground-download-btn"
          onClick={handleDownloadModel}
          disabled={downloadingModel}
          title={`Download ${model.object ? model.name : 'PX–04 Pump'} (.glb)`}
          aria-label="Download active 3D model as GLB"
        >
          <IconDownload />
          <span>{downloadingModel ? 'Downloading…' : 'Download GLB'}</span>
        </button>
      </div>

      {snapshotToast && (
        <div className="snapshot-toast" role="status">
          <span>📷</span> {snapshotToast}
        </div>
      )}

      {/* ─── Real-Time 3D Model Upload Spinner & Progress Bar Overlay ─── */}
      {uploading && (
        <div
          className="model-upload-overlay"
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5, 9, 18, 0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: 20,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 380,
              background: 'rgba(15, 23, 42, 0.96)',
              border: '1px solid rgba(88, 221, 186, 0.35)',
              borderRadius: 14,
              padding: '22px 24px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75), 0 0 28px rgba(88, 221, 186, 0.16)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
            }}
          >
            {/* Spinning Wheel + Progress Ring */}
            <div style={{ position: 'relative', width: 58, height: 58, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg
                width="58"
                height="58"
                viewBox="0 0 58 58"
                style={{ animation: 'sk-spin 1.1s linear infinite', position: 'absolute', inset: 0 }}
              >
                <style>{`@keyframes sk-spin { to { transform: rotate(360deg); } }`}</style>
                <circle
                  cx="29"
                  cy="29"
                  r="24"
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.18)"
                  strokeWidth="4"
                />
                <circle
                  cx="29"
                  cy="29"
                  r="24"
                  fill="none"
                  stroke="#58ddba"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="48 110"
                />
              </svg>
              <span style={{ font: '700 12px "JetBrains Mono", monospace', color: '#58ddba' }}>
                {uploadProgress?.percent ?? 0}%
              </span>
            </div>

            <div style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ font: '700 13px "Manrope", sans-serif', color: '#f8fafc', marginBottom: 4 }}>
                {uploadProgress?.stage || 'Preparing 3D Model…'}
              </div>
              <div style={{ font: '500 10.5px "JetBrains Mono", monospace', color: '#94a3b8' }}>
                UP TO {MAX_MODEL_MB} MB · 100% LOCAL IN BROWSER
              </div>
            </div>

            {/* Accurate Progress Bar Track */}
            <div
              style={{
                width: '100%',
                height: 8,
                borderRadius: 999,
                background: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.max(3, Math.min(100, uploadProgress?.percent ?? 5))}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, #58ddba, #38bdf8)',
                  boxShadow: '0 0 12px rgba(88, 221, 186, 0.5)',
                  transition: 'width 0.18s ease-out',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Upload Error Banner (So invalid / oversized models never fail silently) ─── */}
      {uploadError && !uploading && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            top: 66,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 110,
            maxWidth: 'calc(100% - 32px)',
            background: 'rgba(127, 29, 29, 0.95)',
            border: '1px solid rgba(248, 113, 113, 0.55)',
            borderRadius: 10,
            padding: '10px 14px',
            color: '#fecaca',
            font: '600 12px "Manrope", sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 14px 36px rgba(0, 0, 0, 0.55)',
          }}
        >
          <span>⚠️ {uploadError}</span>
          {onClearUploadError && (
            <button
              type="button"
              onClick={onClearUploadError}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fecaca',
                fontSize: 15,
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: 1,
              }}
              aria-label="Dismiss upload error"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* ─── Tactical Gimbal HUD Overlay (Fighter-Jet Camera Turret & Missile Lock) ─── */}
      {activeModelControl === 'target' && (
        <div className="target-hud-overlay" aria-hidden="true">
          <div className="hud-top-tape">
            <span className="tape-heading">✦ GIMBAL CAMERA TRACKER</span>
            <span>HDG {gimbalHUD.heading.toString().padStart(3, '0')}° · PITCH {gimbalHUD.pitch >= 0 ? `+${gimbalHUD.pitch}` : gimbalHUD.pitch}°</span>
            <span className={`hud-status-badge ${gimbalHUD.isLocked ? 'locked' : ''}`}>
              {gimbalHUD.isLocked ? '● TARGET LOCKED' : '○ ACQUIRING TARGET'}
            </span>
          </div>

          {/* Real-time tracking bracket framing the moving basketball across 3D space: ORANGE -> GREEN */}
          {gimbalHUD.inFrustum && (
            <div
              className={`hud-target-bracket ${gimbalHUD.isLocked ? 'is-locked' : ''}`}
              style={{
                position: 'absolute',
                left: `${gimbalHUD.screenX}%`,
                top: `${gimbalHUD.screenY}%`,
                transform: 'translate(-50%, -50%)',
                width: 124,
                height: 124,
                pointerEvents: 'none',
                border: `2px ${gimbalHUD.isLocked ? 'solid #10b981' : 'dashed #f59e0b'}`,
                borderRadius: 8,
                boxShadow: gimbalHUD.isLocked ? '0 0 18px rgba(16, 185, 129, 0.45)' : undefined,
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <span
                className="bracket-label"
                style={{
                  borderColor: gimbalHUD.isLocked ? '#10b981' : '#f59e0b',
                  color: gimbalHUD.isLocked ? '#10b981' : '#f59e0b',
                  background: gimbalHUD.isLocked ? 'rgba(6, 78, 59, 0.92)' : 'rgba(15, 23, 42, 0.88)',
                }}
              >
                {gimbalHUD.isLocked
                  ? `● BASKETBALL LOCKED · ${gimbalHUD.distMeters}m [MISSILE LOCK]`
                  : `○ ACQUIRING BASKETBALL · ${gimbalHUD.distMeters}m (${gimbalHUD.angleDeg.toFixed(1)}° OFF)`}
              </span>
              <div className="bracket-corner tl" style={{ borderColor: gimbalHUD.isLocked ? '#10b981' : '#f59e0b' }} />
              <div className="bracket-corner tr" style={{ borderColor: gimbalHUD.isLocked ? '#10b981' : '#f59e0b' }} />
              <div className="bracket-corner bl" style={{ borderColor: gimbalHUD.isLocked ? '#10b981' : '#f59e0b' }} />
              <div className="bracket-corner br" style={{ borderColor: gimbalHUD.isLocked ? '#10b981' : '#f59e0b' }} />
            </div>
          )}

          {/* Optical crosshair fixed to camera bore-sight: elevated on mobile to clear bottom controls */}
          <div
            className="hud-reticle-center"
            style={{
              position: 'absolute',
              left: '50%',
              top: isMobile ? '31%' : '50%',
              transform: 'translate(-50%, -50%)',
              width: 90,
              height: 90,
              pointerEvents: 'none',
            }}
          >
            <svg className="hud-crosshair-svg" viewBox="0 0 90 90">
              <circle
                cx="45"
                cy="45"
                r="30"
                fill="none"
                stroke={gimbalHUD.isLocked ? '#10b981' : '#f59e0b'}
                strokeWidth="1.5"
                strokeDasharray={gimbalHUD.isLocked ? undefined : '6 4'}
              />
              <circle
                cx="45"
                cy="45"
                r="3.5"
                fill={gimbalHUD.isLocked ? '#10b981' : '#f59e0b'}
              />
              {gimbalHUD.isLocked && (
                <rect
                  x="39"
                  y="39"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.5"
                />
              )}
              <line x1="45" y1="5" x2="45" y2="24" stroke={gimbalHUD.isLocked ? '#10b981' : '#f59e0b'} strokeWidth="1.5" />
              <line x1="45" y1="66" x2="45" y2="85" stroke={gimbalHUD.isLocked ? '#10b981' : '#f59e0b'} strokeWidth="1.5" />
              <line x1="5" y1="45" x2="24" y2="45" stroke={gimbalHUD.isLocked ? '#10b981' : '#f59e0b'} strokeWidth="1.5" />
              <line x1="66" y1="45" x2="85" y2="45" stroke={gimbalHUD.isLocked ? '#10b981' : '#f59e0b'} strokeWidth="1.5" />
            </svg>
          </div>

          <div className="hud-bottom-tape">
            <span>AZIMUTH: {(-targetAim.x * 54).toFixed(1)}°</span>
            <span>ELEVATION: {(targetAim.y * 35).toFixed(1)}°</span>
            <span>LOCK CONE: {gimbalHUD.angleDeg.toFixed(1)}° / 10.3°</span>
          </div>
        </div>
      )}

      {/* ─── 3D Canvas with Responsive Camera Framing for Mobile & Desktop ─── */}
      <Canvas
        dpr={typeof window !== 'undefined' ? Math.min(1.25, window.devicePixelRatio || 1) : 1}
        performance={{ min: 0.5 }}
        camera={{ position: [3.55, 2.05, 3.70], fov: 40 }}
        gl={{
          localClippingEnabled: true,
          // preserveDrawingBuffer removed for 3x hardware page-flipping fillrate
          powerPreference: 'high-performance',
        }}
        onPointerMissed={() => {
          if (selectedPartId) {
            setSelectedPartId(null);
            selectRef.current(null);
          }
        }}
      >
        <color attach="background" args={[canvasBg]} />
        <ambientLight intensity={isSpotlightMode ? 0.02 : env.ambient} />
        <hemisphereLight args={[env.hemiSky, env.hemiGround, isSpotlightMode ? 0.02 : env.hemiIntensity]} />
        <directionalLight position={env.keyPos} intensity={isSpotlightMode ? 0.03 : env.keyIntensity} color={env.keyColor} />
        <directionalLight position={env.fillPos} intensity={isSpotlightMode ? 0.02 : env.fillIntensity} color={env.fillColor} />
        {env.rimPos && !isSpotlightMode && (
          <directionalLight position={env.rimPos} intensity={env.rimIntensity ?? 1.5} color={env.rimColor ?? '#ffffff'} />
        )}

        <Suspense fallback={<Html center><div className="scene-message">Preparing Playground…</div></Html>}>
          <SpatialProvider>
            <group position={[0, mobileModelYOffset, 0]}>
              <InteractiveModelRig
                activeControl={activeModelControl}
                lightDial={lightDial}
                lightBrightness={lightBrightness}
                lightHeight={lightHeight}
                zeroGEnabled={activeTool === 'spatial' && zeroGEnabled}
                manualAltitude={activeTool === 'spatial' ? manualAltitude : 0}
                dropTestTrigger={dropTestTrigger}
                ballPositionRef={ballPositionRef}
              >
                {model.object ? (
                  <group scale={activeTool === 'gimbal' ? 1.6 / MODEL_FIT : activeTool === 'spatial' ? scaleMultiplier : 1}>
                    <SelectableObject
                      object={model.object}
                      animations={model.animations}
                      explode={activeTool === 'explode' ? proceduralExplode : 0}
                      showExplodeVectors={activeTool === 'explode' && showExplodeVectors}
                      materialConfig={materialConfig}
                      onTelemetry={setTelemetry}
                      fastFlight={activeTool === 'gimbal'}
                      clippingPlanes={clippingPlanes}
                      modelId={model.id}
                      modelName={model.name}
                      segmentSingleMesh
                      fit={MODEL_FIT}
                      onSurfaceClick={handleSurfaceClick}
                    />
                  </group>
                ) : activeTool === 'gimbal' ? (
                  /* Dynamic Target: Basketball flying across 3D space */
                  <SelectableModel
                    src="/models/basketball.glb"
                    modelId="basketball"
                    fit={1.6}
                    materialConfig={materialConfig}
                    fastFlight
                    onSurfaceClick={handleSurfaceClick}
                  />
                ) : (
                  <group scale={activeTool === 'spatial' ? scaleMultiplier : 1}>
                    <SelectableModel
                      src="/pump.glb"
                      modelId="pump"
                      modelName={model.name}
                      fit={MODEL_FIT}
                      explode={activeTool === 'explode' ? proceduralExplode : 0}
                      showExplodeVectors={activeTool === 'explode' && showExplodeVectors}
                      materialConfig={materialConfig}
                      onTelemetry={setTelemetry}
                      clippingPlanes={clippingPlanes}
                      onSurfaceClick={handleSurfaceClick}
                    />
                  </group>
                )}

                {activeTool === 'spatial' && showDimensionCage && (
                  <SpatialDimensionCage
                    dimensions={telemetry.dimensions}
                    scaleMultiplier={scaleMultiplier}
                  />
                )}
              </InteractiveModelRig>

              <SceneBridge
                onParts={setParts}
                selectRef={selectRef}
                onSelectedPartChange={(partId) => {
                  setSelectedPartId(partId);
                }}
              />
            </group>
          </SpatialProvider>

          <ContactShadows
            key={model.id}
            position={[0, mobileModelYOffset - 0.012, 0]}
            opacity={isSpotlightMode ? 0.2 : env.shadowOpacity}
            scale={14}
            blur={2.4}
            far={5}
            resolution={256}
            frames={1}
          />
        </Suspense>

        {showGrid && !isSpotlightMode && env.showGrid && (
          <gridHelper args={[20, 40, gridPrimary, gridSecondary]} position={[0, mobileModelYOffset - 0.025, 0]} />
        )}

        <AdaptiveDpr />
        <CanvasCaptureBridge captureRef={canvasCaptureRef} />

        <BlenderControls
          ref={controlsRef}
          makeDefault
          enabled={activeTool !== 'gimbal'}
          target={
            activeTool === 'gimbal'
              ? [0, 2.0, 0]
              : isMobileElevationTool
              ? [0, 0.35, 0]
              : [0, 1.02, 0]
          }
          minDistance={1.8}
          maxDistance={28}
          enableDamping
        />

        {/* Responsive camera director: handles vertical centering on other tools; bypassed during Gimbal turret piloting */}
        {activeTool !== 'gimbal' && (
          <ResponsiveCameraFraming
            controlsRef={controlsRef}
            modelKey={model.id}
            basePosition={isMobile ? (isMobileElevationTool ? [5.4, 3.6, 5.6] : [5.4, 3.2, 5.6]) : [3.55, 2.05, 3.70]}
            target={isMobileElevationTool ? [0, 0.35, 0] : [0, 1.02, 0]}
          />
        )}

        {/* Fighter-Jet Camera Turret & Lock-On Seeker: steers camera with joystick */}
        {activeTool === 'gimbal' && (
          <GimbalCameraTurret
            active={activeTool === 'gimbal'}
            aim={targetAim}
            ballPosRef={ballPositionRef}
            onHUDUpdate={setGimbalHUD}
            isMobile={isMobile}
          />
        )}

        <ViewportDirector turntable={turntable} focusRequest={focusRequest} controlsRef={controlsRef} />
      </Canvas>

      {/* ─── Left Stack: Standalone Top-Left Gradient Light-Black Upload Button ─── */}
      <div className="playground-left-stack">
        <button
          type="button"
          className="playground-upload-cta top-left-corner"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title={`Upload your own 3D model (.glb / .gltf up to ${MAX_MODEL_MB} MB)`}
        >
          <span className="upload-cta-main">
            <span className="upload-cta-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </span>
            <span className="upload-cta-text">
              <strong>{uploading ? `Uploading ${uploadProgress?.percent ?? 0}%…` : 'Upload 3D Model'}</strong>
              <small>.GLB / .GLTF · UP TO {MAX_MODEL_MB}MB</small>
            </span>
          </span>
          <span className="upload-cta-badge">↑ Browse</span>
        </button>
      </div>

      {/* ─── Floating Tool Console (Docked to Bottom-Right on Desktop, Compact on Mobile) ─── */}
      {activeTool && (
        <aside
          className={`playground-active-console ${consoleMinimized ? 'minimized' : ''} ${activeTool === 'material' || activeTool === 'spatial' || activeTool === 'explode' ? 'inspector-console' : ''}`}
          role="region"
          aria-label="Active Tool Console"
        >
          <div
            className="console-drag-handle"
            onClick={() => setConsoleMinimized((m) => !m)}
            title="Tap to toggle controls"
          />

          <div className="console-header">
            <div
              className="console-header-title"
              onClick={() => setConsoleMinimized((m) => !m)}
              style={{ cursor: 'pointer' }}
            >
              <strong>
                {activeTool === 'material' && '✦ MATERIAL & SURFACE LAB'}
                {activeTool === 'light' && '✦ INSPECTION SPOTLIGHT RIG'}
                {activeTool === 'gimbal' && '✦ 3D FLIGHT GIMBAL TRACKER'}
                {activeTool === 'spatial' && '✦ SPATIAL SCALE & ZERO-G PHYSICS'}
                {activeTool === 'explode' && '✦ PART SPLIT & 3D EXPLODE'}
                {activeTool === 'studio' && '✦ STUDIO LIGHTING & BACKDROP'}
                {activeTool === 'slicer' && '✦ CROSS-SECTION SLICING PLANE'}
              </strong>
              <span>
                {activeTool === 'material' && `SHADER: ${surfaceMode.toUpperCase()} · ROUGHNESS: ${Math.round(surfaceRoughness * 100)}% · METAL: ${Math.round(surfaceMetalness * 100)}%`}
                {activeTool === 'light' && `ORBIT: ${Math.round(lightDial * 360)}° · BRIGHTNESS: ${Math.round(lightBrightness * 100)}% · HEIGHT: ${(0.35 + lightHeight * 3.75).toFixed(1)}m`}
                {activeTool === 'gimbal' && `AIM: [${(targetAim.x * 100).toFixed(0)}, ${(targetAim.y * 100).toFixed(0)}] · ${isTargetLocked ? 'LOCKED' : 'TRACKING'} · COLOR: ${gimbalBg}`}
                {activeTool === 'spatial' && `${(telemetry.triangles / 1000).toFixed(1)}K TRIS · ${scaleMultiplier.toFixed(2)}X SCALE · ${zeroGEnabled ? 'ZERO-G FLOAT' : 'STAGE FLOOR'}`}
                {activeTool === 'explode' && `${parts.length || telemetry.parts} SUB-PARTS · SPREAD: ${Math.round(proceduralExplode * 100)}%`}
                {activeTool === 'studio' && `PRESET: ${env.label} · COLOR: ${canvasBg}`}
                {activeTool === 'slicer' && `AXIS: ${sectionAxis.toUpperCase()} · OFFSET: ${sectionOffset.toFixed(2)}`}
              </span>
            </div>

            <div className="console-header-actions">
              <button
                type="button"
                className="console-minimize-btn"
                onClick={() => setConsoleMinimized((m) => !m)}
                title={consoleMinimized ? 'Expand controls' : 'Collapse controls'}
                aria-label={consoleMinimized ? 'Expand controls' : 'Collapse controls'}
              >
                <IconChevronDown className={consoleMinimized ? 'rotate-180' : ''} />
              </button>
            </div>
          </div>

          <SmoothScrollArea
            className="console-body"
            style={{
              width: '100%',
              display: consoleMinimized ? 'none' : 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Material & Surface Lab ('material') */}
            {activeTool === 'material' && (
              <div className="lux-tool-console-stack">
                <div className="lux-console-section-header">
                  <span>SURFACE SHADER PRESET</span>
                  <span className="lux-console-badge">{surfaceMode.toUpperCase()}</span>
                </div>

                <div className="lux-finish-grid">
                  {([
                    { id: 'pbr', label: 'Standard PBR', sub: 'Original GLB Textures', swatch: 'linear-gradient(135deg, #38bdf8, #14b8a6)' },
                    { id: 'wireframe', label: 'Topology X-Ray', sub: 'Cyan Quad/Tri Mesh', swatch: 'linear-gradient(135deg, #0ea5e9, #0284c7)' },
                    { id: 'clay', label: 'Studio Clay', sub: 'Matte Sculpt Inspection', swatch: 'linear-gradient(135deg, #cbd5e1, #64748b)' },
                    { id: 'chrome', label: 'Liquid Chrome', sub: 'Mirror Specular Finish', swatch: 'linear-gradient(135deg, #f8fafc, #94a3b8)' },
                    { id: 'hologram', label: 'Cyber Hologram', sub: 'Emissive Holo Field', swatch: 'linear-gradient(135deg, #2dd4bf, #0284c7)' },
                    { id: 'glass', label: 'Frosted Acrylic', sub: 'Translucent Shell', swatch: 'linear-gradient(135deg, #e0f2fe, #38bdf8)' },
                  ] as const).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`lux-finish-btn ${surfaceMode === item.id ? 'active' : ''}`}
                      onClick={() => setSurfaceMode(item.id)}
                    >
                      <span className="lux-finish-swatch" style={{ background: item.swatch }} />
                      <span className="lux-finish-meta">
                        <strong>{item.label}</strong>
                        <small>{item.sub}</small>
                      </span>
                    </button>
                  ))}
                </div>

                <div className="lux-toggle-row">
                  <button
                    type="button"
                    className={`lux-pill-toggle ${wireframeOverlay ? 'active' : ''}`}
                    onClick={() => setWireframeOverlay((w) => !w)}
                  >
                    <span>⬡ Topology Wireframe Overlay</span>
                    <strong>{wireframeOverlay ? 'ON' : 'OFF'}</strong>
                  </button>
                </div>

                <div className="lux-slider-group">
                  <div className="lux-slider-header">
                    <span>SURFACE ROUGHNESS (GLOSS ↔ MATTE)</span>
                    <strong>{Math.round(surfaceRoughness * 100)}%</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={surfaceRoughness}
                    onChange={(e) => {
                      setPbrCustomized(true);
                      setSurfaceRoughness(parseFloat(e.target.value));
                    }}
                    className="lux-range-slider"
                  />
                </div>

                <div className="lux-slider-group">
                  <div className="lux-slider-header">
                    <span>METALLIC SHEEN (DIELECTRIC ↔ METAL)</span>
                    <strong>{Math.round(surfaceMetalness * 100)}%</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={surfaceMetalness}
                    onChange={(e) => {
                      setPbrCustomized(true);
                      setSurfaceMetalness(parseFloat(e.target.value));
                    }}
                    className="lux-range-slider"
                  />
                </div>

                <div className="lux-console-actions-row">
                  <button
                    type="button"
                    className="inspector-react-cta"
                    onClick={handleOpenGuide}
                  >
                    <span>Use in your React site</span>
                    <span>↗</span>
                  </button>
                  <button
                    type="button"
                    className="inspector-download-glb-btn"
                    onClick={() => {
                      setSurfaceMode('pbr');
                      setSurfaceRoughness(0.42);
                      setSurfaceMetalness(0.28);
                      setPbrCustomized(false);
                      setWireframeOverlay(false);
                    }}
                  >
                    <span>Reset Surface Shaders</span>
                    <span>↺</span>
                  </button>
                </div>
              </div>
            )}
            {/* Spotlight Rig Widget: Orbit dial + Brightness lever + Spotlight Height lever */}
            {activeTool === 'light' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 4px 4px' }}>
                  <span style={{ font: '700 9.5px "JetBrains Mono", monospace', color: '#94a3b8', letterSpacing: '0.6px' }}>
                    SPOTLIGHT ORBIT
                  </span>
                  <span style={{ font: '700 9.5px "JetBrains Mono", monospace', color: '#38bdf8' }}>
                    {Math.round(lightDial * 360)}°
                  </span>
                </div>
                <TactileDial
                  value={lightDial}
                  onChange={setLightDial}
                  size={isMobile ? 76 : 88}
                  label="BEAM ORBIT"
                  formatValue={(v) => `${Math.round(v * 360)}°`}
                  showGraduations
                  fullCircle
                />

                <div style={{ width: '100%', height: 1, background: 'rgba(255, 255, 255, 0.08)', margin: isMobile ? '8px 0 6px' : '12px 0 8px' }} />

                <div style={{ width: '100%', padding: '0 4px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{ font: '700 9.5px "JetBrains Mono", monospace', color: '#94a3b8', letterSpacing: '0.6px' }}>
                      BRIGHTNESS (REDUCE / INCREASE)
                    </span>
                    <span style={{ font: '700 9.5px "JetBrains Mono", monospace', color: '#38bdf8' }}>
                      {Math.round(lightBrightness * 100)}%
                    </span>
                  </div>
                  <HorizontalMechanicalLever
                    value={lightBrightness}
                    onChange={setLightBrightness}
                    label="BEAM INTENSITY"
                    handleLabel="BRIGHT"
                    tickLabels={['REDUCE', '25%', '50%', '75%', 'INCREASE']}
                  />
                </div>

                <div style={{ width: '100%', height: 1, background: 'rgba(255, 255, 255, 0.08)', margin: isMobile ? '6px 0' : '10px 0 8px' }} />

                <div style={{ width: '100%', padding: '0 4px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{ font: '700 9.5px "JetBrains Mono", monospace', color: '#94a3b8', letterSpacing: '0.6px' }}>
                      SPOTLIGHT HEIGHT (DOWN / UP)
                    </span>
                    <span style={{ font: '700 9.5px "JetBrains Mono", monospace', color: '#38bdf8' }}>
                      {(0.35 + lightHeight * 3.75).toFixed(1)}m
                    </span>
                  </div>
                  <HorizontalMechanicalLever
                    value={lightHeight}
                    onChange={setLightHeight}
                    label="SPOTLIGHT HEIGHT"
                    handleLabel="HEIGHT"
                    tickLabels={['DOWN', '25%', 'MID', '75%', 'UP']}
                  />
                </div>
              </div>
            )}

            {/* Flight Gimbal Joystick Widget + Fixed Background Color Swatches in a straight line */}
            {activeTool === 'gimbal' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: isMobile ? 8 : 12 }}>
                <TactileJoystick
                  value={targetAim}
                  onChange={setTargetAim}
                  size={isMobile ? 96 : 116}
                  label="FLIGHT GIMBAL"
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%', paddingTop: 6, borderTop: '1px solid rgba(148, 163, 184, 0.15)' }}>
                  <span style={{ font: '700 9px "JetBrains Mono", monospace', color: '#64748b', letterSpacing: '0.6px' }}>
                    BACKGROUND COLOR
                  </span>
                  <div
                    className="gimbal-color-line"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      width: '100%',
                      padding: '2px 0',
                    }}
                  >
                    {FIXED_GIMBAL_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`palette-swatch ${gimbalBg.toLowerCase() === c.toLowerCase() ? 'active' : ''}`}
                        style={{
                          backgroundColor: c,
                          width: 18,
                          height: 18,
                          minWidth: 18,
                          minHeight: 18,
                          padding: 0,
                          flexShrink: 0,
                        }}
                        onClick={() => setGimbalBg(c)}
                        aria-label={`Set gimbal background ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Spatial Scale, Telemetry & Zero-G Physics ('spatial') */}
            {activeTool === 'spatial' && (
              <div className="lux-tool-console-stack">
                <div className="lux-console-section-header">
                  <span>3D MESH TELEMETRY & BOUNDS</span>
                  <span className="lux-console-badge">READY FOR ENGINE</span>
                </div>

                <div className="lux-telemetry-grid">
                  <div className="lux-telemetry-card">
                    <span>TRIANGLES</span>
                    <strong>{telemetry.triangles.toLocaleString()}</strong>
                  </div>
                  <div className="lux-telemetry-card">
                    <span>VERTICES</span>
                    <strong>{telemetry.vertices.toLocaleString()}</strong>
                  </div>
                  <div className="lux-telemetry-card">
                    <span>SUB-PARTS</span>
                    <strong>{parts.length || telemetry.parts}</strong>
                  </div>
                  <div className="lux-telemetry-card">
                    <span>FOOTPRINT (M)</span>
                    <strong>
                      {(telemetry.dimensions[0] * scaleMultiplier).toFixed(1)}×
                      {(telemetry.dimensions[1] * scaleMultiplier).toFixed(1)}×
                      {(telemetry.dimensions[2] * scaleMultiplier).toFixed(1)}
                    </strong>
                  </div>
                </div>

                <div className="lux-toggle-row">
                  <button
                    type="button"
                    className={`lux-pill-toggle ${showDimensionCage ? 'active' : ''}`}
                    onClick={() => setShowDimensionCage((c) => !c)}
                  >
                    <span>📐 3D Holographic Dimension Cage (W×H×D)</span>
                    <strong>{showDimensionCage ? 'ON' : 'OFF'}</strong>
                  </button>
                </div>

                <div className="lux-slider-group">
                  <div className="lux-slider-header">
                    <span>REAL-WORLD SCALE MULTIPLIER</span>
                    <strong>{scaleMultiplier.toFixed(2)}x</strong>
                  </div>
                  <input
                    type="range"
                    min={0.4}
                    max={1.8}
                    step={0.02}
                    value={scaleMultiplier}
                    onChange={(e) => setScaleMultiplier(parseFloat(e.target.value))}
                    className="lux-range-slider"
                  />
                </div>

                <div className="lux-console-section-header" style={{ marginTop: 2 }}>
                  <span>STAGE GRAVITY & ZERO-G LEVITATION</span>
                  <span className="lux-console-badge">{zeroGEnabled ? 'ANTI-GRAVITY' : '1.0G FLOOR'}</span>
                </div>

                <div className="lux-physics-row">
                  <button
                    type="button"
                    className={`lux-physics-btn ${zeroGEnabled ? 'active' : ''}`}
                    onClick={() => setZeroGEnabled((z) => !z)}
                  >
                    <span>🛸 Zero-G Float</span>
                    <small>{zeroGEnabled ? 'Active' : 'Off'}</small>
                  </button>
                  <button
                    type="button"
                    className="lux-physics-btn drop-test"
                    onClick={() => {
                      setZeroGEnabled(false);
                      setManualAltitude(0);
                      setDropTestTrigger((n) => n + 1);
                    }}
                  >
                    <span>⚡ Gravity Drop Test</span>
                    <small>Free-Fall Bounce</small>
                  </button>
                </div>

                <div className="lux-slider-group">
                  <div className="lux-slider-header">
                    <span>STAGE HOVER ALTITUDE</span>
                    <strong>{(manualAltitude * 2.2).toFixed(2)}m</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={manualAltitude}
                    onChange={(e) => setManualAltitude(parseFloat(e.target.value))}
                    className="lux-range-slider"
                  />
                </div>

                <div className="lux-console-actions-row">
                  <button
                    type="button"
                    className="inspector-react-cta"
                    onClick={handleOpenGuide}
                  >
                    <span>Use in your React site</span>
                    <span>↗</span>
                  </button>
                  <button
                    type="button"
                    className="inspector-download-glb-btn"
                    onClick={handleDownloadModel}
                  >
                    <span>Download 3D Asset (.glb)</span>
                    <span>⤓</span>
                  </button>
                </div>
              </div>
            )}

            {/* Part Split & Radial 3D Explode ('explode') */}
            {activeTool === 'explode' && (
              <div className="lux-tool-console-stack">
                <div className="lux-console-section-header">
                  <span>SPATIAL MESH SEGMENTATION</span>
                  <span className="lux-console-badge">{Math.round(proceduralExplode * 100)}% SPREAD</span>
                </div>

                <div style={{ width: '100%', padding: '2px 0' }}>
                  <HorizontalMechanicalLever
                    value={proceduralExplode}
                    onChange={(v) => {
                      if (autoExplodePulse) setAutoExplodePulse(false);
                      setProceduralExplode(v);
                    }}
                    label="RADIAL PART EXPLODE"
                    handleLabel="SPLIT"
                    tickLabels={['ASSEMBLED', '25%', '50%', '75%', 'EXPLODED']}
                  />
                </div>

                <div className="lux-physics-row">
                  <button
                    type="button"
                    className={`lux-physics-btn ${autoExplodePulse ? 'active' : ''}`}
                    onClick={() => setAutoExplodePulse((p) => !p)}
                  >
                    <span>◎ Auto-Pulse Explode</span>
                    <small>{autoExplodePulse ? 'Breathing' : 'Manual'}</small>
                  </button>
                  <button
                    type="button"
                    className={`lux-physics-btn ${showExplodeVectors ? 'active' : ''}`}
                    onClick={() => setShowExplodeVectors((v) => !v)}
                  >
                    <span>⤢ 3D Vector Lines</span>
                    <small>{showExplodeVectors ? 'Visible' : 'Hidden'}</small>
                  </button>
                </div>

                <div className="lux-console-section-header" style={{ marginTop: 2 }}>
                  <span>SEGMENTED SUB-PARTS ({parts.length})</span>
                  {selectedPartId && (
                    <button
                      type="button"
                      className="lux-mini-reset-link"
                      onClick={() => {
                        setSelectedPartId(null);
                        selectRef.current(null);
                      }}
                    >
                      Clear Selection ✕
                    </button>
                  )}
                </div>

                <SmoothScrollArea className="lux-part-chips">
                  {parts.slice(0, 12).map((part) => {
                    const isSelected = selectedPartId === part.id;
                    const cleanLabel = String(part.metadata?.label ?? part.name).replace(/_/g, ' ');
                    return (
                      <button
                        key={part.id}
                        type="button"
                        className={`lux-part-chip ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedPartId(null);
                            selectRef.current(null);
                          } else {
                            setSelectedPartId(part.id);
                            selectRef.current(part.id);
                            triggerCameraFocus(part.id);
                          }
                        }}
                        title={`Inspect ${cleanLabel}`}
                      >
                        <span className="lux-part-chip-dot" />
                        <span className="lux-part-chip-name">{cleanLabel}</span>
                      </button>
                    );
                  })}
                </SmoothScrollArea>

                <div className="lux-console-actions-row">
                  <button
                    type="button"
                    className="inspector-download-glb-btn"
                    onClick={() => {
                      setAutoExplodePulse(false);
                      setProceduralExplode(0);
                      setSelectedPartId(null);
                      selectRef.current(null);
                    }}
                  >
                    <span>Reassemble All Sub-Parts (0%)</span>
                    <span>↺</span>
                  </button>
                </div>
              </div>
            )}

            {/* Studio Lighting & Custom Color Backdrop */}
            {activeTool === 'studio' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(Object.keys(ENVIRONMENT_PRESETS) as StudioEnvironmentPreset[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={`dock-item-btn ${envPreset === key && !customStudioBg ? 'active' : ''}`}
                      style={{ flex: 1, justifyContent: 'center', padding: '6px 4px', fontSize: '10px' }}
                      onClick={() => {
                        setEnvPreset(key);
                        setCustomStudioBg(null);
                      }}
                    >
                      {ENVIRONMENT_PRESETS[key].label}
                    </button>
                  ))}
                </div>
                <div className="color-palette-swatches" style={{ justifyContent: 'center' }}>
                  {['#070b14', '#0f172a', '#1e293b', '#111a2c', '#18181b', '#262626', '#eef2f9', '#f8fafc', '#e2e8f0', '#fed7aa', '#134e4a', '#312e81'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`palette-swatch ${canvasBg.toLowerCase() === c.toLowerCase() ? 'active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => {
                        setCustomStudioBg(c);
                        setHexInputText(c.replace('#', ''));
                      }}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
                <div className="hex-glide-controls">
                  <div className="hex-glide-input-wrap">
                    <span className="hex-glide-prefix">#</span>
                    <input
                      type="text"
                      className="hex-glide-text-input"
                      maxLength={6}
                      value={hexInputText}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9a-fA-F]/g, '');
                        setHexInputText(val);
                        if (val.length === 6 || val.length === 3) {
                          setCustomStudioBg(`#${val}`);
                        }
                      }}
                      aria-label="Hex color value"
                    />
                  </div>
                  <label className="native-color-picker-button" title="Choose custom color">
                    <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: canvasBg }} />
                    <input
                      type="color"
                      value={canvasBg.startsWith('#') && canvasBg.length === 7 ? canvasBg : '#070b14'}
                      onChange={(e) => {
                        setCustomStudioBg(e.target.value);
                        setHexInputText(e.target.value.replace('#', ''));
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="playground-top-btn"
                    style={{ padding: '4px 8px', fontSize: '10px' }}
                    onClick={() => setShowGrid((g) => !g)}
                  >
                    Grid: {showGrid ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="studio-snapshot-row">
                  <button
                    type="button"
                    className="studio-snapshot-btn"
                    onClick={captureStudioSnapshot}
                    title="Capture full-resolution 3D viewport snapshot"
                  >
                    <IconCamera />
                    <span>Take Studio Snapshot</span>
                  </button>
                </div>
              </div>
            )}

            {/* Slicing Plane Controls (starts at 1.00, 100% visible, smoothly cuts down) */}
            {activeTool === 'slicer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', minWidth: 260 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { key: 'z', label: 'Z (TOP-DOWN)' },
                    { key: 'x', label: 'X (SIDE-TO-SIDE)' },
                    { key: 'y', label: 'Y (FRONT-BACK)' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={`dock-item-btn ${sectionAxis === key ? 'active' : ''}`}
                      style={{ flex: 1, justifyContent: 'center', padding: '6px 4px', fontSize: '9px' }}
                      onClick={() => setSectionAxis(key as 'x' | 'y' | 'z')}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.01}
                    value={sectionOffset}
                    onChange={(e) => setSectionOffset(parseFloat(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <output style={{ font: '11px monospace', color: 'var(--accent)', minWidth: 36, textAlign: 'right' }}>
                    {sectionOffset.toFixed(2)}
                  </output>
                  <button
                    type="button"
                    className="playground-top-btn"
                    style={{ padding: '2px 8px', fontSize: '10px' }}
                    onClick={() => setSectionOffset(1.0)}
                    title="Reset to 1.00 (100% visible)"
                  >
                    1.0
                  </button>
                </div>
              </div>
            )}

          </SmoothScrollArea>
        </aside>
      )}

      {/* ─── Floating 3D Space Dock (Centered at bottom, touch-scrollable on mobile) ─── */}
      <div className="playground-dock-container">
        <nav className="playground-floating-dock" aria-label="Playground tools dock">
          {/* Segment 1: Material & Surface Lab */}
          <button
            type="button"
            className={`dock-item-btn ${activeTool === 'material' ? 'active' : ''}`}
            onClick={() => selectTool('material')}
            title="Material & Surface Shader Lab"
          >
            <IconMaterialLab />
            <span>Material Lab</span>
          </button>

          <span className="dock-separator" aria-hidden="true" />

          {/* Segment: Interactive 3D Rigs */}
          <button
            type="button"
            className={`dock-item-btn ${activeTool === 'light' ? 'active' : ''}`}
            onClick={() => selectTool('light')}
            title="Inspection Spotlight Rig"
          >
            <IconSpotlight />
            <span>Spotlight</span>
          </button>
          <button
            type="button"
            className={`dock-item-btn ${activeTool === 'gimbal' ? 'active' : ''}`}
            onClick={() => selectTool('gimbal')}
            title="Flight Gimbal Target Lock"
          >
            <IconGimbal />
            <span>Gimbal</span>
          </button>
          <button
            type="button"
            className={`dock-item-btn ${activeTool === 'spatial' ? 'active' : ''}`}
            onClick={() => selectTool('spatial')}
            title="Spatial Scale Cage, Telemetry & Zero-G Drop Physics"
          >
            <IconSpatialScale />
            <span>Spatial Rig</span>
          </button>
          <button
            type="button"
            className={`dock-item-btn ${activeTool === 'explode' ? 'active' : ''}`}
            onClick={() => selectTool('explode')}
            title="Part Split & Radial 3D Explode"
          >
            <IconPartSplit />
            <span>Part Split</span>
          </button>

          <span className="dock-separator" aria-hidden="true" />

          {/* Segment: Studio */}
          <button
            type="button"
            className={`dock-item-btn ${activeTool === 'studio' ? 'active' : ''}`}
            onClick={() => selectTool('studio')}
            title="Studio Lighting & Custom Backdrop Color"
          >
            <IconPalette />
            <span>Studio</span>
          </button>

          <span className="dock-separator" aria-hidden="true" />

          {/* Segment: Slicing */}
          <button
            type="button"
            className={`dock-item-btn ${activeTool === 'slicer' ? 'active' : ''}`}
            onClick={() => selectTool('slicer')}
            title="Cross-Section Slicing Plane"
          >
            <IconSlicer />
            <span>Slicer</span>
          </button>
        </nav>
      </div>

      {/* ─── Playground Tools Sidebar Drawer (for Mobile & Desktop) ─── */}
      <div
        className={`playground-sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`playground-sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Tools and Rigs Sidebar">
        <div className="sidebar-header">
          <strong><span>✦</span> TOOLS & RIGS</strong>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close tools sidebar"
          >
            ×
          </button>
        </div>

        <SmoothScrollArea className="sidebar-content">
          {/* Surface & Topology Lab */}
          <div className="sidebar-section">
            <span className="sidebar-section-title">Surface & Topology</span>
            <button
              type="button"
              className={`sidebar-tool-card ${activeTool === 'material' ? 'active' : ''}`}
              onClick={() => {
                selectTool('material');
                setSidebarOpen(false);
              }}
            >
              <div className="sidebar-tool-main">
                <div className="sidebar-tool-icon"><IconMaterialLab /></div>
                <div className="sidebar-tool-text">
                  <strong>Material & Surface Lab</strong>
                  <span>PBR, X-Ray wireframe, clay, chrome & hologram</span>
                </div>
              </div>
              <span className="sidebar-tool-status">{activeTool === 'material' ? 'ACTIVE' : 'SELECT'}</span>
            </button>

            <button
              type="button"
              className={`sidebar-tool-card ${activeTool === 'explode' ? 'active' : ''}`}
              onClick={() => {
                selectTool('explode');
                setSidebarOpen(false);
              }}
            >
              <div className="sidebar-tool-main">
                <div className="sidebar-tool-icon"><IconPartSplit /></div>
                <div className="sidebar-tool-text">
                  <strong>Part Split & Explode</strong>
                  <span>Spatial disassembly & sub-part isolation</span>
                </div>
              </div>
              <span className="sidebar-tool-status">{activeTool === 'explode' ? 'ACTIVE' : 'SELECT'}</span>
            </button>

            <button
              type="button"
              className={`sidebar-tool-card ${activeTool === 'spatial' ? 'active' : ''}`}
              onClick={() => {
                selectTool('spatial');
                setSidebarOpen(false);
              }}
            >
              <div className="sidebar-tool-main">
                <div className="sidebar-tool-icon"><IconSpatialScale /></div>
                <div className="sidebar-tool-text">
                  <strong>Spatial Scale & Zero-G Rig</strong>
                  <span>3D W×H×D cage, Zero-G float & gravity drop test</span>
                </div>
              </div>
              <span className="sidebar-tool-status">{activeTool === 'spatial' ? 'ACTIVE' : 'SELECT'}</span>
            </button>
          </div>

          {/* Interactive Mechanical Rigs */}
          <div className="sidebar-section">
            <span className="sidebar-section-title">Interactive Rigs</span>
            <button
              type="button"
              className={`sidebar-tool-card ${activeTool === 'light' ? 'active' : ''}`}
              onClick={() => {
                selectTool('light');
                setSidebarOpen(false);
              }}
            >
              <div className="sidebar-tool-main">
                <div className="sidebar-tool-icon"><IconSpotlight /></div>
                <div className="sidebar-tool-text">
                  <strong>Spotlight Rig</strong>
                  <span>360° orbit beam & brightness</span>
                </div>
              </div>
              <span className="sidebar-tool-status">{activeTool === 'light' ? 'ACTIVE' : 'SELECT'}</span>
            </button>

            <button
              type="button"
              className={`sidebar-tool-card ${activeTool === 'gimbal' ? 'active' : ''}`}
              onClick={() => {
                selectTool('gimbal');
                setSidebarOpen(false);
              }}
            >
              <div className="sidebar-tool-main">
                <div className="sidebar-tool-icon"><IconGimbal /></div>
                <div className="sidebar-tool-text">
                  <strong>Flight Gimbal</strong>
                  <span>Dynamic 3D target lock & tracking</span>
                </div>
              </div>
              <span className="sidebar-tool-status">{activeTool === 'gimbal' ? 'ACTIVE' : 'SELECT'}</span>
            </button>
          </div>

          {/* Atmosphere & Studio */}
          <div className="sidebar-section">
            <span className="sidebar-section-title">Atmosphere & Lighting</span>
            <button
              type="button"
              className={`sidebar-tool-card ${activeTool === 'studio' ? 'active' : ''}`}
              onClick={() => {
                selectTool('studio');
                setSidebarOpen(false);
              }}
            >
              <div className="sidebar-tool-main">
                <div className="sidebar-tool-icon"><IconPalette /></div>
                <div className="sidebar-tool-text">
                  <strong>Studio Mode</strong>
                  <span>Backdrop colors & hex palette</span>
                </div>
              </div>
              <span className="sidebar-tool-status">{activeTool === 'studio' ? 'ACTIVE' : 'SELECT'}</span>
            </button>
          </div>

          {/* Slicing */}
          <div className="sidebar-section">
            <span className="sidebar-section-title">Slicing & Cross-Section</span>
            <button
              type="button"
              className={`sidebar-tool-card ${activeTool === 'slicer' ? 'active' : ''}`}
              onClick={() => {
                selectTool('slicer');
                setSidebarOpen(false);
              }}
            >
              <div className="sidebar-tool-main">
                <div className="sidebar-tool-icon"><IconSlicer /></div>
                <div className="sidebar-tool-text">
                  <strong>Section Slicer</strong>
                  <span>Clipping plane with full range</span>
                </div>
              </div>
              <span className="sidebar-tool-status">{activeTool === 'slicer' ? 'ACTIVE' : 'SELECT'}</span>
            </button>
          </div>

          {/* Quick Scene Actions */}
          <div className="sidebar-section">
            <span className="sidebar-section-title">Scene Tools</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <button
                type="button"
                className={`playground-top-btn ${turntable ? 'active' : ''}`}
                style={{ justifyContent: 'center', padding: '8px 10px' }}
                onClick={() => setTurntable((t) => !t)}
              >
                <IconTurntable />
                <span>360° Spin</span>
              </button>
              <button
                type="button"
                className="playground-top-btn"
                style={{ justifyContent: 'center', padding: '8px 10px' }}
                onClick={captureStudioSnapshot}
              >
                <IconCamera />
                <span>Snapshot</span>
              </button>
              <button
                type="button"
                className="playground-top-btn"
                style={{ justifyContent: 'center', padding: '8px 10px' }}
                onClick={() => controlsRef.current?.reset()}
              >
                <IconReset />
                <span>Reset [R]</span>
              </button>
              <button
                type="button"
                className="playground-top-btn"
                style={{ justifyContent: 'center', padding: '8px 10px' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <span>↑ Upload GLB</span>
              </button>
              {model.object && (
                <button
                  type="button"
                  className="playground-top-btn"
                  style={{ justifyContent: 'center', padding: '8px 10px', gridColumn: '1 / -1' }}
                  onClick={() => {
                    onDemo();
                    setSidebarOpen(false);
                  }}
                >
                  <span>↶ Back to Default Model</span>
                </button>
              )}
            </div>
          </div>
        </SmoothScrollArea>
      </aside>

      {/* ─── Snapshot Preview Modal (Shows immediately after capturing snapshot) ─── */}
      {snapshotPreview && (
        <div
          className="snapshot-preview-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Viewport Snapshot Preview"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSnapshotPreview(null);
          }}
        >
          <div className="snapshot-preview-card">
            <div className="snapshot-preview-header">
              <div className="snapshot-preview-title">
                <IconCamera />
                <span>Studio Snapshot Preview</span>
              </div>
              <button
                type="button"
                className="snapshot-preview-close"
                onClick={() => setSnapshotPreview(null)}
                aria-label="Close preview"
                title="Go back"
              >
                ✕
              </button>
            </div>

            <div className="snapshot-preview-image-wrap">
              <img
                src={snapshotPreview.url}
                alt="3D Studio Snapshot"
                className="snapshot-preview-img"
              />
            </div>

            <div className="snapshot-preview-footer">
              <div className="snapshot-preview-meta">
                <span className="snapshot-preview-badge">PNG</span>
                <span className="snapshot-preview-filename">{snapshotPreview.filename}</span>
              </div>
              <div className="snapshot-preview-actions">
                <button
                  type="button"
                  className="snapshot-btn-back"
                  onClick={() => setSnapshotPreview(null)}
                >
                  ← Go Back
                </button>
                <button
                  type="button"
                  className="snapshot-btn-download"
                  onClick={handleDownloadSnapshot}
                >
                  <IconDownload />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
