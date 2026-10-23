import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
  });
}

async function run() {
  console.log('Fetching Khronos Suzanne assets...');
  const base = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Suzanne/glTF/';
  const [gltfRaw, binRaw, baseColorPng, mrPng] = await Promise.all([
    fetchBuf(base + 'Suzanne.gltf'),
    fetchBuf(base + 'Suzanne.bin'),
    fetchBuf(base + 'Suzanne_BaseColor.png'),
    fetchBuf(base + 'Suzanne_MetallicRoughness.png'),
  ]);

  const gltf = JSON.parse(gltfRaw.toString('utf8'));

  function pad4(buf, fill = 0) {
    const rem = buf.length % 4;
    if (rem === 0) return buf;
    const pad = Buffer.alloc(4 - rem, fill);
    return Buffer.concat([buf, pad]);
  }

  const paddedBin = pad4(binRaw);
  const baseColorOffset = paddedBin.length;
  const paddedBaseColor = pad4(baseColorPng);
  const mrOffset = baseColorOffset + paddedBaseColor.length;
  const paddedMr = pad4(mrPng);

  const combinedBin = Buffer.concat([paddedBin, paddedBaseColor, paddedMr]);

  const baseColorBvIndex = gltf.bufferViews.length;
  gltf.bufferViews.push({
    buffer: 0,
    byteOffset: baseColorOffset,
    byteLength: baseColorPng.length,
  });

  const mrBvIndex = gltf.bufferViews.length;
  gltf.bufferViews.push({
    buffer: 0,
    byteOffset: mrOffset,
    byteLength: mrPng.length,
  });

  gltf.images[0] = {
    bufferView: baseColorBvIndex,
    mimeType: 'image/png',
  };
  gltf.images[1] = {
    bufferView: mrBvIndex,
    mimeType: 'image/png',
  };

  gltf.buffers = [{
    byteLength: combinedBin.length,
  }];

  const jsonBuf = pad4(Buffer.from(JSON.stringify(gltf), 'utf8'), 0x20);
  const totalLen = 12 + 8 + jsonBuf.length + 8 + combinedBin.length;

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0); // "glTF"
  header.writeUInt32LE(2, 4);          // version 2
  header.writeUInt32LE(totalLen, 8);   // total length

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuf.length, 0);
  jsonHeader.writeUInt32LE(0x4E4F534A, 4); // "JSON"

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(combinedBin.length, 0);
  binHeader.writeUInt32LE(0x004E4942, 4); // "BIN\0"

  const glb = Buffer.concat([header, jsonHeader, jsonBuf, binHeader, combinedBin]);
  const outPath = path.resolve('examples/inspector/public/models/Suzanne.glb');
  fs.writeFileSync(outPath, glb);
  console.log('Successfully created Suzanne.glb! Size:', (glb.length / 1024 / 1024).toFixed(2), 'MB');
}

run().catch(console.error);
