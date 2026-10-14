import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK } from '../src/blocks.js';
import { PlacedLightManager } from '../src/lights.js';

test('placed block-defined lights restore with distinct colors and track block changes', () => {
  const scene = new THREE.Scene();
  const world = { edits: new Map([['1,2,3', BLOCK.TORCH], ['4,5,6', BLOCK.LUMEN_LANTERN], ['7,8,9', BLOCK.STONE]]) };
  const lights = new PlacedLightManager(scene, world);
  assert.equal(lights.lights.size, 2);
  assert.equal(lights.lights.get('1,2,3').color.getHex(), 0xffb64f);
  assert.equal(lights.lights.get('4,5,6').color.getHex(), 0x74fff1);
  assert.ok(lights.lights.get('4,5,6').distance > lights.lights.get('1,2,3').distance);
  lights.blockChanged(2, 3, 4, BLOCK.TORCH);
  assert.equal(lights.lights.size, 3);
  lights.blockChanged(1, 2, 3, BLOCK.AIR);
  assert.equal(lights.lights.size, 2);
});

test('generated landmark lights stream in, respect broken blocks, and stream out', () => {
  const blocks = new Map([['10,20,30', BLOCK.LUMEN_LANTERN]]);
  const world = {
    edits: new Map(),
    getBlock(x, y, z) { return blocks.get(`${x},${y},${z}`) ?? BLOCK.AIR; },
  };
  const lights = new PlacedLightManager(new THREE.Scene(), world);
  assert.equal(lights.syncGenerated([{ x: 10, y: 20, z: 30 }]), 1);
  assert.equal(lights.lights.get('10,20,30').userData.generated, true);
  blocks.set('10,20,30', BLOCK.AIR);
  assert.equal(lights.syncGenerated([{ x: 10, y: 20, z: 30 }]), 0);
  assert.equal(lights.lights.size, 0);
  blocks.set('10,20,30', BLOCK.LUMEN_LANTERN);
  lights.syncGenerated([{ x: 10, y: 20, z: 30 }]);
  assert.equal(lights.syncGenerated([]), 0);
  assert.equal(lights.lights.size, 0);
});
