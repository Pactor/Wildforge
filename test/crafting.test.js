import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { CraftingGrid, matchCraftingRecipe, recipePattern, RECIPE_PATTERNS } from '../src/crafting.js';
import { Inventory, RECIPES } from '../src/inventory.js';

test('every recipe has a shaped pattern that fits its required station grid', () => {
  for (const recipe of RECIPES) {
    assert.ok(RECIPE_PATTERNS[recipe.id]?.length, `missing ${recipe.id}`);
    const maximum = recipe.station === 'hand' ? 2 : 3;
    const pattern = recipePattern(recipe.id);
    assert.ok(pattern.length <= maximum && pattern.every((row) => row.length <= maximum), `${recipe.id} does not fit`);
  }
});

test('crafting matcher trims offsets, enforces shape, and limits advanced recipes to tables', () => {
  assert.equal(matchCraftingRecipe([null, BLOCK.WOOD, null, null], 2, 'hand').id, 'planks');
  assert.equal(matchCraftingRecipe([BLOCK.PLANKS, BLOCK.PLANKS, null, null], 2, 'hand'), null);
  const pickaxe = [BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, null, 'stick', null, null, 'stick', null];
  assert.equal(matchCraftingRecipe(pickaxe, 3, 'hand'), null);
  assert.equal(matchCraftingRecipe(pickaxe, 3, 'table').id, 'wood_pickaxe');
  const runeforge = [
    'lumen_shard', 'voidglass_shard', 'lumen_shard',
    BLOCK.STONE, 'voidglass_shard', BLOCK.STONE,
    BLOCK.STONE, 'lumen_shard', BLOCK.STONE,
  ];
  assert.equal(matchCraftingRecipe(runeforge, 3, 'table').id, 'runeforge');
  const saddle = [
    'iron_ingot', 'tough_hide', 'iron_ingot',
    'windfiber', 'tough_hide', 'windfiber',
    null, 'tough_hide', null,
  ];
  assert.equal(matchCraftingRecipe(saddle, 3, 'table').id, 'trail_saddle');
  const sigil = [
    'shadow_shard', 'lumen_shard', 'shadow_shard',
    'lumen_shard', 'voidglass_shard', 'lumen_shard',
    'shadow_shard', null, 'shadow_shard',
  ];
  assert.equal(matchCraftingRecipe(sigil, 3, 'table').id, 'warden_sigil');
  const maul = [
    'voidglass_shard', 'warden_core', 'voidglass_shard',
    null, 'stick', null,
    null, 'stick', null,
  ];
  assert.equal(matchCraftingRecipe(maul, 3, 'table').id, 'warden_maul');
  const cinderward = [
    'ashscale', 'ember_gland', 'ashscale',
    null, 'cinder_shard', null,
    null, 'empty_flask', null,
  ];
  assert.equal(matchCraftingRecipe(cinderward, 3, 'table'), null);
  assert.equal(matchCraftingRecipe(cinderward, 3, 'still').id, 'cinderward_tonic');
  const ashglide = [
    'ember_membrane', 'cinder_shard', 'ember_membrane',
    null, 'emberbulb', null,
    null, 'empty_flask', null,
  ];
  assert.equal(matchCraftingRecipe(ashglide, 3, 'table'), null);
  assert.equal(matchCraftingRecipe(ashglide, 3, 'still').id, 'ashglide_tonic');
});

test('grid transfers ingredients, crafts output, and returns leftovers when cleared or resized', () => {
  const inventory = new Inventory({ counts: [[BLOCK.WOOD, 2], [BLOCK.PLANKS, 2]] });
  const grid = new CraftingGrid(2);
  assert.equal(grid.place(inventory, 0, BLOCK.WOOD), true);
  assert.equal(grid.match('hand').id, 'planks');
  assert.equal(grid.craft(inventory, 'hand').id, 'planks');
  assert.equal(inventory.count(BLOCK.PLANKS), 6);
  assert.equal(grid.place(inventory, 0, BLOCK.PLANKS), true);
  assert.equal(grid.place(inventory, 2, BLOCK.PLANKS), true);
  assert.equal(grid.match('hand').id, 'sticks');
  grid.resize(3, inventory);
  assert.equal(inventory.count(BLOCK.PLANKS), 6);
  assert.equal(grid.size, 3);
  assert.ok(grid.slots.every((slot) => slot == null));
});

test('spatial crafting returns reusable containers from Hearthcurd', () => {
  const inventory = new Inventory({ counts: [['mossmilk_pail', 1], ['dried_ashcap', 1], ['amberroot', 1]] });
  const grid = new CraftingGrid(3);
  assert.equal(grid.place(inventory, 0, 'mossmilk_pail'), true);
  assert.equal(grid.place(inventory, 1, 'dried_ashcap'), true);
  assert.equal(grid.place(inventory, 3, 'amberroot'), true);
  assert.equal(grid.match('table').id, 'hearthcurd');
  assert.equal(grid.craft(inventory, 'table').id, 'hearthcurd');
  assert.equal(inventory.count('forged_pail'), 1);
  assert.equal(inventory.count('hearthcurd'), 2);
});

test('spatial Trailchart calibration returns the reusable Wayfinder Compass', () => {
  const inventory = new Inventory({ counts: [['chart_sheet', 8], ['wayfinder_compass', 1]] });
  const grid = new CraftingGrid(3);
  for (const index of [0, 1, 2, 3, 5, 6, 7, 8]) assert.equal(grid.place(inventory, index, 'chart_sheet'), true);
  assert.equal(grid.place(inventory, 4, 'wayfinder_compass'), true);
  assert.equal(grid.match('table').id, 'trailchart');
  assert.equal(grid.craft(inventory, 'table').id, 'trailchart');
  assert.equal(inventory.count('trailchart'), 1);
  assert.equal(inventory.count('wayfinder_compass'), 1);
});
