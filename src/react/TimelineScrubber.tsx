import { useEffect, type CSSProperties, type RefObject } from 'react';

export interface TimelineScrubberProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  formatValue?: (value: number) => string;
}

export interface MediaTimelineOptions {
  /** Input value range produced by TimelineScrubber. */
  input: readonly [number, number];
  /** Media time range in seconds. Reversing this pair reverses playback direction. */
  time: readonly [number, number];
  /** Pause the media whenever the scrubber updates. Defaults to true. */
  pause?: boolean;
}

export function mapTimelineValue(value: number, input: readonly [number, number], output: readonly [number, number]) {
  const [inputStart, inputEnd] = input;
  if (![value, inputStart, inputEnd, output[0], output[1]].every(Number.isFinite)) throw new Error('[SpatialKit] Timeline values must be finite numbers.');
  if (inputStart === inputEnd) throw new Error('[SpatialKit] Timeline input range cannot have zero length.');
  const progress = Math.min(1, Math.max(0, (value - inputStart) / (inputEnd - inputStart)));
  return output[0] + progress * (output[1] - output[0]);
}

/** Keep an HTML video or audio element at the time represented by a controlled value. */
export function useMediaTimeline(
  mediaRef: RefObject<HTMLMediaElement | null>,
  value: number,
  { input, time, pause = true }: MediaTimelineOptions,
) {
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    if (pause) media.pause();
    media.currentTime = mapTimelineValue(value, input, time);
  }, [mediaRef, value, input[0], input[1], time[0], time[1], pause]);
}

/** Accessible, controlled input for scrubbing video, audio, or SpatialKit model animations. */
export function TimelineScrubber({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  orientation = 'horizontal',
  label = 'Animation progress',
  disabled,
  className,
  style,
  formatValue = (current) => String(current),
}: TimelineScrubberProps) {
  const vertical = orientation === 'vertical';
  const inputStyle: CSSProperties = vertical
    ? { writingMode: 'vertical-lr', direction: 'rtl', height: '100%', width: 24, touchAction: 'none' }
    : { width: '100%', touchAction: 'none' };
  return (
    <input
      className={className}
      type="range"
      aria-label={label}
      aria-orientation={orientation}
      aria-valuetext={formatValue(value)}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      style={{ ...inputStyle, ...style }}
    />
  );
}
