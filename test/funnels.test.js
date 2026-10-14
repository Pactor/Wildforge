import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { ramCanMoveBlock } from '../src/circuits.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { ForgeFunnelState, FUNNEL_INTERVAL, funnelBounds, funnelIdForSupport, isForgeFunnel } from '../src/funnels.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { placementPlan, previewBoxes } from '../src/placementPreview.js';
import { StorageState, containerKey, funnelKey } from '../src/storage.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { FurnaceState } from '../src/furnace.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

class MemoryStorage { constructor() { this.values = new Map(); } getItem(key) { return this.values.get(key) ?? null; } setItem(key, value) { this.values.set(key, String(value)); } }
class MemoryWorld {
  constructor(entries = []) { this.blocks = new Map(entries); this.edits = new Map(entries); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); this.edits.set(this.key(x, y, z), id); }
}
class MemoryDrops {
  constructor(items = []) { this.items = items; this.removed = []; }
  remove(item) { this.items.splice(this.items.indexOf(item), 1); this.removed.push(item); }
}

test('Forge Funnel registry, canonical recipe, drop, and immovability agree', () => {
  assert.deepEqual([294, 295, 296, 297, 298], [BLOCK.FORGE_FUNNEL_DOWN, BLOCK.FORGE_FUNNEL_N, BLOCK.FORGE_FUNNEL_E, BLOCK.FORGE_FUNNEL_S, BLOCK.FORGE_FUNNEL_W]);
  for (const id of [294, 295, 296, 297, 298]) { assert.equal(isForgeFunnel(id), true); assert.equal(BLOCKS[id].forgeFunnel, true); assert.deepEqual(blockDrops(id), [BLOCK.FORGE_FUNNEL_DOWN]); }
  assert.equal(ramCanMoveBlock(BLOCK.FORGE_FUNNEL_DOWN), false);
  const grid = ['iron_ingot', null, 'iron_ingot', 'iron_ingot', BLOCK.CHEST, 'iron_ingot', null, 'iron_ingot', null];
  assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'forge_funnel');
  const inventory = new Inventory({ counts: [['iron_ingot', 5], [BLOCK.CHEST, 1]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'forge_funnel'), 'table'), true); assert.equal(inventory.count(BLOCK.FORGE_FUNNEL_DOWN), 1);
});

test('support-face placement selects all five output directions exactly', () => {
  const position = { x: 4, y: 5, z: 6 };
  assert.equal(funnelIdForSupport(position, { x: 4, y: 4, z: 6 }), BLOCK.FORGE_FUNNEL_DOWN);
  assert.equal(funnelIdForSupport(position, { x: 4, y: 6, z: 6 }), BLOCK.FORGE_FUNNEL_DOWN);
  assert.equal(funnelIdForSupport(position, { x: 3, y: 5, z: 6 }), BLOCK.FORGE_FUNNEL_W);
  assert.equal(funnelIdForSupport(position, { x: 5, y: 5, z: 6 }), BLOCK.FORGE_FUNNEL_E);
  assert.equal(funnelIdForSupport(position, { x: 4, y: 5, z: 5 }), BLOCK.FORGE_FUNNEL_N);
  assert.equal(funnelIdForSupport(position, { x: 4, y: 5, z: 7 }), BLOCK.FORGE_FUNNEL_S);
  assert.equal(placementPlan(BLOCK.FORGE_FUNNEL_DOWN, position, 0, { x: 5, y: 5, z: 6 }).parts[0].id, BLOCK.FORGE_FUNNEL_E);
});

test('five-slot Funnel moves one item per timed cycle between containers', () => {
  const world = new MemoryWorld([['0,0,0', BLOCK.CHEST], ['0,1,0', BLOCK.FORGE_FUNNEL_DOWN], ['0,2,0', BLOCK.CHEST]]);
  const storage = new StorageState(); storage.get(containerKey(0, 2, 0)).add(BLOCK.DIRT, 2);
  const state = new ForgeFunnelState(world, storage, new FurnaceState(), new MemoryDrops()); state.restore();
  assert.equal(storage.capacityFor(funnelKey(0, 1, 0)), 5);
  assert.deepEqual(state.update(FUNNEL_INTERVAL - 0.01), []);
  const events = state.update(0.01); assert.deepEqual(events.map(({ type }) => type), ['pull', 'push']);
  assert.equal(storage.get(containerKey(0, 0, 0)).count(BLOCK.DIRT), 1); assert.equal(storage.get(containerKey(0, 2, 0)).count(BLOCK.DIRT), 1);
  state.update(FUNNEL_INTERVAL); assert.equal(storage.get(containerKey(0, 0, 0)).count(BLOCK.DIRT), 2);
});

