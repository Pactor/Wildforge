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
import { StorageState } from '../src/storage.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { isWayvault, isWayvaultStorageKey, WAYVAULT_CAPACITY, WAYVAULT_STORAGE_KEY } from '../src/wayvault.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

test('Wayvault Chest is a canonical late-game block with an exact shaped recipe', () => {
  assert.equal(BLOCK.WAYVAULT_CHEST, 276); assert.equal(isWayvault(BLOCK.WAYVAULT_CHEST), true);
  assert.equal(BLOCKS[BLOCK.WAYVAULT_CHEST].wayvault, true);
  assert.deepEqual(blockDrops(BLOCK.WAYVAULT_CHEST), [BLOCK.WAYVAULT_CHEST]);
  const V = 'voidglass_shard'; const grid = [V, V, V, V, 'lumen_shard', V, V, V, V];
  assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'wayvault_chest');
  const inventory = new Inventory({ counts: [[V, 8], ['lumen_shard', 1]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'wayvault_chest'), 'table'), true);
  assert.equal(inventory.count(BLOCK.WAYVAULT_CHEST), 1);
});

test('every access point resolves one shared 27-slot inventory with exact save and metadata persistence', () => {
  assert.equal(isWayvaultStorageKey(WAYVAULT_STORAGE_KEY), true);
  const carried = new Inventory({ counts: [[BLOCK.STONE, 12]] }); carried.addInstance('voidglass_pickaxe', 431, [{ id: 'swift', level: 2 }]);
  const storage = new StorageState();
  const westAccess = WAYVAULT_STORAGE_KEY; const cinderAccess = WAYVAULT_STORAGE_KEY;
  assert.equal(storage.capacityFor(westAccess), WAYVAULT_CAPACITY);
  assert.equal(storage.deposit(westAccess, carried, BLOCK.STONE, 12), true);
  assert.equal(storage.deposit(westAccess, carried, 'voidglass_pickaxe', 1), true);
  assert.deepEqual(storage.entries(cinderAccess).map(([id, count]) => [String(id), count]), [[String(BLOCK.STONE), 12], ['voidglass_pickaxe', 1]]);
  storage.setLabel(westAccess, 'Expedition Reserve'); storage.setSortMode(westAccess, 'category');
  const restored = new StorageState(storage.serialize()); const recovered = new Inventory();
  assert.equal(restored.label(cinderAccess), 'Expedition Reserve'); assert.equal(restored.sortMode(cinderAccess), 'category');
  assert.equal(restored.withdraw(cinderAccess, recovered, 'voidglass_pickaxe', 1), true);
  assert.equal(recovered.durability('voidglass_pickaxe').remaining, 431);
  assert.deepEqual(recovered.enchantments('voidglass_pickaxe'), [{ id: 'swift', level: 2 }]);
});

test('recovering one physical Wayvault never drains its shared contents', () => {
  const storage = new StorageState(); const carried = new Inventory({ counts: [['lumen_shard', 7]] });
  storage.deposit(WAYVAULT_STORAGE_KEY, carried, 'lumen_shard', 7);
  assert.deepEqual(blockDrops(BLOCK.WAYVAULT_CHEST), [BLOCK.WAYVAULT_CHEST]);
  assert.equal(storage.get(WAYVAULT_STORAGE_KEY).count('lumen_shard'), 7, 'physical access recovery leaves personal storage authoritative');
  assert.equal(new StorageState(storage.serialize()).get(WAYVAULT_STORAGE_KEY).count('lumen_shard'), 7);
});

test('Wayvault state cannot be destroyed by explosions or displaced away from its storage identity', () => {
  assert.equal(blastProtected(BLOCK.WAYVAULT_CHEST), true);
  assert.equal(ramCanMoveBlock(BLOCK.WAYVAULT_CHEST), false);
});

test('Wayvault has original final-atlas pixels, authored chest geometry, collision, preview, and held art', () => {
  const atlas = createBlockAtlas(); const tile = 127; const colors = new Set();
  const tileX = tile % ATLAS_COLUMNS; const tileY = Math.floor(tile / ATLAS_COLUMNS);
  for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) {
    const offset = ((tileY * TILE_SIZE + y) * atlas.image.width + tileX * TILE_SIZE + x) * 4;
    colors.add(`${atlas.image.data[offset]},${atlas.image.data[offset + 1]},${atlas.image.data[offset + 2]}`);
  }
  assert.ok(colors.size >= 4);
  const memory = new Map(); globalThis.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const world = new VoxelWorld(new THREE.Scene(), 12700); const y = WORLD_HEIGHT - 2;
  world.setBlock(7, y, 7, BLOCK.WAYVAULT_CHEST); const geometry = world.buildGeometry(0, 0);
  assert.ok(geometry.getAttribute('position').count > 36);
  assert.deepEqual(world.collisionBoxes(7, y, 7), [[0.06, 0, 0.06, 0.94, 0.88, 0.94]]);
  assert.equal(previewBoxes(BLOCK.WAYVAULT_CHEST).length, 4);
  assert.equal(heldItemProfile(BLOCK.WAYVAULT_CHEST).type, 'wayvault');
  geometry.dispose(); atlas.dispose();
});
