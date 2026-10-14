import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { Inventory } from '../src/inventory.js';
import { canPlaceChest, CHEST_CAPACITY, chestInfo, DOUBLE_CHEST_CAPACITY, containerKey, sanitizeContainerLabel, slotsUsed, STORAGE_SORT_MODES, StorageState } from '../src/storage.js';

class ChestWorld {
  constructor(chests = []) { this.chests = new Set(chests.map(([x, y, z]) => containerKey(x, y, z))); }
  getBlock(x, y, z) { return this.chests.has(containerKey(x, y, z)) ? BLOCK.CHEST : BLOCK.AIR; }
}

test('chest deposits, withdrawals, persistence, and draining are lossless', () => {
  const player = new Inventory({ counts: [[BLOCK.WOOD, 4]] });
  const storage = new StorageState();
  const key = containerKey(1.8, 4, -2.1);
  assert.equal(storage.deposit(key, player, BLOCK.WOOD, 3), true);
  assert.equal(player.count(BLOCK.WOOD), 1);
  assert.equal(storage.entries(key)[0][1], 3);
  const restored = new StorageState(storage.serialize());
  assert.equal(restored.withdraw(key, player, BLOCK.WOOD, 1), true);
  assert.equal(player.count(BLOCK.WOOD), 2);
  assert.deepEqual(restored.drain(key), [[String(BLOCK.WOOD), 2]]);
  assert.equal(restored.entries(key).length, 0);
});

test('chests enforce 27 real slots with 64-item stacks and atomic overflow rejection', () => {
  const capacity = CHEST_CAPACITY * 64;
  const player = new Inventory({ counts: [[BLOCK.WOOD, capacity + 1]] });
  const storage = new StorageState();
  assert.equal(storage.deposit('packed', player, BLOCK.WOOD, capacity + 1), false);
  assert.equal(player.count(BLOCK.WOOD), capacity + 1);
  assert.equal(storage.deposit('packed', player, BLOCK.WOOD, capacity), true);
  assert.equal(slotsUsed(storage.get('packed')), CHEST_CAPACITY);
  assert.equal(storage.spaceFor('packed', BLOCK.WOOD), 0);
  assert.equal(player.count(BLOCK.WOOD), 1);
});

test('durable chest transfers and broken-chest drops preserve each item condition', () => {
  const player = new Inventory({ counts: [['iron_pickaxe', 2]] });
  player.damage('iron_pickaxe', 40);
  const storage = new StorageState();
  assert.equal(storage.deposit('tools', player, 'iron_pickaxe', 2), true);
  assert.equal(slotsUsed(storage.get('tools')), 2);
  assert.equal(storage.withdraw('tools', player, 'iron_pickaxe', 1), true);
  assert.equal(player.durability('iron_pickaxe').remaining, 211);
  const dropped = storage.drainItems('tools');
  assert.deepEqual(dropped, [{ id: 'iron_pickaxe', count: 1, durability: 251 }]);
  assert.equal(storage.entries('tools').length, 0);
});

test('adjacent chests share a stable 54-slot key and placement rejects triples', () => {
  const pair = new ChestWorld([[0, 4, 0], [1, 4, 0]]);
  const left = chestInfo(pair, 0, 4, 0);
  const right = chestInfo(pair, 1, 4, 0);
  assert.equal(left.key, right.key);
  assert.equal(left.capacity, DOUBLE_CHEST_CAPACITY);
  assert.deepEqual(left.members, [{ x: 0, y: 4, z: 0 }, { x: 1, y: 4, z: 0 }]);
  assert.equal(canPlaceChest(new ChestWorld([[0, 4, 0]]), 1, 4, 0), true);
  assert.equal(canPlaceChest(pair, 2, 4, 0), false);
  assert.equal(canPlaceChest(new ChestWorld([[0, 4, 0], [2, 4, 0]]), 1, 4, 0), false);
});

test('pairing merges old single saves losslessly and preserves durable condition', () => {
  const world = new ChestWorld([[0, 4, 0], [1, 4, 0]]);
  const storage = new StorageState();
  const materials = new Inventory({ counts: [[BLOCK.WOOD, 5], ['iron_pickaxe', 1]] });
  materials.damage('iron_pickaxe', 37);
  assert.equal(storage.deposit(containerKey(0, 4, 0), materials, BLOCK.WOOD, 5), true);
  assert.equal(storage.deposit(containerKey(1, 4, 0), materials, 'iron_pickaxe', 1), true);
  const info = chestInfo(world, 1, 4, 0);
  storage.prepare(info);
  assert.equal(storage.capacityFor(info.key), DOUBLE_CHEST_CAPACITY);
  assert.equal(storage.get(info.key).count(BLOCK.WOOD), 5);
  assert.equal(storage.get(info.key).durability('iron_pickaxe').remaining, 214);
  assert.equal(storage.containers.has(containerKey(0, 4, 0)), false);
  assert.equal(storage.containers.has(containerKey(1, 4, 0)), false);
});

