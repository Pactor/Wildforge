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
import { barrelKey, CHEST_CAPACITY, containerKey, isBarrelKey, slotsUsed, StorageState } from '../src/storage.js';
import { ATLAS_COLUMNS, ATLAS_ROWS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

test('Trailbarrel is a canonical six-plank two-slab storage recipe', () => {
  assert.equal(BLOCK.TRAILBARREL, 286); assert.equal(BLOCKS[BLOCK.TRAILBARREL].storageContainer, 'barrel');
  assert.deepEqual(blockDrops(BLOCK.TRAILBARREL), [BLOCK.TRAILBARREL]);
  const grid = [BLOCK.PLANKS, BLOCK.WOOD_SLAB, BLOCK.PLANKS, BLOCK.PLANKS, null, BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.WOOD_SLAB, BLOCK.PLANKS];
  assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'trailbarrel');
  const inventory = new Inventory({ counts: [[BLOCK.PLANKS, 6], [BLOCK.WOOD_SLAB, 2]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'trailbarrel'), 'table'), true);
  assert.equal(inventory.count(BLOCK.TRAILBARREL), 1);
});

test('Trailbarrel keys are coordinate-stable, namespaced, and cannot alias chest data', () => {
  assert.equal(barrelKey(4.9, 8.2, -3.1), 'barrel:4,8,-4'); assert.equal(isBarrelKey('barrel:4,8,-4'), true);
  assert.notEqual(barrelKey(4, 8, -4), containerKey(4, 8, -4)); assert.equal(isBarrelKey(containerKey(4, 8, -4)), false);
  const storage = new StorageState(); const carried = new Inventory({ counts: [[BLOCK.STONE, 5], [BLOCK.WOOD, 6]] });
  storage.deposit(containerKey(4, 8, -4), carried, BLOCK.STONE, 5);
  storage.deposit(barrelKey(4, 8, -4), carried, BLOCK.WOOD, 6);
  assert.equal(storage.get(containerKey(4, 8, -4)).count(BLOCK.WOOD), 0);
  assert.equal(storage.get(barrelKey(4, 8, -4)).count(BLOCK.STONE), 0);
});

test('Trailbarrels persist 27 slots, labels, sorting, wear, and runes, then drain once', () => {
  const key = barrelKey(2, 3, 4); const storage = new StorageState();
  const carried = new Inventory({ counts: [['iron_pickaxe', 1]], durability: [['iron_pickaxe', [199]]], enchantments: [['iron_pickaxe', [[{ id: 'swiftwork', level: 2 }]]]] });
  assert.equal(storage.deposit(key, carried, 'iron_pickaxe', 1), true);
  storage.setLabel(key, 'Trail Tools'); storage.setSortMode(key, 'category');
  const restored = new StorageState(storage.serialize());
  assert.equal(restored.capacityFor(key), CHEST_CAPACITY); assert.equal(slotsUsed(restored.get(key)), 1);
  assert.equal(restored.label(key), 'Trail Tools'); assert.equal(restored.sortMode(key), 'category');
  const drained = restored.drainItems(key);
  assert.equal(drained[0].durability, 199); assert.deepEqual(drained[0].enchantments, [{ id: 'swiftwork', level: 2 }]);
  assert.deepEqual(restored.drainItems(key), []);
});

test('Trailbarrel container identity is blast protected and Ram immovable', () => {
  assert.equal(blastProtected(BLOCK.TRAILBARREL), true); assert.equal(ramCanMoveBlock(BLOCK.TRAILBARREL), false);
  assert.equal(BLOCKS[BLOCK.TRAILBARREL].model, 'trailbarrel');
  assert.equal(previewBoxes(BLOCK.TRAILBARREL).length, 5); assert.equal(heldItemProfile(BLOCK.TRAILBARREL).type, 'trailbarrel');
});

test('Trailbarrel has original seventeenth-row pixels and matching inset world collision', () => {
  const atlas = createBlockAtlas(); assert.ok(ATLAS_ROWS >= 17); const colors = new Set();
  const tileX = 131 % ATLAS_COLUMNS; const tileY = Math.floor(131 / ATLAS_COLUMNS);
  for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) {
    const offset = ((tileY * TILE_SIZE + y) * atlas.image.width + tileX * TILE_SIZE + x) * 4;
    colors.add(`${atlas.image.data[offset]},${atlas.image.data[offset + 1]},${atlas.image.data[offset + 2]}`);
  }
  assert.ok(colors.size >= 4);
  const memory = new Map(); globalThis.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const world = new VoxelWorld(new THREE.Scene(), 13000); const y = WORLD_HEIGHT - 2;
  world.setBlock(7, y, 7, BLOCK.TRAILBARREL);
  assert.deepEqual(world.collisionBoxes(7, y, 7), [[0.06, 0, 0.06, 0.94, 0.94, 0.94]]);
  const geometry = world.buildGeometry(0, 0); assert.ok(geometry.getAttribute('position').count > 36);
  geometry.dispose(); atlas.dispose();
});
