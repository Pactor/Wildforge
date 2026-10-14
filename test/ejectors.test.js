import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { CircuitSystem, poweredVariant, ramCanMoveBlock } from '../src/circuits.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { EJECTOR_BLOCKS, ForgeEjectorState, ejectorBounds, ejectorDirection, ejectorIdForSupport, isForgeEjector } from '../src/ejectors.js';
import { blastProtected } from '../src/explosives.js';
import { FurnaceState } from '../src/furnace.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { placementPlan, previewBoxes } from '../src/placementPreview.js';
import { StorageState, containerKey, ejectorKey } from '../src/storage.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

class MemoryStorage { constructor() { this.values = new Map(); } getItem(key) { return this.values.get(key) ?? null; } setItem(key, value) { this.values.set(key, String(value)); } }
class MemoryWorld {
  constructor(entries = []) { this.blocks = new Map(entries); this.edits = new Map(entries); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); this.edits.set(this.key(x, y, z), id); return true; }
}
class MemoryDrops {
  constructor() { this.spawned = []; this.allow = true; }
  spawn(id, count, position, durability, enchantments, state) { const item = { id, count, position: position.toArray(), durability, enchantments, state }; if (this.allow) this.spawned.push(item); return this.allow ? item : null; }
}

test('Forge Ejector owns twelve canonical states and a complete table recipe', () => {
  assert.equal(EJECTOR_BLOCKS.length, 12); assert.deepEqual(EJECTOR_BLOCKS, Array.from({ length: 12 }, (_, index) => 299 + index));
  for (const id of EJECTOR_BLOCKS) { assert.equal(isForgeEjector(id), true); assert.equal(BLOCKS[id].forgeEjector, true); assert.deepEqual(blockDrops(id), ['forge_ejector']); assert.equal(ramCanMoveBlock(id), false); assert.equal(blastProtected(id), true); }
  const grid = [BLOCK.STONE, BLOCK.STONE, BLOCK.STONE, BLOCK.STONE, null, BLOCK.STONE, BLOCK.STONE, 'lumen_shard', BLOCK.STONE];
  assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'forge_ejector'); const inventory = new Inventory({ counts: [[BLOCK.STONE, 7], ['lumen_shard', 1]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'forge_ejector'), 'table'), true); assert.equal(inventory.count('forge_ejector'), 1);
});

test('clicked support faces select all six exact output directions', () => {
  const p = { x: 4, y: 5, z: 6 }; const cases = [
    [{ x: 4, y: 5, z: 5 }, BLOCK.FORGE_EJECTOR_N_OFF, [0, 0, -1]], [{ x: 5, y: 5, z: 6 }, BLOCK.FORGE_EJECTOR_E_OFF, [1, 0, 0]],
    [{ x: 4, y: 5, z: 7 }, BLOCK.FORGE_EJECTOR_S_OFF, [0, 0, 1]], [{ x: 3, y: 5, z: 6 }, BLOCK.FORGE_EJECTOR_W_OFF, [-1, 0, 0]],
    [{ x: 4, y: 6, z: 6 }, BLOCK.FORGE_EJECTOR_UP_OFF, [0, 1, 0]], [{ x: 4, y: 4, z: 6 }, BLOCK.FORGE_EJECTOR_DOWN_OFF, [0, -1, 0]],
  ];
  for (const [support, id, direction] of cases) { assert.equal(ejectorIdForSupport(p, support), id); assert.deepEqual(ejectorDirection(id), direction); assert.equal(poweredVariant(id, true), id + 6); }
  assert.equal(placementPlan('forge_ejector', p, 0, cases[4][0]).parts[0].id, BLOCK.FORGE_EJECTOR_UP_OFF);
});

test('Spark rising edges activate exactly once while held power does not repeat', () => {
  const world = new MemoryWorld([['0,1,0', BLOCK.SPARK_SWITCH_OFF], ['1,1,0', BLOCK.SUNWIRE_OFF], ['2,1,0', BLOCK.FORGE_EJECTOR_E_OFF]]);
  const storage = new StorageState(); storage.get(ejectorKey(2, 1, 0)).add(BLOCK.DIRT, 2); const drops = new MemoryDrops();
  const ejectors = new ForgeEjectorState(world, storage, new FurnaceState(), drops); ejectors.restore();
  const circuits = new CircuitSystem(world, { onStateChange: (point, oldId, newId) => { if (BLOCKS[newId]?.forgeEjector && BLOCKS[newId].powered && !BLOCKS[oldId]?.powered) ejectors.activate(point.x, point.y, point.z); } });
  circuits.toggleSwitch(0, 1, 0); assert.equal(drops.spawned.length, 1); assert.equal(storage.get(ejectorKey(2, 1, 0)).count(BLOCK.DIRT), 1);
  circuits.recomputeAround(1, 1, 0); assert.equal(drops.spawned.length, 1); circuits.toggleSwitch(0, 1, 0); circuits.toggleSwitch(0, 1, 0); assert.equal(drops.spawned.length, 2);
});

