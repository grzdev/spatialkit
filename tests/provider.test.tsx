import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { StrictMode, useEffect } from 'react';
import { create, act } from '@react-three/test-renderer';
import { Mesh } from 'three';
import { SpatialProvider, useSpatial, useSpatialContext } from '../src/react/SpatialProvider';
import type { PartRecord, SpatialPart } from '../src/react/model';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const records: PartRecord[] = [{ object: new Mesh(), part: { id: 'pump/valve', modelId: 'pump', name: 'valve', metadata: {} } }];
const api: Record<string, ReturnType<typeof useSpatial>> = {};
function Probe({ name, mounted = true }: { name: string; mounted?: boolean }) {
  const { register } = useSpatialContext();
  api[name] = useSpatial();
  useEffect(() => mounted ? register('pump', records) : undefined, [register, mounted]);
  return null;
}
test('providers isolate selection and removing a selected model clears its selection', async () => {
  const changes: Array<SpatialPart | null> = [];
  const tree = (mounted: boolean) => <StrictMode>
    <SpatialProvider onSelectionChange={(part) => changes.push(part)}><Probe name="a" mounted={mounted} /></SpatialProvider>
    <SpatialProvider><Probe name="b" /></SpatialProvider>
  </StrictMode>;
  const renderer = await create(tree(true));
  await act(async () => api.a.select('valve'));
  assert.equal(api.a.selectedPart?.id, 'pump/valve');
  assert.equal(api.b.selectedPart, null);
  assert.equal(changes.length, 1);
  await renderer.update(tree(false));
  assert.equal(api.a.selectedPart, null);
  assert.equal(api.a.parts.length, 0);
  assert.equal(api.b.parts.length, 1);
  assert.equal(changes.at(-1), null);
  await renderer.unmount();
});
