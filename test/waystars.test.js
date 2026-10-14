import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { ramCanMoveBlock } from '../src/circuits.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { blastProtected } from '../src/explosives.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { previewBoxes } from '../src/placementPreview.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';
import { MAX_WAYSTARS, WaystarRenderer, WaystarState, waystarBeamClear, waystarPyramidLevel, waystarStatus } from '../src/waystars.js';

class MemoryWorld {
  constructor(entries = []) { this.blocks = new Map(entries); this.edits = new Map(entries); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); this.edits.set(this.key(x, y, z), id); return true; }
}

function buildPyramid(world, x, y, z, levels) {
  world.setBlock(x, y, z, BLOCK.WAYSTAR);
  for (let layer = 1; layer <= levels; layer += 1) for (let dx = -layer; dx <= layer; dx += 1) for (let dz = -layer; dz <= layer; dz += 1) {
    world.setBlock(x + dx, y - layer, z + dz, BLOCK.FORGED_IRON_BLOCK);
  }
}

test('Waystar is a canonical boss-gated recipe with protected recovery', () => {
  assert.equal(BLOCK.WAYSTAR, 292); assert.equal(BLOCKS[BLOCK.WAYSTAR].waystar, true);
  assert.deepEqual(blockDrops(BLOCK.WAYSTAR), [BLOCK.WAYSTAR]);
  assert.equal(blastProtected(BLOCK.WAYSTAR), true); assert.equal(ramCanMoveBlock(BLOCK.WAYSTAR), false);
  const grid = [BLOCK.GLASS, BLOCK.GLASS, BLOCK.GLASS, BLOCK.GLASS, 'warden_core', BLOCK.GLASS, 'voidglass_shard', 'voidglass_shard', 'voidglass_shard'];
  assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'waystar');
  const inventory = new Inventory({ counts: [[BLOCK.GLASS, 5], ['warden_core', 1], ['voidglass_shard', 3]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'waystar'), 'table'), true);
  assert.equal(inventory.count(BLOCK.WAYSTAR), 1);
});

test('pyramid authority requires every block in each consecutive square layer', () => {
  const world = new MemoryWorld(); buildPyramid(world, 10, 12, 10, 4);
  assert.equal(waystarPyramidLevel(world, 10, 12, 10), 4);
  assert.deepEqual(waystarStatus(world, 10, 12, 10, 3), { level: 4, pyramidLevel: 4, clear: true, effect: 'hearthmend', effectIndex: 3, effectName: 'Hearthmend', range: 44 });
  world.setBlock(13, 9, 13, BLOCK.AIR); assert.equal(waystarPyramidLevel(world, 10, 12, 10), 2);
  world.setBlock(11, 11, 11, BLOCK.AIR); assert.equal(waystarPyramidLevel(world, 10, 12, 10), 0);
});

test('opaque overhead blocks suppress a beam while glass and water remain passable', () => {
  const world = new MemoryWorld(); buildPyramid(world, 2, 8, 2, 1);
  world.setBlock(2, 20, 2, BLOCK.GLASS); world.setBlock(2, 21, 2, BLOCK.WATER);
  assert.equal(waystarBeamClear(world, 2, 8, 2), true); assert.equal(waystarStatus(world, 2, 8, 2).level, 1);
  world.setBlock(2, 30, 2, BLOCK.STONE);
  assert.equal(waystarBeamClear(world, 2, 8, 2), false);
  assert.deepEqual(waystarStatus(world, 2, 8, 2), { level: 0, pyramidLevel: 1, clear: false, effect: null, effectIndex: 0, effectName: null, range: 0 });
});

test('saved selections sanitize, cycle only through unlocked effects, and remain bounded', () => {
  const malformed = Array.from({ length: MAX_WAYSTARS + 8 }, (_, index) => ({ x: index, y: 9, z: 0, effectIndex: index === 0 ? 99 : index % 4 }));
  malformed.push({ x: 'bad', y: 1, z: 1, effectIndex: 2 });
  const state = new WaystarState({ records: malformed }); assert.equal(state.entries().length, MAX_WAYSTARS);
  assert.equal(state.get(0, 9, 0).effectIndex, 3);
  const world = new MemoryWorld(); buildPyramid(world, 0, 9, 0, 3);
  const one = new WaystarState({ records: [{ x: 0, y: 9, z: 0, effectIndex: 3 }] });
  assert.equal(one.inspect(world, 0, 9, 0).effect, 'lumen_sight');
  assert.equal(one.cycle(world, 0, 9, 0).effect, 'windstep');
  assert.deepEqual(new WaystarState(one.serialize()).serialize(), one.serialize());
  world.setBlock(0, 9, 0, BLOCK.AIR); assert.deepEqual(one.restore(world), { active: 0, removed: 1 });
});

test('auras tick once per second, obey exact range, and stop when the beam is disabled', () => {
  const world = new MemoryWorld(); buildPyramid(world, 0, 10, 0, 2);
  const state = new WaystarState({ records: [{ x: 0, y: 10, z: 0, effectIndex: 1 }] }); const applications = [];
  assert.deepEqual(state.update(0.9, world, new THREE.Vector3(0.5, 10.5, 28.4), (...args) => applications.push(args)), []);
  const applied = state.update(0.2, world, new THREE.Vector3(0.5, 10.5, 28.4), (...args) => applications.push(args));
  assert.equal(applied.length, 1); assert.deepEqual(applications, [['stoneward', 2.5]]);
  state.update(1, world, new THREE.Vector3(0.5, 10.5, 28.6), (...args) => applications.push(args)); assert.equal(applications.length, 1);
  world.setBlock(0, 40, 0, BLOCK.STONE);
  state.update(1, world, new THREE.Vector3(0.5, 10.5, 0.5), (...args) => applications.push(args)); assert.equal(applications.length, 1);
});

test('Waystar has original atlas art, matching geometry, collision, held art, and disposable beams', () => {
  assert.equal(previewBoxes(BLOCK.WAYSTAR).length, 4); assert.equal(heldItemProfile(BLOCK.WAYSTAR).type, 'waystar');
  const atlas = createBlockAtlas(); const colors = new Set(); const tileX = 133 % ATLAS_COLUMNS; const tileY = Math.floor(133 / ATLAS_COLUMNS);
  for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) {
    const offset = ((tileY * TILE_SIZE + y) * atlas.image.width + tileX * TILE_SIZE + x) * 4;
    colors.add([...atlas.image.data.slice(offset, offset + 3)].join(','));
  }
  assert.ok(colors.size >= 4);
  const memory = new Map(); globalThis.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const voxelWorld = new VoxelWorld(new THREE.Scene(), 13300); const y = WORLD_HEIGHT - 5; voxelWorld.setBlock(8, y, 8, BLOCK.WAYSTAR);
  assert.deepEqual(voxelWorld.collisionBoxes(8, y, 8), [[0.06, 0, 0.06, 0.94, 0.9, 0.94]]);
  assert.ok(voxelWorld.buildGeometry(0, 0).getAttribute('position').count > 0);
  const world = new MemoryWorld(); buildPyramid(world, 0, 8, 0, 1); const state = new WaystarState(); state.ensure(0, 8, 0);
  const scene = new THREE.Scene(); const renderer = new WaystarRenderer(scene, world, state); renderer.sync(new THREE.Vector3());
  assert.equal(renderer.meshes.size, 1); world.setBlock(0, 20, 0, BLOCK.STONE); renderer.sync(new THREE.Vector3()); assert.equal(renderer.meshes.size, 0);
  atlas.dispose();
});
