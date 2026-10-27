import { useEffect, useRef, useState, Suspense, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Vector3, type Group, type Mesh, AdditiveBlending, DoubleSide } from 'three';
import { DialControl, SelectableModel, SpatialProvider, BlenderControls, type JoystickValue } from 'spatialkit/react';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function ControlCard({ index, number, title, description, tags, code, toggle3D, children }: {
  index: number;
  number: string;
  title: string;
  description: string;
  tags: string[];
  code: string;
  toggle3D?: { active: boolean; onToggle: () => void; label?: string };
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (!copied) return; const timer = setTimeout(() => setCopied(false), 1600); return () => clearTimeout(timer); }, [copied]);
  return (
    <article className="lab-card" style={{ '--card-index': index } as CSSProperties}>
      <div className="lab-card-head">
        <span>{number}</span>
        <div>
          {toggle3D && (
            <button
              type="button"
              className={`lab-mode-toggle ${toggle3D.active ? 'active' : ''}`}
              onClick={toggle3D.onToggle}
              title="Toggle between 2D schematic and real 3D model"
            >
              {toggle3D.active ? '✦ 3D Scene' : '⬡ View 3D'}
            </button>
          )}
          {tags.map((tag) => <small key={tag}>{tag}</small>)}
        </div>
      </div>
      <div className="lab-stage">{children}</div>
      <div className="lab-card-copy">
        <h2>{title}</h2>
        <p>{description}</p>
        <button onClick={async () => { await navigator.clipboard.writeText(code); setCopied(true); }}>{copied ? '✓ Copied' : 'Copy example'} <span>↗</span></button>
      </div>
    </article>
  );
}

/** Individual playing card with face, suit emblem, and crimson back. */
function PlayingCard({ index, total, progress }: { index: number; total: number; progress: number }) {
  // Cascading trigger threshold for each card
  const start = (index / total) * 0.7;
  const p = clamp((progress - start) / 0.3, 0, 1);

  // Stacked starting position at progress = 0
  const stackedY = -0.28 + index * 0.0075;

  // Arc physics when falling / cascading across the gaming table
  const spreadX = ((index - total / 2) / (total / 2)) * 1.6;
  const spreadZ = -0.3 + (index / total) * 1.5;
  const arcY = Math.sin(p * Math.PI) * 0.75;
  const landedY = -0.28 + index * 0.0035;

  const x = (1 - p) * 0 + p * spreadX;
  const y = (1 - p) * stackedY + p * landedY + arcY;
  const z = (1 - p) * 0 + p * spreadZ;

  // Rotations
  const rotX = (1 - p) * 0 + p * (0.12 + Math.sin(index * 0.7) * 0.08);
  const rotY = (1 - p) * 0 + p * ((index - total / 2) * 0.07);
  const rotZ = (1 - p) * 0 + p * (Math.sin(index * 0.85) * 0.18 + (1 - p) * 0.22);

  const suit = ['♠', '♥', '♦', '♣'][index % 4];
  const isRed = suit === '♥' || suit === '♦';

  return (
    <group position={[x, y, z]} rotation={[rotX, rotY, rotZ]}>
      {/* Crisp White Card Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.58, 0.86, 0.006]} />
        <meshStandardMaterial color="#fdfbf7" roughness={0.35} metalness={0.05} />
      </mesh>
      {/* Card Back: Royal Crimson pattern */}
      <mesh position={[0, 0, -0.004]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.52, 0.8]} />
        <meshStandardMaterial color="#991b1b" roughness={0.5} />
      </mesh>
      {/* Card Front: White inlay */}
      <mesh position={[0, 0, 0.004]}>
        <planeGeometry args={[0.52, 0.8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Front Emblem / Suit Pip */}
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[0.2, 0.2]} />
        <meshBasicMaterial color={isRed ? '#dc2626' : '#0f172a'} />
      </mesh>
    </group>
  );
}

/** 01 3D Stage: Deck of Cards Falling / Cascading along Timeline Scrub. */
function DeckOfCardsViewer({ progress }: { progress: number }) {
  const cardCount = 30;
  return (
    <div className="lab-3d-stage">
      <Canvas camera={{ position: [0, 1.4, 2.8], fov: 44 }}>
        <color attach="background" args={['#080e1a']} />
        <ambientLight intensity={1.1} />
        <directionalLight position={[4, 6, 4]} intensity={2.6} />
        <directionalLight position={[-4, 3, -3]} intensity={1.1} color="#94a3b8" />

        {/* Casino Green Felt Table Surface */}
        <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#064e3b" roughness={0.85} metalness={0.1} />
        </mesh>
        <gridHelper args={[10, 20, '#042f24', '#064e3b']} position={[0, -0.295, 0]} />

        {/* 30 Playing Cards Cascading */}
        <group position={[0, 0, -0.2]}>
          {Array.from({ length: cardCount }).map((_, i) => (
            <PlayingCard key={i} index={i} total={cardCount} progress={progress} />
          ))}
        </group>

        <BlenderControls target={[0, 0.1, 0]} minDistance={1.6} maxDistance={6} enableDamping />
      </Canvas>
    </div>
  );
}

/** Horizontal Mechanical Slider Lever with Graduation Marks and Heavy T-Grip Handle. */
export function HorizontalMechanicalLever({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.005,
  label = 'Timeline scrubber lever',
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const trackRectRef = useRef<{ left: number; width: number } | null>(null);
  const [active, setActive] = useState(false);

  const range = max - min;
  const progress = range > 0 ? clamp((value - min) / range, 0, 1) : 0;

  const updateFromClientX = (clientX: number) => {
    const rect = trackRectRef.current;
    if (!rect) return;
    const pad = 24;
    const usableWidth = Math.max(1, rect.width - pad * 2);
    const ratio = clamp((clientX - (rect.left + pad)) / usableWidth, 0, 1);
    const snapped = min + Math.round((ratio * range) / step) * step;
    onChange(clamp(Number(snapped.toFixed(4)), min, max));
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Number(value.toFixed(2))}
      className={`horiz-lever ${active ? 'is-active' : ''}`}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault();
          onChange(clamp(value + step * 4, min, max));
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          event.preventDefault();
          onChange(clamp(value - step * 4, min, max));
        } else if (event.key === 'Home') {
          event.preventDefault();
          onChange(min);
        } else if (event.key === 'End') {
          event.preventDefault();
          onChange(max);
        }
      }}
      onPointerDown={(event) => {
        pointerIdRef.current = event.pointerId;
        const b = trackRef.current?.getBoundingClientRect();
        if (b) trackRectRef.current = { left: b.left, width: b.width };
        event.currentTarget.setPointerCapture(event.pointerId);
        setActive(true);
        updateFromClientX(event.clientX);
      }}
      onPointerMove={(event) => {
        if (pointerIdRef.current !== event.pointerId) return;
        updateFromClientX(event.clientX);
      }}
      onPointerUp={(event) => {
        if (pointerIdRef.current !== event.pointerId) return;
        pointerIdRef.current = null;
        trackRectRef.current = null;
        setActive(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        pointerIdRef.current = null;
        trackRectRef.current = null;
        setActive(false);
      }}
    >
      <div className="horiz-lever-ticks" aria-hidden="true">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
      <div className="horiz-lever-slot">
        <div className="horiz-lever-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      <div
        className="horiz-lever-carriage"
        style={{ left: `calc(24px + ${progress} * (100% - 48px))` }}
      >
        <div className="horiz-lever-handle">
          <i /><i /><i />
          <span>SCRUB</span>
        </div>
      </div>
    </div>
  );
}

