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
  Annotation,
  BlenderControls,
  Measurement,
  SelectableModel,
  SelectableObject,
  SpatialProvider,
  type JoystickValue,
  type SpatialPart,
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
import { type Note, annotationOffset } from './notes';
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

export type PlaygroundDockTab = 'rigs' | 'studio' | 'inspect' | 'showcase';

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
  notes: Note[];
}) {
  const controlsRef = useRef<ComponentRef<typeof BlenderControls>>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Tool Dock Segment
  const [activeDockTab, setActiveDockTab] = useState<PlaygroundDockTab>('rigs');
  const [activeTool, setActiveTool] = useState<string | null>('light');

  // Mechanical Rig State
  const [lightDial, setLightDial] = useState(0.72);
  const [targetAim, setTargetAim] = useState<JoystickValue>({ x: 0, y: 0 });
  const [liftHeight, setLiftHeight] = useState(0.35);
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

  // Inspection Tools
  const [measuring, setMeasuring] = useState(false);
  const [caliperPointA, setCaliperPointA] = useState<[number, number, number] | null>(null);
  const [measurements, setMeasurements] = useState<Array<{ id: string; start: [number, number, number]; end: [number, number, number] }>>([]);
  const [crossSectionEnabled, setCrossSectionEnabled] = useState(false);
  const [sectionAxis, setSectionAxis] = useState<'x' | 'y' | 'z'>('y');
  const [sectionOffset, setSectionOffset] = useState(0);
  const [showAnnotations, setShowAnnotations] = useState(true);

  const env = ENVIRONMENT_PRESETS[envPreset];
  const defaultBg = envPreset === 'showroom' ? env.bgDark : (theme === 'dark' ? env.bgDark : env.bgLight);
  const canvasBg = customStudioBg ?? defaultBg;

  // Derive active model control from selected tool
  const activeModelControl: ActiveModelControl = useMemo(() => {
    if (activeTool === 'light') return 'light';
    if (activeTool === 'gimbal') return 'target';
    if (activeTool === 'lift') return 'lift';
    if (activeTool === 'scrubber') return 'scrub';
    return 'none';
  }, [activeTool]);

  // Slicing plane
  const clippingPlanes = useMemo(() => {
    if (!crossSectionEnabled) return undefined;
    const normal = sectionAxis === 'x'
      ? new Vector3(-1, 0, 0)
      : sectionAxis === 'y'
        ? new Vector3(0, -1, 0)
        : new Vector3(0, 0, -1);
    return [new Plane(normal, sectionOffset * 2)];
  }, [crossSectionEnabled, sectionAxis, sectionOffset]);

  // Target lock-on detection
  const isTargetLocked = Math.hypot(targetAim.x, targetAim.y) < 0.22;
  const aimXPercent = 50 + targetAim.x * 35;
  const aimYPercent = 50 - targetAim.y * 35;

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
        setActiveTool(null);
        setMeasuring(false);
        setCaliperPointA(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Surface click for measurements
  function handleSurfaceClick(hit: SurfaceHit) {
    if (measuring) {
      const worldPos = hit.point.slice() as [number, number, number];
      if (!caliperPointA) {
        setCaliperPointA(worldPos);
      } else {
        setMeasurements((prev) => [
          ...prev,
          { id: crypto.randomUUID(), start: caliperPointA, end: worldPos },
        ]);
        setCaliperPointA(null);
      }
    }
  }

  return (
    <main className="playground-workspace" ref={viewportRef} aria-label="SpatialKit 3D Playground">
      {shutterFlash && <div className="viewport-shutter-flash" aria-hidden="true" />}

      {/* ─── Topbar HUD Overlay ─────────────────────────────────────── */}
      <div className="playground-topbar">
        <div className="playground-meta-badge">
          <span className="status-dot" aria-hidden="true" />
          <strong>{model.name}</strong>
          <span style={{ color: '#94a3b8' }}>{model.format}</span>
          <button
            type="button"
            className="playground-top-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ padding: '3px 8px', fontSize: '10px' }}
          >
            {uploading ? 'Preparing…' : '↑ Load GLB'}
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
        </div>
      </div>

      {snapshotToast && (
        <div className="snapshot-toast" role="status">
          <span>📷</span> {snapshotToast}
        </div>
      )}

      {measuring && (
        <div className="placement-banner caliper-banner" role="status" style={{ top: 70, bottom: 'auto' }}>
          {caliperPointA ? 'Click second point to finish distance measurement' : 'Click first surface point to start measurement'}
        </div>
      )}

      {/* ─── Tactical Gimbal HUD Overlay (when Flight Gimbal active) ─── */}
      {activeModelControl === 'target' && (
        <div className="target-hud-overlay" aria-hidden="true">
          <div className="hud-top-tape">
            <span className="tape-heading">✦ GIMBAL LOCK-ON SYSTEM</span>
            <span>AIM: [{(targetAim.x * 100).toFixed(0)}, {(targetAim.y * 100).toFixed(0)}]</span>
            <span className={`hud-status-badge ${isTargetLocked ? 'locked' : ''}`}>
              {isTargetLocked ? '● TARGET LOCKED' : '○ ACQUIRING'}
            </span>
          </div>

          <div
            className={`hud-target-bracket ${isTargetLocked ? 'is-locked' : ''}`}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 140,
              height: 140,
              pointerEvents: 'none',
              border: `1.5px dashed ${isTargetLocked ? '#10b981' : '#f59e0b'}`,
              borderRadius: 8,
            }}
          >
            <span className="bracket-label">
              {isTargetLocked ? 'ASSEMBLY TARGET [LOCKED]' : 'ASSEMBLY TARGET'}
            </span>
            <div className="bracket-corner tl" />
            <div className="bracket-corner tr" />
            <div className="bracket-corner bl" />
            <div className="bracket-corner br" />
          </div>

          <div
            className="hud-reticle-movable"
            style={{
              position: 'absolute',
              left: `${aimXPercent}%`,
              top: `${aimYPercent}%`,
              transform: 'translate(-50%, -50%)',
              width: 80,
              height: 80,
              pointerEvents: 'none',
            }}
          >
            <svg className="hud-crosshair-svg" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="28" fill="none" stroke={isTargetLocked ? '#10b981' : '#38bdf8'} strokeWidth="1.5" strokeDasharray="6 4" />
              <circle cx="40" cy="40" r="4" fill={isTargetLocked ? '#10b981' : '#38bdf8'} />
              <line x1="40" y1="4" x2="40" y2="20" stroke={isTargetLocked ? '#10b981' : '#38bdf8'} strokeWidth="1.5" />
              <line x1="40" y1="60" x2="40" y2="76" stroke={isTargetLocked ? '#10b981' : '#38bdf8'} strokeWidth="1.5" />
              <line x1="4" y1="40" x2="20" y2="40" stroke={isTargetLocked ? '#10b981' : '#38bdf8'} strokeWidth="1.5" />
              <line x1="60" y1="40" x2="76" y2="40" stroke={isTargetLocked ? '#10b981' : '#38bdf8'} strokeWidth="1.5" />
            </svg>
          </div>

          <div className="hud-bottom-tape">
            <span>AZIMUTH: {(targetAim.x * 45).toFixed(1)}°</span>
            <span>ELEVATION: {(targetAim.y * 30).toFixed(1)}°</span>
            <span>RANGE: 3.4M</span>
          </div>
        </div>
      )}

      {/* ─── 3D Canvas ─────────────────────────────────────────────── */}
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [4.8, 3.4, 5.2], fov: 40 }}
        gl={{ localClippingEnabled: true, preserveDrawingBuffer: true }}
      >
        <color attach="background" args={[canvasBg]} />
        <ambientLight intensity={env.ambient} />
        <hemisphereLight args={[env.hemiSky, env.hemiGround, env.hemiIntensity]} />
        <directionalLight position={env.keyPos} intensity={env.keyIntensity} color={env.keyColor} />
        <directionalLight position={env.fillPos} intensity={env.fillIntensity} color={env.fillColor} />
        {env.rimPos && (
          <directionalLight position={env.rimPos} intensity={env.rimIntensity ?? 1.5} color={env.rimColor ?? '#ffffff'} />
        )}

        <Suspense fallback={<Html center><div className="scene-message">Preparing Playground…</div></Html>}>
          <SpatialProvider>
            <InteractiveModelRig
              activeControl={activeModelControl}
              lightDial={lightDial}
              liftHeight={liftHeight}
            >
              {model.object ? (
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
                  animationProgress={animationProgress}
                  explode={proceduralExplode}
                  clippingPlanes={clippingPlanes}
                  onSurfaceClick={handleSurfaceClick}
                />
              )}
            </InteractiveModelRig>

            {showAnnotations && notes.map((note, i) => (
              <Annotation
                key={note.id}
                target={note.target}
                label={note.label}
                point={note.point}
                offset={annotationOffset(notes, i)}
                className="model-annotation"
              />
            ))}

            {measurements.map((m) => (
              <Measurement
                key={m.id}
                start={m.start}
                end={m.end}
                unit="cm"
                color="#f6ad55"
              />
            ))}

            {caliperPointA && (
              <mesh position={caliperPointA}>
                <sphereGeometry args={[0.035, 16, 16]} />
                <meshBasicMaterial color="#f6ad55" depthTest={false} />
              </mesh>
            )}
          </SpatialProvider>

          <ContactShadows
            position={[0, -0.012, 0]}
            opacity={env.shadowOpacity}
            scale={14}
            blur={2.4}
            far={5}
            resolution={256}
            frames={1}
          />
        </Suspense>

        {showGrid && env.showGrid && (
          <gridHelper args={[20, 40, env.gridPrimary, env.gridSecondary]} position={[0, -0.025, 0]} />
        )}

        <BlenderControls
          ref={controlsRef}
          makeDefault
          target={[0, 1, 0]}
          minDistance={2}
          maxDistance={14}
          enableDamping
        />

        <PlaygroundDirector turntable={turntable} controlsRef={controlsRef} />
      </Canvas>

      {/* ─── Floating 3D Space Dock & Active Tool Console ──────────── */}
      <div className="playground-dock-container">
        {/* Active Tool Console: Emerges smoothly above the dock */}
        {activeTool && (
          <div className="playground-active-console" role="region" aria-label="Active Tool Console">
            <div className="console-header">
              <div className="console-header-title">
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
                  {activeTool === 'light' && `ORBIT: ${Math.round(lightDial * 360)}° · INTENSITY: ${Math.round(lightDial * 100)}%`}
                  {activeTool === 'gimbal' && `AIM: [${(targetAim.x * 100).toFixed(0)}, ${(targetAim.y * 100).toFixed(0)}] · ${isTargetLocked ? 'LOCKED' : 'TRACKING'}`}
                  {activeTool === 'lift' && `HEIGHT: ${(liftHeight * 1.8).toFixed(2)}m`}
                  {activeTool === 'scrubber' && `PROGRESS: ${Math.round((model.hasAnimations ? animationProgress : proceduralExplode) * 100)}%`}
                  {activeTool === 'studio' && `PRESET: ${env.label} · COLOR: ${canvasBg}`}
                  {activeTool === 'slicer' && `AXIS: ${sectionAxis.toUpperCase()} · OFFSET: ${sectionOffset.toFixed(2)}`}
                  {activeTool === 'calipers' && `${measurements.length} MEASUREMENT${measurements.length === 1 ? '' : 'S'} SAVED`}
                </span>
              </div>
              <button
                type="button"
                className="console-close-btn"
                onClick={() => {
                  setActiveTool(null);
                  setMeasuring(false);
                  setCaliperPointA(null);
                }}
                aria-label="Close active console"
              >
                ×
              </button>
            </div>

            {/* Spotlight Rig Widget */}
            {activeTool === 'light' && (
              <TactileDial
                value={lightDial}
                onChange={setLightDial}
                size={92}
                label="ORBIT / LUMENS"
                formatValue={(v) => `${Math.round(v * 100)}%`}
                showGraduations
              />
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

            {/* Hydraulic Lift Lever Widget */}
            {activeTool === 'lift' && (
              <div style={{ height: 130, display: 'flex', alignItems: 'center' }}>
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
              <div style={{ width: 280, padding: '4px 0' }}>
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

            {/* Slicing Plane Controls */}
            {activeTool === 'slicer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', minWidth: 260 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['x', 'y', 'z'] as const).map((axis) => (
                    <button
                      key={axis}
                      type="button"
                      className={`dock-item-btn ${sectionAxis === axis ? 'active' : ''}`}
                      style={{ flex: 1, justifyContent: 'center' }}
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
                  <output style={{ font: '10px monospace', color: 'var(--accent)' }}>{sectionOffset.toFixed(2)}</output>
                  <button
                    type="button"
                    className="playground-top-btn"
                    style={{ padding: '2px 6px', fontSize: '9px' }}
                    onClick={() => setSectionOffset(0)}
                  >
                    0
                  </button>
                </div>
              </div>
            )}

            {/* Calipers Measurement Controls */}
            {activeTool === 'calipers' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ font: '11px monospace', color: '#f6ad55' }}>
                  {measurements.length === 0 ? 'Click surface points to measure' : `${measurements.length} active measurement(s)`}
                </span>
                {measurements.length > 0 && (
                  <button
                    type="button"
                    className="playground-top-btn"
                    style={{ padding: '4px 8px', fontSize: '10px' }}
                    onClick={() => setMeasurements([])}
                  >
                    Clear All
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── The Segmented Floating 3D Space Dock ─── */}
        <nav className="playground-floating-dock" aria-label="Playground tools dock">
          {/* Segment: Rigs */}
          <button
            type="button"
            className={`dock-item-btn ${activeTool === 'light' ? 'active' : ''}`}
            onClick={() => setActiveTool((t) => (t === 'light' ? null : 'light'))}
            title="Inspection Spotlight Rig"
          >
            <IconSpotlight />
            <span>Spotlight</span>
          </button>
          <button
            type="button"
            className={`dock-item-btn ${activeTool === 'gimbal' ? 'active' : ''}`}
            onClick={() => setActiveTool((t) => (t === 'gimbal' ? null : 'gimbal'))}
            title="Flight Gimbal Target Lock"
          >
            <IconGimbal />
            <span>Gimbal</span>
          </button>
          <button
            type="button"
            className={`dock-item-btn ${activeTool === 'lift' ? 'active' : ''}`}
            onClick={() => setActiveTool((t) => (t === 'lift' ? null : 'lift'))}
            title="Hydraulic Platform Lift"
          >
            <IconLift />
            <span>Lift</span>
          </button>
          <button
            type="button"
            className={`dock-item-btn ${activeTool === 'scrubber' ? 'active' : ''}`}
            onClick={() => setActiveTool((t) => (t === 'scrubber' ? null : 'scrubber'))}
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
            onClick={() => setActiveTool((t) => (t === 'studio' ? null : 'studio'))}
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
            onClick={() => {
              const next = activeTool === 'calipers' ? null : 'calipers';
              setActiveTool(next);
              setMeasuring(next === 'calipers');
              setCaliperPointA(null);
            }}
            title="3D Calipers Measurement"
          >
            <IconCalipers />
            <span>Calipers</span>
          </button>
          <button
            type="button"
            className={`dock-item-btn ${activeTool === 'slicer' ? 'active' : ''}`}
            onClick={() => {
              const next = activeTool === 'slicer' ? null : 'slicer';
              setActiveTool(next);
              setCrossSectionEnabled(next === 'slicer');
            }}
            title="Cross-Section Slicing Plane"
          >
            <IconSlicer />
            <span>Slicer</span>
          </button>

          <span className="dock-separator" aria-hidden="true" />

          {/* Segment: Annotations */}
          <button
            type="button"
            className={`dock-item-btn ${showAnnotations ? 'active' : ''}`}
            onClick={() => setShowAnnotations((s) => !s)}
            title="Toggle 3D Annotations"
          >
            <span style={{ fontSize: '11px', fontWeight: 700 }}>▤</span>
            <span>Notes</span>
          </button>
        </nav>
      </div>
    </main>
  );
}
