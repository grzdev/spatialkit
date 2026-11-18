import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export interface SmoothScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

/**
 * Hardware-composited scroll container that isolates scrolling onto its own GPU layer
 * (`transform: translate3d(0,0,0)`, `contain: content`, `overscroll-behavior: contain`)
 * and prevents wheel/touch events from leaking to the 3D WebGL Canvas behind it.
 */
export const SmoothScrollArea = forwardRef<HTMLDivElement, SmoothScrollAreaProps>(
  function SmoothScrollArea({ children, className = '', style, onWheel, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={`lux-smooth-scroll ${className}`.trim()}
        style={style}
        onWheel={(e) => {
          e.stopPropagation();
          onWheel?.(e);
        }}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
