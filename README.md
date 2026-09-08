# SpatialKit

Composable selection and annotations for React Three Fiber.

SpatialKit adds part selection, highlighting, model metadata, and attached labels to an existing React 3D scene. This repository includes a working inspector with a local pump assembly, searchable parts, saved notes, and JSON export.

This is a local development preview; these changes have not been published to npm.

## Try the inspector

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173. Select a part in the model or assembly list, attach a note, and reload to see it restored. Notes are saved in this browser, not synced to a server. Export downloads a JSON copy; importing that file is not implemented yet.

The original webcam experiment is available with `npm run demo:legacy`.

## React integration

The tested peer versions are React 18.3, React Three Fiber 8.18, Drei 9.122, and Three.js 0.167. React 19 / Fiber 9 support is not claimed in this preview.

To try the current source in a separate application:

```bash
# In this repository
npm run build
npm pack

# In your React application (replace the path with the generated tarball)
npm install /path/to/spatialkit-0.1.0.tgz
npm install three@0.167 react@18 react-dom@18 @react-three/fiber@8 @react-three/drei@9
```

```tsx
import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  SpatialProvider,
  SelectableModel,
  Annotation,
  type SpatialPart,
} from 'spatialkit/react';

export function Inspector() {
  const [selectedPart, setSelectedPart] = useState<SpatialPart | null>(null);

  return (
    <>
      <div style={{ height: 500 }}>
        <Canvas camera={{ position: [5, 4, 5] }}>
          <ambientLight intensity={1.5} />
          <directionalLight position={[4, 7, 5]} intensity={3} />
          <Suspense fallback={null}>
            <SpatialProvider onSelectionChange={setSelectedPart}>
              <SelectableModel src="/pump.glb" modelId="pump" />
              <Annotation
                target="pressure-valve"
                label="Inspect this seal"
              />
            </SpatialProvider>
          </Suspense>
          <OrbitControls target={[0, 1, 0]} />
        </Canvas>
      </div>
      <p>{selectedPart?.name ?? 'Select a part'}</p>
    </>
  );
}
```

Copy `examples/inspector/public/pump.glb` into your application's public directory to use this example. Your own model works too: annotation targets must match its mesh names or explicit ids. Mount an error boundary around loading components in production; the inspector example includes one. Camera framing, lighting, and controls remain yours to configure.

### `SpatialProvider`

Place inside your existing `<Canvas>`. Each provider owns an isolated part registry and selection state; no global event bus is used by the React entry point. `onSelectionChange(part)` fires on selection changes, including `null` when selection is cleared or the selected model unmounts. It does not fire an initial empty selection.

The selection is a data object:

```ts
interface SpatialPart {
  id: string;       // e.g. "pump/pressure-valve"
  modelId: string;  // "pump"
  name: string;    // mesh name from glTF
  metadata: Record<string, unknown>; // node extras
}
```

Use that context in your application state, backend, or AI request. SpatialKit does not call an AI service or manage credentials.

### `SelectableModel`

| Prop | Behavior |
| --- | --- |
| `src` | Required GLB/GLTF URL. Suspends while loading; loader failures reach the enclosing error boundary. |
| `modelId` | Defaults to `src`. Use a stable, unique id when saving notes or mounting multiple instances of a model. |
| `position`, `rotation` | Optional `[x, y, z]`; rotations are radians. |
| `scale` | Optional number or `[x, y, z]`. Asset units are preserved. |
| `highlightColor` | Hover/selection color; defaults to `#58ddba`. |
| `configureLoader` | Optional stable `(loader: GLTFLoader) => void` to configure decoders/plugins. |

Selection is at mesh level. Each mesh's part id uses `modelId` plus, in priority order, `extras.spatialId`, a unique mesh name, or a deterministic node path. Duplicate explicit ids throw. Paths can change when an asset hierarchy changes, so author explicit ids for long-lived annotations. Named groups are not selectable parts in this preview.

Model instances clone transforms and materials. Highlighting one instance does not change another. Loader-cached geometry and textures are shared and never disposed by SpatialKit; cloned materials are disposed on unmount. Animation playback is not implemented.

### `Annotation`

| Prop | Behavior |
| --- | --- |
| `target` | Required scoped part id, unique mesh name, or explicit part key. |
| `modelId` | Optional qualifier when names occur in more than one model. |
| `label` | Text content. |
| `children` | Custom React content, taking precedence over `label`. |
| `offset` | World-space `[x, y, z]` offset from the mesh bounding-box centre; defaults to `[0, 0.3, 0]`. |
| `selectedOnly` | Show only while the target is selected; defaults to false. |
| `className`, `style` | Customize the label. |

Annotations track transforms and project into the browser DOM using Drei's `Html`. They are display-only by default, remain visible through geometry, and do not avoid overlaps automatically. Missing or ambiguous targets render nothing; a full part id or `modelId` disambiguates. No hardcoded `pressure-valve` behavior is built into the library.

**These annotations are browser overlays, not immersive WebXR UI.** Webcam imagery does not provide real-world anchoring. Hardware hand tracking, surface placement, occlusion, and true eye tracking are outside this React release.

### `useSpatial()`

Call inside `SpatialProvider`:

```tsx
const { parts, selectedPart, select, clearSelection } = useSpatial();
select('pump/pressure-valve');
select('pressure-valve', 'pump');
clearSelection();
```

`parts` contains registered mesh metadata. Unknown/ambiguous selections clear selection. In the inspector, a small bridge exposes this API to the DOM parts list. Use the same approach to connect a toolbar outside the canvas. The example also clears selection on a missed canvas click and Escape; those are application policies, not global library listeners.

## Package entry points

| Import | Purpose |
| --- | --- |
| `spatialkit/react` | React components and hook; requires React, Fiber, Drei, and Three.js. |
| `spatialkit` | Existing vanilla Three.js scene/model/panel and basic WebXR helpers. |
| `spatialkit/gestures` | Optional webcam adapter; requires `@mediapipe/tasks-vision`. |

**Migration from the earlier source:** import `GestureController` and its types from `spatialkit/gestures`. Removing that export from the root keeps MediaPipe out of core and React imports. Root helpers still use the legacy global bus; do not confuse them with the isolated React provider. Prefer the ESM entry points for browser bundlers.

## Develop and verify

```bash
npm run typecheck
npm test
npm run build:example
npm run test:package
```

`build:example` builds the library and then builds the inspector against the package's public exports, rather than a source alias. During development, the source alias enables hot reload. Regression tests cover provider isolation, removal of selected models, material ownership, ambiguous targets, stable ids, transformed attachments, and saved-note validation.

`scripts/create-demo-model.mjs` generates the original demo asset without a download. Run it with Node to regenerate `examples/inspector/public/pump.glb`. This illustrative assembly is not an engineering model or maintenance guide.

## Next milestones

- Validate selection and annotation APIs in external React projects.
- Point-on-surface annotations, note import, and an application-owned persistence example.
- Object transform handles using existing ecosystem tools.
- React 19/Fiber 9 compatibility checks.
- Separately tested XR input and spatial UI adapters.

MIT licensed. The procedural demo model is included under the same license.
