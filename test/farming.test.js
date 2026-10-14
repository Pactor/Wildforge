import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { cropBlock, cropGrowthTime, cropPlantingAllowed, cropSeedItem, cropSubstrateAllowed, FarmingState } from '../src/farming.js';
import { ATLAS_COLUMNS, ATLAS_ROWS, createBlockAtlas, TILE_SIZE, tileUVs } from '../src/textures.js';

test('tilled soil hydrates near water, accelerates crops, and persists', () => {
  const farming = new FarmingState(null, 77);
  assert.equal(farming.till(1, 1, 3), true);
  assert.equal(farming.plant(1, 2, 3), true);
  assert.equal(farming.plant(1, 2, 3), false);
  const grown = [];
  const soilChanges = [];
  farming.update(50, (x, y, z, block) => grown.push({ x, y, z, block }), {
    isHydrated: () => true,
    onSoilChange: (x, y, z, hydrated) => soilChanges.push({ x, y, z, hydrated }),
  });
  assert.deepEqual(grown, [{ x: 1, y: 2, z: 3, block: BLOCK.WHEAT_1 }]);
  assert.deepEqual(soilChanges, [{ x: 1, y: 1, z: 3, hydrated: true }]);
  assert.equal(farming.soilEntries()[0].block, BLOCK.HYDRATED_FARMLAND);
  const restored = new FarmingState(farming.serialize(), 77);
  assert.equal(restored.entries()[0].stage, 1);
  assert.equal(restored.soilEntries()[0].hydrated, true);
  assert.equal(restored.remove(1, 2, 3), true);
});

test('crop timing is deterministic while dry empty farmland eventually returns to dirt', () => {
  assert.equal(cropGrowthTime(2, 3, 4, 0, 99), cropGrowthTime(2, 3, 4, 0, 99));
  const wet = new FarmingState(null, 99);
  const dry = new FarmingState(null, 99);
  for (const state of [wet, dry]) {
    state.till(2, 2, 4);
    state.plant(2, 3, 4);
  }
  wet.update(50, null, { isHydrated: () => true });
  dry.update(50, null, { isHydrated: () => false });
  assert.equal(wet.entries()[0].stage, 1);
  assert.equal(dry.entries()[0].stage, 0);

  const empty = new FarmingState();
  empty.till(8, 2, 8);
  const dried = [];
  empty.update(121, null, { isHydrated: () => false, onDry: (...position) => dried.push(position) });
  assert.deepEqual(dried, [[8, 2, 8]]);
  assert.equal(empty.soilEntries().length, 0);
});

test('legacy crop-only saves reconstruct their supporting farmland', () => {
  const restored = new FarmingState({ crops: [['4,6,7', { stage: 2, elapsed: 9 }]] }, 12);
  assert.deepEqual(restored.soilEntries()[0], { x: 4, y: 5, z: 7, hydrated: false, block: BLOCK.FARMLAND });
});

test('Amberroot uses its own four-stage blocks, seed item, growth, and persisted crop type', () => {
  const farming = new FarmingState(null, 404);
  farming.till(5, 2, 5);
  assert.equal(farming.plant(5, 3, 5, 'amberroot'), true);
  assert.equal(cropBlock('amberroot', 0), BLOCK.AMBERROOT_0);
  assert.equal(cropBlock('amberroot', 3), BLOCK.AMBERROOT_3);
  assert.equal(cropSeedItem('amberroot'), 'amberroot_seed');
  const grown = [];
  farming.update(50, (x, y, z, block, stage, type) => grown.push({ block, stage, type }), { isHydrated: () => true });
  assert.deepEqual(grown, [{ block: BLOCK.AMBERROOT_1, stage: 1, type: 'amberroot' }]);
  const restored = new FarmingState(farming.serialize(), 404);
  assert.equal(restored.entries()[0].type, 'amberroot');
  assert.equal(restored.entries()[0].block, BLOCK.AMBERROOT_1);
  assert.equal(restored.plant(6, 3, 5, 'not-a-crop'), false);
});

test('blocked light pauses growth while Rich Compost advances one crop stage', () => {
  const farming = new FarmingState(null, 505);
  farming.till(2, 2, 2);
  farming.plant(2, 3, 2, 'wheat');
  farming.update(100, null, { isHydrated: () => true, hasLight: () => false });
  assert.equal(farming.entries()[0].stage, 0);
  assert.deepEqual(farming.fertilize(2, 3, 2), { type: 'wheat', stage: 1, block: BLOCK.WHEAT_1 });
  assert.equal(farming.entries()[0].stage, 1);
  assert.equal(farming.fertilize(9, 9, 9), null);
  farming.fertilize(2, 3, 2, 9);
  assert.equal(farming.entries()[0].stage, 3);
  assert.equal(farming.fertilize(2, 3, 2), null);
});

