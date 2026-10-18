import { forwardRef, type ComponentRef } from 'react';
import { OrbitControls, type OrbitControlsProps } from '@react-three/drei';
import { MOUSE } from 'three';

export type BlenderControlsProps = Omit<OrbitControlsProps, 'mouseButtons'>;

/** Orbit with middle mouse, pan with Shift + middle mouse, and zoom with the wheel. */
export const BlenderControls = forwardRef<ComponentRef<typeof OrbitControls>, BlenderControlsProps>(function BlenderControls(props, forwardedRef) {
  return (
    <OrbitControls
      {...props}
      ref={forwardedRef}
      mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.ROTATE, RIGHT: MOUSE.PAN }}
    />
  );
});
