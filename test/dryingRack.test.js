import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { DRYING_RECIPES, DryingRackState } from '../src/dryingRack.js';

class RackWorld {
  constructor() { this.blocks = new Map(); }
  getBlock(x, y, z) { return this.blocks.get(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`, id); }
}

test('Windracks cure four regional foods, gain speed from wind, and pause in exposed rain', () => {
  const world = new RackWorld();
  world.setBlock(2, 5, 3, BLOCK.DRYING_RACK);
  const completed = [];
  const racks = new DryingRackState(world, null, { onComplete: (result) => completed.push(result) });
  for (const input of Object.keys(DRYING_RECIPES)) assert.ok(racks.addFood(2, 5, 3, input));
  assert.equal(racks.addFood(2, 5, 3, 'raw_meat'), null);

  racks.update(20, { windStrength: 1, raining: true, isExposed: () => true });
  assert.equal(racks.status(2, 5, 3).paused, true);
  assert.deepEqual(racks.status(2, 5, 3).progress, [0, 0, 0, 0]);
  racks.update(100, { windStrength: 1, raining: false, isExposed: () => true });
  assert.deepEqual(new Set(completed.map((result) => result.output)), new Set(Object.values(DRYING_RECIPES).map((recipe) => recipe.output)));
  assert.equal(racks.status(2, 5, 3).slots, 0);
});

test('Windrack progress persists exactly and breaking returns every uncured input', () => {
  const world = new RackWorld();
  world.setBlock(7, 8, 9, BLOCK.DRYING_RACK);
  const racks = new DryingRackState(world);
  racks.addFood(7, 8, 9, 'raw_meat');
  racks.addFood(7, 8, 9, 'raw_silverfin');
  racks.update(11, { windStrength: 0.5 });
  const serialized = racks.serialize();
  const restored = new DryingRackState(world, serialized);
  assert.deepEqual(restored.serialize(), serialized);
  assert.deepEqual(restored.drain(7, 8, 9), ['raw_meat', 'raw_silverfin']);
  assert.deepEqual(restored.serialize(), { sites: [] });
});

test('Windracks reject invalid foods and discard stale saved sites safely', () => {
  const world = new RackWorld();
  world.setBlock(1, 2, 3, BLOCK.DRYING_RACK);
  const racks = new DryingRackState(world, { sites: [['1,2,3', { slots: [{ input: 'coal', remaining: -50 }, { input: 'raw_ashcap', remaining: 999 }] }]] });
  assert.equal(racks.addFood(1, 2, 3, 'coal'), null);
  assert.equal(racks.status(1, 2, 3).slots, 1);
  world.setBlock(1, 2, 3, BLOCK.AIR);
  racks.update(1);
  assert.deepEqual(racks.serialize(), { sites: [] });
});
