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
import { Box3, Mesh, Plane, Vector3 } from 'three';
import {
  Annotation,
  BlenderControls,
  SelectableModel,
  SelectableObject,
  SpatialProvider,
  useSpatial,
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
import { generateComponent, publicFilename } from './integration';
import { INITIAL_NOTES, parseNotes, notesKey, annotationOffset, type Note } from './notes';
import {
  HorizontalMechanicalLever,
  PullLever,
  TactileDial,
  TactileJoystick,
} from './ControlsLab';

function SceneBridge({
  onParts,
  selectRef,
}: {
  onParts: (parts: SpatialPart[]) => void;
  selectRef: React.MutableRefObject<(target: string | null) => void>;
}) {
  const { parts, select } = useSpatial();
  useEffect(() => {
    onParts(parts);
  }, [parts, onParts]);
  useEffect(() => {
    selectRef.current = select;
  }, [select, selectRef]);
  return null;
}

// ─── Precision SVG Glyphs for Professional CAD/Blender UI ───────────────────
export function IconInspector() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <circle cx="11" cy="11" r="3" />
    </svg>
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
    // Zoomed out 25-30% more for wider field of view to easily track target
    const aspect = size.width / Math.max(1, size.height);
    const baseZ = aspect < 1.2 ? 14.2 : 11.2;
    const baseY = 2.2;
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
      if (node instanceof Mesh && node.userData._skPartId === focusRequest.partId) {
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

export function Playground({
  model,
  onUpload,
  onDemo,
  uploading,
  uploadError,
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
  uploadError: string;
  theme: 'light' | 'dark';
  notes?: Note[];
  onNotesChange?: (notes: Note[]) => void;
  onOpenGuide?: () => void;
  onDownloadModel?: () => void;
}) {
  const controlsRef = useRef<ComponentRef<typeof BlenderControls>>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noteFileInputRef = useRef<HTMLInputElement>(null);

  // Active Tool Selection & Responsive Sidebar: Default to 'inspect'!
  const [activeTool, setActiveTool] = useState<string | null>('inspect');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [consoleMinimized, setConsoleMinimized] = useState(false);

  // ─── 3D Inspector, Hotspot & Guided Tour State ──────────────────────────────
  const storageKey = notesKey(model.id);
  const [internalNotes, setInternalNotes] = useState<Note[]>(() => {
    if (propNotes && propNotes.length > 0) return propNotes;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) return parseNotes(raw, model.id);
    } catch {}
    return model.id === 'pump' ? INITIAL_NOTES : [];
  });

  const notes = propNotes ?? internalNotes;
  const setNotes = (updater: Note[] | ((prev: Note[]) => Note[])) => {
    setInternalNotes((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      onNotesChange?.(next);
      return next;
    });
  };

  const [parts, setParts] = useState<SpatialPart[]>([]);
  const selectRef = useRef<(target: string | null) => void>(() => {});
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null);
  const [pendingPoint, setPendingPoint] = useState<[number, number, number] | null>(null);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [showAssembly, setShowAssembly] = useState(false);
  const [assemblyFilter, setAssemblyFilter] = useState('');

  // Guided Feature Tour State
  const [tourActive, setTourActive] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [tourPaused, setTourPaused] = useState(false);
  const [focusRequest, setFocusRequest] = useState<CameraFocusRequest | null>(null);

  function triggerCameraFocus(partId: string, point?: [number, number, number]) {
    setFocusRequest({ partId, point, nonce: Date.now() + Math.random() });
  }

  const tourStops = useMemo(() => {
    if (notes.length === 0) return [];
    return notes.map((note) => {
      const part = parts.find((p) => p.id === note.target || p.name === note.target);
      return {
        id: note.id,
        partId: part?.id ?? note.target,
        partTitle: part ? String(part.metadata?.label ?? part.name) : note.target.replace(/^[^/]+\//, ''),
        caption: note.label,
        point: note.point,
      };
    });
  }, [notes, parts]);

  // Stop tour if notes drop below 2
  useEffect(() => {
    if (tourActive && tourStops.length < 2) {
      setTourActive(false);
    }
  }, [tourActive, tourStops.length]);

  // Tour step focus
  useEffect(() => {
    if (!tourActive || !tourStops.length) return;
    const safeIndex = tourIndex % tourStops.length;
    const stop = tourStops[safeIndex];
    if (stop) {
      selectRef.current(stop.partId);
      setSelectedPartId(stop.partId);
      setHighlightedNoteId(stop.id);
      triggerCameraFocus(stop.partId, stop.point);
    }
  }, [tourActive, tourIndex, tourStops]);

  // Tour timer (3.2 seconds brisk rhythm per stop)
  useEffect(() => {
    if (!tourActive || tourPaused || tourStops.length <= 1) return;
    const timer = setInterval(() => {
      setTourIndex((prev) => (prev + 1) % tourStops.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [tourActive, tourPaused, tourStops.length]);

  function handleSaveHotspot() {
    if (!draftLabel.trim() || !pendingTarget) return;
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      target: pendingTarget,
      label: draftLabel.trim(),
      point: pendingPoint ? [pendingPoint[0], pendingPoint[1], pendingPoint[2]] : undefined,
    };
    setNotes((prev) => [...prev, newNote]);
    setDraftLabel('');
    setPendingPoint(null);
    setPendingTarget(null);
  }

  function handleDeleteNote(noteId: string) {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  function handleExportNotes() {
    const jsonStr = JSON.stringify(notes, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${publicFilename(model.name)}-notes.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleImportNotes(file: File) {
    try {
      const text = await file.text();
      const imported = parseNotes(text, model.id);
      if (!imported.length) return;
      setNotes((existing) => {
        const existingIds = new Set(existing.map((n) => n.id));
        const merged = [...existing];
        for (const note of imported) {
          if (!existingIds.has(note.id)) {
            merged.push(note);
            existingIds.add(note.id);
          }
        }
        return merged;
      });
      setSnapshotToast(`Imported ${imported.length} hotspot${imported.length === 1 ? '' : 's'}`);
      setTimeout(() => setSnapshotToast(null), 2500);
    } catch (err) {
      console.error('Failed to import notes:', err);
    }
  }

  async function handleDownloadModel() {
    if (onDownloadModel) {
      onDownloadModel();
      return;
    }
    try {
      const blob = model.file ?? (await fetch(`/${model.filename || 'pump.glb'}`).then((r) => r.blob()));
      if (!blob) throw new Error('Download failed');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${publicFilename(model.filename || model.name)}.glb`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error('Failed to download model:', e);
    }
  }

  function handleOpenGuide() {
    if (onOpenGuide) {
      onOpenGuide();
    } else {
      const snippet = generateComponent(model, notes);
      navigator.clipboard.writeText(snippet);
      setSnapshotToast('React component code copied to clipboard!');
      setTimeout(() => setSnapshotToast(null), 2500);
    }
  }

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

  // Slicer Cross-Section Tool: Defaults to 1.00 so full model is 100% visible by default!
  // In CAD & 3D printing, Z is the vertical height axis (Top-to-Bottom slicing plane)
  const [crossSectionEnabled, setCrossSectionEnabled] = useState(false);
  const [sectionAxis, setSectionAxis] = useState<'x' | 'y' | 'z'>('z');
  const [sectionOffset, setSectionOffset] = useState(1.0);

  // Tool Selection with strict state isolation (no feature bleeding)
  function selectTool(toolName: string) {
    setActiveTool((prev) => {
      const next = prev === toolName ? null : toolName;
      setCrossSectionEnabled(next === 'slicer');
      if (next !== 'inspect') {
        setPendingPoint(null);
        setPendingTarget(null);
        setHighlightedNoteId(null);
        setTourActive(false);
      }
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

  // Slicing plane:
  // In CAD & 3D printing, Z is vertical height (slices top to bottom)
  // X is width (slices left to right)
  // Y is depth (slices front to back)
  const clippingPlanes = useMemo(() => {
    if (activeTool !== 'slicer' || !crossSectionEnabled) return undefined;
    if (sectionAxis === 'z') {
      const normal = new Vector3(0, -1, 0);
      const constant = (sectionOffset + 1.0) * 1.4;
      return [new Plane(normal, constant)];
    }
    if (sectionAxis === 'x') {
      const normal = new Vector3(-1, 0, 0);
      const constant = sectionOffset * 2.2 + 0.2;
      return [new Plane(normal, constant)];
    }
    const normal = new Vector3(0, 0, -1);
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
        setPendingPoint(null);
        setPendingTarget(null);
        setTourActive(false);
        setCrossSectionEnabled(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  // Surface click for 3D hotspots in inspector mode
  function handleSurfaceClick(hit: SurfaceHit) {
    if (activeTool === 'inspect') {
      const partId = hit.part.id;
      setSelectedPartId(partId);
      selectRef.current(partId);

      // Check if clicked part already has a hotspot
      const match = notes.find((n) => n.target === partId);
      if (match) {
        setHighlightedNoteId(match.id);
        setPendingPoint(null);
        setPendingTarget(null);
      } else {
        const worldPos = (hit.worldPoint ?? hit.point).slice() as [number, number, number];
        setPendingPoint(worldPos);
        setPendingTarget(partId);
        setHighlightedNoteId(null);
      }
      setConsoleMinimized(false);
    }
  }

  return (
    <main className="playground-workspace" ref={viewportRef} aria-label="SpatialKit 3D Playground">
      {shutterFlash && <div className="viewport-shutter-flash" aria-hidden="true" />}

      {/* ─── Topbar HUD Overlay (Clean & Uncluttered) ─── */}
      <div className="playground-topbar">
        <div className="playground-meta-badge">
          <span className="status-dot" aria-hidden="true" />
          <strong title={activeTool === 'gimbal' ? 'Basketball (Target)' : model.name}>
            {activeTool === 'gimbal' ? 'Basketball' : model.name}
          </strong>
          <button
            type="button"
            className="playground-top-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ padding: '3px 8px', fontSize: '10px' }}
          >
            {uploading ? 'Preparing…' : '↑ Upload'}
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
          <input
            ref={noteFileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) handleImportNotes(file);
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

      {/* ─── Bottom-Left 3D Model Credit Badge (Aligned with bottom dock) ─── */}
      <div className="playground-credit-badge" role="contentinfo" aria-label="3D Model Attribution">
        <span className="credit-icon">©</span>
        {activeTool === 'gimbal' ? (
          <span>
            Model: <a href="https://sketchfab.com/ikagogava" target="_blank" rel="noreferrer">Basketball by Ika Gogava</a> (Sketchfab)
          </span>
        ) : model.id === 'pump' ? (
          <span>
            Model: <strong>PX–04 Demonstration Pump</strong> (SpatialKit)
          </span>
        ) : (
          <span>
            Model: <strong>{model.name}</strong> (Local preview)
          </span>
        )}
      </div>

      {snapshotToast && (
        <div className="snapshot-toast" role="status">
          <span>📷</span> {snapshotToast}
        </div>
      )}

      {/* Hotspot Placement Instruction Banner */}
      {activeTool === 'inspect' && !tourActive && (
        <div
          className="placement-banner"
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
          {pendingPoint
            ? '✦ Point targeted on surface · Enter label in console below'
            : '✦ Click any part or surface of the 3D model to drop a hotspot'}
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

      {/* ─── Guided Feature Tour Top HUD (Auto-Cycling Callouts) ─── */}
      {tourActive && tourStops.length > 0 && (
        <div className="tour-hud-card" role="region" aria-label="Guided Tour">
          <div className="tour-hud-top">
            <span className="tour-step-badge">
              TOUR {String((tourIndex % tourStops.length) + 1).padStart(2, '0')} / {String(tourStops.length).padStart(2, '0')}
            </span>
            <strong>{tourStops[tourIndex % tourStops.length]?.partTitle}</strong>
            <div className="tour-hud-controls">
              <button
                type="button"
                aria-label="Previous tour stop"
                onClick={() => setTourIndex((i) => (i - 1 + tourStops.length) % tourStops.length)}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label={tourPaused ? 'Resume tour' : 'Pause tour'}
                onClick={() => setTourPaused((p) => !p)}
              >
                {tourPaused ? '▶' : '⏸'}
              </button>
              <button
                type="button"
                aria-label="Next tour stop"
                onClick={() => setTourIndex((i) => (i + 1) % tourStops.length)}
              >
                ›
              </button>
              <button
                type="button"
                aria-label="Exit guided tour"
                onClick={() => setTourActive(false)}
              >
                ✕
              </button>
            </div>
          </div>
          <div className="tour-hud-caption">
            {tourStops[tourIndex % tourStops.length]?.caption}
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

            <SceneBridge onParts={setParts} selectRef={selectRef} />

            {/* 3D Hotspot Annotations */}
            {activeTool === 'inspect' && notes.map((note, i) => (
              <Annotation
                key={note.id}
                target={note.target}
                label={note.label}
                point={note.point}
                offset={annotationOffset(notes, i)}
                className="model-annotation"
              />
            ))}

            {/* Active Locator Beacon when surface point is targeted */}
            {activeTool === 'inspect' && pendingPoint && (
              <mesh position={pendingPoint}>
                <sphereGeometry args={[0.045, 16, 16]} />
                <meshBasicMaterial color="#38bdf8" depthTest={false} />
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

        <ViewportDirector turntable={turntable} focusRequest={focusRequest} controlsRef={controlsRef} />
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
                {activeTool === 'inspect' && '✦ 3D HOTSPOT & TOUR INSPECTOR'}
                {activeTool === 'light' && '✦ INSPECTION SPOTLIGHT RIG'}
                {activeTool === 'gimbal' && '✦ 3D FLIGHT GIMBAL TRACKER'}
                {activeTool === 'lift' && '✦ HYDRAULIC LIFT PLATFORM'}
                {activeTool === 'scrubber' && '✦ MECHANICAL SCRUBBER LEVER'}
                {activeTool === 'studio' && '✦ STUDIO LIGHTING & BACKDROP'}
                {activeTool === 'slicer' && '✦ CROSS-SECTION SLICING PLANE'}
              </strong>
              <span>
                {activeTool === 'inspect' && `${notes.length} HOTSPOT${notes.length === 1 ? '' : 'S'} · ${parts.length} PARTS`}
                {activeTool === 'light' && `ORBIT: ${Math.round(lightDial * 360)}° · BRIGHTNESS: ${Math.round(lightBrightness * 100)}%`}
                {activeTool === 'gimbal' && `AIM: [${(targetAim.x * 100).toFixed(0)}, ${(targetAim.y * 100).toFixed(0)}] · ${isTargetLocked ? 'LOCKED' : 'TRACKING'}`}
                {activeTool === 'lift' && `HEIGHT: ${(0.08 + liftHeight * 3.4).toFixed(2)}m`}
                {activeTool === 'scrubber' && `PROGRESS: ${Math.round((model.hasAnimations ? animationProgress : proceduralExplode) * 100)}%`}
                {activeTool === 'studio' && `PRESET: ${env.label} · COLOR: ${canvasBg}`}
                {activeTool === 'slicer' && `AXIS: ${sectionAxis.toUpperCase()} · OFFSET: ${sectionOffset.toFixed(2)}`}
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
                  setPendingPoint(null);
                  setPendingTarget(null);
                  setDraftLabel('');
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
            {/* 3D Inspector: Hotspots, Guided Tour, Closeable Assembly, & Export/Import */}
            {activeTool === 'inspect' && (
              <div className="inspector-console-wrap" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* 1. Hotspot Input Box (Contextual: Appears when user clicks surface to add a hotspot) */}
                {pendingPoint ? (
                  <div className="inspector-anchor-box">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ font: '700 10.5px "JetBrains Mono", monospace', color: '#38bdf8' }}>
                        ✦ ATTACH TO {pendingTarget?.replace(/^[^/]+\//, '').toUpperCase()}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingPoint(null);
                          setPendingTarget(null);
                          setDraftLabel('');
                        }}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        className="inspector-text-input"
                        placeholder="Describe this hotspot…"
                        value={draftLabel}
                        onChange={(e) => setDraftLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveHotspot();
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="inspector-primary-btn"
                        onClick={handleSaveHotspot}
                        disabled={!draftLabel.trim()}
                      >
                        Attach ↗
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="inspector-hint-pill">
                    <span>💡 Click any part on the model to highlight or drop a hotspot</span>
                  </div>
                )}

                {/* 2. Hotspots List with live selection highlighting */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                  <div className="inspector-section-label">
                    <span>HOTSPOTS ({notes.length})</span>
                    {selectedPartId && (
                      <span style={{ color: '#38bdf8', fontSize: 9.5 }}>
                        SELECTED: {selectedPartId.replace(/^[^/]+\//, '')}
                      </span>
                    )}
                  </div>

                  {notes.length > 0 ? (
                    <div className="inspector-notes-scroll">
                      {notes.map((note) => {
                        const isMatch = highlightedNoteId === note.id || selectedPartId === note.target;
                        return (
                          <div
                            key={note.id}
                            className={`inspector-note-card ${isMatch ? 'active-highlight' : ''}`}
                            onClick={() => {
                              setSelectedPartId(note.target);
                              setHighlightedNoteId(note.id);
                              selectRef.current(note.target);
                              triggerCameraFocus(note.target, note.point);
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, gap: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className="note-part-badge">{note.target.replace(/^[^/]+\//, '')}</span>
                                {isMatch && <span className="note-selected-tag">● ACTIVE</span>}
                              </div>
                              <span className="note-label-text">{note.label}</span>
                            </div>
                            <button
                              type="button"
                              className="inspector-note-delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNote(note.id);
                                if (highlightedNoteId === note.id) setHighlightedNoteId(null);
                              }}
                              title="Delete hotspot"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="inspector-empty-notes">
                      No hotspots placed yet. Click on the model to add your first point.
                    </div>
                  )}
                </div>

                {/* 3. Guided Tour Launcher (with fast 3.2s transition rhythm) */}
                <div style={{ width: '100%' }}>
                  {tourStops.length >= 2 ? (
                    <button
                      type="button"
                      className={`inspector-tour-toggle-btn ${tourActive ? 'active' : ''}`}
                      onClick={() => setTourActive((a) => !a)}
                    >
                      <span>{tourActive ? '⏹ Exit Tour' : '▶ Start Guided Feature Tour'}</span>
                      <span style={{ fontSize: 10, opacity: 0.85 }}>({tourStops.length} stops · 3s pace)</span>
                    </button>
                  ) : (
                    <div className="inspector-tour-locked-banner">
                      Add {2 - tourStops.length} more hotspot{2 - tourStops.length === 1 ? '' : 's'} to unlock guided tour
                    </div>
                  )}
                </div>

                {/* 4. Closeable Assembly Dropdown with search filter */}
                <div className="inspector-assembly-section">
                  <button
                    type="button"
                    className={`inspector-assembly-header-btn ${showAssembly ? 'open' : ''}`}
                    onClick={() => setShowAssembly((s) => !s)}
                  >
                    <span>✦ Assembly Tree ({parts.length} parts)</span>
                    <span className="assembly-toggle-indicator">{showAssembly ? 'Hide ▲' : 'Open ▼'}</span>
                  </button>

                  {showAssembly && (
                    <div className="inspector-assembly-list">
                      <div className="assembly-search-input-wrap">
                        <input
                          type="text"
                          className="assembly-search-mini"
                          placeholder="Filter parts…"
                          value={assemblyFilter}
                          onChange={(e) => setAssemblyFilter(e.target.value)}
                        />
                        {assemblyFilter && (
                          <button
                            type="button"
                            className="assembly-search-clear"
                            onClick={() => setAssemblyFilter('')}
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <div className="assembly-scroll-container">
                        {parts
                          .filter((p) => {
                            const name = String(p.metadata?.label ?? p.name).toLowerCase();
                            return !assemblyFilter || name.includes(assemblyFilter.toLowerCase()) || p.id.toLowerCase().includes(assemblyFilter.toLowerCase());
                          })
                          .map((part) => {
                            const isSelected = selectedPartId === part.id;
                            const hasNote = notes.some((n) => n.target === part.id);
                            return (
                              <button
                                key={part.id}
                                type="button"
                                className={`assembly-part-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  setSelectedPartId(part.id);
                                  selectRef.current(part.id);
                                  triggerCameraFocus(part.id);
                                  const match = notes.find((n) => n.target === part.id);
                                  setHighlightedNoteId(match ? match.id : null);
                                }}
                              >
                                <span className="part-mesh-icon">⬡</span>
                                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {String(part.metadata?.label ?? part.name)}
                                </span>
                                {hasNote && <span className="assembly-note-dot" title="Has hotspot">●</span>}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Storage, Import/Export & Integration matching user screenshot */}
                <div className="inspector-storage-section">
                  <div className="inspector-storage-status">
                    <span className="status-dot green" />
                    <span>Notes saved on this device</span>
                  </div>

                  <div className="inspector-storage-actions">
                    <button
                      type="button"
                      className="inspector-action-link"
                      onClick={() => noteFileInputRef.current?.click()}
                    >
                      Import notes ↑
                    </button>
                    <button
                      type="button"
                      className="inspector-action-link"
                      onClick={handleExportNotes}
                    >
                      Export notes ↓
                    </button>
                  </div>

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
                    <span>Download Model (.glb)</span>
                    <span>⤓</span>
                  </button>
                </div>
              </div>
            )}
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

          </div>
        </aside>
      )}

      {/* ─── Floating 3D Space Dock (Centered at bottom, touch-scrollable on mobile) ─── */}
      <div className="playground-dock-container">
        <nav className="playground-floating-dock" aria-label="Playground tools dock">
          {/* Segment: Inspector (FIRST item in dock before Spotlight) */}
          <button
            type="button"
            className={`dock-item-btn ${activeTool === 'inspect' ? 'active' : ''}`}
            onClick={() => selectTool('inspect')}
            title="3D Hotspot & Tour Inspector"
          >
            <IconInspector />
            <span>Inspector</span>
          </button>

          <span className="dock-separator" aria-hidden="true" />

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

        <div className="sidebar-content">
          {/* 3D Hotspot & Guided Tour Inspector */}
          <div className="sidebar-section">
            <span className="sidebar-section-title">Inspection & Hotspots</span>
            <button
              type="button"
              className={`sidebar-tool-card ${activeTool === 'inspect' ? 'active' : ''}`}
              onClick={() => {
                selectTool('inspect');
                setConsoleMinimized(false);
                setSidebarOpen(false);
              }}
            >
              <div className="sidebar-tool-main">
                <div className="sidebar-tool-icon"><IconInspector /></div>
                <div className="sidebar-tool-text">
                  <strong>3D Inspector</strong>
                  <span>Hotspots, guided tour & parts</span>
                </div>
              </div>
              <span className="sidebar-tool-status">{activeTool === 'inspect' ? 'ACTIVE' : 'SELECT'}</span>
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

          {/* Slicing */}
          <div className="sidebar-section">
            <span className="sidebar-section-title">Slicing & Cross-Section</span>
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
                <span>↑ Upload GLB</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
