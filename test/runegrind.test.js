import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { ExperienceState } from '../src/experience.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { previewBoxes } from '../src/placementPreview.js';
import { applyRunegrind, MAX_RUNEGRIND_EXPERIENCE, runegrindEligible, runegrindValue } from '../src/runegrind.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

test('Runegrind Wheel is a canonical high-ID workstation with a complete shaped recipe', () => {
  assert.equal(BLOCK.RUNEGRIND_WHEEL, 269); assert.equal(BLOCKS[BLOCK.RUNEGRIND_WHEEL].runegrindWheel, true);
  assert.deepEqual(blockDrops(BLOCK.RUNEGRIND_WHEEL), [BLOCK.RUNEGRIND_WHEEL]);
  const grid = ['stick', BLOCK.STONE_SLAB, 'stick', BLOCK.PLANKS, null, BLOCK.PLANKS, null, null, null];
  assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'runegrind_wheel');
  const inventory = new Inventory({ counts: [['stick', 2], [BLOCK.STONE_SLAB, 1], [BLOCK.PLANKS, 2]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'runegrind_wheel'), 'table'), true);
  assert.equal(inventory.count(BLOCK.RUNEGRIND_WHEEL), 1);
});

test('rune recovery is deterministic, level-based, and hard capped', () => {
  assert.equal(runegrindValue([{ id: 'keen', level: 1 }, { id: 'enduring', level: 3 }]), 8);
  assert.equal(runegrindValue(Array.from({ length: 20 }, () => ({ id: 'swift', level: 3 }))), MAX_RUNEGRIND_EXPERIENCE);
  assert.equal(runegrindValue(null), 0);
});

test('grinding preserves exact item condition, removes all runes, and awards bounded experience once', () => {
  const inventory = new Inventory(); const experience = new ExperienceState();
  inventory.addInstance('iron_pickaxe', 117, [{ id: 'swift', level: 3 }, { id: 'enduring', level: 2 }]);
  const result = applyRunegrind(inventory, experience, 'iron_pickaxe');
  assert.equal(result.experience, 10); assert.equal(result.durability, 117);
  assert.equal(inventory.durability('iron_pickaxe').remaining, 117);
  assert.deepEqual(inventory.enchantments('iron_pickaxe'), []);
  assert.equal(experience.currentPoints(), 10);
  const after = inventory.serialize(); assert.equal(applyRunegrind(inventory, experience, 'iron_pickaxe'), null);
  assert.deepEqual(inventory.serialize(), after); assert.equal(experience.currentPoints(), 10);
});

test('only the first real enchanted instance is cleansed and ineligible inventory is never mutated', () => {
  const inventory = new Inventory(); const experience = new ExperienceState();
  inventory.addInstance('iron_sword', 90, [{ id: 'keen', level: 2 }]);
  inventory.addInstance('iron_sword', 170, [{ id: 'enduring', level: 1 }]);
  inventory.addInstance('stone_shovel', 80, []);
  assert.deepEqual(runegrindEligible(inventory).map(({ id, experience: value }) => [id, value]), [['iron_sword', 4]]);
  applyRunegrind(inventory, experience, 'iron_sword');
  assert.equal(inventory.count('iron_sword'), 2);
  assert.deepEqual(inventory.enchantments('iron_sword'), [{ id: 'enduring', level: 1 }]);
  const before = inventory.serialize(); assert.equal(applyRunegrind(inventory, experience, 'stone_shovel'), null);
  assert.deepEqual(inventory.serialize(), before);
});

test('Runegrind Wheel has original atlas identity, authored geometry, partial collision, preview, and held art', () => {
  const atlas = createBlockAtlas(); const colors = new Set(); const tile = 120;
  const tileX = tile % ATLAS_COLUMNS; const tileY = Math.floor(tile / ATLAS_COLUMNS);
  for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) {
    const offset = ((tileY * TILE_SIZE + y) * atlas.image.width + tileX * TILE_SIZE + x) * 4;
    colors.add(`${atlas.image.data[offset]},${atlas.image.data[offset + 1]},${atlas.image.data[offset + 2]}`);
  }
  assert.ok(colors.size >= 4);
  const storage = new Map(); globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  const world = new VoxelWorld(new THREE.Scene(), 12400); const y = WORLD_HEIGHT - 2;
  world.setBlock(8, y, 8, BLOCK.RUNEGRIND_WHEEL); const geometry = world.buildGeometry(0, 0);
  assert.ok(geometry.getAttribute('position').count > 36);
  assert.deepEqual(world.collisionBoxes(8, y, 8), [[0.08, 0, 0.18, 0.92, 0.12, 0.82], [0.12, 0.1, 0.3, 0.26, 0.92, 0.7], [0.74, 0.1, 0.3, 0.88, 0.92, 0.7], [0.3, 0.28, 0.38, 0.7, 0.9, 0.62]]);
  assert.equal(previewBoxes(BLOCK.RUNEGRIND_WHEEL).length, 6);
  assert.equal(heldItemProfile(BLOCK.RUNEGRIND_WHEEL).type, 'runegrindWheel');
  geometry.dispose(); atlas.dispose();
});
