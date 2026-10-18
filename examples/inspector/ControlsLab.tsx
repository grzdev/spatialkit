import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { DialControl, JoystickControl, TimelineScrubber, type JoystickValue } from 'spatialkit/react';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function ControlCard({ index, number, title, description, tags, code, children }: {
  index: number;
  number: string;
  title: string;
  description: string;
  tags: string[];
  code: string;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (!copied) return; const timer = setTimeout(() => setCopied(false), 1600); return () => clearTimeout(timer); }, [copied]);
  return (
    <article className="lab-card" style={{ '--card-index': index } as CSSProperties}>
      <div className="lab-card-head"><span>{number}</span><div>{tags.map((tag) => <small key={tag}>{tag}</small>)}</div></div>
      <div className="lab-stage">{children}</div>
      <div className="lab-card-copy">
        <h2>{title}</h2>
        <p>{description}</p>
        <button onClick={async () => { await navigator.clipboard.writeText(code); setCopied(true); }}>{copied ? '✓ Copied' : 'Copy example'} <span>↗</span></button>
      </div>
    </article>
  );
}

/** Tactile vertical mechanical pull-lever with a physical grab handle, track ticks, wheel, and keyboard support. */
function PullLever({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
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
  const [active, setActive] = useState(false);
  const range = max - min;
  const normalized = range > 0 ? clamp((value - min) / range, 0, 1) : 0;
  // Visual travel from top (0%) to bottom (100%):
  // If not inverted (e.g. Hydraulic Lift), max is at the top (0%) and min is at the bottom (100%).
  // If inverted (e.g. Syringe Plunger push-down), min is at the top (0%) and max is at the bottom (100%).
  const topFraction = inverted ? normalized : 1 - normalized;

  const setClamped = (next: number) => {
    const snapped = min + Math.round((clamp(next, min, max) - min) / step) * step;
    onChange(clamp(Number(snapped.toFixed(4)), min, max));
  };

  const updateFromClientY = (clientY: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
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
        setActive(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        pointerIdRef.current = null;
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
              ? { top: 0, height: `${ normalized * 100 }%` }
              : { bottom: 0, height: `${ normalized * 100 }%` }
          }
        />
      </div>
      <div
        className="pull-lever-carriage"
        style={{ top: `${ 16 + topFraction * 124 }px` }}
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

/** Tactile rotary dial with a protruding lever handle, SVG progress arc, and knurled grip so mouse control is effortless. */
function TactileDial({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  size = 96,
  label,
  formatValue,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: number;
  label: string;
  formatValue?: (value: number) => string;
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
        const r = 42;
        const circumference = 2 * Math.PI * r;
        const arcLength = circumference * 0.75; // 270 deg sweep (-135 to +135)
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
            </svg>
            <div className="tactile-dial-plate" />
            <div
              className="tactile-dial-rotor"
              style={{
                transform: `rotate(${angle}deg)`,
                transition: active ? 'none' : 'transform .05s ease-out',
              }}
            >
              {/* Extended lever arm + grip handle sticking out for easy mouse grabbing */}
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

/** Blender's Suzanne (monkey head) mesh with dynamic top-down specular & diffuse lighting reflections. */
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

        {/* Ground pedestal shadow & light bounce pool */}
        <ellipse
          cx="80"
          cy="118"
          rx={38 + lit * 16}
          ry={7 + lit * 3}
          fill={`rgba(253, 230, 138, ${lit * 0.28})`}
        />
        <ellipse cx="80" cy="118" rx="34" ry="5.5" fill="rgba(2, 6, 23, 0.55)" />

        {/* Left & Right Monkey Ears (faceted low-poly style) */}
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

        {/* Cranium / Main Head Dome */}
        <polygon
          points="52,16 80,10 108,16 124,36 120,78 102,96 58,96 40,78 36,36"
          fill="url(#suzanne-top-light)"
          stroke={`rgba(254, 243, 199, ${0.22 + lit * 0.68})`}
          strokeWidth="1.4"
        />

        {/* Top Cranium Specular Facets (direct reflection right under the bulb) */}
        <polygon
          points="56,18 80,12 104,18 96,32 80,29 64,32"
          fill={`rgba(254, 249, 195, ${0.06 + lit * 0.72})`}
        />
        <polygon
          points="64,32 80,29 96,32 108,40 80,38 52,40"
          fill={`rgba(253, 230, 138, ${0.04 + lit * 0.48})`}
        />

        {/* Iconic Suzanne Brow Ridge */}
        <polygon
          points="38,42 58,34 80,39 102,34 122,42 116,52 80,48 44,52"
          fill="url(#suzanne-brow-spec)"
          stroke={`rgba(254, 240, 138, ${0.25 + lit * 0.7})`}
          strokeWidth="1.2"
        />

        {/* Deep Eye Sockets */}
        <polygon points="44,50 61,44 74,52 70,69 50,71 41,60" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(148, 163, 184, 0.3)" strokeWidth="0.9" />
        <polygon points="116,50 99,44 86,52 90,69 110,71 119,60" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(148, 163, 184, 0.3)" strokeWidth="0.9" />

        {/* Eyes with dynamic specular catchlights from the bulb above */}
        <circle cx="58" cy="57" r="9.5" fill={`rgba(45, 212, 191, ${0.22 + lit * 0.52})`} stroke={`rgba(253, 230, 138, ${0.3 + lit * 0.6})`} strokeWidth="1.1" />
        <circle cx="58" cy="57" r="4.5" fill="#0f172a" />
        <circle cx="56" cy="53.5" r={1.4 + lit * 2.2} fill={`rgba(255, 255, 255, ${0.35 + lit * 0.65})`} />

        <circle cx="102" cy="57" r="9.5" fill={`rgba(45, 212, 191, ${0.22 + lit * 0.52})`} stroke={`rgba(253, 230, 138, ${0.3 + lit * 0.6})`} strokeWidth="1.1" />
        <circle cx="102" cy="57" r="4.5" fill="#0f172a" />
        <circle cx="100" cy="53.5" r={1.4 + lit * 2.2} fill={`rgba(255, 255, 255, ${0.35 + lit * 0.65})`} />

        {/* Nose Bridge & Nostrils */}
        <polygon
          points="74,48 86,48 91,72 80,77 69,72"
          fill="url(#suzanne-brow-spec)"
          stroke={`rgba(253, 230, 138, ${0.2 + lit * 0.55})`}
          strokeWidth="1"
        />
        <ellipse cx="76" cy="72" rx="2.2" ry="3.2" fill="#0f172a" />
        <ellipse cx="84" cy="72" rx="2.2" ry="3.2" fill="#0f172a" />

        {/* Protruding Monkey Muzzle & Chin */}
        <polygon
          points="48,74 68,69 80,74 92,69 112,74 116,92 100,109 80,113 60,109 44,92"
          fill="url(#suzanne-muzzle-grad)"
          stroke={`rgba(253, 230, 138, ${0.2 + lit * 0.65})`}
          strokeWidth="1.3"
        />
        {/* Upper Lip Specular Shelf catching overhead light */}
        <polygon
          points="54,75 80,79 106,75 110,86 80,91 50,86"
          fill={`rgba(254, 243, 199, ${0.05 + lit * 0.45})`}
        />
        {/* Mouth Crease */}
        <polyline
          points="55,93 80,98 105,93"
          fill="none"
          stroke="#0f172a"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Subtle 3D Low-Poly Wireframe Mesh Overlay Lines */}
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
  const [grip, setGrip] = useState(0.35);
  const [plunger, setPlunger] = useState(0.25);
  const [valve, setValve] = useState(35);
  const [throttle, setThrottle] = useState(0.35);
  const [joystick, setJoystick] = useState<JoystickValue>({ x: 0, y: 0 });
  const [light, setLight] = useState(0.72);

  return (
    <main className="controls-lab">
      <section className="lab-hero">
        {/* Animated concentric orbital rings & telemetry nodes in the top right */}
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
        <p>Each experiment is a real controlled React component. Pull a lever, spin a rotary crank, or use the arrow keys—then copy the exact interaction into training, simulation, product, or 3D software.</p>
        <div className="lab-legend"><span>DRAG</span><i /><span>ROTATE</span><i /><span>PULL LEVER</span><i /><span>KEYBOARD</span><i /><span>REACT STATE</span></div>
      </section>

      <section className="lab-grid" aria-label="Interactive control experiments">
        <ControlCard index={0} number="01" title="Pendulum scrub" description="Map a normalized value onto any angle or animation frame." tags={['TIMELINE', 'PHYSICS']} code={`const [progress, setProgress] = useState(0.5);\n<TimelineScrubber value={progress} onChange={setProgress} />\n// angle = -50 + progress * 100`}>
          <div className="pendulum-rig">
            <div className="pendulum-pin" />
            <div className="pendulum-arm" style={{ transform: `rotate(${-50 + pendulum * 100}deg)` }}><b /></div>
          </div>
          <div className="lab-control-row"><TimelineScrubber value={pendulum} onChange={setPendulum} label="Pendulum angle" /><output>{Math.round(-50 + pendulum * 100)}°</output></div>
        </ControlCard>

        <ControlCard index={1} number="02" title="Hydraulic lift" description="Pull the physical hydraulic lever up or down to raise and lower the payload platform." tags={['LEVER', 'MACHINE']} code={`<TimelineScrubber orientation="vertical" value={height} onChange={setHeight} />`}>
          <div className="lift-demo">
            <PullLever value={lift} onChange={setLift} label="Hydraulic lift lever" unitLabel="LIFT" />
            <div
              className="lift-shaft"
              title="Drag platform or pull the lever"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                const rect = event.currentTarget.getBoundingClientRect();
                setLift(clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1));
              }}
              onPointerMove={(event) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                const rect = event.currentTarget.getBoundingClientRect();
                setLift(clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1));
              }}
            >
              <div className="lift-platform" style={{ bottom: `${16 + lift * 105}px` }}><span>PAYLOAD</span></div>
              <i style={{ height: `${22 + lift * 105}px` }} />
            </div>
            <output>{Math.round(lift * 180)} cm</output>
          </div>
        </ControlCard>

        <ControlCard index={2} number="03" title="Robotic gripper" description="Drive two or more transforms from one shared interaction value." tags={['LINKED', 'ROBOTICS']} code={`const gap = 12 + grip * 58;\n<TimelineScrubber value={grip} onChange={setGrip} />`}>
          <div className="gripper-demo">
            <div className="gripper-rail"><i style={{ transform: `translateX(${-10 - grip * 35}px)` }} /><i style={{ transform: `translateX(${10 + grip * 35}px)` }} /><b /></div>
            <div className="lab-control-row"><TimelineScrubber value={grip} onChange={setGrip} label="Gripper opening" /><output>{Math.round(12 + grip * 58)} mm</output></div>
          </div>
        </ControlCard>

        <ControlCard index={3} number="04" title="Medical plunger" description="Pull or push the dosing lever—or grab the syringe plunger handle directly—to control fluid volume." tags={['LEVER', 'MEDICAL']} code={`useMediaTimeline(videoRef, depth, { input: [0, 6], time: [49, 50.4] });\n<TimelineScrubber min={0} max={6} value={depth} onChange={setDepth} />`}>
          <div className="syringe-demo">
            <PullLever
              inverted
              min={0}
              max={6}
              step={0.1}
              value={plunger * 6}
              onChange={(val) => setPlunger(val / 6)}
              label="Plunger lever depth"
              unitLabel="DOSE"
            />
            <div
              className="syringe-assembly"
              title="Drag syringe plunger or use the dosing lever"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                const rect = event.currentTarget.getBoundingClientRect();
                setPlunger(clamp((event.clientY - rect.top - 18) / (rect.height - 54), 0, 1));
              }}
              onPointerMove={(event) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                const rect = event.currentTarget.getBoundingClientRect();
                setPlunger(clamp((event.clientY - rect.top - 18) / (rect.height - 54), 0, 1));
              }}
            >
              {/* Protruding top T-handle and piston rod so the user can see & pull the plunger */}
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
            <output>{(plunger * 6).toFixed(1)} ml</output>
          </div>
        </ControlCard>

        <ControlCard index={4} number="05" title="Valve dial" description="Grab the rotary crank handle and drag around the dial, scroll your mouse wheel, or click a pressure preset." tags={['DIAL', 'PRESSURE']} code={`<DialControl min={0} max={100} value={pressure} onChange={setPressure} label="Pressure valve" />`}>
          <div className="dial-demo">
            <div className="dial-scale">
              {[0, 25, 50, 75, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={valve === preset ? 'active' : ''}
                  onClick={() => setValve(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
            <TactileDial
              size={104}
              min={0}
              max={100}
              step={1}
              value={valve}
              onChange={setValve}
              label="Pressure valve"
              formatValue={(value) => `${value} psi`}
            />
            <output>{valve} <small>PSI</small></output>
          </div>
        </ControlCard>

        <ControlCard index={5} number="06" title="Turbine throttle" description="Swing the throttle dial handle or scroll to continuously accelerate the turbine rotor." tags={['DIAL', 'VELOCITY']} code={`<DialControl value={speed} onChange={setSpeed} />\n// animationDuration = 1.8 - speed * 1.65`}>
          <div className="turbine-demo">
            <div className="turbine" style={{ animationDuration: `${1.8 - throttle * 1.65}s`, animationPlayState: throttle < 0.02 ? 'paused' : 'running' }}><i /><i /><i /><i /><b /></div>
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

        <ControlCard index={6} number="07" title="Robot joystick" description="A bounded two-axis control works for cameras, robots, cursors, and tools." tags={['2-AXIS', 'ROBOTICS']} code={`const [position, setPosition] = useState({ x: 0, y: 0 });\n<JoystickControl value={position} onChange={setPosition} />`}>
          <div className="joystick-demo">
            <div className="robot-field"><span className="field-axis x" /><span className="field-axis y" /><div className="robot-puck" style={{ left: `${50 + joystick.x * 38}%`, top: `${50 - joystick.y * 38}%` }}>◆</div></div>
            <JoystickControl className="lab-joystick" size={116} value={joystick} onChange={setJoystick} label="Robot position" />
            <output>X {joystick.x.toFixed(2)} · Y {joystick.y.toFixed(2)}</output>
          </div>
        </ControlCard>

        <ControlCard index={7} number="08" title="Inspection light" description="Rotate the dimmer crank to shine an overhead inspection beam directly onto Blender's Suzanne mesh." tags={['MATERIAL', 'LIGHT']} code={`<DialControl value={intensity} onChange={setIntensity} />\n<spotLight position={[0, 4, 0]} intensity={intensity * 8} />`}>
          <div className="light-demo" style={{ '--light-level': light } as CSSProperties}>
            <div className="light-control-dock">
              <TactileDial
                size={76}
                value={light}
                onChange={setLight}
                label="Inspection light intensity"
                formatValue={percent}
              />
              <output>{percent(light)}</output>
            </div>

            {/* Overhead rig aligned so the bulb shines directly down onto Suzanne */}
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
