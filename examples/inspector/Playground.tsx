import {
  Suspense,
  useRef,
  useState,
  useEffect,
  useMemo,
  type ComponentRef,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Html } from '@react-three/drei';
import { Plane, Vector3 } from 'three';
import {
  BlenderControls,
  Measurement,
  SelectableModel,
  SelectableObject,
  SpatialProvider,
  type JoystickValue,
  type SurfaceHit,
} from 'spatialkit/react';
import {
  ENVIRONMENT_PRESETS,
  InteractiveModelRig,
  type ActiveModelControl,
  type StudioEnvironmentPreset,
} from './main';
import { MODEL_FIT, type ModelAsset } from './model-files';
import { publicFilename } from './integration';
import type { Note } from './notes';
import {
  HorizontalMechanicalLever,
  PullLever,
  TactileDial,
  TactileJoystick,
} from './ControlsLab';

// ─── Precision SVG Glyphs for Professional CAD/Blender UI ───────────────────
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

// ─── Responsive Camera Framing: Centers Model by Default on Desktop, Laptop & Mobile ──
export function ResponsiveCameraFraming({
  controlsRef,
  basePosition = [4.6, 2.5, 4.8],
  target = [0, 1.15, 0],
}: {
  controlsRef?: React.RefObject<ComponentRef<typeof BlenderControls> | null>;
  basePosition?: [number, number, number];
  target?: [number, number, number];
}) {
  const { camera, size } = useThree();
  const prevKeyRef = useRef<string>('');

  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const key = `${aspect.toFixed(2)}-${basePosition.join(',')}-${target.join(',')}`;
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    const vTarget = new Vector3(...target);
    const vBase = new Vector3(...basePosition);
    const vOffset = vBase.clone().sub(vTarget);

    // On mobile / portrait screens (aspect < 1.3), pull camera distance back so full model fits horizontally
    const factor = aspect < 1.3 ? Math.min(2.35, Math.max(1.15, 1.48 / aspect)) : 1.0;
    const newPos = vTarget.clone().add(vOffset.multiplyScalar(factor));

    camera.position.copy(newPos);
    camera.lookAt(vTarget);
    camera.updateProjectionMatrix();

    if (controlsRef?.current) {
      controlsRef.current.target.copy(vTarget);
      controlsRef.current.update();
      const ctrl = controlsRef.current as unknown as { saveState?: () => void };
      ctrl.saveState?.();
    }
  }, [size.width, size.height, camera, controlsRef, basePosition, target]);

  return null;
}

// ─── Fighter-Jet Camera Turret & Lock-On Seeker for Gimbal Basketball ───────
export function GimbalCameraTurret({
  active,
  aim,
  ballPosRef,
  onHUDUpdate,
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
    const aspect = size.width / Math.max(1, size.height);
    // On mobile / portrait screens, step back slightly for wide visibility
    const baseZ = aspect < 1.2 ? 10.5 : 8.2;
    const baseY = 2.0;
    const basePos = new Vector3(0, baseY, baseZ);

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

    // Angular check for missile lock: angle between camera forward vector and target
    camera.getWorldDirection(aimForward.current);
    targetDir.current.copy(ballPosRef.current).sub(camera.position).normalize();
    const angleRad = aimForward.current.angleTo(targetDir.current);
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

// ─── Auto Turntable Director for Playground ─────────────────────────────────
function PlaygroundDirector({
  turntable,
  controlsRef,
}: {
  turntable: boolean;
  controlsRef: React.RefObject<ComponentRef<typeof BlenderControls> | null>;
}) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const ctrl = controlsRef.current;
    if (!ctrl || !turntable) return;
    const dt = Math.min(delta, 0.05);
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
  });

  return null;
}

export interface StoredMeasurement {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  distanceCm: number;
}