/** 07 3D Stage: Fighter-Jet Camera Turret & Moving Low-Poly Target Drone. */
function TargetShooterScene({
  joystick,
  onHUDUpdate,
}: {
  joystick: JoystickValue;
  onHUDUpdate: (info: {
    isLocked: boolean;
    distMeters: number;
    screenX: number;
    screenY: number;
    inView: boolean;
    heading: number;
    pitch: number;
  }) => void;
}) {
  const { camera } = useThree();
  const droneRef = useRef<Group>(null);
  const ringRef = useRef<Mesh>(null);
  const tempVec = useRef(new Vector3());
  const aimForward = useRef(new Vector3());
  const targetDir = useRef(new Vector3());

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!droneRef.current) return;

    // Target drone orbits through 3D space
    const tx = Math.sin(t * 0.85) * 2.8 + Math.cos(t * 0.4) * 0.7;
    const ty = 0.4 + Math.cos(t * 1.1) * 1.1 + Math.sin(t * 0.5) * 0.4;
    const tz = -4.8 + Math.sin(t * 0.7) * 1.3;
    droneRef.current.position.set(tx, ty, tz);
    droneRef.current.rotation.y += 0.03;
    droneRef.current.rotation.x = Math.sin(t * 1.6) * 0.2;

    if (ringRef.current) {
      ringRef.current.rotation.z -= 0.04;
    }

    // Camera acts as the seeker turret: rotation steered directly by joystick!
    const targetYaw = -joystick.x * 0.82;
    const targetPitch = joystick.y * 0.54;
    const targetRoll = -joystick.x * 0.08;
    camera.rotation.y += (targetYaw - camera.rotation.y) * 0.22;
    camera.rotation.x += (targetPitch - camera.rotation.x) * 0.22;
    camera.rotation.z += (targetRoll - camera.rotation.z) * 0.22;

    // Missile lock-on angular check: angle between camera forward and target direction
    camera.getWorldDirection(aimForward.current);
    targetDir.current.copy(droneRef.current.position).sub(camera.position).normalize();
    const angle = aimForward.current.angleTo(targetDir.current);
    const isLocked = angle < 0.20; // Within ~11.5° cone of center crosshairs

    // Screen-space projection of target drone
    tempVec.current.copy(droneRef.current.position).project(camera);
    const inView = tempVec.current.z < 1;
    const screenX = (tempVec.current.x * 0.5 + 0.5) * 100;
    const screenY = (-tempVec.current.y * 0.5 + 0.5) * 100;
    const distMeters = Math.round(camera.position.distanceTo(droneRef.current.position) * 16);
    const heading = Math.round(((camera.rotation.y * (180 / Math.PI) * -1) % 360 + 360) % 360);
    const pitch = Math.round(camera.rotation.x * (180 / Math.PI));

    onHUDUpdate({ isLocked, distMeters, screenX, screenY, inView, heading, pitch });
  });

  return (
    <>
      <color attach="background" args={['#070d18']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 8, 5]} intensity={2.4} />
      <directionalLight position={[-5, -2, -3]} intensity={0.8} color="#0284c7" />

      {/* Cyber low-poly wireframe ground grid */}
      <gridHelper args={[24, 16, '#334155', '#0f172a']} position={[0, -2.4, -4]} />

      {/* Floating Low-Poly Radar Buoys */}
      <group position={[-5, 1.2, -7]}>
        <mesh>
          <octahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial color="#475569" flatShading />
        </mesh>
      </group>
      <group position={[5.2, -0.8, -8]}>
        <mesh>
          <octahedronGeometry args={[0.25, 0]} />
          <meshStandardMaterial color="#475569" flatShading />
        </mesh>
      </group>

      {/* Moving Low-Poly Target Drone */}
      <group ref={droneRef} position={[0, 0, -4.5]}>
        <mesh>
          <octahedronGeometry args={[0.38, 0]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.8} flatShading />
        </mesh>
        <mesh ref={ringRef}>
          <torusGeometry args={[0.56, 0.024, 6, 24]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.6} wireframe />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
        <mesh position={[-0.2, 0, 0.35]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#06b6d4" />
        </mesh>
        <mesh position={[0.2, 0, 0.35]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#06b6d4" />
        </mesh>
      </group>
    </>
  );
}

