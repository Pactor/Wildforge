import assert from 'node:assert/strict';
import test from 'node:test';
import { EquipmentState } from '../src/equipment.js';
import { Inventory } from '../src/inventory.js';

test('armor equips, swaps, persists, unequips, and reduces damage', () => {
  const inventory = new Inventory({ counts: [['iron_helmet', 2], ['iron_chestplate', 1]] });
  const equipment = new EquipmentState();
  assert.equal(equipment.equip(inventory, 'iron_helmet'), true);
  assert.equal(equipment.equip(inventory, 'iron_chestplate'), true);
  assert.equal(equipment.armorPoints(), 8);
  assert.equal(equipment.reduceDamage(10), 7);
  assert.deepEqual(equipment.absorbDamage(10), { damage: 7, wear: 3, broken: [] });
  assert.equal(equipment.condition('head').remaining, 163);
  assert.equal(equipment.condition('chest').remaining, 238);
  const restored = new EquipmentState(equipment.serialize());
  assert.equal(restored.armorPoints(), 8);
  assert.equal(restored.condition('head').remaining, 163);
  assert.equal(restored.unequip(inventory, 'head'), true);
  assert.equal(restored.armorPoints(), 6);
  assert.equal(inventory.count('iron_helmet'), 2);
});

test('armor pieces break independently after absorbing protected hits', () => {
  const equipment = new EquipmentState({
    slots: { head: 'iron_helmet', chest: 'iron_chestplate' },
    conditions: { head: 1, chest: 20 },
  });
  assert.deepEqual(equipment.absorbDamage(4), { damage: 3, wear: 1, broken: ['iron_helmet'] });
  assert.equal(equipment.slots.head, null);
  assert.equal(equipment.condition('head'), null);
  assert.equal(equipment.condition('chest').remaining, 19);
  assert.equal(equipment.armorPoints(), 6);
});

test('Tough Hide armor provides a complete early tier and swaps cleanly with iron', () => {
  const inventory = new Inventory({ counts: [
    ['hide_helmet', 1], ['hide_chestplate', 1], ['hide_leggings', 1], ['hide_boots', 1], ['iron_helmet', 1],
  ] });
  const equipment = new EquipmentState();
  for (const id of ['hide_helmet', 'hide_chestplate', 'hide_leggings', 'hide_boots']) assert.equal(equipment.equip(inventory, id), true);
  assert.equal(equipment.armorPoints(), 7);
  assert.equal(equipment.reduceDamage(10), 8);
  assert.deepEqual(equipment.absorbDamage(8), { damage: 6, wear: 2, broken: [] });
  assert.equal(equipment.condition('head').remaining, 70);
  assert.equal(equipment.equip(inventory, 'iron_helmet'), true);
  assert.equal(equipment.armorPoints(), 8);
  assert.equal(inventory.durability('hide_helmet').remaining, 70);
  const restored = new EquipmentState(equipment.serialize());
  assert.equal(restored.slots.head, 'iron_helmet');
  assert.equal(restored.slots.chest, 'hide_chestplate');
  assert.equal(restored.condition('chest').remaining, 102);
});

test('Emberite and Voidglass armor form complete distinct late-game tiers', () => {
  const inventory = new Inventory({ counts: [
    ['emberite_helmet', 1], ['emberite_chestplate', 1], ['emberite_leggings', 1], ['emberite_boots', 1],
    ['voidglass_helmet', 1], ['voidglass_chestplate', 1], ['voidglass_leggings', 1], ['voidglass_boots', 1],
  ] });
  const equipment = new EquipmentState();
  for (const id of ['emberite_helmet', 'emberite_chestplate', 'emberite_leggings', 'emberite_boots']) assert.equal(equipment.equip(inventory, id), true);
  assert.equal(equipment.armorPoints(), 13);
  for (const id of ['voidglass_helmet', 'voidglass_chestplate', 'voidglass_leggings', 'voidglass_boots']) assert.equal(equipment.equip(inventory, id), true);
  assert.equal(equipment.armorPoints(), 19);
  assert.equal(equipment.reduceDamage(20), 5);
  const restored = new EquipmentState(equipment.serialize());
  assert.equal(restored.armorPoints(), 19);
  assert.ok(restored.condition('chest').maximum > 500);
});

