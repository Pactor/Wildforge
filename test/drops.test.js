import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { DROP_LIFETIME, DroppedItemManager, MAX_WORLD_DROPS, scatterDeathInventory } from '../src/drops.js';
import { EquipmentState } from '../src/equipment.js';
import { Inventory } from '../src/inventory.js';

const world = { isSolid: () => false };
const distantPlayer = { position: new THREE.Vector3(100, 20, 100) };

test('world drops restore exact bounded motion, age, durable condition, and enchantments', () => {
  const first = new DroppedItemManager(new THREE.Scene(), world, distantPlayer);
  const item = first.spawn('iron_pickaxe', 1, new THREE.Vector3(4, 12, -7), 143, [{ id: 'swiftwork', level: 2 }]);
  item.mesh.position.set(4.25, 12.5, -6.75);
  item.velocity.set(-0.4, 1.2, 0.7);
  item.baseY = 12.4;
  item.age = 47.5;

  const restored = new DroppedItemManager(new THREE.Scene(), world, distantPlayer, () => {}, first.serialize());
  assert.equal(restored.items.length, 1);
  const copy = restored.items[0];
  assert.deepEqual(copy.mesh.position.toArray(), [4.25, 12.5, -6.75]);
  assert.deepEqual(copy.velocity.toArray(), [-0.4, 1.2, 0.7]);
  assert.equal(copy.baseY, 12.4);
  assert.equal(copy.age, 47.5);
  assert.equal(copy.durability, 143);
  assert.deepEqual(copy.enchantments, [{ id: 'swiftwork', level: 2 }]);
});

test('drop saves reject malformed records, clamp metadata, and remain hard bounded', () => {
  const records = [
    null,
    { id: 'missing', count: 1, position: [0, 10, 0], age: 0 },
    { id: 'stick', count: 1, position: [Infinity, 10, 0], age: 0 },
    { id: 'stick', count: 1, position: [0, 10, 0], age: DROP_LIFETIME },
    { id: 'iron_pickaxe', count: 99, position: [0, 10, 0], velocity: [999, -999, 0], durability: 9999, enchantments: [{ id: 'keen_edge', level: 99 }], age: 1 },
  ];
  const manager = new DroppedItemManager(new THREE.Scene(), world, distantPlayer, () => {}, records);
  assert.equal(manager.items.length, 1);
  assert.equal(manager.items[0].durability, 251);
  assert.equal(manager.items[0].count, 1);
  assert.deepEqual(manager.items[0].velocity.toArray(), [24, -24, 0]);
  assert.deepEqual(manager.items[0].enchantments, [{ id: 'keen_edge', level: 3 }]);
  assert.equal(MAX_WORLD_DROPS, 2048);
});

test('restored drops retain their remaining five-minute lifetime and can be recovered', () => {
  const picked = [];
  const player = { position: new THREE.Vector3(0, 9.2, 0) };
  const manager = new DroppedItemManager(new THREE.Scene(), world, player, (...args) => picked.push(args), [{
    id: 'stick', count: 4, position: [0, 10, 0], velocity: [0, 0, 0], baseY: 10, age: 12,
  }]);
  manager.update(0.01, false);
  assert.equal(picked.length, 0, 'dead players must not reclaim their drops from the death screen');
  manager.update(0.01);
  assert.deepEqual(picked[0].slice(0, 2), ['stick', 4]);
  assert.equal(manager.items.length, 0);

  const expiring = new DroppedItemManager(new THREE.Scene(), world, distantPlayer);
  const item = expiring.spawn('stick', 1, new THREE.Vector3(0, 10, 0));
  item.age = DROP_LIFETIME - 0.01;
  expiring.update(0.02);
  assert.equal(expiring.items.length, 0);
});

test('death scattering drains carried and equipped gear losslessly with saturation fallback', () => {
  const inventory = new Inventory({ counts: [['stick', 12], ['iron_pickaxe', 1]] });
  inventory.damage('iron_pickaxe', 40);
  inventory.applyEnchantment('iron_pickaxe', 'swiftwork', 2);
  const equipment = new EquipmentState({
    slots: { head: 'iron_helmet' }, conditions: { head: 120 },
    offhand: 'oak_shield', offhandCondition: 180,
    cosmetic: 'suncrest_regalia',
  });
  const manager = new DroppedItemManager(new THREE.Scene(), world, distantPlayer);
  assert.deepEqual(scatterDeathInventory(inventory, equipment, manager, new THREE.Vector3(3, 11, 4)), {
    dropped: 16, retained: 0, stacks: 5,
  });
  assert.deepEqual(inventory.entries(), []);
  assert.equal(equipment.armorPoints(), 0);
  assert.equal(equipment.hasShield(), false);
  const saved = manager.serialize();
  assert.equal(saved.find((entry) => entry.id === 'iron_pickaxe').durability, 211);
  assert.deepEqual(saved.find((entry) => entry.id === 'iron_pickaxe').enchantments, [{ id: 'swiftwork', level: 2 }]);
  assert.equal(saved.find((entry) => entry.id === 'stick').count, 12);

  const fallbackInventory = new Inventory({ counts: [['iron_pickaxe', 1]] });
  fallbackInventory.damage('iron_pickaxe', 9);
  const fallbackEquipment = new EquipmentState({ slots: { head: 'iron_helmet' }, conditions: { head: 77 } });
  assert.deepEqual(scatterDeathInventory(fallbackInventory, fallbackEquipment, { spawn: () => null }, new THREE.Vector3()), {
    dropped: 0, retained: 2, stacks: 0,
  });
  assert.equal(fallbackInventory.durability('iron_pickaxe').remaining, 242);
  assert.equal(fallbackInventory.durability('iron_helmet').remaining, 77);
});