function TargetTracker3D({ joystick }: { joystick: JoystickValue }) {
  const [hud, setHud] = useState({
    isLocked: false,
    distMeters: 48,
    screenX: 50,
    screenY: 50,
    inView: true,
    heading: 0,
    pitch: 0,
  });

  return (
    <div className="target-tracker-stage">
      <Canvas camera={{ position: [0, 0, 0], fov: 52 }}>
        <TargetShooterScene joystick={joystick} onHUDUpdate={setHud} />
      </Canvas>

      {/* Tactical Military HUD Overlay */}
      <div className="target-tracker-hud">
        <div className="hud-top-tape">
          <span>SYS.AIM · TURRET-01</span>
          <span className="tape-heading">HDG {hud.heading.toString().padStart(3, '0')}° · PITCH {hud.pitch >= 0 ? `+${hud.pitch}` : hud.pitch}°</span>
          <span>FOV 52°</span>
        </div>

        {/* Center optical crosshair fixed to camera forward bore-sight */}
        <div className="hud-reticle-center" style={{ left: '50%', top: '50%' }}>
          <svg className="hud-crosshair-svg" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="24"
              fill="none"
              stroke={hud.isLocked ? '#10b981' : '#f59e0b'}
              strokeWidth="1.4"
              strokeDasharray={hud.isLocked ? undefined : '4 6'}
            />
            <circle
              cx="50"
              cy="50"
              r="2.5"
              fill={hud.isLocked ? '#10b981' : '#f59e0b'}
            />
            <line x1="20" y1="50" x2="38" y2="50" stroke={hud.isLocked ? '#10b981' : '#f59e0b'} strokeWidth="1.4" />
            <line x1="62" y1="50" x2="80" y2="50" stroke={hud.isLocked ? '#10b981' : '#f59e0b'} strokeWidth="1.4" />
            <line x1="50" y1="20" x2="50" y2="38" stroke={hud.isLocked ? '#10b981' : '#f59e0b'} strokeWidth="1.4" />
            <line x1="50" y1="62" x2="50" y2="80" stroke={hud.isLocked ? '#10b981' : '#f59e0b'} strokeWidth="1.4" />
          </svg>
        </div>

        {/* Dynamic target tracking brackets tracking the target drone: ORANGE -> GREEN */}
        {hud.inView && (
          <div
            className={`hud-target-bracket ${hud.isLocked ? 'is-locked' : ''}`}
            style={{
              left: `${clamp(hud.screenX, 8, 92)}%`,
              top: `${clamp(hud.screenY, 12, 88)}%`,
              borderColor: hud.isLocked ? '#10b981' : '#f59e0b',
            }}
          >
            <div className="bracket-corner tl" style={{ borderColor: hud.isLocked ? '#10b981' : '#f59e0b' }} />
            <div className="bracket-corner tr" style={{ borderColor: hud.isLocked ? '#10b981' : '#f59e0b' }} />
            <div className="bracket-corner bl" style={{ borderColor: hud.isLocked ? '#10b981' : '#f59e0b' }} />
            <div className="bracket-corner br" style={{ borderColor: hud.isLocked ? '#10b981' : '#f59e0b' }} />
            <span
              className="bracket-label"
              style={{
                borderColor: hud.isLocked ? '#10b981' : '#f59e0b',
                color: hud.isLocked ? '#10b981' : '#f59e0b',
                background: hud.isLocked ? 'rgba(6, 78, 59, 0.9)' : 'rgba(15, 23, 42, 0.85)',
              }}
            >
              {hud.isLocked ? `● LOCKED · ${hud.distMeters}m` : `○ ACQUIRING · ${hud.distMeters}m`}
            </span>
          </div>
        )}

        <div className="hud-bottom-tape">
          <span className={`hud-status-badge ${hud.isLocked ? 'locked' : ''}`}>
            {hud.isLocked ? '● MISSILE LOCK READY' : '○ ACQUIRING TARGET'}
          </span>
          <span>AIM X: {joystick.x.toFixed(2)} · Y: {joystick.y.toFixed(2)}</span>
          <span>DRONE-LP</span>
        </div>
      </div>
    </div>
  );
}

/** 07 2D Mode: Tactical CRT Radar Scope. */
function TactileRadar2D({ joystick }: { joystick: JoystickValue }) {
  const [target, setTarget] = useState({ x: 32, y: -22 });

  useEffect(() => {
    let frame = 0;
    const interval = setInterval(() => {
      frame += 0.04;
      setTarget({
        x: Math.sin(frame * 0.9) * 42,
        y: Math.cos(frame * 1.2) * 32,
      });
    }, 40);
    return () => clearInterval(interval);
  }, []);

  const crossX = joystick.x * 45;
  const crossY = -joystick.y * 45;
  const dist = Math.hypot(crossX - target.x, crossY - target.y);
  const isLocked = dist < 14;

  return (
    <div className="radar-2d-scope">
      <div className="radar-sweep-beam" />
      <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <circle cx="50" cy="50" r="15" fill="none" stroke="#1e293b" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="#1e293b" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="0.8" />
        <line x1="50" y1="0" x2="50" y2="100" stroke="#1e293b" strokeWidth="0.8" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" strokeWidth="0.8" />
      </svg>
      <div
        className={`radar-target-blip ${isLocked ? 'is-locked' : ''}`}
        style={{
          left: `${50 + (target.x / 50) * 40}%`,
          top: `${50 + (target.y / 50) * 40}%`,
        }}
      />
      <div
        className={`radar-crosshair ${isLocked ? 'is-locked' : ''}`}
        style={{
          left: `${50 + joystick.x * 40}%`,
          top: `${50 - joystick.y * 40}%`,
        }}
      />
    </div>
  );
}

/** 08 3D Stage: Blender Suzanne with Focused Overhead Inspection Spotlight (ZOOMED OUT AT FIRST). */
function SuzanneInspection3D({ light }: { light: number }) {
  const lit = clamp(light, 0, 1);
  return (
    <div className="lab-3d-stage">
      <Canvas camera={{ position: [0, 0.9, 4.4], fov: 44 }}>
        <color attach="background" args={['#080d19']} />

        {/* Overhead Industrial Lamp Fixture */}
        <group position={[0, 2.1, 0]}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 0.5, 8]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.18, 0.56, 0.38, 32]} />
            <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0, -0.06, 0]}>
            <sphereGeometry args={[0.16, 24, 24]} />
            <meshStandardMaterial
              emissive="#fef08a"
              emissiveIntensity={0.5 + lit * 5.0}
              color="#fef9c3"
              roughness={0.1}
            />
          </mesh>
        </group>

        {/* Volumetric Light Cone Beam */}
        <mesh position={[0, 1.05, 0]}>
          <coneGeometry args={[1.5, 2.1, 32, 1, true]} />
          <meshBasicMaterial
            color="#fef08a"
            transparent
            opacity={0.02 + lit * 0.18}
            depthWrite={false}
            blending={AdditiveBlending}
            side={DoubleSide}
          />
        </mesh>

        {/* Focused Overhead Spotlight Shining Directly onto Suzanne */}
        <spotLight
          position={[0, 2.1, 0]}
          target-position={[0, 0.1, 0]}
          intensity={20 + lit * 180}
          angle={0.68}
          penumbra={0.4}
          color="#fffbeb"
        />

        {/* Dynamic Point Light for Specular Highlights on Brow & Snout */}
        <pointLight
          position={[
            Math.cos(lit * Math.PI * 2) * 1.6,
            1.8,
            Math.sin(lit * Math.PI * 2) * 1.6,
          ]}
          intensity={8 + lit * 75}
          color="#fde68a"
          distance={6}
          decay={2}
        />

        <ambientLight intensity={0.25 + lit * 0.4} />
        <directionalLight position={[0, -1, -3]} intensity={0.7} color="#38bdf8" />

        {/* Circular Inspection Pedestal */}
        <mesh position={[0, -0.68, 0]}>
          <cylinderGeometry args={[1.4, 1.5, 0.14, 32]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.5} />
        </mesh>
        <mesh position={[0, -0.60, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0, 1.25, 32]} />
          <meshBasicMaterial
            color="#fef08a"
            transparent
            opacity={0.06 + lit * 0.28}
            blending={AdditiveBlending}
          />
        </mesh>

        {/* Blender's Iconic Suzanne 3D Monkey Mesh */}
        <Suspense fallback={null}>
          <SpatialProvider>
            <SelectableModel
              src="/models/Suzanne.glb"
              modelId="suzanne-inspection"
              fit={1.75}
              position={[0, 0.08, 0]}
            />
          </SpatialProvider>
        </Suspense>

        <BlenderControls target={[0, 0.2, 0]} minDistance={1.2} maxDistance={8} enableDamping />
      </Canvas>
    </div>
  );
}

