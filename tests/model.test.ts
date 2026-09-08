import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { createModelInstance, partCenter, resolvePart } from '../src/react/model';
import { parseNotes } from '../examples/inspector/notes';

function fixture() {
  const group = new Group();
  const mesh = new Mesh(new BoxGeometry(2, 2, 2), new MeshStandardMaterial({ color: 'red' }));
  mesh.name = 'valve';
  group.add(mesh);
  return { group, mesh };
}
test('model instances isolate transforms and highlighting but retain loader-owned geometry', () => {
  const { group, mesh } = fixture();
  const a = createModelInstance(group, 'a');
  const b = createModelInstance(group, 'b');
  const material = a.records[0].object.material as MeshStandardMaterial;
  material.color.set('blue');
  a.root.position.x = 5;
  assert.equal(mesh.material.color.getHexString(), 'ff0000');
  assert.equal((b.records[0].object.material as MeshStandardMaterial).color.getHexString(), 'ff0000');
  assert.equal(b.root.position.x, 0);
  assert.equal(a.records[0].object.geometry, mesh.geometry);
  let geometryDisposed = false;
  let materialDisposed = false;
  mesh.geometry.addEventListener('dispose', () => { geometryDisposed = true; });
  material.addEventListener('dispose', () => { materialDisposed = true; });
  a.dispose();
  assert.equal(materialDisposed, true);
  assert.equal(geometryDisposed, false);
  b.dispose();
});
test('ambiguous short targets do not silently attach to the wrong model', () => {
  const { group } = fixture();
  const records = [...createModelInstance(group, 'a').records, ...createModelInstance(group, 'b').records];
  assert.equal(resolvePart(records, 'valve'), undefined);
  assert.equal(resolvePart(records, 'valve', 'b')?.part.id, 'b/valve');
  assert.equal(resolvePart(records, 'a/valve')?.part.id, 'a/valve');
  assert.equal(resolvePart(records, 'missing'), undefined);
});
test('duplicate mesh names get distinct deterministic paths, explicit ids survive renaming', () => {
  const { group, mesh } = fixture();
  group.add(mesh.clone());
  const ids = createModelInstance(group, 'pump').records.map((record) => record.part.id);
  assert.equal(new Set(ids).size, 2);
  assert.deepEqual(ids, createModelInstance(group, 'pump').records.map((record) => record.part.id));
  mesh.userData.spatialId = 'stable-valve';
  mesh.name = 'New display name';
  assert.equal(createModelInstance(group, 'pump').records[0].part.id, 'pump/stable-valve');
});
test('attachment points follow nested parent rotation, translation and scaling', () => {
  const { group, mesh } = fixture();
  mesh.position.set(1, 0, 0);
  group.position.set(3, 4, 5);
  group.scale.setScalar(2);
  group.rotation.z = Math.PI / 2;
  assert.ok(partCenter(mesh).distanceTo(new Vector3(3, 6, 5)) < 1e-6);
});
test('notes round trip and reject corrupted or duplicate saved data', () => {
  const notes = [{ id: '1', target: 'pump/valve', label: 'Inspect seal' }];
  assert.deepEqual(parseNotes(JSON.stringify(notes)), notes);
  assert.deepEqual(parseNotes('[]'), []);
  assert.throws(() => parseNotes('not json'));
  assert.throws(() => parseNotes(JSON.stringify([...notes, ...notes])));
  assert.throws(() => parseNotes('[{"id":"1","target":"pump/valve","label":3}]'));
});
