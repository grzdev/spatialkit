# SpatialKit Consumer Integration Test

A standalone consumer test app validating `spatialkit/react` in an isolated React Three Fiber environment.

## Running the Test Consumer

```bash
cd scripts/test-consumer
npm install --legacy-peer-deps
npm run dev
```

Runs on `http://localhost:5174` (alongside the main inspector on port 5173).

## Features Tested
- `<SpatialProvider>` context wrapping and selection callbacks
- `<SelectableModel src="/pump.glb" modelId="pump" />` GLB mesh part picking
- `<Annotation>` 3D world-space anchored labels
- `useSpatial()` hook for assembly tree and active part inspection