/** Tactile vertical mechanical pull-lever with a physical grab handle, track ticks, wheel, and keyboard support. */
export function PullLever({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.005,
  inverted = false,
  label,
  unitLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  inverted?: boolean;
  label: string;
  unitLabel?: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const trackRectRef = useRef<{ top: number; height: number } | null>(null);
  const [active, setActive] = useState(false);
  const range = max - min;
  const normalized = range > 0 ? clamp((value - min) / range, 0, 1) : 0;
  const topFraction = inverted ? normalized : 1 - normalized;

  const setClamped = (next: number) => {
    const snapped = min + Math.round((clamp(next, min, max) - min) / step) * step;
    onChange(clamp(Number(snapped.toFixed(4)), min, max));
  };

  const updateFromClientY = (clientY: number) => {
    const rect = trackRectRef.current;
    if (!rect) return;
    const pad = 16;
    const usableHeight = Math.max(1, rect.height - pad * 2);
    const ratioFromTop = clamp((clientY - (rect.top + pad)) / usableHeight, 0, 1);
    const nextNorm = inverted ? ratioFromTop : 1 - ratioFromTop;
    setClamped(min + nextNorm * range);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const dir = inverted ? -1 : 1;
    const changes: Record<string, number> = {
      ArrowUp: step * dir,
      ArrowRight: step,
      ArrowDown: -step * dir,
      ArrowLeft: -step,
      PageUp: step * 10 * dir,
      PageDown: -step * 10 * dir,
    };
    if (event.key === 'Home') { event.preventDefault(); setClamped(min); }
    else if (event.key === 'End') { event.preventDefault(); setClamped(max); }
    else if (changes[event.key] !== undefined) {
      event.preventDefault();
      setClamped(value + changes[event.key]);
    }
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Number(value.toFixed(2))}
      className={`pull-lever ${active ? 'is-active' : ''}`}
      onKeyDown={onKeyDown}
      onWheel={(event) => {
        event.preventDefault();
        const delta = (event.deltaY < 0 ? 1 : -1) * (inverted ? -1 : 1);
        setClamped(value + delta * step * 4);
      }}
      onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
        pointerIdRef.current = event.pointerId;
        const b = trackRef.current?.getBoundingClientRect();
        if (b) trackRectRef.current = { top: b.top, height: b.height };
        event.currentTarget.setPointerCapture(event.pointerId);
        setActive(true);
        updateFromClientY(event.clientY);
      }}
      onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
        if (pointerIdRef.current !== event.pointerId) return;
        updateFromClientY(event.clientY);
      }}
      onPointerUp={(event: PointerEvent<HTMLDivElement>) => {
        if (pointerIdRef.current !== event.pointerId) return;
        pointerIdRef.current = null;
        trackRectRef.current = null;
        setActive(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        pointerIdRef.current = null;
        trackRectRef.current = null;
        setActive(false);
      }}
    >
      <div className="pull-lever-ticks" aria-hidden="true">
        <span /><span /><span /><span /><span />
      </div>
      <div className="pull-lever-slot">
        <div
          className="pull-lever-fill"
          style={
            inverted
              ? { top: 0, height: `${normalized * 100}%` }
              : { bottom: 0, height: `${normalized * 100}%` }
          }
        />
      </div>
      <div
        className="pull-lever-carriage"
        style={{ top: `${16 + topFraction * 124}px` }}
      >
        <div className="pull-lever-shaft" />
        <div className="pull-lever-grip">
          <i /><i /><i />
          <span>{unitLabel ?? 'PULL'}</span>
        </div>
      </div>
    </div>
  );
}

