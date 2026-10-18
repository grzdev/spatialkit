import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const snap = (value: number, min: number, max: number, step: number) => {
  const snapped = min + Math.round((clamp(value, min, max) - min) / step) * step;
  return clamp(Number(snapped.toFixed(10)), min, max);
};

export interface DialControlRenderState {
  value: number;
  progress: number;
  angle: number;
  active: boolean;
}

export interface DialControlProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  minAngle?: number;
  maxAngle?: number;
  dragPixels?: number;
  label?: string;
  formatValue?: (value: number) => string;
  className?: string;
  style?: CSSProperties;
  children?: (state: DialControlRenderState) => ReactNode;
}

/** An accessible rotary input controlled by circular pointer dragging, vertical/horizontal dragging, mouse wheel, or arrow keys. */
export function DialControl({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  minAngle = -135,
  maxAngle = 135,
  dragPixels = 180,
  label = 'Dial',
  formatValue = String,
  className,
  style,
  children,
}: DialControlProps) {
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lastAngle: number;
    centerX: number;
    centerY: number;
    radius: number;
    value: number;
    mode: 'angle' | 'linear';
  } | null>(null);
  const [active, setActive] = useState(false);
  const range = max - min;
  const progress = range > 0 ? clamp((value - min) / range, 0, 1) : 0;
  const angle = minAngle + progress * (maxAngle - minAngle);
  const set = (next: number) => onChange(snap(next, min, max, step));

  const getPointerAngle = (clientX: number, clientY: number, centerX: number, centerY: number) => {
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    // 0 deg is straight up (12 o'clock), negative is counter-clockwise (left), positive is clockwise (right)
    return Math.atan2(dx, -dy) * (180 / Math.PI);
  };

  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const changes: Record<string, number> = { ArrowUp: step, ArrowRight: step, ArrowDown: -step, ArrowLeft: -step, PageUp: step * 10, PageDown: -step * 10 };
    if (event.key === 'Home') { event.preventDefault(); set(min); }
    else if (event.key === 'End') { event.preventDefault(); set(max); }
    else if (changes[event.key] !== undefined) { event.preventDefault(); set(value + changes[event.key]); }
  };
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={formatValue(value)}
      className={className}
      style={{ width: 92, height: 92, borderRadius: '50%', position: 'relative', touchAction: 'none', cursor: active ? 'grabbing' : 'grab', userSelect: 'none', ...style }}
      onKeyDown={keyDown}
      onWheel={(event) => {
        event.preventDefault();
        const direction = event.deltaY < 0 || event.deltaX > 0 ? 1 : -1;
        set(value + direction * step * 3);
      }}
      onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const bounds = event.currentTarget.getBoundingClientRect();
        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height / 2;
        const radius = Math.min(bounds.width, bounds.height) / 2;
        const dist = Math.hypot(event.clientX - centerX, event.clientY - centerY);
        const mode = radius > 0 && dist > radius * 0.22 ? 'angle' : 'linear';
        const lastAngle = getPointerAngle(event.clientX, event.clientY, centerX, centerY);
        drag.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          lastAngle,
          centerX,
          centerY,
          radius,
          value,
          mode,
        };
        setActive(true);
        event.currentTarget.dataset.active = 'true';
      }}
      onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
        if (!drag.current || drag.current.pointerId !== event.pointerId) return;
        const current = drag.current;
        const dist = Math.hypot(event.clientX - current.centerX, event.clientY - current.centerY);
        if (current.radius > 0 && (current.mode === 'angle' || dist > current.radius * 0.32)) {
          if (current.mode !== 'angle') {
            current.mode = 'angle';
            current.lastAngle = getPointerAngle(event.clientX, event.clientY, current.centerX, current.centerY);
          }
          const nextAngle = getPointerAngle(event.clientX, event.clientY, current.centerX, current.centerY);
          let deltaAngle = nextAngle - current.lastAngle;
          if (deltaAngle > 180) deltaAngle -= 360;
          if (deltaAngle < -180) deltaAngle += 360;
          current.lastAngle = nextAngle;
          const span = Math.max(1, maxAngle - minAngle);
          // Solid mechanical stops at min and max: never wraps around across 6 o'clock
          const nextValue = clamp(current.value + (deltaAngle / span) * range, min, max);
          current.value = nextValue;
          set(nextValue);
        } else {
          const delta = (current.startY - event.clientY) + (event.clientX - current.startX);
          set(current.value + (delta / dragPixels) * range);
        }
      }}
      onPointerUp={(event: PointerEvent<HTMLDivElement>) => {
        drag.current = null;
        setActive(false);
        delete event.currentTarget.dataset.active;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { drag.current = null; setActive(false); }}
    >
      {children?.({ value, progress, angle, active }) ?? (
        <>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(145deg,#f8fafc,#cbd5e1)', boxShadow: 'inset 0 0 0 1px #94a3b8, 0 8px 20px #0f172a30' }} />
          <div style={{ position: 'absolute', inset: '8%', borderRadius: '50%', border: '1px dashed #94a3b888', pointerEvents: 'none' }} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform: `rotate(${angle}deg)`,
              transition: active ? undefined : 'transform .06s ease-out',
              pointerEvents: 'none',
            }}
          >
            {/* Protruding tactile lever handle tab so users can visually grab & turn the dial */}
            <div
              style={{
                position: 'absolute',
                width: 14,
                height: 22,
                left: 'calc(50% - 7px)',
                top: -7,
                borderRadius: 6,
                background: 'linear-gradient(180deg, #14b8a6, #0f766e)',
                boxShadow: '0 3px 8px #0f172a55, inset 0 1px 0 #99f6e4',
                border: '1px solid #0d9488',
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: 4,
                height: '34%',
                left: 'calc(50% - 2px)',
                top: '14%',
                borderRadius: 4,
                background: '#0f766e',
              }}
            />
          </div>
          <div style={{ position: 'absolute', inset: '34%', borderRadius: '50%', background: 'linear-gradient(145deg,#e2e8f0,#94a3b8)', boxShadow: '0 2px 5px #0f172a33, inset 0 1px 0 #fff', pointerEvents: 'none' }} />
        </>
      )}
    </div>
  );
}