test('Funnel routes downward input, side fuel, and extracts furnace output', () => {
  const entries = [['0,1,0', BLOCK.FORGE_FUNNEL_DOWN], ['0,0,0', BLOCK.FURNACE], ['2,1,0', BLOCK.FORGE_FUNNEL_E], ['3,1,0', BLOCK.FURNACE], ['5,1,0', BLOCK.FORGE_FUNNEL_DOWN], ['5,2,0', BLOCK.FURNACE], ['5,0,0', BLOCK.CHEST]];
  const world = new MemoryWorld(entries); const storage = new StorageState(); const furnaces = new FurnaceState();
  storage.get(funnelKey(0, 1, 0)).add(BLOCK.IRON_ORE, 1); storage.get(funnelKey(2, 1, 0)).add('coal', 1);
  furnaces.get(containerKey(5, 2, 0)).output = { id: 'iron_ingot', count: 1 };
  const state = new ForgeFunnelState(world, storage, furnaces, new MemoryDrops()); state.restore(); state.update(FUNNEL_INTERVAL);
  assert.deepEqual(furnaces.get(containerKey(0, 0, 0)).input, { id: String(BLOCK.IRON_ORE), count: 1 });
  assert.deepEqual(furnaces.get(containerKey(3, 1, 0)).fuel, { id: 'coal', count: 1 });
  assert.equal(furnaces.get(containerKey(5, 2, 0)).output, null); assert.equal(storage.get(containerKey(5, 0, 0)).count('iron_ingot'), 1);
});

test('loose durable drops are collected with exact metadata', () => {
  const item = { id: 'iron_pickaxe', count: 1, durability: 117, enchantments: [{ id: 'keen', level: 2 }], mesh: { position: new THREE.Vector3(0.5, 1.9, 0.5) } };
  const world = new MemoryWorld([['0,1,0', BLOCK.FORGE_FUNNEL_DOWN]]); const storage = new StorageState(); const drops = new MemoryDrops([item]);
  const state = new ForgeFunnelState(world, storage, new FurnaceState(), drops); state.restore(); state.update(FUNNEL_INTERVAL);
  assert.equal(drops.items.length, 0); const stored = storage.get(funnelKey(0, 1, 0)).takeInstance('iron_pickaxe');
  assert.deepEqual(stored, { id: 'iron_pickaxe', durability: 117, enchantments: [{ id: 'keen', level: 2 }] });
});

test('saved Funnel records are bounded and stale contents recover once', () => {
  const world = new MemoryWorld([['1,2,3', BLOCK.FORGE_FUNNEL_DOWN]]); const storage = new StorageState(); storage.get(funnelKey(1, 2, 3)).add(BLOCK.DIRT, 2); storage.get(funnelKey(9, 9, 9)).add('coal', 3);
  const state = new ForgeFunnelState(world, storage, new FurnaceState(), new MemoryDrops(), { records: [{ x: 1, y: 2, z: 3, timer: 999 }, { x: 'bad', y: 0, z: 0 }] });
  const recovered = state.restore(); assert.equal(state.entries().length, 1); assert.deepEqual(recovered.map(({ id, count }) => [id, count]), [['coal', 3]]); assert.equal(state.serialize().records[0].timer, FUNNEL_INTERVAL);
  const broken = state.blockChanged(1, 2, 3, BLOCK.FORGE_FUNNEL_DOWN, BLOCK.AIR); assert.deepEqual(broken.map(({ id, count }) => [id, count]), [[String(BLOCK.DIRT), 2]]); assert.deepEqual(state.blockChanged(1, 2, 3, BLOCK.FORGE_FUNNEL_DOWN, BLOCK.AIR), []);
});

test('original pixels, hollow geometry, collision, preview, and held art agree', () => {
  assert.equal(heldItemProfile(BLOCK.FORGE_FUNNEL_DOWN).type, 'forgeFunnel'); assert.deepEqual(previewBoxes(BLOCK.FORGE_FUNNEL_E), funnelBounds(BLOCK.FORGE_FUNNEL_E));
  assert.equal(funnelBounds(BLOCK.FORGE_FUNNEL_DOWN).length, 7); assert.ok(!funnelBounds(BLOCK.FORGE_FUNNEL_DOWN).some(([x0, y0, z0, x1, y1, z1]) => x0 < 0.5 && x1 > 0.5 && z0 < 0.5 && z1 > 0.5 && y0 >= 0.7));
  const atlas = createBlockAtlas(); const colors = new Set(); const tileX = 135 % ATLAS_COLUMNS; const tileY = Math.floor(135 / ATLAS_COLUMNS);
  for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) { const offset = ((tileY * TILE_SIZE + y) * atlas.image.width + tileX * TILE_SIZE + x) * 4; colors.add([...atlas.image.data.slice(offset, offset + 3)].join(',')); }
  assert.ok(colors.size >= 4); globalThis.localStorage = new MemoryStorage(); const voxelWorld = new VoxelWorld(new THREE.Scene(), 13500); const y = WORLD_HEIGHT - 4; voxelWorld.setBlock(8, y, 8, BLOCK.FORGE_FUNNEL_W);
  assert.deepEqual(voxelWorld.collisionBoxes(8, y, 8), funnelBounds(BLOCK.FORGE_FUNNEL_W)); assert.ok(voxelWorld.buildGeometry(0, 0).getAttribute('position').count > 0); atlas.dispose();
});
