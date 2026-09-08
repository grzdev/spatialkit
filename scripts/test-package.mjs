// Verify the actual npm tarball from a consumer directory, including declaration resolution.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const repository = process.cwd();
const workspace = resolve('.cache/package-smoke');
const consumer = join(workspace, 'consumer');
const unpacked = join(consumer, 'node_modules/spatialkit');
await mkdir(unpacked, { recursive: true });
const npm = process.env.npm_execpath;
assert.ok(npm, 'Run with npm run test:package');
const packed = JSON.parse(execFileSync(process.execPath, [npm, 'pack', '--json', '--ignore-scripts', '--pack-destination', workspace], { encoding: 'utf8' }))[0];
execFileSync('tar', ['-xf', join(workspace, packed.filename), '-C', unpacked, '--strip-components=1']);
const manifest = JSON.parse(await readFile(join(unpacked, 'package.json'), 'utf8'));
for (const entry of Object.values(manifest.exports)) {
  for (const path of Object.values(entry)) assert.ok((await readFile(join(unpacked, path))).length > 0, `Missing ${path}`);
}
for (const name of ['react.js', 'spatialkit.js']) {
  assert.ok(!(await readFile(join(unpacked, 'dist', name), 'utf8')).includes('@mediapipe'), `${name} must not load optional MediaPipe`);
}
await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
await writeFile(join(consumer, 'smoke.mjs'), `
import assert from 'node:assert/strict';
import { SpatialProvider, SelectableModel, Annotation, useSpatial } from 'spatialkit/react';
import { SceneManager } from 'spatialkit';
for (const exported of [SpatialProvider, SelectableModel, Annotation, useSpatial, SceneManager]) assert.equal(typeof exported, 'function');
console.log('Packed ESM exports resolve without constructing browser resources.');
`);
await writeFile(join(consumer, 'smoke.tsx'), `
import { SpatialProvider, SelectableModel, Annotation, type SpatialPart } from 'spatialkit/react';
const onSelectionChange = (part: SpatialPart | null) => part?.metadata;
export const scene = <SpatialProvider onSelectionChange={onSelectionChange}><SelectableModel src="/pump.glb" modelId="pump" /><Annotation target="pressure-valve" label="Inspect this seal" /></SpatialProvider>;
`);
await writeFile(join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2020', module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, skipLibCheck: true, noEmit: true }, include: ['smoke.tsx'] }));
execFileSync(process.execPath, [join(consumer, 'smoke.mjs')], { stdio: 'inherit' });
execFileSync(process.execPath, [join(repository, 'node_modules/typescript/bin/tsc'), '-p', join(consumer, 'tsconfig.json')], { stdio: 'inherit' });
console.log(`Verified ${packed.filename}: public exports, declarations, consumer TSX, and optional MediaPipe isolation.`);