test('activation transfers metadata-safe items into front containers before physical ejection', () => {
  const world = new MemoryWorld([['0,1,0', BLOCK.FORGE_EJECTOR_E_OFF], ['1,1,0', BLOCK.CHEST]]); const storage = new StorageState(); const drops = new MemoryDrops();
  storage.get(ejectorKey(0, 1, 0)).addInstance('iron_pickaxe', 123, [{ id: 'keen', level: 2 }]); const state = new ForgeEjectorState(world, storage, new FurnaceState(), drops); state.restore();
  assert.equal(state.activate(0, 1, 0).type, 'transfer'); assert.equal(drops.spawned.length, 0); assert.deepEqual(storage.get(containerKey(1, 1, 0)).takeInstance('iron_pickaxe'), { id: 'iron_pickaxe', durability: 123, enchantments: [{ id: 'keen', level: 2 }] });
});

test('physical ejection preserves metadata, direction, and atomic saturation fallback', () => {
  const world = new MemoryWorld([['0,1,0', BLOCK.FORGE_EJECTOR_UP_OFF]]); const storage = new StorageState(); const drops = new MemoryDrops(); const source = storage.get(ejectorKey(0, 1, 0));
  source.addInstance('iron_pickaxe', 77, [{ id: 'enduring', level: 1 }]); const state = new ForgeEjectorState(world, storage, new FurnaceState(), drops); state.restore();
  const result = state.activate(0, 1, 0); assert.equal(result.type, 'eject'); assert.deepEqual(drops.spawned[0].state.velocity, [0, 4.2, 0]); assert.equal(drops.spawned[0].durability, 77);
  source.add(BLOCK.DIRT, 1); drops.allow = false; assert.equal(state.activate(0, 1, 0), null); assert.equal(source.count(BLOCK.DIRT), 1);
});

test('nine-slot state persists, sanitizes, and breaks contents exactly once', () => {
  const world = new MemoryWorld([['3,4,5', BLOCK.FORGE_EJECTOR_DOWN_OFF]]); const storage = new StorageState(); storage.get(ejectorKey(3, 4, 5)).add('coal', 4); storage.get(ejectorKey(9, 9, 9)).add(BLOCK.DIRT, 2);
  const state = new ForgeEjectorState(world, storage, new FurnaceState(), new MemoryDrops(), { records: [{ x: 3, y: 4, z: 5, pulse: 2_000_000 }, { x: 'bad', y: 0, z: 0 }] });
  const recovered = state.restore(); assert.equal(storage.capacityFor(ejectorKey(3, 4, 5)), 9); assert.equal(state.entries().length, 1); assert.equal(state.entries()[0].pulse, 1_000_000); assert.deepEqual(recovered.map(({ id, count }) => [id, count]), [[String(BLOCK.DIRT), 2]]);
  assert.deepEqual(state.blockChanged(3, 4, 5, BLOCK.FORGE_EJECTOR_DOWN_OFF, BLOCK.AIR).map(({ id, count }) => [id, count]), [['coal', 4]]); assert.deepEqual(state.blockChanged(3, 4, 5, BLOCK.FORGE_EJECTOR_DOWN_OFF, BLOCK.AIR), []);
});

test('eighteenth-row pixels, directional geometry, collision, preview, and held art agree', () => {
  assert.equal(heldItemProfile('forge_ejector').type, 'forgeEjector'); assert.deepEqual(previewBoxes(BLOCK.FORGE_EJECTOR_DOWN_OFF), ejectorBounds(BLOCK.FORGE_EJECTOR_DOWN_OFF));
  assert.notDeepEqual(ejectorBounds(BLOCK.FORGE_EJECTOR_N_OFF), ejectorBounds(BLOCK.FORGE_EJECTOR_UP_OFF)); const atlas = createBlockAtlas(); const colors = new Set(); const tileX = 136 % ATLAS_COLUMNS; const tileY = Math.floor(136 / ATLAS_COLUMNS);
  for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) { const offset = ((tileY * TILE_SIZE + y) * atlas.image.width + tileX * TILE_SIZE + x) * 4; colors.add([...atlas.image.data.slice(offset, offset + 3)].join(',')); }
  assert.ok(colors.size >= 4); globalThis.localStorage = new MemoryStorage(); const world = new VoxelWorld(new THREE.Scene(), 13600); const y = WORLD_HEIGHT - 4; world.setBlock(8, y, 8, BLOCK.FORGE_EJECTOR_UP_ON);
  assert.deepEqual(world.collisionBoxes(8, y, 8), [[0.04, 0.04, 0.04, 0.96, 0.96, 0.96]]); assert.ok(world.buildGeometry(0, 0).getAttribute('position').count > 0); atlas.dispose();
});