export interface JoystickValue { x: number; y: number }
export interface JoystickControlProps {
  value: JoystickValue;
  onChange: (value: JoystickValue) => void;
  size?: number;
  step?: number;
  springToCenter?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
  children?: (value: JoystickValue, active: boolean) => ReactNode;
}

/** A bounded two-axis pointer and keyboard control with optional return-to-centre behavior. */
export function JoystickControl({ value, onChange, size = 150, step = 0.1, springToCenter = true, label = 'Joystick', className, style, children }: JoystickControlProps) {
  const pointer = useRef<number | null>(null);
  const [active, setActive] = useState(false);
  const setFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    let x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    let y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    onChange({ x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) });
  };
  const release = (event: PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    setActive(false);
    delete event.currentTarget.dataset.active;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (springToCenter) onChange({ x: 0, y: 0 });
  };
  return (
    <div
      role="application"
      tabIndex={0}
      aria-label={`${label}: x ${value.x.toFixed(2)}, y ${value.y.toFixed(2)}`}
      className={className}
      style={{ width: size, height: size, borderRadius: '50%', position: 'relative', touchAction: 'none', ...style }}
      onKeyDown={(event) => {
        const next = { ...value };
        if (event.key === 'ArrowLeft') next.x -= step;
        else if (event.key === 'ArrowRight') next.x += step;
        else if (event.key === 'ArrowUp') next.y += step;
        else if (event.key === 'ArrowDown') next.y -= step;
        else if (event.key === 'Home' || event.key === 'Escape') { next.x = 0; next.y = 0; }
        else return;
        event.preventDefault();
        onChange({ x: snap(next.x, -1, 1, step), y: snap(next.y, -1, 1, step) });
      }}
      onPointerDown={(event) => { pointer.current = event.pointerId; setActive(true); event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.dataset.active = 'true'; setFromPointer(event); }}
      onPointerMove={(event) => { if (pointer.current === event.pointerId) setFromPointer(event); }}
      onPointerUp={release}
      onPointerCancel={(event) => { pointer.current = null; setActive(false); delete event.currentTarget.dataset.active; if (springToCenter) onChange({ x: 0, y: 0 }); }}
    >
      {children?.(value, active) ?? (
        <>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle,#334155 0 12%,#1e293b 13% 48%,#0f172a 49%)', boxShadow: 'inset 0 0 0 1px #64748b, inset 0 8px 18px #02061799' }} />
          <div style={{ position: 'absolute', width: '30%', height: '30%', left: `${50 + value.x * 32}%`, top: `${50 - value.y * 32}%`, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'linear-gradient(145deg,#f8fafc,#94a3b8)', boxShadow: '0 5px 10px #02061799', transition: pointer.current === null && springToCenter ? 'left .18s ease, top .18s ease' : undefined }} />
        </>
      )}
    </div>
  );
}
