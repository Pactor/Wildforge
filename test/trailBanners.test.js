import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { placementPlan, previewBoxes } from '../src/placementPreview.js';
import { detachUnsupportedTrailBanner, isTrailBanner, MAX_TRAIL_BANNERS, TRAIL_BANNER_BLOCKS, TRAIL_BANNER_EMBLEMS, TrailBannerRenderer, TrailBannerState, trailBannerFacingForYaw } from '../src/trailBanners.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

class MockWorld {
  constructor() { this.blocks = new Map(); this.edits = this.blocks; }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { id === BLOCK.AIR ? this.blocks.delete(this.key(x, y, z)) : this.blocks.set(this.key(x, y, z), id); return 1; }
}

test('five original Trail Banner palettes occupy expanded IDs and craft from matching Mossweave', () => {
  assert.deepEqual(TRAIL_BANNER_BLOCKS, [257, 258, 259, 260, 261]);
  const weave = [BLOCK.MOSSWEAVE_NATURAL, BLOCK.MOSSWEAVE_SUN, BLOCK.MOSSWEAVE_EMBER, BLOCK.MOSSWEAVE_FROST, BLOCK.MOSSWEAVE_HOLLOW];
  const names = ['natural', 'sun', 'ember', 'frost', 'hollow'];
  TRAIL_BANNER_BLOCKS.forEach((id, index) => {
    assert.equal(isTrailBanner(id), true); assert.equal(BLOCKS[id].bannerPalette, names[index]);
    assert.deepEqual(blockDrops(id), [id]); assert.equal(heldItemProfile(id).type, 'banner');
    const inventory = new Inventory({ counts: [[weave[index], 6], ['stick', 1]] });
    assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === `${names[index]}_trail_banner`), 'table'), true);
    assert.equal(inventory.count(id), 1);
  });
  const grid = Array(6).fill(BLOCK.MOSSWEAVE_NATURAL).concat([null, 'stick', null]);
  assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'natural_trail_banner');
});

test('banner facing, rotation, emblem choice, and restoration are exact and deterministic', () => {
  assert.deepEqual([0, -Math.PI / 2, Math.PI, Math.PI / 2].map(trailBannerFacingForYaw), [0, 1, 2, 3]);
  const state = new TrailBannerState(); const placed = state.ensure(2.8, 5.2, -3.1, -Math.PI / 2);
  assert.equal(placed.facing, 1); assert.equal(placed.emblem, 0);
  assert.equal(state.rotate(2, 5, -4).facing, 2);
  for (let index = 0; index < TRAIL_BANNER_EMBLEMS.length + 1; index += 1) state.cycleEmblem(2, 5, -4);
  assert.equal(state.get(2, 5, -4).emblem, 1);
  const restored = new TrailBannerState(state.serialize());
  assert.deepEqual(restored.serialize(), state.serialize());
});

test('malformed banner saves are sanitized, bounded, and stale records cannot survive', () => {
  const records = Array.from({ length: MAX_TRAIL_BANNERS + 20 }, (_, x) => ({ x, y: 4, z: 0, facing: x % 4, emblem: x % 4 }));
  records.unshift({ x: Number.NaN, y: 1, z: 2, facing: 99, emblem: -2 });
  const state = new TrailBannerState({ records });
  assert.ok(state.entries().length <= MAX_TRAIL_BANNERS);
  const invalid = new TrailBannerState({ records: [{ x: 1, y: 2, z: 3, facing: 99, emblem: -2 }] });
  assert.deepEqual(invalid.get(1, 2, 3), { x: 1, y: 2, z: 3, facing: 0, emblem: 0 });
  assert.equal(invalid.recoverStale(new MockWorld()), 1); assert.equal(invalid.entries().length, 0);
});

test('support loss detaches one exact palette and cannot duplicate its recovery', () => {
  const world = new MockWorld(); world.setBlock(4, 3, 2, BLOCK.STONE); world.setBlock(4, 4, 2, BLOCK.TRAIL_BANNER_HOLLOW);
  assert.equal(detachUnsupportedTrailBanner(world, 4, 3, 2), null);
  world.setBlock(4, 3, 2, BLOCK.AIR);
  assert.deepEqual(detachUnsupportedTrailBanner(world, 4, 3, 2), { x: 4, y: 4, z: 2, id: BLOCK.TRAIL_BANNER_HOLLOW });
  assert.equal(detachUnsupportedTrailBanner(world, 4, 3, 2), null);
});

test('Trail Banners are non-colliding authored markers with previews, pole geometry, and emblem cloth', () => {
  const storage = new Map(); globalThis.localStorage = { getItem(key) { return storage.get(key) ?? null; }, setItem(key, value) { storage.set(key, value); } };
  const world = new VoxelWorld(new THREE.Scene(), 11919); const y = WORLD_HEIGHT - 2;
  world.setBlock(8, y, 8, BLOCK.TRAIL_BANNER_EMBER);
  assert.deepEqual(world.collisionBoxes(8, y, 8), []);
  assert.equal(previewBoxes(BLOCK.TRAIL_BANNER_EMBER).length, 3);
  assert.equal(placementPlan(BLOCK.TRAIL_BANNER_EMBER, { x: 8, y, z: 8 }, 0).kind, 'trailBanner');
  const geometry = world.buildGeometry(0, 0); assert.ok(geometry.getAttribute('position').count > 0);
  const state = new TrailBannerState({ records: [{ x: 8, y, z: 8, facing: 3, emblem: 3 }] });
  const renderer = new TrailBannerRenderer(new THREE.Scene(), world, state);
  assert.equal(renderer.meshes.size, 1);
  const model = [...renderer.meshes.values()][0];
  assert.match(model.name, /hollow-eye · W$/); assert.ok(model.children.length >= 7);
  geometry.dispose();
});
