import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { Inventory } from '../src/inventory.js';
import { activeCombatTool, activeMiningTool, breakDuration, canHarvestBlock } from '../src/mining.js';

test('crafted pickaxes automatically improve stone mining speed', () => {
  const hand = new Inventory();
  const wood = new Inventory({ counts: [['wooden_pickaxe', 1]] });
  const stone = new Inventory({ counts: [['stone_pickaxe', 1]] });
  assert.ok(breakDuration(BLOCK.STONE, hand, null) > breakDuration(BLOCK.STONE, wood, 'wooden_pickaxe'));
  assert.ok(breakDuration(BLOCK.STONE, wood, 'wooden_pickaxe') > breakDuration(BLOCK.STONE, stone, 'stone_pickaxe'));
  assert.equal(activeMiningTool(stone, 'stone_pickaxe').name, 'Stone Pickaxe');
});

test('a pickaxe does not accelerate mismatched materials', () => {
  const hand = new Inventory();
  const pickaxe = new Inventory({ counts: [['stone_pickaxe', 1]] });
  assert.equal(breakDuration(BLOCK.WOOD, hand, null), breakDuration(BLOCK.WOOD, pickaxe, 'stone_pickaxe'));
});

test('owned tools only apply while selected', () => {
  const inventory = new Inventory({ counts: [['stone_pickaxe', 1]] });
  assert.equal(activeMiningTool(inventory, BLOCK.STONE).id, 'hand');
  assert.equal(activeMiningTool(inventory, 'stone_pickaxe').id, 'stone_pickaxe');
});

test('iron tools improve mining and selected swords improve combat', () => {
  const inventory = new Inventory({ counts: [['stone_pickaxe', 1], ['iron_pickaxe', 1], ['iron_sword', 1]] });
  assert.ok(breakDuration(BLOCK.IRON_ORE, inventory, 'iron_pickaxe') < breakDuration(BLOCK.IRON_ORE, inventory, 'stone_pickaxe'));
  assert.equal(activeCombatTool(inventory, 'iron_sword').damage, 7);
  assert.ok(activeCombatTool(inventory, 'iron_sword').recovery < activeCombatTool(inventory, 'stone_pickaxe').recovery);
  assert.ok(activeCombatTool(inventory, 'iron_sword').knockback > activeCombatTool(inventory, BLOCK.STONE).knockback);
  assert.equal(activeCombatTool(inventory, BLOCK.STONE).damage, 2);
});

test('axes and shovels accelerate only their matching materials across all tiers', () => {
  const inventory = new Inventory({ counts: [
    ['wooden_axe', 1], ['stone_axe', 1], ['iron_axe', 1],
    ['wooden_shovel', 1], ['stone_shovel', 1], ['iron_shovel', 1],
  ] });
  assert.ok(breakDuration(BLOCK.WOOD, inventory, 'wooden_axe') > breakDuration(BLOCK.WOOD, inventory, 'stone_axe'));
  assert.ok(breakDuration(BLOCK.WOOD, inventory, 'stone_axe') > breakDuration(BLOCK.WOOD, inventory, 'iron_axe'));
  assert.ok(breakDuration(BLOCK.DIRT, inventory, 'wooden_shovel') > breakDuration(BLOCK.DIRT, inventory, 'stone_shovel'));
  assert.ok(breakDuration(BLOCK.DIRT, inventory, 'stone_shovel') > breakDuration(BLOCK.DIRT, inventory, 'iron_shovel'));
  assert.equal(activeMiningTool(inventory, 'iron_axe').kind, 'axe');
  assert.equal(activeMiningTool(inventory, 'iron_shovel').kind, 'shovel');
  assert.equal(breakDuration(BLOCK.STONE, inventory, 'iron_axe'), breakDuration(BLOCK.STONE, new Inventory(), null));
  assert.equal(activeCombatTool(inventory, 'iron_axe').damage, 8);
});

test('late-game ores enforce pickaxe tiers while Emberite and Voidglass improve speed and combat', () => {
  const inventory = new Inventory({ counts: [
    ['stone_pickaxe', 1], ['iron_pickaxe', 1], ['emberite_pickaxe', 1], ['voidglass_pickaxe', 1],
    ['emberite_sword', 1], ['voidglass_sword', 1],
  ] });
  assert.equal(canHarvestBlock(BLOCK.EMBERITE_ORE, inventory, 'stone_pickaxe'), false);
  assert.equal(canHarvestBlock(BLOCK.EMBERITE_ORE, inventory, 'iron_pickaxe'), true);
  assert.equal(canHarvestBlock(BLOCK.VOIDGLASS_ORE, inventory, 'iron_pickaxe'), false);
  assert.equal(canHarvestBlock(BLOCK.VOIDGLASS_ORE, inventory, 'emberite_pickaxe'), true);
  assert.ok(breakDuration(BLOCK.STONE, inventory, 'voidglass_pickaxe') < breakDuration(BLOCK.STONE, inventory, 'emberite_pickaxe'));
  assert.ok(activeCombatTool(inventory, 'voidglass_sword').damage > activeCombatTool(inventory, 'emberite_sword').damage);
  assert.ok(activeMiningTool(inventory, 'voidglass_pickaxe').tier > activeMiningTool(inventory, 'iron_pickaxe').tier);
});

test('the Hollow Warden Maul is a slow high-impact unique boss weapon', () => {
  const inventory = new Inventory({ counts: [['warden_maul', 1]] });
  const maul = activeCombatTool(inventory, 'warden_maul');
  assert.equal(maul.damage, 12);
  assert.equal(maul.recovery, 1.12);
  assert.equal(maul.knockback, 5.4);
});