test('breaking one double-chest half preserves 27 slots and drops only overflow', () => {
  const storage = new StorageState();
  const key = 'double:0,4,0|1,4,0';
  const player = new Inventory({ counts: [['oak_shield', 30]] });
  player.damage('oak_shield', 20);
  assert.equal(storage.deposit(key, player, 'oak_shield', 30), true);
  assert.equal(slotsUsed(storage.get(key)), 30);
  const overflow = storage.unpair(key, containerKey(1, 4, 0));
  assert.equal(storage.get(containerKey(1, 4, 0)).count('oak_shield'), CHEST_CAPACITY);
  assert.equal(storage.get(containerKey(1, 4, 0)).durability('oak_shield').remaining, 220);
  assert.deepEqual(overflow, [
    { id: 'oak_shield', count: 1, durability: 240 },
    { id: 'oak_shield', count: 1, durability: 240 },
    { id: 'oak_shield', count: 1, durability: 240 },
  ]);
});

test('container labels are sanitized and sorting choices persist', () => {
  const storage = new StorageState();
  const chest = storage.get('pantry');
  chest.add(BLOCK.WOOD, 2);
  chest.add('coal', 7);
  chest.add('raw_meat', 4);
  assert.equal(sanitizeContainerLabel('  Forge\n\t Supplies  '), 'Forge Supplies');
  assert.equal(storage.setLabel('pantry', '  Forge\n\t Supplies  '), 'Forge Supplies');
  assert.equal(storage.setSortMode('pantry', 'count'), true);
  assert.deepEqual(storage.entries('pantry').map(([, count]) => count), [7, 4, 2]);
  assert.equal(storage.setSortMode('pantry', 'bogus'), false);
  const restored = new StorageState(storage.serialize());
  assert.equal(restored.label('pantry'), 'Forge Supplies');
  assert.equal(restored.sortMode('pantry'), 'count');
  assert.deepEqual(STORAGE_SORT_MODES, ['name', 'category', 'count']);
});

test('pairing and splitting preserve chest labels and sort modes even when empty', () => {
  const world = new ChestWorld([[0, 4, 0], [1, 4, 0]]);
  const storage = new StorageState();
  const leftKey = containerKey(0, 4, 0);
  const rightKey = containerKey(1, 4, 0);
  storage.setLabel(leftKey, 'Mining Gear');
  storage.setSortMode(leftKey, 'category');
  const info = chestInfo(world, 0, 4, 0);
  storage.prepare(info);
  assert.equal(storage.label(info.key), 'Mining Gear');
  assert.equal(storage.sortMode(info.key), 'category');
  assert.equal(storage.label(leftKey), '');
  assert.equal(storage.sortMode(leftKey), 'name');
  assert.deepEqual(storage.unpair(info.key, rightKey), []);
  assert.equal(storage.label(rightKey), 'Mining Gear');
  assert.equal(storage.sortMode(rightKey), 'category');
});

test('generated container loot seeds once and cannot refill after emptying or reload', () => {
  const storage = new StorageState();
  const loot = [{ id: 'iron_ingot', count: 2 }, { id: 'coal', count: 4 }];
  assert.equal(storage.seedGenerated('4,20,7', loot, 'trailforge:0,0'), true);
  assert.equal(storage.get('4,20,7').count('iron_ingot'), 2);
  assert.equal(storage.seedGenerated('4,20,7', loot, 'trailforge:0,0'), false);
  storage.drainItems('4,20,7');
  assert.equal(storage.seedGenerated('4,20,7', loot, 'trailforge:0,0'), false);
  const restored = new StorageState(storage.serialize());
  assert.equal(restored.seedGenerated('4,20,7', loot, 'trailforge:0,0'), false);
  assert.equal(restored.get('4,20,7').entries().length, 0);
});

test('non-stackable regalia survives chest transfer and storage persistence', () => {
  const player = new Inventory({ counts: [['frostveil_regalia', 1]] });
  const storage = new StorageState();
  assert.equal(storage.deposit('wardrobe', player, 'frostveil_regalia', 1), true);
  assert.equal(player.count('frostveil_regalia'), 0);
  const restored = new StorageState(storage.serialize());
  assert.equal(restored.get('wardrobe').count('frostveil_regalia'), 1);
  assert.equal(restored.withdraw('wardrobe', player, 'frostveil_regalia', 1), true);
  assert.equal(player.count('frostveil_regalia'), 1);
});