export function Playground({
  model,
  onUpload,
  onDemo,
  uploading,
  uploadError,
  theme,
  notes,
}: {
  model: ModelAsset;
  onUpload: (file: File) => void;
  onDemo: () => void;
  uploading: boolean;
  uploadError: string;
  theme: 'light' | 'dark';
  notes?: Note[];
}) {
  const controlsRef = useRef<ComponentRef<typeof BlenderControls>>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Tool Selection & Responsive Sidebar
  const [activeTool, setActiveTool] = useState<string | null>('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [consoleMinimized, setConsoleMinimized] = useState(false);

  // Mechanical Rig State
  // Default lightDial to 1.0 (all the way to the right) so light shines straight at front face of the model!
  const [lightDial, setLightDial] = useState(1.0);
  const [lightBrightness, setLightBrightness] = useState(0.55); // Default in the middle!
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

  const [liftHeight, setLiftHeight] = useState(0.0); // Minimum height rests on 3D grid line!
  const [animationProgress, setAnimationProgress] = useState(0);
  const [proceduralExplode, setProceduralExplode] = useState(0);

  // Studio Lighting & Custom Color Backdrop
  const [envPreset, setEnvPreset] = useState<StudioEnvironmentPreset>('showroom');
  const [customStudioBg, setCustomStudioBg] = useState<string | null>('#070b14');
  const [hexInputText, setHexInputText] = useState('070b14');
  const [showGrid, setShowGrid] = useState(true);

  // Showcase Features
  const [turntable, setTurntable] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);

  // Calipers Measurement Tool
  const [measuring, setMeasuring] = useState(false);
  const [caliperPointA, setCaliperPointA] = useState<[number, number, number] | null>(null);
  const [measurements, setMeasurements] = useState<StoredMeasurement[]>([]);

  // Slicer Cross-Section Tool: Defaults to 1.00 so full model is 100% visible by default!
  const [crossSectionEnabled, setCrossSectionEnabled] = useState(false);
  const [sectionAxis, setSectionAxis] = useState<'x' | 'y' | 'z'>('y');
  const [sectionOffset, setSectionOffset] = useState(1.0);

  // Tool Selection with strict state isolation (no feature bleeding)
  function selectTool(toolName: string) {
    setActiveTool((prev) => {
      const next = prev === toolName ? null : toolName;
      setMeasuring(next === 'calipers');
      if (next !== 'calipers') setCaliperPointA(null);
      setCrossSectionEnabled(next === 'slicer');
      return next;
    });
  }

  const env = ENVIRONMENT_PRESETS[envPreset];
  const defaultBg = envPreset === 'showroom' ? env.bgDark : (theme === 'dark' ? env.bgDark : env.bgLight);

  // Pitch black dark-room environment for spotlight inspection
  const isSpotlightMode = activeTool === 'light';
  const canvasBg = isSpotlightMode ? '#010408' : (customStudioBg ?? defaultBg);

  // Derive active model control from selected tool
  const activeModelControl: ActiveModelControl = useMemo(() => {
    if (activeTool === 'light') return 'light';
    if (activeTool === 'gimbal') return 'target';
    if (activeTool === 'lift') return 'lift';
    if (activeTool === 'scrubber') return 'scrub';
    return 'none';
  }, [activeTool]);

  // Slicing plane: 1.00 = 100% visible, progressively cuts through as dragged down to -1.00
  const clippingPlanes = useMemo(() => {
    if (activeTool !== 'slicer' || !crossSectionEnabled) return undefined;
    if (sectionAxis === 'y') {
      const normal = new Vector3(0, -1, 0);
      const constant = (sectionOffset + 1.0) * 1.4;
      return [new Plane(normal, constant)];
    }
    const normal = sectionAxis === 'x' ? new Vector3(-1, 0, 0) : new Vector3(0, 0, -1);
    const constant = sectionOffset * 2.2 + 0.2;
    return [new Plane(normal, constant)];
  }, [activeTool, crossSectionEnabled, sectionAxis, sectionOffset]);

  // Target missile lock status derived directly from camera turret angular aim
  const isTargetLocked = gimbalHUD.isLocked;

  function captureStudioSnapshot() {
    const canvas = viewportRef.current?.querySelector('canvas');
    if (!canvas) return;
    try {
      setShutterFlash(true);
      setTimeout(() => setShutterFlash(false), 260);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${publicFilename(model.name)}-playground.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setSnapshotToast('Studio snapshot saved');
      }, 'image/png');
    } catch {
      setSnapshotToast('Snapshot capture unavailable.');
    }
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
        if (sidebarOpen) {
          setSidebarOpen(false);
          return;
        }
        setActiveTool(null);
        setMeasuring(false);
        setCaliperPointA(null);
        setCrossSectionEnabled(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  // Surface click for measurements in world coordinates
  function handleSurfaceClick(hit: SurfaceHit) {
    if (activeTool === 'calipers') {
      const worldPos = (hit.worldPoint ?? hit.point).slice() as [number, number, number];
      if (!caliperPointA) {
        setCaliperPointA(worldPos);
      } else {
        const distM = Math.hypot(
          worldPos[0] - caliperPointA[0],
          worldPos[1] - caliperPointA[1],
          worldPos[2] - caliperPointA[2]
        );
        setMeasurements((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            start: caliperPointA,
            end: worldPos,
            distanceCm: distM * 100,
          },
        ]);
        setCaliperPointA(null);
      }
    }
  }

  const latestMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;

  return (
    <main className="playground-workspace" ref={viewportRef} aria-label="SpatialKit 3D Playground">
      {shutterFlash && <div className="viewport-shutter-flash" aria-hidden="true" />}

      {/* ─── Topbar HUD Overlay (Responsive for Mobile, Laptop, Desktop) ─── */}
      <div className="playground-topbar">
        <div className="playground-meta-badge">
          <span className="status-dot" aria-hidden="true" />
          <strong title={activeTool === 'gimbal' ? 'Basketball (Target)' : model.name}>
            {activeTool === 'gimbal' ? 'Basketball' : model.name}
          </strong>
          <span style={{ color: '#94a3b8' }}>{model.format}</span>
          <button
            type="button"
            className="playground-top-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ padding: '3px 8px', fontSize: '10px' }}
          >
            {uploading ? 'Preparing…' : '↑ Load'}
          </button>
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
          {model.object && (
            <button
              type="button"
              className="playground-top-btn"
              onClick={onDemo}
              style={{ padding: '3px 8px', fontSize: '10px' }}
            >
              ↶ Demo
            </button>
          )}
        </div>

        <div className="playground-top-actions">
          <button
            type="button"
            className={`playground-top-btn ${turntable ? 'active' : ''}`}
            onClick={() => setTurntable((t) => !t)}
            title="360° Studio Turntable"
          >
            <IconTurntable />
            <span>360°</span>
          </button>
          <button
            type="button"
            className="playground-top-btn"
            onClick={captureStudioSnapshot}
            title="Capture Studio PNG Snapshot"
          >
            <IconCamera />
            <span>Snapshot</span>
          </button>
          <button
            type="button"
            className="playground-top-btn"
            onClick={() => controlsRef.current?.reset()}
            title="Reset Camera View [R]"
          >
            <IconReset />
            <span>Reset</span>
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

      {snapshotToast && (
        <div className="snapshot-toast" role="status">
          <span>📷</span> {snapshotToast}
        </div>
      )}

      {/* Caliper Instruction Banner (Strictly absolute, no layout displacement) */}
      {activeTool === 'calipers' && (
        <div
          className="placement-banner caliper-banner"
          role="status"
          style={{
            position: 'absolute',
            top: 68,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 48,
            pointerEvents: 'none',
            margin: 0,
          }}
        >
          {caliperPointA
            ? '✦ Point A anchored · Click second point to measure distance'
            : '✦ Click any point on the model surface to place Point A'}
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

          {/* Optical crosshair fixed to camera center bore-sight: ORANGE -> GREEN */}
          <div
            className="hud-reticle-center"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
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
        dpr={[1, 2]}
        camera={{ position: [4.6, 2.5, 4.8], fov: 40 }}
        gl={{ localClippingEnabled: true, preserveDrawingBuffer: true }}
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
            <InteractiveModelRig
              activeControl={activeModelControl}
              lightDial={lightDial}
              lightBrightness={lightBrightness}
              liftHeight={liftHeight}
              ballPositionRef={ballPositionRef}
            >
              {activeTool === 'gimbal' ? (
                /* Dynamic Target: Basketball flying across 3D space */
                <SelectableModel
                  src="/models/basketball.glb"
                  modelId="basketball"
                  fit={1.6}
                  onSurfaceClick={handleSurfaceClick}
                />
              ) : model.object ? (
                <SelectableObject
                  object={model.object}
                  animations={model.animations}
                  animationProgress={model.hasAnimations ? animationProgress : undefined}
                  explode={proceduralExplode}
                  clippingPlanes={clippingPlanes}
                  modelId={model.id}
                  fit={MODEL_FIT}
                  onSurfaceClick={handleSurfaceClick}
                />
              ) : (
                <SelectableModel
                  src="/pump.glb"
                  modelId="pump"
                  fit={MODEL_FIT}
                  animationProgress={animationProgress}
                  explode={proceduralExplode}
                  clippingPlanes={clippingPlanes}
                  onSurfaceClick={handleSurfaceClick}
                />
              )}
            </InteractiveModelRig>

            {/* Calipers 3D Measurements (strictly rendered only when Calipers tool is active) */}
            {activeTool === 'calipers' && measurements.map((m) => (
              <Measurement
                key={m.id}
                start={m.start}
                end={m.end}
                unit="cm"
                color="#f6ad55"
              />
            ))}

            {activeTool === 'calipers' && caliperPointA && (
              <mesh position={caliperPointA}>
                <sphereGeometry args={[0.04, 16, 16]} />
                <meshBasicMaterial color="#f6ad55" depthTest={false} />
              </mesh>
            )}
          </SpatialProvider>

          <ContactShadows
            position={[0, -0.012, 0]}
            opacity={isSpotlightMode ? 0.2 : env.shadowOpacity}
            scale={14}
            blur={2.4}
            far={5}
            resolution={256}
            frames={1}
          />
        </Suspense>

        {showGrid && !isSpotlightMode && env.showGrid && (
          <gridHelper args={[20, 40, env.gridPrimary, env.gridSecondary]} position={[0, -0.025, 0]} />
        )}

        <BlenderControls
          ref={controlsRef}
          makeDefault
          enabled={activeTool !== 'gimbal'}
          target={activeTool === 'gimbal' ? [0, 2.0, 0] : [0, 1.15, 0]}
          minDistance={1.8}
          maxDistance={28}
          enableDamping
        />

        {/* Responsive camera director: handles vertical centering on other tools; bypassed during Gimbal turret piloting */}
        {activeTool !== 'gimbal' && (
          <ResponsiveCameraFraming
            controlsRef={controlsRef}
            basePosition={[4.6, 2.5, 4.8]}
            target={[0, 1.15, 0]}
          />
        )}

        {/* Fighter-Jet Camera Turret & Lock-On Seeker: steers camera with joystick */}
        {activeTool === 'gimbal' && (
          <GimbalCameraTurret
            active={activeTool === 'gimbal'}
            aim={targetAim}
            ballPosRef={ballPositionRef}
            onHUDUpdate={setGimbalHUD}
          />
        )}

        <PlaygroundDirector turntable={turntable} controlsRef={controlsRef} />
      </Canvas>

      {/* ─── Floating Tool Console (Docked to Bottom-Right on Desktop, Bottom Sheet on Mobile) ─── */}
      {activeTool && (
        <aside
          className={`playground-active-console ${consoleMinimized ? 'minimized' : ''}`}
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
                {activeTool === 'light' && '✦ INSPECTION SPOTLIGHT RIG'}
                {activeTool === 'gimbal' && '✦ 3D FLIGHT GIMBAL TRACKER'}
                {activeTool === 'lift' && '✦ HYDRAULIC LIFT PLATFORM'}
                {activeTool === 'scrubber' && '✦ MECHANICAL SCRUBBER LEVER'}
                {activeTool === 'studio' && '✦ STUDIO LIGHTING & BACKDROP'}
                {activeTool === 'slicer' && '✦ CROSS-SECTION SLICING PLANE'}
                {activeTool === 'calipers' && '✦ 3D CALIPERS MEASUREMENT'}
              </strong>
              <span>
                {activeTool === 'light' && `ORBIT: ${Math.round(lightDial * 360)}° · BRIGHTNESS: ${Math.round(lightBrightness * 100)}%`}
                {activeTool === 'gimbal' && `AIM: [${(targetAim.x * 100).toFixed(0)}, ${(targetAim.y * 100).toFixed(0)}] · ${isTargetLocked ? 'LOCKED' : 'TRACKING'}`}
                {activeTool === 'lift' && `HEIGHT: ${(0.08 + liftHeight * 3.4).toFixed(2)}m`}
                {activeTool === 'scrubber' && `PROGRESS: ${Math.round((model.hasAnimations ? animationProgress : proceduralExplode) * 100)}%`}
                {activeTool === 'studio' && `PRESET: ${env.label} · COLOR: ${canvasBg}`}
                {activeTool === 'slicer' && `AXIS: ${sectionAxis.toUpperCase()} · OFFSET: ${sectionOffset.toFixed(2)}`}
                {activeTool === 'calipers' && (latestMeasurement ? `LAST: ${latestMeasurement.distanceCm.toFixed(1)} cm` : `${measurements.length} SAVED`)}
              </span>
            </div>

            <div className="console-header-actions">
              <button
                type="button"
                className="console-minimize-btn"
                onClick={() => setConsoleMinimized((m) => !m)}
                title={consoleMinimized ? 'Expand controls' : 'Minimize controls'}
              >
                {consoleMinimized ? '▲' : '▼'}
              </button>
              <button
                type="button"
                className="console-close-btn"
                onClick={() => {
                  setActiveTool(null);
                  setMeasuring(false);
                  setCaliperPointA(null);
                  setCrossSectionEnabled(false);
                }}
                aria-label="Close active console"
              >
                ×
              </button>
            </div>
          </div>

          <div
            className="console-body"
            style={{
              width: '100%',
              display: consoleMinimized ? 'none' : 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Spotlight Rig Widget: Orbit dial + vertical space + Brightness lever (starts at 0.55 in middle) */}
            {activeTool === 'light' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <TactileDial
                  value={lightDial}
                  onChange={setLightDial}
                  size={92}
                  label="BEAM ORBIT"
                  formatValue={(v) => `${Math.round(v * 360)}°`}
                  showGraduations
                />
                <div style={{ width: '100%', height: 1, background: 'rgba(255, 255, 255, 0.08)', margin: '14px 0 10px' }} />
                <div style={{ width: '100%', padding: '0 4px' }}>
                  <HorizontalMechanicalLever
                    value={lightBrightness}
                    onChange={setLightBrightness}
                    label="BEAM INTENSITY"
                  />
                </div>
              </div>
            )}

            {/* Flight Gimbal Joystick Widget */}
            {activeTool === 'gimbal' && (
              <TactileJoystick
                value={targetAim}
                onChange={setTargetAim}
                size={116}
                label="FLIGHT GIMBAL"
              />
            )}

            {/* Hydraulic Lift Lever Widget with generous padding top & bottom */}
            {activeTool === 'lift' && (
              <div style={{ paddingTop: 24, paddingBottom: 24, minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PullLever
                  value={liftHeight}
                  onChange={setLiftHeight}
                  label="PULL LEVER"
                  unitLabel="m"
                />
              </div>
            )}

            {/* Mechanical Scrubber Lever Widget */}
            {activeTool === 'scrubber' && (
              <div style={{ width: 280, maxWidth: '100%', padding: '4px 0' }}>
                <HorizontalMechanicalLever
                  value={model.hasAnimations ? animationProgress : proceduralExplode}
                  onChange={model.hasAnimations ? setAnimationProgress : setProceduralExplode}
                  label={model.hasAnimations ? 'ANIMATION PROGRESS' : 'EXPLODE PROGRESS'}
                />
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
                  {['#070b14', '#0f172a', '#1e293b', '#111a2c', '#18181b', '#262626', '#f8fafc', '#e2e8f0', '#fed7aa', '#134e4a', '#312e81'].map((c) => (
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
              </div>
            )}

            {/* Slicing Plane Controls (starts at 1.00, 100% visible, smoothly cuts down) */}
            {activeTool === 'slicer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', minWidth: 260 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['x', 'y', 'z'] as const).map((axis) => (
                    <button
                      key={axis}
                      type="button"
                      className={`dock-item-btn ${sectionAxis === axis ? 'active' : ''}`}
                      style={{ flex: 1, justifyContent: 'center', padding: '6px 4px' }}
                      onClick={() => setSectionAxis(axis)}
                    >
                      {axis.toUpperCase()} AXIS
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

            {/* Calipers Measurement Controls with prominent live distance readout */}
            {activeTool === 'calipers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', minWidth: 260 }}>
                {caliperPointA ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(246, 173, 85, 0.15)', border: '1px solid #f6ad55', borderRadius: 6 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f6ad55' }} />
                    <span style={{ font: '600 11px "JetBrains Mono", monospace', color: '#f6ad55' }}>
                      POINT A ANCHORED · Click 2nd point
                    </span>
                  </div>
                ) : latestMeasurement ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(246, 173, 85, 0.12)', border: '1px solid rgba(246, 173, 85, 0.4)', borderRadius: 6 }}>
                    <span style={{ font: '600 10px "JetBrains Mono", monospace', color: '#cbd5e1' }}>LAST MEASUREMENT:</span>
                    <strong style={{ font: '700 13px "JetBrains Mono", monospace', color: '#f6ad55' }}>
                      {latestMeasurement.distanceCm.toFixed(1)} cm
                    </strong>
                  </div>
                ) : (
                  <div style={{ font: '11px "JetBrains Mono", monospace', color: '#94a3b8' }}>
                    Click any point on the model surface to anchor Point A.
                  </div>
                )}
                {measurements.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                    <span style={{ font: '10px "JetBrains Mono", monospace', color: '#94a3b8' }}>
                      {measurements.length} saved dimension{measurements.length === 1 ? '' : 's'}
                    </span>
                    <button
                      type="button"
                      className="playground-top-btn"
                      style={{ padding: '4px 10px', fontSize: '10px', color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.4)' }}
                      onClick={() => {
                        setMeasurements([]);
                        setCaliperPointA(null);
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ─── Floating 3D Space Dock (Centered at bottom, touch-scrollable on mobile) ─── */}
      <div className="playground-dock-container">
        <nav className="playground-floating-dock" aria-label="Playground tools dock">
          {/* Segment: Rigs */}
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
            className={`dock-item-btn ${activeTool === 'lift' ? 'active' : ''}`}
            onClick={() => selectTool('lift')}
            title="Hydraulic Platform Lift"
          >
            <IconLift />
            <span>Lift</span>
          </button>
          <button
            type="button"
            className={`dock-item-btn ${activeTool === 'scrubber' ? 'active' : ''}`}
            onClick={() => selectTool('scrubber')}
            title="Mechanical Scrubber Lever"
          >
            <IconScrubber />
            <span>Scrubber</span>
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

          {/* Segment: Inspect */}
          <button
            type="button"
            className={`dock-item-btn ${activeTool === 'calipers' ? 'active' : ''}`}
            onClick={() => selectTool('calipers')}
            title="3D Calipers Measurement"
          >
            <IconCalipers />
            <span>Calipers</span>
          </button>
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

        <div className="sidebar-content">
          {/* Interactive Mechanical Rigs */}
          <div className="sidebar-section">
            <span className="sidebar-section-title">Interactive Rigs</span>
            <button
              type="button"
              className={`sidebar-tool-card ${activeTool === 'light' ? 'active' : ''}`}
              onClick={() => {
                selectTool('light');
                setConsoleMinimized(false);
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
                setConsoleMinimized(false);
                setSidebarOpen(false);
              }}
            >
              <div className="sidebar-tool-main">
                <div className="sidebar-tool-icon"><IconGimbal /></div>
                <div className="sidebar-tool-text">
                  <strong>Flight Gimbal</strong>
                  <span>Dynamic 3D basketball tracking</span>
                </div>
              </div>
              <span className="sidebar-tool-status">{activeTool === 'gimbal' ? 'ACTIVE' : 'SELECT'}</span>
            </button>

            <button
              type="button"
              className={`sidebar-tool-card ${activeTool === 'lift' ? 'active' : ''}`}
              onClick={() => {
                selectTool('lift');
                setConsoleMinimized(false);
                setSidebarOpen(false);
              }}
            >
              <div className="sidebar-tool-main">
                <div className="sidebar-tool-icon"><IconLift /></div>
                <div className="sidebar-tool-text">
                  <strong>Hydraulic Lift</strong>
                  <span>Vertical platform pull lever</span>
                </div>
              </div>
              <span className="sidebar-tool-status">{activeTool === 'lift' ? 'ACTIVE' : 'SELECT'}</span>
            </button>

            <button
              type="button"
              className={`sidebar-tool-card ${activeTool === 'scrubber' ? 'active' : ''}`}
              onClick={() => {
                selectTool('scrubber');
                setConsoleMinimized(false);
                setSidebarOpen(false);
              }}
            >
              <div className="sidebar-tool-main">
                <div className="sidebar-tool-icon"><IconScrubber /></div>
                <div className="sidebar-tool-text">
                  <strong>Time Scrubber</strong>
                  <span>Exploded assembly timeline</span>
                </div>
              </div>
              <span className="sidebar-tool-status">{activeTool === 'scrubber' ? 'ACTIVE' : 'SELECT'}</span>
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
                setConsoleMinimized(false);
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

          {/* CAD & Measurements */}
          <div className="sidebar-section">
            <span className="sidebar-section-title">Inspection & Measurement</span>
            <button
              type="button"
              className={`sidebar-tool-card ${activeTool === 'calipers' ? 'active' : ''}`}
              onClick={() => {
                selectTool('calipers');
                setConsoleMinimized(false);
                setSidebarOpen(false);
              }}
            >
              <div className="sidebar-tool-main">
                <div className="sidebar-tool-icon"><IconCalipers /></div>
                <div className="sidebar-tool-text">
                  <strong>3D Calipers</strong>
                  <span>Surface distance measuring</span>
                </div>
              </div>
              <span className="sidebar-tool-status">{activeTool === 'calipers' ? 'ACTIVE' : 'SELECT'}</span>
            </button>

            <button
              type="button"
              className={`sidebar-tool-card ${activeTool === 'slicer' ? 'active' : ''}`}
              onClick={() => {
                selectTool('slicer');
                setConsoleMinimized(false);
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
                <span>↑ Load GLB</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