test('environment multipliers let rain help crops while violent storms slow them', () => {
  const rain = new FarmingState(null, 606);
  const storm = new FarmingState(null, 606);
  for (const state of [rain, storm]) {
    state.till(1, 1, 1);
    state.plant(1, 2, 1);
  }
  rain.update(40, null, { isHydrated: () => true, growthMultiplier: 1.16 });
  storm.update(40, null, { isHydrated: () => true, growthMultiplier: 0.6 });
  assert.equal(rain.entries()[0].stage, 1);
  assert.equal(storm.entries()[0].stage, 0);
});

test('Rimepods plant and grow only in snowy highlands with distinct persistent stages', () => {
  assert.equal(cropPlantingAllowed('rimepod', 'snowy_highlands'), true);
  assert.equal(cropPlantingAllowed('rimepod', 'plains'), false);
  assert.equal(cropPlantingAllowed('wheat', 'desert'), true);
  const farming = new FarmingState(null, 707);
  farming.till(4, 2, 4);
  assert.equal(farming.plant(4, 3, 4, 'rimepod', { biomeId: 'plains' }), false);
  assert.equal(farming.plant(4, 3, 4, 'rimepod', { biomeId: 'snowy_highlands' }), true);
  assert.equal(cropBlock('rimepod', 0), BLOCK.RIMEPOD_0);
  assert.equal(cropBlock('rimepod', 3), BLOCK.RIMEPOD_3);
  assert.equal(cropSeedItem('rimepod'), 'rimepod_seed');
  farming.update(100, null, { isHydrated: () => true, biomeAt: () => ({ id: 'plains' }) });
  assert.equal(farming.entries()[0].stage, 0);
  farming.update(100, null, { isHydrated: () => true, biomeAt: () => ({ id: 'snowy_highlands' }) });
  assert.equal(farming.entries()[0].stage, 1);
  const restored = new FarmingState(farming.serialize(), 707);
  assert.equal(restored.entries()[0].type, 'rimepod');
  assert.equal(restored.entries()[0].block, BLOCK.RIMEPOD_1);
});

test('Emberbulbs grow only on Ember Soil in Cinderreach without creating farmland state', () => {
  assert.equal(cropPlantingAllowed('emberbulb', 'cinderreach'), true);
  assert.equal(cropPlantingAllowed('emberbulb', 'plains'), false);
  assert.equal(cropSubstrateAllowed('emberbulb', BLOCK.EMBER_SOIL), true);
  assert.equal(cropSubstrateAllowed('emberbulb', BLOCK.FARMLAND), false);
  assert.equal(cropSubstrateAllowed('wheat', BLOCK.FARMLAND), true);
  const farming = new FarmingState(null, 808);
  assert.equal(farming.plant(7, 18, 7, 'emberbulb', { biomeId: 'cinderreach', substrateId: BLOCK.ASHSTONE }), false);
  assert.equal(farming.plant(7, 18, 7, 'emberbulb', { biomeId: 'cinderreach', substrateId: BLOCK.EMBER_SOIL }), true);
  assert.equal(farming.soilEntries().length, 0, 'realm substrate must never migrate into managed farmland');
  assert.equal(cropBlock('emberbulb', 3), BLOCK.EMBERBULB_3);
  assert.equal(cropSeedItem('emberbulb'), 'emberbulb_cutting');
  farming.update(100, null, { biomeAt: () => 'cinderreach', blockAt: () => BLOCK.ASHSTONE, growthMultiplier: 2 });
  assert.equal(farming.entries()[0].stage, 0, 'invalid saved substrate must pause growth');
  farming.update(100, null, { biomeAt: () => 'cinderreach', blockAt: () => BLOCK.EMBER_SOIL, growthMultiplier: 0.25 });
  assert.equal(farming.entries()[0].stage, 1, 'realm heat growth is independent from Overworld weather multipliers');
  const restored = new FarmingState(farming.serialize(), 808);
  assert.equal(restored.entries()[0].type, 'emberbulb');
  assert.equal(restored.soilEntries().length, 0);
});

test('Emberbulb stages occupy a dedicated thirteenth procedural atlas row with cutout silhouettes', () => {
  const atlas = createBlockAtlas();
  assert.equal(atlas.image.height, TILE_SIZE * ATLAS_ROWS);
  const alphaCount = (tile) => {
    let count = 0;
    const tileX = tile % ATLAS_COLUMNS;
    const tileY = Math.floor(tile / ATLAS_COLUMNS);
    for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) {
      const px = tileX * TILE_SIZE + x;
      const py = tileY * TILE_SIZE + y;
      if (atlas.image.data[(py * atlas.image.width + px) * 4 + 3] > 0) count += 1;
    }
    return count;
  };
  assert.ok(alphaCount(96) > 0 && alphaCount(96) < TILE_SIZE * TILE_SIZE);
  assert.ok(alphaCount(99) > alphaCount(96), 'mature bulb silhouette must visibly fill out');
  assert.ok(tileUVs(99).every(([u, v]) => u > 0 && u < 1 && v > 0 && v < 1));
});
