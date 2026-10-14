import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { blastProtected } from '../src/explosives.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { INFUSION_RECIPES, InfusionStillState, MAX_INFUSION_STILLS, STILL_CATALYST_CHARGES } from '../src/infusionStill.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { previewBoxes } from '../src/placementPreview.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

test('Infusion Still is canonical, blast protected, and owns all six tonic formulas', () => {
  assert.equal(BLOCK.INFUSION_STILL, 267);
  assert.equal(BLOCKS[BLOCK.INFUSION_STILL].infusionStill, true);
  assert.deepEqual(blockDrops(BLOCK.INFUSION_STILL), [BLOCK.INFUSION_STILL]);
  assert.equal(blastProtected(BLOCK.INFUSION_STILL), true);
  assert.equal(INFUSION_RECIPES.length, 6);
  for (const formula of INFUSION_RECIPES) {
    const legacy = RECIPES.find((recipe) => recipe.id === formula.id);
    assert.equal(legacy.station, 'still');
  }
});

test('a timed infusion consumes one flask, exact reagents, and one of three catalyst charges', () => {
  const inventory = new Inventory({ counts: [['empty_flask', 2], ['windfiber', 4], ['sunpetal_dye', 2], ['lumen_spore', 1]] });
  const state = new InfusionStillState(); const key = '1,2,3';
  assert.equal(state.deposit(key, inventory, 'flask', 'empty_flask', 2), true);
  assert.equal(state.deposit(key, inventory, 'ingredient', 'windfiber', 4), true);
  assert.equal(state.deposit(key, inventory, 'ingredient', 'sunpetal_dye', 2), true);
  assert.equal(state.deposit(key, inventory, 'catalyst', 'lumen_spore', 1), true);
  assert.deepEqual(state.update(11.9), []);
  assert.equal(state.status(key).output, null);
  assert.equal(state.update(0.1)[0].output, 'windstep_tonic');
  assert.equal(state.status(key).charges, STILL_CATALYST_CHARGES - 1);
  assert.equal(state.status(key).flasks, 1);
  assert.equal(state.update(12)[0].output, 'windstep_tonic');
  assert.deepEqual(state.status(key).output, { id: 'windstep_tonic', count: 2 });
});

test('different output blocks a formula switch and withdrawing resets only partial work', () => {
  const state = new InfusionStillState({ stills: [['4,5,6', {
    flasks: 1, catalyst: 0, charges: 1,
    ingredients: [['amberroot', 2], ['lumen_spore', 1]],
    output: { id: 'windstep_tonic', count: 1 }, progress: 8, activeRecipe: 'hearthmend_tonic',
  }]] });
  assert.equal(state.status('4,5,6').recipe, null);
  const inventory = new Inventory();
  assert.equal(state.withdraw('4,5,6', inventory, 'output', null, 1), true);
  assert.equal(state.status('4,5,6').recipe.id, 'hearthmend_tonic');
  assert.equal(state.progress('4,5,6'), 0);
});

test('malformed saves are bounded, sanitized, and stale Still contents recover exactly once', () => {
  const records = Array.from({ length: MAX_INFUSION_STILLS + 12 }, (_, index) => [`${index},4,0`, {
    flasks: 99, catalyst: 99, charges: 99, ingredients: [['windfiber', 999], ['not_an_item', 4]],
    output: { id: 'windstep_tonic', count: 999 }, progress: 999, activeRecipe: 'windstep_tonic',
  }]);
  const state = new InfusionStillState({ stills: records });
  assert.equal(state.stills.size, MAX_INFUSION_STILLS);
  const first = state.status('0,4,0');
  assert.equal(first.flasks, 3); assert.equal(first.catalyst, 64); assert.equal(first.charges, 3);
  assert.deepEqual(first.ingredients, [['windfiber', 64]]); assert.equal(first.output.count, 64);
  const world = { edits: new Map([['0,4,0', BLOCK.AIR]]) };
  const recovered = state.recoverStale(world);
  assert.ok(recovered.some((entry) => entry.key === '0,4,0'));
  assert.equal(state.drain('0,4,0').length, 0);
});

test('Still has authored visible geometry, partial collision, faithful preview, and held art', () => {
  const storage = new Map(); globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  const world = new VoxelWorld(new THREE.Scene(), 12200); const y = WORLD_HEIGHT - 2;
  world.setBlock(8, y, 8, BLOCK.INFUSION_STILL);
  const geometry = world.buildGeometry(0, 0);
  assert.ok(geometry.getAttribute('position').count > 36);
  assert.deepEqual(world.collisionBoxes(8, y, 8), [[0.08, 0, 0.08, 0.92, 0.16, 0.92], [0.36, 0.16, 0.36, 0.64, 0.84, 0.64]]);
  assert.equal(previewBoxes(BLOCK.INFUSION_STILL).length, 6);
  assert.equal(heldItemProfile(BLOCK.INFUSION_STILL).type, 'infusionStill');
  geometry.dispose();
});
