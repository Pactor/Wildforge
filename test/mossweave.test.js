import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { footstepSurface, FOOTSTEP_PRESETS } from '../src/audio.js';
import { BLOCK, BLOCKS, blockTexture } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { Inventory, RECIPES, blockDrops } from '../src/inventory.js';
import { breakDuration } from '../src/mining.js';
import { detachUnsupportedMossweaveCarpet, isMossweave, isMossweaveCarpet, mossweaveFamily, MOSSWEAVE_BLOCKS, MOSSWEAVE_CARPETS, MOSSWEAVE_PALETTES } from '../src/mossweave.js';
import { previewBoxes } from '../src/placementPreview.js';
import { createBlockAtlas, ATLAS_COLUMNS, ATLAS_ROWS, TILE_SIZE } from '../src/textures.js';
import { lightPasses } from '../src/voxelLighting.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

class MockWorld {
  constructor() { this.blocks = new Map(); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { id === BLOCK.AIR ? this.blocks.delete(this.key(x, y, z)) : this.blocks.set(this.key(x, y, z), id); return 1; }
}

test('Mossweave exposes five exact regional full-block and carpet families with canonical recovery', () => {
  assert.deepEqual(MOSSWEAVE_PALETTES, ['natural', 'sun', 'ember', 'frost', 'hollow']);
  assert.equal(MOSSWEAVE_BLOCKS.length, 5); assert.equal(MOSSWEAVE_CARPETS.length, 5);
  const textures = new Set();
  for (const palette of MOSSWEAVE_PALETTES) {
    const family = mossweaveFamily(palette);
    assert.equal(isMossweave(family.block), true); assert.equal(isMossweaveCarpet(family.carpet), true);
    assert.equal(BLOCKS[family.block].material, 'cloth'); assert.equal(BLOCKS[family.carpet].material, 'cloth');
    assert.deepEqual(blockDrops(family.block), [family.block]); assert.deepEqual(blockDrops(family.carpet), [family.carpet]);
    assert.equal(blockTexture(family.block), blockTexture(family.carpet)); textures.add(blockTexture(family.block));
  }
  assert.equal(textures.size, 5);
  assert.equal(mossweaveFamily('missing'), null);
});

test('renewable Mosswool dyes into all palettes and every family crafts three matching carpets', () => {
  assert.equal(matchCraftingRecipe(['mosswool', 'mosswool', 'mosswool', 'mosswool'], 2, 'hand').id, 'natural_mossweave');
  const source = new Inventory({ counts: [['mosswool', 4]] });
  assert.equal(source.craft(RECIPES.find(({ id }) => id === 'natural_mossweave'), 'hand'), true);
  assert.equal(source.count(BLOCK.MOSSWEAVE_NATURAL), 1);
  const dyeRecipes = [
    ['sun_mossweave', 'sunpetal_dye', BLOCK.MOSSWEAVE_SUN], ['ember_mossweave', 'ember_dye', BLOCK.MOSSWEAVE_EMBER],
    ['frost_mossweave', 'snow_clump', BLOCK.MOSSWEAVE_FROST],
  ];
  for (const [recipeId, dye, output] of dyeRecipes) {
    const inventory = new Inventory({ counts: [[BLOCK.MOSSWEAVE_NATURAL, 1], [dye, 1]] });
    assert.equal(inventory.craft(RECIPES.find(({ id }) => id === recipeId), 'hand'), true);
    assert.equal(inventory.count(output), 1);
  }
  const hollow = new Inventory({ counts: [[BLOCK.MOSSWEAVE_NATURAL, 1], ['shadow_shard', 1], ['lumen_spore', 1]] });
  assert.equal(hollow.craft(RECIPES.find(({ id }) => id === 'hollow_mossweave'), 'table'), true);
  assert.equal(hollow.count(BLOCK.MOSSWEAVE_HOLLOW), 1);
  for (let index = 0; index < 5; index += 1) {
    const recipe = RECIPES.find(({ id }) => id === `${MOSSWEAVE_PALETTES[index]}_mossweave_carpet`);
    const inventory = new Inventory({ counts: [[MOSSWEAVE_BLOCKS[index], 2]] });
    assert.equal(inventory.craft(recipe, 'hand'), true); assert.equal(inventory.count(MOSSWEAVE_CARPETS[index]), 3);
  }
});

test('Mossweave carpets detach from lost support exactly once while retaining their palette', () => {
  for (const carpet of MOSSWEAVE_CARPETS) {
    const world = new MockWorld(); world.setBlock(3, 5, 2, BLOCK.STONE); world.setBlock(3, 6, 2, carpet);
    assert.equal(detachUnsupportedMossweaveCarpet(world, 3, 5, 2), null);
    world.setBlock(3, 5, 2, BLOCK.AIR);
    assert.deepEqual(detachUnsupportedMossweaveCarpet(world, 3, 5, 2), { x: 3, y: 6, z: 2, id: carpet });
    assert.equal(detachUnsupportedMossweaveCarpet(world, 3, 5, 2), null);
  }
});

test('carpets use true one-sixteenth collision, matching previews and authored held rugs without blocking light', () => {
  for (const carpet of MOSSWEAVE_CARPETS) {
    assert.deepEqual(previewBoxes(carpet), [[0, 0, 0, 1, 0.0625, 1]]);
    assert.equal(heldItemProfile(carpet).type, 'carpet');
    assert.equal(lightPasses(carpet), true);
    assert.equal(footstepSurface(carpet), 'cloth');
  }
  assert.ok(FOOTSTEP_PRESETS.cloth);
  const inventory = new Inventory({ counts: [['moss_shears', 1], [BLOCK.MOSSWEAVE_NATURAL, 1]] });
  assert.ok(breakDuration(BLOCK.MOSSWEAVE_NATURAL, inventory, 'moss_shears') < breakDuration(BLOCK.MOSSWEAVE_NATURAL, inventory, null));
});

test('expanded atlas carries five original woven pixel palettes and carpet geometry stays visibly thin', () => {
  const atlas = createBlockAtlas();
  assert.equal(atlas.image.width, TILE_SIZE * ATLAS_COLUMNS); assert.equal(atlas.image.height, TILE_SIZE * ATLAS_ROWS);
  const signatures = new Set();
  for (const tile of [111, 112, 113, 114, 115]) {
    const tileX = tile % ATLAS_COLUMNS; const tileY = Math.floor(tile / ATLAS_COLUMNS);
    const offset = ((tileY * TILE_SIZE + 8) * atlas.image.width + tileX * TILE_SIZE + 8) * 4;
    signatures.add([...atlas.image.data.slice(offset, offset + 3)].join(','));
  }
  assert.equal(signatures.size, 5);
  const storage = new Map(); globalThis.localStorage = { getItem(key) { return storage.get(key) ?? null; }, setItem(key, value) { storage.set(key, value); } };
  const world = new VoxelWorld(new THREE.Scene(), 11717); const y = WORLD_HEIGHT - 2;
  world.setBlock(8, y, 8, BLOCK.MOSSWEAVE_CARPET_HOLLOW);
  assert.deepEqual(world.collisionBoxes(8, y, 8), [[0, 0, 0, 1, 0.0625, 1]]);
  const geometry = world.buildGeometry(0, 0); const positions = geometry.getAttribute('position');
  let maximum = 0; for (let index = 1; index < positions.count * 3; index += 3) maximum = Math.max(maximum, positions.array[index]);
  assert.ok(maximum >= y && maximum <= y + 0.063);
  geometry.dispose(); atlas.dispose();
});
