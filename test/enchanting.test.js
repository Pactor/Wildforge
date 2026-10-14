import assert from 'node:assert/strict';
import test from 'node:test';
import { EquipmentState } from '../src/equipment.js';
import { availableEnchantments, enchantmentLabel, enchantmentLevel, RuneforgeState } from '../src/enchanting.js';
import { ExperienceState } from '../src/experience.js';
import { Inventory } from '../src/inventory.js';
import { activeCombatTool, activeMiningTool } from '../src/mining.js';
import { containerKey, StorageState } from '../src/storage.js';

test('Runeforge offers are deterministic, compatible, and atomically consume levels and shards', () => {
  const inventory = new Inventory({ counts: [['iron_pickaxe', 1], ['lumen_shard', 8]] });
  const experience = new ExperienceState();
  experience.add(500);
  const forge = new RuneforgeState(12345);
  const first = forge.offers('iron_pickaxe', inventory.enchantments('iron_pickaxe'));
  assert.deepEqual(first, new RuneforgeState(12345).offers('iron_pickaxe', []));
  assert.equal(first.length, 3);
  assert.ok(first.every((offer) => availableEnchantments('iron_pickaxe').includes(offer.id)));
  const offer = first[1];
  const levelBefore = experience.level;
  const shardsBefore = inventory.count('lumen_shard');
  assert.equal(forge.apply(inventory, experience, 'iron_pickaxe', offer), true);
  assert.equal(experience.level, levelBefore - offer.cost);
  assert.equal(inventory.count('lumen_shard'), shardsBefore - offer.reagent);
  assert.equal(enchantmentLevel(inventory.enchantments('iron_pickaxe'), offer.id), offer.level);
  assert.equal(forge.nonce, 1);
  assert.ok(enchantmentLabel(offer).length > 3);
});

test('enchantments persist per copy through saves, item transfer, chests, and equipment', () => {
  const inventory = new Inventory({ counts: [['iron_helmet', 1], ['iron_pickaxe', 1]] });
  inventory.applyEnchantment('iron_helmet', 'warding', 2);
  inventory.applyEnchantment('iron_pickaxe', 'swift', 3);
  const restored = new Inventory(inventory.serialize());
  assert.deepEqual(restored.enchantments('iron_pickaxe'), [{ id: 'swift', level: 3 }]);

  const storage = new StorageState();
  const key = containerKey(1, 2, 3);
  assert.equal(storage.deposit(key, restored, 'iron_pickaxe'), true);
  assert.equal(storage.withdraw(key, restored, 'iron_pickaxe'), true);
  assert.deepEqual(restored.enchantments('iron_pickaxe'), [{ id: 'swift', level: 3 }]);

  const equipment = new EquipmentState();
  assert.equal(equipment.equip(restored, 'iron_helmet'), true);
  assert.equal(equipment.armorPoints(), 4);
  const equipmentRestored = new EquipmentState(equipment.serialize());
  assert.deepEqual(equipmentRestored.enchantments.head, [{ id: 'warding', level: 2 }]);
  assert.equal(equipmentRestored.armorPoints(), 4);
  assert.equal(equipmentRestored.unequip(restored, 'head'), true);
  assert.deepEqual(restored.enchantments('iron_helmet'), [{ id: 'warding', level: 2 }]);
});

test('Swiftwork and Keen Edge produce real mining and combat improvements', () => {
  const inventory = new Inventory({ counts: [['iron_pickaxe', 1], ['iron_sword', 1]] });
  const baseSpeed = activeMiningTool(inventory, 'iron_pickaxe').speed;
  const baseDamage = activeCombatTool(inventory, 'iron_sword').damage;
  inventory.applyEnchantment('iron_pickaxe', 'swift', 3);
  inventory.applyEnchantment('iron_sword', 'keen', 2);
  assert.equal(activeMiningTool(inventory, 'iron_pickaxe').speed, baseSpeed * 1.54);
  assert.equal(activeCombatTool(inventory, 'iron_sword').damage, baseDamage + 2.5);
});

test('Enduring can prevent condition loss without breaking instance metadata', () => {
  const inventory = new Inventory({ counts: [['iron_pickaxe', 1]] });
  inventory.applyEnchantment('iron_pickaxe', 'enduring', 3);
  const condition = inventory.durability('iron_pickaxe').remaining;
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    const result = inventory.damage('iron_pickaxe', 1);
    assert.equal(result.prevented, true);
    assert.equal(inventory.durability('iron_pickaxe').remaining, condition);
    assert.deepEqual(inventory.enchantments('iron_pickaxe'), [{ id: 'enduring', level: 3 }]);
  } finally {
    Math.random = originalRandom;
  }
});

test('Runeforge rejects unaffordable offers without mutating gear or resources', () => {
  const inventory = new Inventory({ counts: [['iron_sword', 1], ['lumen_shard', 1]] });
  const experience = new ExperienceState();
  const forge = new RuneforgeState(9);
  const offer = forge.offers('iron_sword', [])[2];
  assert.equal(forge.apply(inventory, experience, 'iron_sword', offer), false);
  assert.deepEqual(inventory.enchantments('iron_sword'), []);
  assert.equal(inventory.count('lumen_shard'), 1);
  assert.equal(forge.nonce, 0);
});
