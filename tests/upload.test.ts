import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { prepareModel, validateModelFile } from '../examples/inspector/model-files';
import { generateComponent, publicFilename } from '../examples/inspector/integration';
import { notesKey, parseNotes } from '../examples/inspector/notes';
import { modelFit } from '../src/react/model';
import { mapTimelineValue } from '../src/react/TimelineScrubber';

const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).buffer as ArrayBuffer;
test('accepts a real GLB and embedded glTF; rejects external resources and malformed containers', () => {
  const file = readFileSync('examples/inspector/public/pump.glb');
  const glb = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  assert.equal(validateModelFile('pump.glb', glb).asset.version, '2.0');
  assert.equal(validateModelFile('model.gltf', bytes({ asset: { version: '2.0' }, buffers: [{ uri: 'data:application/octet-stream;base64,AAAA' }] })).asset.version, '2.0');
  assert.throws(() => validateModelFile('model.gltf', bytes({ asset: { version: '2.0' }, images: [{ uri: 'https://example.com/texture.png' }] })), /separate files/);
  assert.throws(() => validateModelFile('model.gltf', bytes({ asset: { version: '2.0' }, buffers: [{ uri: 'model.bin' }] })), /separate files/);
  assert.throws(() => validateModelFile('model.obj', bytes({})), /Export other formats/);
  assert.throws(() => validateModelFile('model.glb', glb.slice(0, 25)), /valid GLB/);
  assert.throws(() => validateModelFile('model.gltf', bytes({ asset: { version: '2.0' }, extensionsUsed: ['KHR_draco_mesh_compression'] })), /uncompressed/);
});

test('prepares a real uploaded GLB and derives identity from content, not filename', async () => {
  const contents = readFileSync('examples/inspector/public/pump.glb');
  const first = await prepareModel(new File([contents], 'first-name.glb'));
  const second = await prepareModel(new File([contents], 'renamed.glb'));
  try {
    assert.equal(first.id, second.id);
    assert.equal(first.name, 'first-name');
    assert.equal(first.filename, 'first-name.glb');
    assert.ok(first.object);
    assert.equal(first.animations?.[0]?.name, 'Exploded inspection');
  } finally { first.dispose?.(); second.dispose?.(); }
});

test('timeline values clamp and map in both directions', () => {
  assert.equal(mapTimelineValue(1.25, [0, 2.5], [49, 50.4]), 49.7);
  assert.equal(mapTimelineValue(3, [0, 2.5], [49, 50.4]), 50.4);
  assert.equal(mapTimelineValue(0.25, [0, 1], [3, 0]), 2.25);
  assert.throws(() => mapTimelineValue(0, [1, 1], [0, 1]), /zero length/);
});

test('large off-centre and tiny models fit, ground, and preserve aspect ratio', () => {
  for (const dimension of [0.00001, 5000]) {
    const source = new Mesh(new BoxGeometry(dimension, dimension * 2, dimension / 2), new MeshStandardMaterial());
    source.position.set(12, 10, -9);
    const fitted = modelFit(source, 3.5);
    const wrapper = new Group();
    wrapper.scale.setScalar(fitted.scale);
    wrapper.position.set(...fitted.position);
    wrapper.add(source.clone());
    wrapper.updateMatrixWorld(true);
    const box = new Box3().setFromObject(wrapper);
    const size = box.getSize(new Vector3());
    assert.ok(Math.abs(size.y - 3.5) < 1e-6);
    assert.ok(Math.abs(size.y / size.x - 2) < 1e-6);
    assert.ok(Math.abs(box.min.y) < 1e-6);
    assert.ok(Math.abs(box.getCenter(new Vector3()).x) < 1e-6);
    assert.equal(source.position.x, 12);
  }
  assert.throws(() => modelFit(new Group(), 3.5), /no visible mesh/);
  assert.throws(() => modelFit(new Group(), 0), /positive/);
});

test('saved notes are isolated by model identity including same-name files', () => {
  const a = [{ id: 'note', target: 'model-a/mesh', label: 'First model' }];
  assert.deepEqual(parseNotes(JSON.stringify(a), 'model-a'), a);
  assert.throws(() => parseNotes(JSON.stringify(a), 'model-b'));
  assert.notEqual(notesKey('model-a'), notesKey('model-b'));
  assert.equal(notesKey('pump'), 'spatialkit.inspector.notes.v1');
});

test('generated TSX uses the selected asset, stable targets, escaped text, and preview offsets', () => {
  const label = 'Seal "A" {unsafe} </Annotation>\nNew line';
  const code = generateComponent({ id: 'model-hash', filename: 'My model #1.glb', object: {} }, [
    { id: 'a', target: 'model-hash/Valve', label, point: [0.12, -0.5, 1.75] },
    { id: 'b', target: 'model-hash/Valve', label: 'Second note' },
  ]);
  assert.ok(code.includes('src={"/models/My-model--1.glb"}'));
  assert.ok(code.includes('fit={3.5}'));
  assert.ok(code.includes(`label={${JSON.stringify(label)}}`));
  assert.ok(code.includes('point={[0.12,-0.5,1.75]}'));
  assert.ok(code.includes('offset={[0,0.65,0]}'));
  assert.ok(!code.includes('blob:'));
  assert.ok(!code.includes('pump.glb'));
  const result = ts.transpileModule(code, { fileName: 'ModelViewer.tsx', compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 }, reportDiagnostics: true });
  assert.equal(result.diagnostics?.length, 0);
  assert.equal(publicFilename('../../model.glb'), '-..-model.glb');
});

test('saved hotspot coordinates must be finite mesh-local triples', () => {
  const valid = [{ id: 'hotspot', target: 'model-a/mesh', label: 'Point', point: [0.1, -2, 3.5] }];
  assert.deepEqual(parseNotes(JSON.stringify(valid), 'model-a'), valid);
  for (const point of [[1, 2], [1, 2, 3, 4], [1, '2', 3], [1, null, 3]]) {
    assert.throws(() => parseNotes(JSON.stringify([{ ...valid[0], point }]), 'model-a'));
  }
});

test('imported notes parse correctly and de-duplicate by ID against existing list', () => {
  const existing = [{ id: 'n1', target: 'pump/valve', label: 'Existing note' }];
  const importedRaw = JSON.stringify([
    { id: 'n1', target: 'pump/valve', label: 'Duplicate id should not be re-added' },
    { id: 'n2', target: 'pump/casing', label: 'New imported note', point: [0, 1, 0] },
  ]);
  const imported = parseNotes(importedRaw, 'pump');
  assert.equal(imported.length, 2);

  const existingIds = new Set(existing.map((n) => n.id));
  const merged = [...existing];
  let added = 0;
  for (const note of imported) {
    if (!existingIds.has(note.id)) {
      merged.push(note);
      existingIds.add(note.id);
      added++;
    }
  }
  assert.equal(added, 1);
  assert.equal(merged.length, 2);
  assert.equal(merged[1].id, 'n2');
  assert.equal(merged[1].label, 'New imported note');
});
