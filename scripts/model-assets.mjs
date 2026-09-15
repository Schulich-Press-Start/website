import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

export function packageGlb(document, binary) {
  assert.equal(document.asset.version, '2.0');
  assert.equal(document.buffers.length, 1, 'Only the supplied single-buffer model is supported.');
  assert.equal(binary.byteLength, document.buffers[0].byteLength, 'The model geometry is incomplete.');
  const packed = structuredClone(document);
  delete packed.buffers[0].uri;
  const json = Buffer.from(JSON.stringify(packed));
  const jsonLength = Math.ceil(json.length / 4) * 4;
  const binaryLength = Math.ceil(binary.length / 4) * 4;
  const glb = Buffer.alloc(12 + 8 + jsonLength + 8 + binaryLength);
  glb.write('glTF', 0);
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(jsonLength, 12);
  glb.write('JSON', 16);
  glb.fill(0x20, 20, 20 + jsonLength);
  json.copy(glb, 20);
  glb.writeUInt32LE(binaryLength, 20 + jsonLength);
  glb.write('BIN\0', 24 + jsonLength);
  binary.copy(glb, 28 + jsonLength);
  return glb;
}

export async function prepareModel() {
  const source = new URL('../design/reference/handheld/', import.meta.url);
  const document = JSON.parse(await readFile(new URL('SPS_V1_07.20.gltf', source), 'utf8'));
  const binary = await readFile(new URL('SPS V1 07.20.bin', source));
  const output = new URL('../public/models/', import.meta.url);
  await mkdir(output, { recursive: true });
  await writeFile(new URL('sps-handheld.glb', output), packageGlb(document, binary));
}