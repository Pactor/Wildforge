import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { FURNACE_RECIPES, FurnaceState } from '../src/furnace.js';
import { Inventory } from '../src/inventory.js';

test('furnaces consume fuel and smelt input only after cook time', () => {
  const inventory = new Inventory({ counts: [[BLOCK.IRON_ORE, 2], ['coal', 1]] });
  const furnaces = new FurnaceState();
  assert.equal(furnaces.deposit('1,2,3', inventory, 'input', BLOCK.IRON_ORE, 2), true);
  assert.equal(furnaces.deposit('1,2,3', inventory, 'fuel', 'coal', 1), true);
  assert.deepEqual(furnaces.update(7.9), []);
  assert.equal(furnaces.get('1,2,3').output, null);
  const completed = furnaces.update(0.1);
  assert.equal(completed.length, 1);
  assert.deepEqual(furnaces.get('1,2,3').output, { id: 'iron_ingot', count: 1 });
  assert.equal(furnaces.get('1,2,3').input.count, 1);
  assert.equal(furnaces.get('1,2,3').fuel, null);
});

test('furnace slots, partial progress, and burn time persist exactly', () => {
  const inventory = new Inventory({ counts: [['raw_meat', 1], ['coal', 1]] });
  const furnaces = new FurnaceState();
  furnaces.deposit('camp', inventory, 'input', 'raw_meat', 1);
  furnaces.deposit('camp', inventory, 'fuel', 'coal', 1);
  furnaces.update(2.5);
  const restored = new FurnaceState(furnaces.serialize());
  assert.deepEqual(restored.serialize(), furnaces.serialize());
  restored.update(3.5);
  assert.deepEqual(restored.get('camp').output, { id: 'cooked_meat', count: 1 });
});

test('incompatible output blocks smelting and breaking drains every stored slot', () => {
  const furnaces = new FurnaceState({ furnaces: [['forge', {
    input: { id: BLOCK.IRON_ORE, count: 1 },
    fuel: { id: 'coal', count: 2 },
    output: { id: BLOCK.GLASS, count: 3 },
    progress: 2,
    burnRemaining: 4,
    burnTotal: 24,
  }]] });
  furnaces.update(10);
  assert.equal(furnaces.get('forge').input.count, 1);
  assert.equal(furnaces.get('forge').progress, 0);
  assert.deepEqual(furnaces.drain('forge'), [
    [BLOCK.IRON_ORE, 1],
    ['coal', 2],
    [BLOCK.GLASS, 3],
  ]);
});

test('raw Glowkelp roasts into compact survival food', () => {
  const inventory = new Inventory({ counts: [['raw_glowkelp', 1], ['coal', 1]] });
  const furnaces = new FurnaceState();
  assert.equal(furnaces.deposit('kelp', inventory, 'input', 'raw_glowkelp', 1), true);
  assert.equal(furnaces.deposit('kelp', inventory, 'fuel', 'coal', 1), true);
  assert.deepEqual(furnaces.update(5), [{ key: 'kelp', recipeId: 'roasted_glowkelp', output: 'roasted_glowkelp' }]);
  assert.deepEqual(furnaces.get('kelp').output, { id: 'roasted_glowkelp', count: 1 });
});

test('raw Silverfin cooks into a stronger survival meal', () => {
  const inventory = new Inventory({ counts: [['raw_silverfin', 1], ['coal', 1]] });
  const furnaces = new FurnaceState();
  furnaces.deposit('fish', inventory, 'input', 'raw_silverfin', 1);
  furnaces.deposit('fish', inventory, 'fuel', 'coal', 1);
  assert.deepEqual(furnaces.update(6), [{ key: 'fish', recipeId: 'cooked_silverfin', output: 'cooked_silverfin' }]);
  assert.deepEqual(furnaces.get('fish').output, { id: 'cooked_silverfin', count: 1 });
});

test('raw Ashcaps sear into useful cave expedition food', () => {
  const inventory = new Inventory({ counts: [['raw_ashcap', 1], ['coal', 1]] });
  const furnaces = new FurnaceState();
  furnaces.deposit('cave', inventory, 'input', 'raw_ashcap', 1);
  furnaces.deposit('cave', inventory, 'fuel', 'coal', 1);
  assert.deepEqual(furnaces.update(5), [{ key: 'cave', recipeId: 'seared_ashcap', output: 'seared_ashcap' }]);
  assert.deepEqual(furnaces.get('cave').output, { id: 'seared_ashcap', count: 1 });
});

test('Rimepods roast through the furnace cooking path', () => {
  const inventory = new Inventory({ counts: [['rimepod', 1], ['coal', 1]] });
  const furnaces = new FurnaceState();
  assert.equal(furnaces.deposit('rime', inventory, 'input', 'rimepod', 1), true);
  assert.equal(furnaces.deposit('rime', inventory, 'fuel', 'coal', 1), true);
  assert.deepEqual(furnaces.update(5), [{ key: 'rime', recipeId: 'roasted_rimepod', output: 'roasted_rimepod' }]);
});

test('Emberite Ore smelts into the advanced progression metal', () => {
  const inventory = new Inventory({ counts: [[BLOCK.EMBERITE_ORE, 1], ['coal', 1]] });
  const furnaces = new FurnaceState();
  furnaces.deposit('ember', inventory, 'input', BLOCK.EMBERITE_ORE, 1);
  furnaces.deposit('ember', inventory, 'fuel', 'coal', 1);
  assert.deepEqual(furnaces.update(10), [{ key: 'ember', recipeId: 'emberite_ingot', output: 'emberite_ingot' }]);
  assert.deepEqual(furnaces.get('ember').output, { id: 'emberite_ingot', count: 1 });
});

test('Emberbulbs roast through the coal furnace path', () => {
  const inventory = new Inventory({ counts: [['emberbulb', 1], ['coal', 1]] });
  const furnaces = new FurnaceState();
  assert.equal(furnaces.deposit('bulb', inventory, 'input', 'emberbulb', 1), true);
  assert.equal(furnaces.deposit('bulb', inventory, 'fuel', 'coal', 1), true);
  assert.deepEqual(furnaces.update(6), [{ key: 'bulb', recipeId: 'roasted_emberbulb', output: 'roasted_emberbulb' }]);
});

test('Bramblehen meat and eggs cook into distinct farm provisions', () => {
  assert.deepEqual(FURNACE_RECIPES.find((recipe) => recipe.input === 'raw_bramble'), {
    id: 'roasted_bramble', input: 'raw_bramble', output: 'roasted_bramble', cookTime: 6,
  });
  assert.deepEqual(FURNACE_RECIPES.find((recipe) => recipe.input === 'bramble_egg'), {
    id: 'baked_bramble_egg', input: 'bramble_egg', output: 'baked_bramble_egg', cookTime: 5,
  });
});
