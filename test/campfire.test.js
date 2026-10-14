import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { CAMPFIRE_RECIPES, CampfireState } from '../src/campfire.js';

class MemoryWorld {
  constructor(id = BLOCK.HEARTHFIRE_UNLIT) {
    this.value = id;
    this.edits = new Map([['2,5,3', id]]);
  }
  getBlock(x, y, z) { return Math.floor(x) === 2 && Math.floor(y) === 5 && Math.floor(z) === 3 ? this.value : BLOCK.AIR; }
  setBlock(x, y, z, id) {
    if (Math.floor(x) === 2 && Math.floor(y) === 5 && Math.floor(z) === 3) this.value = id;
    this.edits.set(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`, id);
  }
}

test('Hearthfires ignite, cook four foods independently, pause, and persist exact progress', () => {
  const world = new MemoryWorld();
  const completed = [];
  const campfires = new CampfireState(world, null, { onComplete: (result) => completed.push(result) });
  assert.equal(campfires.addFood(2, 5, 3, 'raw_meat'), null, 'unlit fires cannot cook');
  assert.equal(campfires.setLit(2, 5, 3, true), true);
  for (const input of ['raw_meat', 'raw_silverfin', 'raw_glowkelp', 'raw_ashcap']) assert.ok(campfires.addFood(2, 5, 3, input));
  assert.equal(campfires.addFood(2, 5, 3, 'raw_meat'), null, 'all four spots are occupied');
  campfires.update(6);
  const saved = campfires.serialize();
  const meat = saved.sites[0][1].slots.find((slot) => slot.input === 'raw_meat');
  assert.equal(meat.remaining, CAMPFIRE_RECIPES.raw_meat.cookTime - 6);
  campfires.setLit(2, 5, 3, false);
  campfires.update(100);
  assert.equal(campfires.status(2, 5, 3).slots, 4, 'extinguished cook progress must pause');
  campfires.setLit(2, 5, 3, true);
  campfires.update(18);
  assert.equal(completed.length, 4);
  assert.deepEqual(new Set(completed.map((result) => result.output)), new Set(['cooked_meat', 'cooked_silverfin', 'roasted_glowkelp', 'seared_ashcap']));
});

test('serialized Hearthfire food resumes and breaking safely drains uncooked inputs', () => {
  const world = new MemoryWorld(BLOCK.HEARTHFIRE_LIT);
  const first = new CampfireState(world);
  first.addFood(2, 5, 3, 'raw_meat');
  first.update(7);
  const restored = new CampfireState(world, first.serialize());
  assert.ok(Math.abs(restored.status(2, 5, 3).progress[0] - 7 / 24) < 1e-9);
  assert.deepEqual(restored.drain(2, 5, 3), ['raw_meat']);
  assert.deepEqual(restored.drain(2, 5, 3), []);
});

test('four seconds of exposed non-desert rain extinguishes while shelter keeps fire dry', () => {
  const world = new MemoryWorld(BLOCK.HEARTHFIRE_LIT);
  let extinguished = 0;
  const campfires = new CampfireState(world, null, { onExtinguish: () => { extinguished += 1; } });
  campfires.update(10, { isRaining: () => true, isExposed: () => false });
  assert.equal(world.value, BLOCK.HEARTHFIRE_LIT);
  campfires.update(3.9, { isRaining: () => true, isExposed: () => true });
  assert.equal(world.value, BLOCK.HEARTHFIRE_LIT);
  campfires.update(0.2, { isRaining: () => true, isExposed: () => true });
  assert.equal(world.value, BLOCK.HEARTHFIRE_UNLIT);
  assert.equal(extinguished, 1);
});

test('Hearthfires roast harvested Rimepods into a stronger cold-region food', () => {
  const world = new MemoryWorld(BLOCK.HEARTHFIRE_LIT);
  const completed = [];
  const campfires = new CampfireState(world, null, { onComplete: (result) => completed.push(result) });
  assert.ok(campfires.addFood(2, 5, 3, 'rimepod'));
  campfires.update(CAMPFIRE_RECIPES.rimepod.cookTime);
  assert.equal(completed[0].output, 'roasted_rimepod');
});

test('Hearthfires roast Emberbulbs into dense Cinderreach provisions', () => {
  const world = new MemoryWorld(BLOCK.HEARTHFIRE_LIT);
  const completed = [];
  const campfires = new CampfireState(world, null, { onComplete: (result) => completed.push(result) });
  assert.ok(campfires.addFood(2, 5, 3, 'emberbulb'));
  campfires.update(CAMPFIRE_RECIPES.emberbulb.cookTime);
  assert.equal(completed[0].output, 'roasted_emberbulb');
});

test('Hearthfires roast Bramblehen meat and bake renewable eggs', () => {
  assert.equal(CAMPFIRE_RECIPES.raw_bramble.output, 'roasted_bramble');
  assert.equal(CAMPFIRE_RECIPES.bramble_egg.output, 'baked_bramble_egg');
  assert.ok(CAMPFIRE_RECIPES.bramble_egg.cookTime < CAMPFIRE_RECIPES.raw_bramble.cookTime);
});
