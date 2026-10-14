import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, itemDefinition, RECIPES } from '../src/inventory.js';
import { previewBoxes } from '../src/placementPreview.js';
import { applySmithingUpgrade, availableSmithingUpgrades, SMITHING_UPGRADES, smithingUpgradeFor } from '../src/smithing.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

test('Forgeheart Anvil is a canonical high-ID workstation with a complete progression recipe', () => {
  assert.equal(BLOCK.FORGEHEART_ANVIL, 268);
  assert.equal(BLOCKS[BLOCK.FORGEHEART_ANVIL].forgeheartAnvil, true);
  assert.deepEqual(blockDrops(BLOCK.FORGEHEART_ANVIL), [BLOCK.FORGEHEART_ANVIL]);
  const grid = ['iron_ingot', 'emberite_ingot', 'iron_ingot', 'iron_ingot', 'lumen_shard', 'iron_ingot', BLOCK.STONE_SLAB, BLOCK.STONE_SLAB, BLOCK.STONE_SLAB];
  assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'forgeheart_anvil');
  const inventory = new Inventory({ counts: [['iron_ingot', 4], ['emberite_ingot', 1], ['lumen_shard', 1], [BLOCK.STONE_SLAB, 3]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'forgeheart_anvil'), 'table'), true);
  assert.equal(inventory.count(BLOCK.FORGEHEART_ANVIL), 1);
});

test('all nine Iron gear families ascend through Emberite into Voidglass without table bypasses', () => {
  assert.equal(SMITHING_UPGRADES.length, 18);
  for (const suffix of ['pickaxe', 'axe', 'shovel', 'sword', 'hoe', 'helmet', 'chestplate', 'leggings', 'boots']) {
    assert.equal(smithingUpgradeFor(`iron_${suffix}`).output, `emberite_${suffix}`);
    assert.equal(smithingUpgradeFor(`emberite_${suffix}`).output, `voidglass_${suffix}`);
    assert.equal(RECIPES.some(({ id }) => id === `emberite_${suffix}` || id === `voidglass_${suffix}`), false);
  }
});

test('smithing preserves exact wear ratio and every rune across both ascensions', () => {
  const ironMaximum = itemDefinition('iron_pickaxe').durability;
  const inventory = new Inventory({ counts: [['emberite_ingot', 1], ['voidglass_shard', 1]] });
  inventory.addInstance('iron_pickaxe', Math.round(ironMaximum * 0.4), [{ id: 'swiftwork', level: 2 }, { id: 'enduring', level: 1 }]);
  const emberite = applySmithingUpgrade(inventory, 'iron_pickaxe');
  assert.equal(emberite.output, 'emberite_pickaxe');
  assert.ok(Math.abs(inventory.durability('emberite_pickaxe').ratio - 0.4) < 0.01);
  assert.deepEqual(inventory.enchantments('emberite_pickaxe'), [{ id: 'swiftwork', level: 2 }, { id: 'enduring', level: 1 }]);
  const voidglass = applySmithingUpgrade(inventory, 'emberite_pickaxe');
  assert.equal(voidglass.output, 'voidglass_pickaxe');
  assert.ok(Math.abs(inventory.durability('voidglass_pickaxe').ratio - 0.4) < 0.01);
  assert.deepEqual(inventory.enchantments('voidglass_pickaxe'), emberite.enchantments);
});

test('smithing is atomic when material or eligible gear is missing and reports affordability', () => {
  const inventory = new Inventory(); inventory.addInstance('iron_sword', 111, [{ id: 'keen_edge', level: 1 }]);
  const before = inventory.serialize(); assert.equal(applySmithingUpgrade(inventory, 'iron_sword'), null);
  assert.deepEqual(inventory.serialize(), before);
  assert.deepEqual(availableSmithingUpgrades(inventory).map(({ input, affordable }) => [input, affordable]), [['iron_sword', false]]);
  inventory.add('emberite_ingot', 1);
  assert.equal(availableSmithingUpgrades(inventory)[0].affordable, true);
  assert.equal(applySmithingUpgrade(inventory, 'wooden_sword'), null);
});

test('Forgeheart Anvil has original atlas identity, authored geometry, partial collision, preview, and held art', () => {
  const atlas = createBlockAtlas(); const colors = new Set(); const tile = 119;
  const tileX = tile % ATLAS_COLUMNS; const tileY = Math.floor(tile / ATLAS_COLUMNS);
  for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) {
    const offset = ((tileY * TILE_SIZE + y) * atlas.image.width + tileX * TILE_SIZE + x) * 4;
    colors.add(`${atlas.image.data[offset]},${atlas.image.data[offset + 1]},${atlas.image.data[offset + 2]}`);
  }
  assert.ok(colors.size >= 4);
  const storage = new Map(); globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  const world = new VoxelWorld(new THREE.Scene(), 12300); const y = WORLD_HEIGHT - 2;
  world.setBlock(8, y, 8, BLOCK.FORGEHEART_ANVIL); const geometry = world.buildGeometry(0, 0);
  assert.ok(geometry.getAttribute('position').count > 36);
  assert.deepEqual(world.collisionBoxes(8, y, 8), [[0.12, 0, 0.12, 0.88, 0.14, 0.88], [0.32, 0.12, 0.24, 0.68, 0.86, 0.76]]);
  assert.equal(previewBoxes(BLOCK.FORGEHEART_ANVIL).length, 4);
  assert.equal(heldItemProfile(BLOCK.FORGEHEART_ANVIL).type, 'forgeheartAnvil');
  geometry.dispose(); atlas.dispose();
});