/** Tactile rotary dial with protruding lever handle, SVG progress arc, and graduation numbers that react when reached. */
export function TactileDial({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  size = 96,
  label,
  formatValue,
  showGraduations = false,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: number;
  label: string;
  formatValue?: (value: number) => string;
  showGraduations?: boolean;
}) {
  return (
    <DialControl
      className="lab-dial tactile-dial"
      style={{ width: size, height: size }}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      label={label}
      formatValue={formatValue}
    >
      {({ progress, angle, active }) => {
        const r = 40;
        const circumference = 2 * Math.PI * r;
        const arcLength = circumference * 0.75;
        const dashOffset = arcLength * (1 - progress);
        return (
          <div className={`tactile-dial-inner ${active ? 'is-active' : ''}`}>
            <svg className="tactile-dial-svg" viewBox="0 0 100 100" aria-hidden="true">
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="var(--border-2)"
                strokeWidth="4"
                strokeDasharray={`${arcLength} ${circumference}`}
                strokeLinecap="round"
                transform="rotate(135 50 50)"
              />
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="4.5"
                strokeDasharray={`${arcLength} ${circumference}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(135 50 50)"
              />
              {/* Reactive Dial Number Graduations that illuminate when the needle points at them */}
              {showGraduations && [0, 25, 50, 75, 100].map((val) => {
                const isNear = Math.abs(value - val) <= 4;
                const gradAngle = -135 + (val / 100) * 270;
                const rad = (gradAngle * Math.PI) / 180;
                const x = 50 + Math.cos(rad) * 44;
                const y = 50 + Math.sin(rad) * 44;
                return (
                  <text
                    key={val}
                    x={x}
                    y={y + 2.5}
                    textAnchor="middle"
                    fontSize="6.5"
                    fontFamily="'JetBrains Mono', monospace"
                    fontWeight={isNear ? '800' : '500'}
                    fill={isNear ? '#2dd4bf' : '#64748b'}
                    style={{ transition: 'fill .12s, font-weight .12s' }}
                  >
                    {val}
                  </text>
                );
              })}
            </svg>
            <div className="tactile-dial-plate" />
            <div
              className="tactile-dial-rotor"
              style={{
                transform: `rotate(${angle}deg)`,
                transition: active ? 'none' : 'transform .05s ease-out',
              }}
            >
              <div className="tactile-dial-arm" />
              <div className="tactile-dial-handle" title="Drag around or up/down to rotate">
                <span />
              </div>
            </div>
            <div className="tactile-dial-cap" />
          </div>
        );
      }}
    </DialControl>
  );
}

/** Tactile Physical Flight / Arcade Joystick with machined bezel, cardinal markings, and 3D thumbstick. */
export function TactileJoystick({
  value,
  onChange,
  size = 124,
  label = 'Flight Gimbal',
  springToCenter = true,
}: {
  value: JoystickValue;
  onChange: (value: JoystickValue) => void;
  size?: number;
  label?: string;
  springToCenter?: boolean;
}) {
  const pointerIdRef = useRef<number | null>(null);
  const rectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const [active, setActive] = useState(false);

  const thumbSize = Math.round(size * 0.44);
  const maxTravel = (size - thumbSize) / 2 - 4;
  const xOffset = value.x * maxTravel;
  const yOffset = -value.y * maxTravel;
  const rotX = -value.y * 22;
  const rotY = value.x * 22;
  const mag = Math.min(1, Math.hypot(value.x, value.y));

  const updateFromPointer = (clientX: number, clientY: number) => {
    const rect = rectRef.current;
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = maxTravel;
    let dx = (clientX - centerX) / radius;
    let dy = -(clientY - centerY) / radius;
    const dist = Math.hypot(dx, dy);
    if (dist > 1) {
      dx /= dist;
      dy /= dist;
    }
    onChange({ x: Number(dx.toFixed(3)), y: Number(dy.toFixed(3)) });
  };

  return (
    <div
      role="application"
      tabIndex={0}
      aria-label={`${label}: X ${value.x.toFixed(2)}, Y ${value.y.toFixed(2)}`}
      className={`tactile-joystick ${active ? 'is-active' : ''}`}
      style={{ width: size, height: size }}
      onKeyDown={(event) => {
        const step = 0.1;
        const next = { ...value };
        if (event.key === 'ArrowLeft') next.x -= step;
        else if (event.key === 'ArrowRight') next.x += step;
        else if (event.key === 'ArrowUp') next.y += step;
        else if (event.key === 'ArrowDown') next.y -= step;
        else if (event.key === 'Home' || event.key === 'Escape') { next.x = 0; next.y = 0; }
        else return;
        event.preventDefault();
        const dist = Math.hypot(next.x, next.y);
        if (dist > 1) { next.x /= dist; next.y /= dist; }
        onChange({ x: Number(next.x.toFixed(3)), y: Number(next.y.toFixed(3)) });
      }}
      onPointerDown={(event) => {
        pointerIdRef.current = event.pointerId;
        const b = event.currentTarget.getBoundingClientRect();
        rectRef.current = { left: b.left, top: b.top, width: b.width, height: b.height };
        event.currentTarget.setPointerCapture(event.pointerId);
        setActive(true);
        updateFromPointer(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (pointerIdRef.current !== event.pointerId) return;
        updateFromPointer(event.clientX, event.clientY);
      }}
      onPointerUp={(event) => {
        if (pointerIdRef.current !== event.pointerId) return;
        pointerIdRef.current = null;
        rectRef.current = null;
        setActive(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
        if (springToCenter) onChange({ x: 0, y: 0 });
      }}
      onPointerCancel={() => {
        pointerIdRef.current = null;
        rectRef.current = null;
        setActive(false);
        if (springToCenter) onChange({ x: 0, y: 0 });
      }}
    >
      <div className="joystick-bezel">
        <span className="cardinal-tick n">N</span>
        <span className="cardinal-tick e">E</span>
        <span className="cardinal-tick s">S</span>
        <span className="cardinal-tick w">W</span>
        <div className="joystick-tick-ring" aria-hidden="true" />
      </div>

      <div className="joystick-gaiter">
        <div className="gaiter-ring ring-3" />
        <div className="gaiter-ring ring-2" />
        <div className="gaiter-ring ring-1" />
      </div>

      <div
        className="joystick-thumb"
        style={{
          width: thumbSize,
          height: thumbSize,
          transform: `translate(-50%, -50%) translate3d(${xOffset}px, ${yOffset}px, 0) perspective(400px) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
          boxShadow: `${-value.x * 14}px ${value.y * 14 + 6}px 18px rgba(0, 0, 0, 0.65), inset 0 2px 3px rgba(255, 255, 255, 0.28)`,
        }}
      >
        <div className="thumb-grip-rim" />
        <div className="thumb-cup">
          <div className="thumb-crosshair" />
          <div className={`thumb-led ${active || mag > 0.05 ? 'is-lit' : ''}`} />
        </div>
      </div>
    </div>
  );
}

/** Blender's Suzanne (monkey head) 2D vector mesh with dynamic top-down specular & diffuse lighting reflections. */
function SuzanneMonkey({ light }: { light: number }) {
  const lit = clamp(light, 0, 1);
  return (
    <div className="suzanne-stage" style={{ '--light-level': lit } as CSSProperties}>
      <svg className="suzanne-svg" viewBox="0 0 160 130" role="img" aria-label="Blender Suzanne 3D monkey head">
        <defs>
          <radialGradient id="suzanne-top-light" cx="50%" cy="15%" r="70%">
            <stop offset="0%" stopColor={`rgba(254, 243, 199, ${0.15 + lit * 0.85})`} />
            <stop offset="45%" stopColor={`rgba(45, 212, 191, ${0.18 + lit * 0.65})`} />
            <stop offset="100%" stopColor="rgba(15, 23, 42, 0.92)" />
          </radialGradient>
          <linearGradient id="suzanne-brow-spec" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor={`rgba(255, 251, 235, ${0.1 + lit * 0.9})`} />
            <stop offset="60%" stopColor={`rgba(94, 234, 212, ${0.12 + lit * 0.55})`} />
            <stop offset="100%" stopColor="rgba(30, 41, 59, 0.85)" />
          </linearGradient>
          <linearGradient id="suzanne-muzzle-grad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor={`rgba(253, 230, 138, ${0.08 + lit * 0.78})`} />
            <stop offset="45%" stopColor={`rgba(20, 184, 166, ${0.15 + lit * 0.52})`} />
            <stop offset="100%" stopColor="rgba(15, 23, 42, 0.95)" />
          </linearGradient>
        </defs>

        <ellipse
          cx="80"
          cy="118"
          rx={38 + lit * 16}
          ry={7 + lit * 3}
          fill={`rgba(253, 230, 138, ${lit * 0.28})`}
        />
        <ellipse cx="80" cy="118" rx="34" ry="5.5" fill="rgba(2, 6, 23, 0.55)" />

        <polygon
          points="14,52 28,36 42,46 40,74 22,78 10,66"
          fill="url(#suzanne-top-light)"
          stroke={`rgba(253, 230, 138, ${0.18 + lit * 0.55})`}
          strokeWidth="1.2"
        />
        <polygon
          points="19,55 29,44 37,51 35,69 24,71"
          fill="rgba(15, 23, 42, 0.65)"
          stroke="rgba(148, 163, 184, 0.25)"
          strokeWidth="0.8"
        />
        <polygon
          points="146,52 132,36 118,46 120,74 138,78 150,66"
          fill="url(#suzanne-top-light)"
          stroke={`rgba(253, 230, 138, ${0.18 + lit * 0.55})`}
          strokeWidth="1.2"
        />
        <polygon
          points="141,55 131,44 123,51 125,69 136,71"
          fill="rgba(15, 23, 42, 0.65)"
          stroke="rgba(148, 163, 184, 0.25)"
          strokeWidth="0.8"
        />

        <polygon
          points="52,16 80,10 108,16 124,36 120,78 102,96 58,96 40,78 36,36"
          fill="url(#suzanne-top-light)"
          stroke={`rgba(254, 243, 199, ${0.22 + lit * 0.68})`}
          strokeWidth="1.4"
        />

        <polygon
          points="56,18 80,12 104,18 96,32 80,29 64,32"
          fill={`rgba(254, 249, 195, ${0.06 + lit * 0.72})`}
        />
        <polygon
          points="64,32 80,29 96,32 108,40 80,38 52,40"
          fill={`rgba(253, 230, 138, ${0.04 + lit * 0.48})`}
        />

        <polygon
          points="46,38 80,36 114,38 122,50 80,48 38,50"
          fill="url(#suzanne-brow-spec)"
          stroke={`rgba(254, 243, 199, ${0.3 + lit * 0.7})`}
          strokeWidth="1.4"
        />
        <polygon
          points="48,40 80,38 112,40 106,46 80,44 54,46"
          fill={`rgba(255, 255, 255, ${0.15 + lit * 0.85})`}
        />

        <ellipse cx="60" cy="56" rx="14" ry="12" fill="#0f172a" stroke="rgba(148, 163, 184, 0.4)" strokeWidth="1" />
        <ellipse cx="60" cy="56" rx="9" ry="8" fill="rgba(30, 41, 59, 0.95)" />
        <circle cx="58" cy="54" r="3" fill={`rgba(254, 243, 199, ${0.2 + lit * 0.8})`} />

        <ellipse cx="100" cy="56" rx="14" ry="12" fill="#0f172a" stroke="rgba(148, 163, 184, 0.4)" strokeWidth="1" />
        <ellipse cx="100" cy="56" rx="9" ry="8" fill="rgba(30, 41, 59, 0.95)" />
        <circle cx="98" cy="54" r="3" fill={`rgba(254, 243, 199, ${0.2 + lit * 0.8})`} />

        <polygon
          points="54,64 80,58 106,64 110,88 80,94 50,88"
          fill="url(#suzanne-muzzle-grad)"
          stroke={`rgba(254, 243, 199, ${0.2 + lit * 0.6})`}
          strokeWidth="1.2"
        />
        <polygon
          points="62,66 80,62 98,66 94,76 80,74 66,76"
          fill={`rgba(254, 249, 195, ${0.08 + lit * 0.65})`}
        />
        <ellipse cx="73" cy="74" rx="2.5" ry="4" fill="#020617" />
        <ellipse cx="87" cy="74" rx="2.5" ry="4" fill="#020617" />

        <polygon
          points="54,75 80,79 106,75 110,86 80,91 50,86"
          fill={`rgba(254, 243, 199, ${0.05 + lit * 0.45})`}
        />
        <polyline
          points="55,93 80,98 105,93"
          fill="none"
          stroke="#0f172a"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <g stroke={`rgba(254, 249, 195, ${0.08 + lit * 0.32})`} strokeWidth="0.7" fill="none">
          <line x1="80" y1="10" x2="80" y2="48" />
          <line x1="52" y1="16" x2="64" y2="32" />
          <line x1="108" y1="16" x2="96" y2="32" />
          <line x1="36" y1="36" x2="58" y2="34" />
          <line x1="124" y1="36" x2="102" y2="34" />
          <line x1="40" y1="78" x2="48" y2="74" />
          <line x1="120" y1="78" x2="112" y2="74" />
          <line x1="80" y1="98" x2="80" y2="113" />
        </g>
      </svg>
      <span className="suzanne-caption">SUZANNE.GLB · SPECULAR {(lit * 1.4).toFixed(2)}</span>
    </div>
  );
}

const percent = (value: number) => `${Math.round(value * 100)}%`;

export function ControlsLab({ onBack }: { onBack: () => void }) {
  const [pendulum, setPendulum] = useState(0.5);
  const [lift, setLift] = useState(0.35);
  const [liftDragging, setLiftDragging] = useState(false);
  const liftShaftRectRef = useRef<{ top: number; height: number } | null>(null);

  const [grip, setGrip] = useState(0.35);

  const [plunger, setPlunger] = useState(0.25);
  const [plungerDragging, setPlungerDragging] = useState(false);
  const syringeRectRef = useRef<{ top: number; height: number } | null>(null);

  const [valve, setValve] = useState(35);
  const [throttle, setThrottle] = useState(0.35);
  const [joystick, setJoystick] = useState<JoystickValue>({ x: 0, y: 0 });
  const [light, setLight] = useState(0.72);
  const [active3D, setActive3D] = useState<Record<string, boolean>>({
    '01': true,
    '07': true,
    '08': true,
  });

  return (
    <main className="controls-lab">
      <section className="lab-hero">
        <div className="lab-hero-orbits" aria-hidden="true">
          <div className="orbit-ring ring-1" />
          <div className="orbit-ring ring-2" />
          <div className="orbit-ring ring-3" />
          <div className="orbit-sweep" />
          <div className="orbit-satellite sat-1"><span /></div>
          <div className="orbit-satellite sat-2"><span /></div>
          <div className="orbit-crosshair" />
        </div>

        <button className="lab-back" onClick={onBack}>← Model inspector</button>
        <div className="lab-kicker"><span /> SPATIALKIT CONTROLS LAB · 08 EXPERIMENTS</div>
        <h1>Move something.<br /><em>Understand everything.</em></h1>
        <p>Each experiment is a real controlled React component. Pull a lever, spin a rotary crank, or aim the flight stick—then copy the exact interaction into training, simulation, product, or 3D software.</p>
        <div className="lab-legend"><span>DRAG</span><i /><span>ROTATE</span><i /><span>PULL LEVER</span><i /><span>FLIGHT STICK</span><i /><span>REACT STATE</span></div>
      </section>

      <section className="lab-grid" aria-label="Interactive control experiments">
        {/* 01 Timeline Scrub -> Deck of Cards Falling / Cascading */}
        <ControlCard
          index={0}
          number="01"
          title="Timeline scrub"
          description="Drag the mechanical scrubbing lever to cascade and fan the deck of playing cards in real-time 3D."
          tags={['TIMELINE', active3D['01'] ? '3D CARDS' : 'LINKAGE']}
          toggle3D={{
            active: !!active3D['01'],
            onToggle: () => setActive3D((prev) => ({ ...prev, '01': !prev['01'] })),
          }}
          code={`const [progress, setProgress] = useState(0.5);\n<HorizontalMechanicalLever value={progress} onChange={setProgress} />\n// Cascade cards: card[i].arc = Math.sin(progress * Math.PI)`}
        >
          {active3D['01'] ? (
            <DeckOfCardsViewer progress={pendulum} />
          ) : (
            <div className="pendulum-rig">
              <div className="pendulum-pin" />
              <div className="pendulum-arm" style={{ transform: `rotate(${-50 + pendulum * 100}deg)` }}><b /></div>
            </div>
          )}
          <div className="lab-control-row">
            <HorizontalMechanicalLever value={pendulum} onChange={setPendulum} label="Cards cascade progress" />
            <output>{Math.round(pendulum * 100)}%</output>
          </div>
        </ControlCard>

        {/* 02 Hydraulic Lift with Apple Payload */}
        <ControlCard
          index={1}
          number="02"
          title="Hydraulic lift"
          description="Pull the physical hydraulic lever up or down to raise and lower the fresh apple payload."
          tags={['LEVER', 'MACHINE']}
          code={`<TimelineScrubber orientation="vertical" value={height} onChange={setHeight} />`}
        >
          <div className={`lift-demo ${liftDragging ? 'is-dragging' : ''}`}>
            <PullLever value={lift} onChange={setLift} label="Hydraulic lift lever" unitLabel="LIFT" />
            <div
              className={`lift-shaft ${liftDragging ? 'is-dragging' : ''}`}
              title="Drag apple platform or pull the lever"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                const b = event.currentTarget.getBoundingClientRect();
                liftShaftRectRef.current = { top: b.top, height: b.height };
                setLiftDragging(true);
                setLift(clamp(1 - (event.clientY - b.top - 12) / (b.height - 24), 0, 1));
              }}
              onPointerMove={(event) => {
                if (!liftShaftRectRef.current) return;
                const rect = liftShaftRectRef.current;
                setLift(clamp(1 - (event.clientY - rect.top - 12) / (rect.height - 24), 0, 1));
              }}
              onPointerUp={(event) => {
                liftShaftRectRef.current = null;
                setLiftDragging(false);
                event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onPointerCancel={() => {
                liftShaftRectRef.current = null;
                setLiftDragging(false);
              }}
            >
              <div className="lift-platform" style={{ bottom: `${16 + lift * 105}px` }}>
                <div className="apple-payload" title="Newton's fresh apple on the hydraulic lift">
                  <div className="apple-stem" />
                  <div className="apple-leaf" />
                  <div className="apple-body">
                    <div className="apple-shine" />
                  </div>
                </div>
                <span>APPLE</span>
              </div>
              <i style={{ height: `${22 + lift * 105}px` }} />
            </div>
            <output>{Math.round(lift * 180)} cm</output>
          </div>
        </ControlCard>

        {/* 03 Robotic Gripper */}
        <ControlCard
          index={2}
          number="03"
          title="Robotic gripper"
          description="Close the articulated surgical jaws onto the specimen vial—drag the jaws directly or scrub the actuator."
          tags={['LINKED', 'SURGICAL']}
          code={`const gap = 12 + grip * 58;\n<TimelineScrubber value={grip} onChange={setGrip} />`}
        >
          <div className={`gripper-demo ${grip <= 0.22 ? 'is-clamped' : ''}`}>
            <div
              className="gripper-stage-rig"
              title="Drag horizontally to open or clamp the robotic jaws"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                const rect = event.currentTarget.getBoundingClientRect();
                const distFromCenter = Math.abs(event.clientX - (rect.left + rect.width / 2));
                setGrip(clamp((distFromCenter - 18) / (rect.width * 0.36), 0, 1));
              }}
              onPointerMove={(event) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const distFromCenter = Math.abs(event.clientX - (rect.left + rect.width / 2));
                setGrip(clamp((distFromCenter - 18) / (rect.width * 0.36), 0, 1));
              }}
            >
              <div className="gripper-telemetry">
                <span className="gripper-dot" />
                {grip <= 0.22 ? `CLAMPED · ${(12.4 + (0.22 - grip) * 28).toFixed(1)} N` : 'READY · 0.0 N'}
              </div>
              <div className="gripper-rail">
                <div className="gripper-leadscrew" />
                <div
                  className="gripper-jaw left"
                  style={{ transform: `translateX(${-6 - grip * 42}px) rotate(${(0.2 - grip) * 8}deg)` }}
                >
                  <span className="jaw-knuckle" />
                  <span className="jaw-pad" />
                </div>
                <div
                  className="gripper-jaw right"
                  style={{ transform: `translateX(${6 + grip * 42}px) rotate(${-(0.2 - grip) * 8}deg)` }}
                >
                  <span className="jaw-knuckle" />
                  <span className="jaw-pad" />
                </div>
                <b style={{ transform: `rotate(${grip * 220}deg)` }}><span /></b>
              </div>
              <div
                className="gripper-specimen"
                style={{
                  transform: `scaleX(${grip <= 0.22 ? 0.92 + (grip / 0.22) * 0.08 : 1})`,
                }}
              >
                <div className="specimen-cap" />
                <div className="specimen-core" />
                <span className="specimen-label">BIO-03</span>
              </div>
            </div>
            <div className="lab-control-row">
              <HorizontalMechanicalLever value={grip} onChange={setGrip} label="Gripper opening" />
              <output>{Math.round(12 + grip * 58)} mm</output>
            </div>
          </div>
        </ControlCard>

        {/* 04 Medical Plunger */}
        <ControlCard
          index={3}
          number="04"
          title="Medical plunger"
          description="Pull or push the dosing lever—or grab the syringe plunger handle directly—to control fluid volume."
          tags={['LEVER', 'MEDICAL']}
          code={`useMediaTimeline(videoRef, depth, { input: [0, 6], time: [49, 50.4] });\n<TimelineScrubber min={0} max={6} value={depth} onChange={setDepth} />`}
        >
          <div className={`syringe-demo ${plungerDragging ? 'is-dragging' : ''}`}>
            <PullLever
              inverted
              min={0}
              max={6}
              step={0.01}
              value={plunger * 6}
              onChange={(val) => setPlunger(val / 6)}
              label="Plunger lever depth"
              unitLabel="DOSE"
            />
            <div
              className={`syringe-assembly ${plungerDragging ? 'is-dragging' : ''}`}
              title="Drag syringe plunger or use the dosing lever"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                const b = event.currentTarget.getBoundingClientRect();
                syringeRectRef.current = { top: b.top, height: b.height };
                setPlungerDragging(true);
                setPlunger(clamp((event.clientY - b.top - 18) / (b.height - 54), 0, 1));
              }}
              onPointerMove={(event) => {
                if (!syringeRectRef.current) return;
                const rect = syringeRectRef.current;
                setPlunger(clamp((event.clientY - rect.top - 18) / (rect.height - 54), 0, 1));
              }}
              onPointerUp={(event) => {
                syringeRectRef.current = null;
                setPlungerDragging(false);
                event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onPointerCancel={() => {
                syringeRectRef.current = null;
                setPlungerDragging(false);
              }}
            >
              <div className="syringe-rod-assembly" style={{ transform: `translateY(${plunger * 78}px)` }}>
                <div className="syringe-thumb-cap" />
                <div className="syringe-rod" />
              </div>
              <div className="syringe">
                <div className="syringe-graduations" aria-hidden="true"><i /><i /><i /><i /><i /></div>
                <div className="syringe-liquid" style={{ height: `${88 - plunger * 70}%` }} />
                <div className="syringe-plunger" style={{ top: `${8 + plunger * 70}%` }} />
              </div>
              <div className="syringe-nozzle" />
            </div>
            <output>{(plunger * 6).toFixed(1)} <small>ML</small></output>
          </div>
        </ControlCard>

        {/* 05 Pressure Valve with Reactive Numbers */}
        <ControlCard
          index={4}
          number="05"
          title="Pressure valve"
          description="Turn the rotary valve crank to dial precise pressure—watch the numbers illuminate as the lever sweeps past them."
          tags={['DIAL', 'CALIBRATION']}
          code={`<TactileDial min={0} max={100} step={1} value={psi} onChange={setPsi} showGraduations />`}
        >
          <div className="dial-demo">
            <div className="dial-presets" role="group" aria-label="Pressure presets">
              {[15, 35, 60, 85].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={Math.abs(valve - preset) <= 3 ? 'active' : ''}
                  onClick={() => setValve(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
            <TactileDial
              size={112}
              min={0}
              max={100}
              step={1}
              value={valve}
              onChange={setValve}
              label="Pressure valve"
              formatValue={(value) => `${value} psi`}
              showGraduations
            />
            <output>{valve} <small>PSI</small></output>
          </div>
        </ControlCard>

        {/* 06 Turbine Throttle */}
        <ControlCard
          index={5}
          number="06"
          title="Turbine throttle"
          description="Swing the throttle dial handle or scroll to continuously accelerate the turbine rotor."
          tags={['DIAL', 'VELOCITY']}
          code={`<DialControl value={speed} onChange={setSpeed} />\n// animationDuration = 1.8 - speed * 1.65`}
        >
          <div className="turbine-demo">
            <div
              className="turbine"
              style={{
                animationDuration: `${1.8 - throttle * 1.65}s`,
                animationPlayState: throttle < 0.02 ? 'paused' : 'running',
              }}
            >
              <i /><i /><i /><i /><b />
            </div>
            <div className="turbine-control-col">
              <TactileDial
                size={84}
                value={throttle}
                onChange={setThrottle}
                label="Turbine throttle"
                formatValue={(value) => `${Math.round(value * 8400)} RPM`}
              />
              <span className="dial-hint">DRAG HANDLE</span>
            </div>
            <output>{Math.round(throttle * 8400)} <small>RPM</small></output>
          </div>
        </ControlCard>

        {/* 07 Flight Joystick & Low-Poly POV Shooter Target Tracker (Camera Turret Seeker) */}
        <ControlCard
          index={6}
          number="07"
          title="Flight gimbal joystick"
          description="Aim the camera turret with the flight stick to track and missile-lock onto the moving low-poly target drone—the camera acts as the fighter-jet seeker."
          tags={['FLIGHT STICK', active3D['07'] ? 'CAMERA TURRET' : 'RADAR']}
          toggle3D={{
            active: !!active3D['07'],
            onToggle: () => setActive3D((prev) => ({ ...prev, '07': !prev['07'] })),
          }}
          code={`const [aim, setAim] = useState({ x: 0, y: 0 });\n<TactileJoystick value={aim} onChange={setAim} />\n// Camera yaw = -aim.x * 47°, pitch = aim.y * 31° -> Missile lock-on`}
        >
          {active3D['07'] ? (
            <TargetTracker3D joystick={joystick} />
          ) : (
            <div className="joystick-demo">
              <TactileRadar2D joystick={joystick} />
              <TactileJoystick size={124} value={joystick} onChange={setJoystick} label="Targeting Gimbal" />
            </div>
          )}

          {active3D['07'] && (
            <div className="tactile-joystick-wrap">
              <TactileJoystick size={124} value={joystick} onChange={setJoystick} label="Targeting Gimbal" />
              <div className="joystick-telemetry-bar">
                <span>AIM X: <b>{joystick.x.toFixed(2)}</b></span>
                <span>AIM Y: <b>{joystick.y.toFixed(2)}</b></span>
                <span>DEFLECTION: <b>{(Math.hypot(joystick.x, joystick.y) * 100).toFixed(0)}%</b></span>
              </div>
            </div>
          )}
        </ControlCard>

        {/* 08 Inspection Light -> Blender Suzanne (Zoomed Out at First, Dial Outside 3D Space) */}
        <ControlCard
          index={7}
          number="08"
          title="Inspection light"
          description="Rotate the dimmer crank to cast real-time focused lighting across Blender's Suzanne mesh—zoom in anytime to inspect specular reflections."
          tags={['LIGHTING', active3D['08'] ? '3D SUZANNE' : '2D SPECULAR']}
          toggle3D={{
            active: !!active3D['08'],
            onToggle: () => setActive3D((prev) => ({ ...prev, '08': !prev['08'] })),
          }}
          code={`<TactileDial value={intensity} onChange={setIntensity} />\n// <spotLight intensity={20 + intensity * 180} /><SelectableModel src="/models/Suzanne.glb" />`}
        >
          {active3D['08'] ? (
            <SuzanneInspection3D light={light} />
          ) : (
            <div className="light-demo" style={{ '--light-level': light } as CSSProperties}>
              <div className="light-rig-column">
                <div className="lamp-overhead">
                  <div className="lamp-cord" />
                  <div className="lamp-shade" />
                  <div className="lamp-bulb" />
                </div>
                <div className="light-cone" />
                <SuzanneMonkey light={light} />
              </div>
            </div>
          )}

          {/* Dimmer dial sits cleanly OUTSIDE the 3D space */}
          <div className="light-control-bar">
            <TactileDial
              size={84}
              value={light}
              onChange={setLight}
              label="Inspection light dimmer"
              formatValue={percent}
            />
            <div className="light-telemetry-col">
              <span className="light-dimmer-title">DIMMER CRANK</span>
              <output>{percent(light)} <small>INTENSITY</small></output>
            </div>
          </div>
        </ControlCard>
      </section>

      <section className="lab-outro">
        <span>WHAT THIS PROVES</span>
        <h2>One interaction value.<br />Any experience you can imagine.</h2>
        <p>The controls stay unopinionated about what they drive. Connect them to CSS, Three.js transforms, glTF animation progress, video time, audio, simulation state, or your own domain logic.</p>
        <button onClick={onBack}>Try them with a 3D model <span>↗</span></button>
      </section>
    </main>
  );
}
