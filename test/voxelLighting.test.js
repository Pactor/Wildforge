import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { emittedLightLevel, lightPasses, MAX_LIGHT, VoxelLightField } from '../src/voxelLighting.js';

class LightWorld {
  constructor(blockAt) { this.blockAt = blockAt; }
  getBlock(x, y, z) { return this.blockAt(Math.floor(x), Math.floor(y), Math.floor(z)); }
}

test('skylight descends through openings and attenuates sideways beneath roofs', () => {
  const world = new LightWorld((x, y, z) => y === 10 && (x !== 0 || z !== 0) ? BLOCK.STONE : BLOCK.AIR);
  const field = new VoxelLightField(world, 0, 0, 1, 1, 16, 5);
  assert.equal(field.skyLevelAt(0, 12, 0), MAX_LIGHT);
  assert.equal(field.skyLevelAt(0, 9, 0), MAX_LIGHT);
  assert.equal(field.skyLevelAt(3, 9, 0), MAX_LIGHT - 3);
  assert.ok(field.skyLevelAt(5, 5, 5) < field.skyLevelAt(3, 9, 0));
});

test('block light propagates from canonical emitters and respects solid walls', () => {
  const world = new LightWorld((x, y, z) => {
    if (x === 0 && y === 5 && z === 0) return BLOCK.TORCH;
    if (x === 2 && y < 10) return BLOCK.STONE;
    return BLOCK.AIR;
  });
  const field = new VoxelLightField(world, 0, 0, 1, 1, 12, 5);
  const source = emittedLightLevel(BLOCK.TORCH);
  assert.ok(source > 0);
  assert.equal(field.blockLevelAt(0, 5, 0), source);
  assert.equal(field.blockLevelAt(1, 5, 0), source - 1);
  assert.equal(field.blockLevelAt(3, 5, 0), 0);
  assert.ok(field.blockLevelAt(0, 5, 0) > field.blockLevelAt(4, 5, 0));
});

test('transparent and nonsolid voxels pass light while ordinary solids stop it', () => {
  assert.equal(lightPasses(BLOCK.AIR), true);
  assert.equal(lightPasses(BLOCK.TORCH), true);
  assert.equal(lightPasses(BLOCK.GLASS), true);
  assert.equal(lightPasses(BLOCK.STONE), false);
});

test('light fields support negative world layers', () => {
  const world = new LightWorld((x, y, z) => x === 0 && y === -80 && z === 0 ? BLOCK.TORCH : BLOCK.AIR);
  const field = new VoxelLightField(world, 0, 0, 1, 1, 32, 3, -96);
  const source = emittedLightLevel(BLOCK.TORCH);
  assert.equal(field.blockLevelAt(0, -80, 0), source);
  assert.equal(field.blockLevelAt(1, -80, 0), source - 1);
  assert.equal(field.blockLevelAt(0, -97, 0), 0);
});