test('offhand shields preserve condition, block damage, wear, persist, and break', () => {
  const inventory = new Inventory({ counts: [['oak_shield', 2]] });
  const equipment = new EquipmentState();
  assert.equal(equipment.equipShield(inventory, 'oak_shield'), true);
  assert.deepEqual(equipment.blockDamage(10, false), { damage: 10, blocked: 0, wear: 0, broke: null });
  assert.deepEqual(equipment.blockDamage(10, true), { damage: 4, blocked: 6, wear: 10, broke: null });
  assert.equal(equipment.shieldCondition().remaining, 230);
  const restored = new EquipmentState(equipment.serialize());
  assert.equal(restored.offhand, 'oak_shield');
  assert.equal(restored.shieldCondition().remaining, 230);
  assert.equal(restored.unequipShield(inventory), true);
  assert.equal(inventory.durability('oak_shield').remaining, 240);
  assert.equal(equipment.equipShield(inventory, 'oak_shield'), true);
  equipment.offhandCondition = 3;
  assert.deepEqual(equipment.blockDamage(4, true), { damage: 2, blocked: 2, wear: 4, broke: 'oak_shield' });
  assert.equal(equipment.hasShield(), false);
});

test('regalia layers swap, persist, and remain mechanically cosmetic', () => {
  const inventory = new Inventory({ counts: [['iron_chestplate', 1], ['suncrest_regalia', 1], ['hollow_regalia', 1]] });
  const equipment = new EquipmentState();
  equipment.equip(inventory, 'iron_chestplate');
  const armor = equipment.armorPoints();
  assert.equal(equipment.equipCosmetic(inventory, 'suncrest_regalia'), true);
  assert.equal(equipment.cosmetic, 'suncrest_regalia');
  assert.equal(equipment.armorPoints(), armor);
  assert.equal(equipment.equipCosmetic(inventory, 'hollow_regalia'), true);
  assert.equal(inventory.count('suncrest_regalia'), 1);
  const restored = new EquipmentState(equipment.serialize());
  assert.equal(restored.cosmetic, 'hollow_regalia');
  assert.equal(restored.armorPoints(), armor);
  assert.equal(restored.unequipCosmetic(inventory), true);
  assert.equal(restored.cosmetic, null);
  assert.equal(inventory.count('hollow_regalia'), 1);
  assert.equal(new EquipmentState({ cosmetic: 'iron_ingot' }).cosmetic, null);
});

test('death draining returns armor, shield, and regalia with exact instance metadata', () => {
  const equipment = new EquipmentState({
    slots: { head: 'iron_helmet', chest: 'voidglass_chestplate' },
    conditions: { head: 121, chest: 500 },
    enchantments: { head: [{ id: 'warding', level: 1 }], chest: [{ id: 'enduring', level: 3 }] },
    offhand: 'oak_shield',
    offhandCondition: 177,
    offhandEnchantments: [{ id: 'warding', level: 2 }],
    cosmetic: 'suncrest_regalia',
  });
  assert.deepEqual(equipment.drainAll(), [
    { id: 'iron_helmet', count: 1, durability: 121, enchantments: [{ id: 'warding', level: 1 }] },
    { id: 'voidglass_chestplate', count: 1, durability: 500, enchantments: [{ id: 'enduring', level: 3 }] },
    { id: 'oak_shield', count: 1, durability: 177, enchantments: [{ id: 'warding', level: 2 }] },
    { id: 'suncrest_regalia', count: 1 },
  ]);
  assert.equal(equipment.armorPoints(), 0);
  assert.equal(equipment.hasShield(), false);
  assert.equal(equipment.cosmetic, null);
});
