import { annotationOffset, type Note } from './notes';

export interface IntegrationModel { id: string; filename: string; object?: unknown; hasAnimations?: boolean }
export function publicFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/^\.+/, '') || 'model.glb';
}

/** JSON expressions keep quotes, braces, newlines and user markup safely inside strings. */
export function generateComponent(model: IntegrationModel, notes: Note[]): string {
  const annotations = notes.map((note, i) => `              <Annotation target={${JSON.stringify(note.target)}} label={${JSON.stringify(note.label)}}${note.point ? ` point={${JSON.stringify(note.point)}}` : ''} offset={${JSON.stringify(annotationOffset(notes, i))}} />`).join('\n');
  const animationProp = model.hasAnimations ? ' animationProgress={animationProgress}' : '';
  const animationControl = model.hasAnimations ? `
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <span>Animation</span>
        <TimelineScrubber value={animationProgress} onChange={setAnimationProgress} label="Model animation" />
        <output>{Math.round(animationProgress * 100)}%</output>
      </div>` : '';
  return `'use client';

import { Component, Suspense, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { SpatialProvider, SelectableModel, Annotation, BlenderControls, TimelineScrubber, type SpatialPart } from 'spatialkit/react';

class ModelError extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <Html center>Model failed to load. Check the file in public/models.</Html>
      : this.props.children;
  }
}

export default function ModelViewer() {
  const [selectedPart, setSelectedPart] = useState<SpatialPart | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  return (
    <section>
      <div style={{ height: 560, width: '100%', borderRadius: 12, overflow: 'hidden' }}>
        <Canvas camera={{ position: [5.1, 3.7, 5.4], fov: 39 }} dpr={[1, 1.75]}>
          <color attach="background" args={['#e8eef8']} />
          <ambientLight intensity={1.2} />
          <hemisphereLight args={['#ffffff', '#687a69', 2]} />
          <directionalLight position={[4, 7, 5]} intensity={3.2} />
          <directionalLight position={[-4, 3, -2]} intensity={1.8} color="#c5dfed" />
          <ModelError>
            <Suspense fallback={<Html center>Loading model…</Html>}>
              <SpatialProvider onSelectionChange={setSelectedPart}>
                <SelectableModel src={${JSON.stringify(`/models/${publicFilename(model.filename)}`)}} modelId={${JSON.stringify(model.id)}}${model.object ? ' fit={3.5}' : ''}${animationProp} />
${annotations}
              </SpatialProvider>
            </Suspense>
          </ModelError>
          <BlenderControls target={[0, 1, 0]} minDistance={3} maxDistance={14} />
        </Canvas>
      </div>
${animationControl}
      <p>{selectedPart?.name ?? 'Select a part to inspect it'}</p>
    </section>
  );
}
`;
}

export const INSTALL_COMMAND = 'npm install three@0.167 react@18 react-dom@18 @react-three/fiber@8 @react-three/drei@9';
