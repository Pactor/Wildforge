import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { ramCanMoveBlock } from '../src/circuits.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { HearthsongRenderer, HearthsongState, MAX_HEARTHSONG_PLAYERS, SONGSTONES, SONGSTONE_IDS } from '../src/hearthsongs.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, itemDefinition, RECIPES } from '../src/inventory.js';
import { previewBoxes } from '../src/placementPreview.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

class MemoryStorage { constructor() { this.values = new Map(); } getItem(key) { return this.values.get(key) ?? null; } setItem(key, value) { this.values.set(key, String(value)); } }
class MemoryWorld {
  constructor(entries = []) { this.blocks = new Map(entries); this.edits = new Map(entries); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); this.edits.set(this.key(x, y, z), id); return true; }
}

test('Hearthsong Player and four Songstones have canonical progression identities', () => {
  assert.equal(BLOCK.HEARTHSONG_PLAYER, 293); assert.equal(BLOCKS[BLOCK.HEARTHSONG_PLAYER].hearthsongPlayer, true);
  assert.deepEqual(blockDrops(BLOCK.HEARTHSONG_PLAYER), [BLOCK.HEARTHSONG_PLAYER]); assert.equal(ramCanMoveBlock(BLOCK.HEARTHSONG_PLAYER), false);
  assert.equal(SONGSTONE_IDS.length, 4); SONGSTONE_IDS.forEach((id) => { assert.ok(itemDefinition(id)); assert.equal(itemDefinition(id).stackSize, 1); assert.equal(SONGSTONES[id].notes.length, 32); });
  const grid = [BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, 'echo_core', BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS];
  assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'hearthsong_player');
  const inventory = new Inventory({ counts: [[BLOCK.PLANKS, 8], ['echo_core', 1]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'hearthsong_player'), 'table'), true); assert.equal(inventory.count(BLOCK.HEARTHSONG_PLAYER), 1);
});

test('insert, pause, resume, completion, and ejection preserve exactly one Songstone', () => {
  const world = new MemoryWorld([['2,3,4', BLOCK.HEARTHSONG_PLAYER]]); const state = new HearthsongState();
  assert.equal(state.insert(world, 2, 3, 4, 'coal'), null);
  const inserted = state.insert(world, 2, 3, 4, 'songstone_trail'); assert.equal(inserted.playing, true); assert.equal(inserted.step, 0);
  assert.equal(state.insert(world, 2, 3, 4, 'songstone_sun'), null);
  assert.equal(state.toggle(2, 3, 4).playing, false); assert.equal(state.update(1, new THREE.Vector3(2.5, 3.5, 4.5)).length, 0);
  assert.equal(state.toggle(2, 3, 4).playing, true); assert.ok(state.update(0.01, new THREE.Vector3(2.5, 3.5, 4.5)).length > 0);
  for (let index = 0; index < 20; index += 1) state.update(1, new THREE.Vector3(2.5, 3.5, 4.5));
  assert.equal(state.get(2, 3, 4).playing, false);
  assert.equal(state.eject(2, 3, 4), 'songstone_trail'); assert.equal(state.eject(2, 3, 4), null); assert.equal(state.get(2, 3, 4).songstone, null);
});

test('playback is spatially bounded, melodic, and resumes from exact saved timing', () => {
  const world = new MemoryWorld([['0,5,0', BLOCK.HEARTHSONG_PLAYER]]); const state = new HearthsongState(); state.insert(world, 0, 5, 0, 'songstone_hollow');
  assert.equal(state.update(0.01, new THREE.Vector3(40, 5, 0)).length, 0); assert.equal(state.get(0, 5, 0).step, 1);
  state.get(0, 5, 0).timer = 0; const events = state.update(0.01, new THREE.Vector3(0.5, 5.5, 0.5));
  assert.equal(events.length, 1); assert.ok(events[0].frequency > 30); assert.equal(events[0].waveform, 'sine'); assert.equal(state.playingNear(new THREE.Vector3(0, 5, 0)), true);
  const restored = new HearthsongState(state.serialize()); assert.deepEqual(restored.serialize(), state.serialize());
  assert.equal(restored.playingNear(new THREE.Vector3(33, 5, 0)), false);
});

