// Original, procedural demo asset. Regenerate with: node scripts/create-demo-model.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { BoxGeometry, CylinderGeometry, TorusGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then((data) => { this.result = data; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then((data) => { this.result = `data:${blob.type};base64,${Buffer.from(data).toString('base64')}`; this.onloadend?.(); }); }
};
const scene = new Group();
scene.name = 'PX-04 demonstration pump';
const teal = new MeshStandardMaterial({ color: '#397b71', metalness: 0.5, roughness: 0.3 });
const dark = new MeshStandardMaterial({ color: '#273b3f', metalness: 0.65, roughness: 0.38 });
const steel = new MeshStandardMaterial({ color: '#aab8b9', metalness: 0.8, roughness: 0.27 });
const brass = new MeshStandardMaterial({ color: '#d5a15e', metalness: 0.65, roughness: 0.3 });
const orange = new MeshStandardMaterial({ color: '#db663f', metalness: 0.4, roughness: 0.35 });
function part(name, geometry, material, position, description, rotation = [0, 0, 0]) {
  const mesh = new Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.userData = { spatialId: name, label: name.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join(' '), description, material: material === brass ? 'Brass' : material === teal ? 'Coated aluminium' : 'Steel', asset: 'PX-04 · Demo assembly' };
  scene.add(mesh);
  return mesh;
}
part('mounting-base', new BoxGeometry(3.7, 0.18, 1.75), dark, [0, 0.1, 0], 'Rigid platform supporting the demonstration assembly.');
part('motor-support', new BoxGeometry(1.65, 0.28, 1), teal, [-0.85, 0.32, 0], 'Connects the motor casing to the mounting base.');
part('motor-housing', new CylinderGeometry(0.64, 0.64, 1.65, 48), teal, [-0.85, 1, 0], 'Protective enclosure around the drive motor.', [0, 0, Math.PI / 2]);
for (let i = 0; i < 9; i++) part(`cooling-fin-${i + 1}`, new CylinderGeometry(0.69, 0.69, 0.035, 48), teal, [-1.5 + i * 0.145, 1, 0], 'Surface area for dissipating heat from the motor.', [0, 0, Math.PI / 2]);
part('motor-end-cap', new CylinderGeometry(0.57, 0.65, 0.15, 48), dark, [-1.75, 1, 0], 'Removable cover on the rear of the motor.', [0, 0, Math.PI / 2]);
part('shaft-coupling', new CylinderGeometry(0.23, 0.23, 0.5, 32), steel, [0.2, 1, 0], 'Transfers rotation between the motor and pump.', [0, 0, Math.PI / 2]);
part('pump-body', new CylinderGeometry(0.7, 0.7, 0.65, 48), teal, [0.88, 1, 0], 'Main housing for the pump impeller.', [Math.PI / 2, 0, 0]);
part('front-cover', new CylinderGeometry(0.61, 0.61, 0.12, 48), steel, [0.88, 1, 0.39], 'Service cover for accessing the impeller chamber.', [Math.PI / 2, 0, 0]);
part('inlet-port', new CylinderGeometry(0.24, 0.24, 0.55, 32), brass, [0.88, 1, 0.71], 'Entry connection for the demonstration flow path.', [Math.PI / 2, 0, 0]);
part('inlet-flange', new TorusGeometry(0.26, 0.07, 12, 40), steel, [0.88, 1, 1], 'Circular mounting face around the inlet.');
part('outlet-neck', new CylinderGeometry(0.19, 0.19, 0.55, 32), brass, [0.88, 1.83, 0], 'Connects the pump body to the outlet valve.');
part('pressure-valve', new BoxGeometry(0.6, 0.27, 0.44), brass, [0.88, 2.11, 0], 'Valve body and seal. Select this part to attach an inspection note.');
part('valve-stem', new CylinderGeometry(0.065, 0.065, 0.3, 20), steel, [0.88, 2.35, 0], 'Connects the handwheel to the valve mechanism.');
part('valve-handwheel', new TorusGeometry(0.28, 0.045, 12, 40), orange, [0.88, 2.51, 0], 'Manual adjustment wheel.', [Math.PI / 2, 0, 0]);
part('handwheel-spoke', new BoxGeometry(0.55, 0.055, 0.06), orange, [0.88, 2.51, 0], 'Crossbar of the adjustment wheel.');
for (let i = 0; i < 6; i++) {
  const angle = i * Math.PI / 3;
  part(`cover-bolt-${i + 1}`, new CylinderGeometry(0.055, 0.055, 0.09, 6), dark, [0.88 + Math.cos(angle) * 0.5, 1 + Math.sin(angle) * 0.5, 0.49], 'Fastener securing the front cover.', [Math.PI / 2, 0, 0]);
}
await mkdir('examples/inspector/public', { recursive: true });
const result = await new GLTFExporter().parseAsync(scene, { binary: true });
await writeFile('examples/inspector/public/pump.glb', Buffer.from(result));
console.log(`Created original pump.glb (${Math.round(result.byteLength / 1024)} KB, ${scene.children.length} selectable parts).`);