test('malformed and stale saves are bounded and recover inserted media only once', () => {
  const records = Array.from({ length: MAX_HEARTHSONG_PLAYERS + 9 }, (_, index) => ({ x: index, y: 4, z: 0, songstone: index === 0 ? 'invalid' : 'songstone_sun', playing: true, step: 999, timer: 999 }));
  records.push({ x: 'bad', y: 0, z: 0, songstone: 'songstone_trail' });
  const state = new HearthsongState({ records }); assert.equal(state.entries().length, MAX_HEARTHSONG_PLAYERS); assert.equal(state.get(0, 4, 0).songstone, null);
  const world = new MemoryWorld([['1,4,0', BLOCK.HEARTHSONG_PLAYER]]); const recovered = state.restore(world);
  assert.equal(state.entries().length, 1); assert.equal(recovered.length, MAX_HEARTHSONG_PLAYERS - 2); assert.ok(recovered.every(({ id }) => id === 'songstone_sun'));
  const broken = state.blockChanged(1, 4, 0, BLOCK.HEARTHSONG_PLAYER, BLOCK.AIR); assert.equal(broken.id, 'songstone_sun');
  assert.equal(state.blockChanged(1, 4, 0, BLOCK.HEARTHSONG_PLAYER, BLOCK.AIR), null);
});

test('all four Songstones have deterministic authored structure sources', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 76031);
  let ruin = null; for (let z = -16; z <= 16 && !ruin; z += 1) for (let x = -16; x <= 16 && !ruin; x += 1) ruin = world.ruinForCell(x, z);
  let hall = null; for (let z = -28; z <= 28 && !hall; z += 1) for (let x = -28; x <= 28 && !hall; x += 1) hall = world.sunstepPulseHallForCell(x, z);
  let vault = null; for (let z = -16; z <= 16 && !vault; z += 1) for (let x = -16; x <= 16 && !vault; x += 1) vault = world.echoVaultForCell(x, z);
  const watch = world.cinderwatchesNear(524288, 524288, 640)[0]; assert.ok(ruin && hall && vault && watch);
  const sources = [
    [world.ruinFeatures(ruin).chest, 'songstone_trail'], [world.sunstepPulseHallFeatures(hall).chest, 'songstone_sun'],
    [world.echoVaultFeatures(vault).chest, 'songstone_hollow'], [world.cinderwatchFeatures(watch).chest, 'songstone_cinder'],
  ];
  for (const [chest, id] of sources) assert.ok(world.generatedContainerLoot(chest.x, chest.y, chest.z).items.some((item) => item.id === id && item.count === 1));
});

test('original player pixels, geometry, collision, held art, and spinning renderer agree', () => {
  assert.equal(previewBoxes(BLOCK.HEARTHSONG_PLAYER).length, 4); assert.equal(heldItemProfile(BLOCK.HEARTHSONG_PLAYER).type, 'hearthsongPlayer');
  SONGSTONE_IDS.forEach((id) => assert.equal(heldItemProfile(id).type, 'songstone'));
  const atlas = createBlockAtlas(); const colors = new Set(); const tileX = 134 % ATLAS_COLUMNS; const tileY = Math.floor(134 / ATLAS_COLUMNS);
  for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) { const offset = ((tileY * TILE_SIZE + y) * atlas.image.width + tileX * TILE_SIZE + x) * 4; colors.add([...atlas.image.data.slice(offset, offset + 3)].join(',')); }
  assert.ok(colors.size >= 4);
  globalThis.localStorage = new MemoryStorage(); const voxelWorld = new VoxelWorld(new THREE.Scene(), 13400); const y = WORLD_HEIGHT - 4; voxelWorld.setBlock(8, y, 8, BLOCK.HEARTHSONG_PLAYER);
  assert.deepEqual(voxelWorld.collisionBoxes(8, y, 8), [[0.04, 0, 0.04, 0.96, 0.9, 0.96]]);
  const world = new MemoryWorld([['0,2,0', BLOCK.HEARTHSONG_PLAYER]]); const state = new HearthsongState(); state.insert(world, 0, 2, 0, 'songstone_cinder');
  const scene = new THREE.Scene(); const renderer = new HearthsongRenderer(scene, state); assert.equal(renderer.meshes.size, 1); const mesh = [...renderer.meshes.values()][0]; const before = mesh.rotation.y;
  renderer.update(1); assert.ok(mesh.rotation.y > before); state.eject(0, 2, 0); renderer.sync(); assert.equal(renderer.meshes.size, 0); atlas.dispose();
});
