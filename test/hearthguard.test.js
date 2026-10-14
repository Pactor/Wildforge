import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { companionAttackAllowed, CREATURES, EntityManager, realmSpawnProfile } from '../src/entities.js';
import { awakenHearthguard, hearthguardPlan, MAX_HEARTHGUARDS } from '../src/hearthguard.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { tetherEligible } from '../src/tethers.js';

class MockWorld {
  constructor() { this.blocks = new Map(); this.changes = []; }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) {
    const key = this.key(x, y, z);
    if (id === BLOCK.AIR) this.blocks.delete(key); else this.blocks.set(key, id);
    return 1;
  }
  setBlocks(changes) {
    let count = 0;
    for (const change of changes) {
      if (this.getBlock(change.x, change.y, change.z) === change.id) continue;
      this.setBlock(change.x, change.y, change.z, change.id);
      this.changes.push({ ...change });
      count += 1;
    }
    return count;
  }
  terrainHeight() { return 20; }
  biomeAt() { return { id: 'plains' }; }
  undergroundBiomeAt() { return { id: 'rootbound_hollow' }; }
}

function buildPattern(world, axis = 'x', core = { x: 0, y: 23, z: 0 }) {
  world.setBlock(core.x, core.y, core.z, BLOCK.HEARTHGUARD_CORE);
  world.setBlock(core.x, core.y - 1, core.z, BLOCK.FORGED_IRON_BLOCK);
  world.setBlock(core.x, core.y - 2, core.z, BLOCK.FORGED_IRON_BLOCK);
  if (axis === 'x') {
    world.setBlock(core.x - 1, core.y - 1, core.z, BLOCK.FORGED_IRON_BLOCK);
    world.setBlock(core.x + 1, core.y - 1, core.z, BLOCK.FORGED_IRON_BLOCK);
  } else {
    world.setBlock(core.x, core.y - 1, core.z - 1, BLOCK.FORGED_IRON_BLOCK);
    world.setBlock(core.x, core.y - 1, core.z + 1, BLOCK.FORGED_IRON_BLOCK);
  }
  return core;
}

test('Hearthguard patterns recognize both axes while incomplete structures remain ordinary blocks', () => {
  for (const axis of ['x', 'z']) {
    const world = new MockWorld();
    const core = buildPattern(world, axis);
    const plan = hearthguardPlan(world, core);
    assert.equal(plan.axis, axis);
    assert.equal(plan.parts.length, 5);
    assert.deepEqual(plan.spawn, { x: 0.5, y: 21, z: 0.5 });
  }
  const incomplete = new MockWorld();
  const core = buildPattern(incomplete);
  incomplete.setBlock(1, 22, 0, BLOCK.AIR);
  assert.equal(hearthguardPlan(incomplete, core), null);
  assert.equal(awakenHearthguard(incomplete, core, () => ({ id: 1 })), null);
  assert.equal(incomplete.getBlock(0, 23, 0), BLOCK.HEARTHGUARD_CORE);
  assert.equal(incomplete.getBlock(-1, 22, 0), BLOCK.FORGED_IRON_BLOCK);
});

test('awakening is gated by successful spawning and consumes exactly one valid five-block pattern', () => {
  const rejected = new MockWorld();
  const rejectedCore = buildPattern(rejected);
  assert.equal(awakenHearthguard(rejected, rejectedCore, () => null), null);
  assert.equal(rejected.changes.length, 0, 'a failed or capped spawn consumes nothing');

  const world = new MockWorld();
  const core = buildPattern(world, 'z');
  const entity = { type: 'hearthguard' };
  const result = awakenHearthguard(world, core, (spawn) => {
    assert.deepEqual(spawn, { x: 0.5, y: 21, z: 0.5 });
    return entity;
  });
  assert.equal(result.entity, entity);
  assert.equal(world.changes.length, 5);
  assert.ok(result.parts.every((part) => world.getBlock(part.x, part.y, part.z) === BLOCK.AIR));
  assert.equal(MAX_HEARTHGUARDS, 8);
});

test('Forged Iron storage is reversible and the Hearthguard Core has an exact shaped recipe', () => {
  assert.equal(BLOCKS[BLOCK.FORGED_IRON_BLOCK].texture, 107);
  assert.equal(BLOCKS[BLOCK.HEARTHGUARD_CORE].texture, 110);
  assert.deepEqual(blockDrops(BLOCK.FORGED_IRON_BLOCK), [BLOCK.FORGED_IRON_BLOCK]);
  assert.deepEqual(blockDrops(BLOCK.HEARTHGUARD_CORE), [BLOCK.HEARTHGUARD_CORE]);
  const packed = matchCraftingRecipe(Array(9).fill('iron_ingot'), 3, 'table');
  assert.equal(packed.id, 'forged_iron_block');
  assert.equal(matchCraftingRecipe([BLOCK.FORGED_IRON_BLOCK], 1, 'hand').id, 'unpack_forged_iron');
  assert.equal(matchCraftingRecipe(['iron_ingot', BLOCK.PLANKS, 'iron_ingot', BLOCK.PLANKS, 'lumen_shard', BLOCK.PLANKS, 'iron_ingot', BLOCK.PLANKS, 'iron_ingot'], 3, 'table').id, 'hearthguard_core');

  const inventory = new Inventory({ counts: [['iron_ingot', 9]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'forged_iron_block'), 'table'), true);
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'unpack_forged_iron'), 'hand'), true);
  assert.equal(inventory.count('iron_ingot'), 9);
});

test('Hearthguards are original persistent constructs that seek and strike nearby hostiles', () => {
  assert.equal(CREATURES.hearthguard.guardian, true);
  assert.equal(CREATURES.hearthguard.constructed, true);
  assert.equal(realmSpawnProfile('plains').passive.includes('hearthguard'), false, 'constructed guardians never spawn naturally');
  const world = new MockWorld();
  const player = { position: new THREE.Vector3(0, 21, 5), inWater: false };
  const manager = new EntityManager(new THREE.Scene(), world, player, 113);
  manager.spawnTimer = 999;
  const guard = manager.spawn('hearthguard', 0.5, 0.5, { y: 21, persistent: true, homeX: 0.5, homeY: 21, homeZ: 0.5 });
  const hostile = manager.spawn('duskling', 1.45, 0.5, { persistent: true });
  assert.equal(guard.root.name, 'Hearthguard');
  assert.ok(guard.root.getObjectByName('hearth-core'));
  assert.equal(guard.root.userData.guardArms.length, 2);
  const before = hostile.health;
  manager.update(0.05, 0);
  assert.equal(hostile.health, before - CREATURES.hearthguard.damage);
  assert.ok(guard.attackCooldown > 0);
  assert.equal(companionAttackAllowed(guard, false), false);
  assert.equal(companionAttackAllowed(guard, true), true);
  assert.equal(tetherEligible(guard), false);
  guard.health = 31;
  assert.deepEqual(manager.repairGuardian(guard, 'iron_ingot'), { repaired: 15, health: 46, maximum: 60 });
  assert.equal(manager.repairGuardian(guard, BLOCK.FORGED_IRON_BLOCK), null);

  const saved = manager.serialize().find(({ type }) => type === 'hearthguard');
  assert.equal(saved.y, guard.root.position.y);
  const restored = new EntityManager(new THREE.Scene(), world, player, 113);
  assert.equal(restored.restore([saved]), 1);
  assert.equal(restored.entities[0].type, 'hearthguard');
  assert.equal(restored.entities[0].persistent, true);
});

test('defeated Hearthguards return their unique core plus a bounded iron salvage', () => {
  const world = new MockWorld();
  const drops = [];
  const manager = new EntityManager(new THREE.Scene(), world, { position: new THREE.Vector3(0, 21, 2), inWater: false }, 114, {
    onDrop: (id, count) => drops.push({ id, count }),
  });
  manager.spawnTimer = 999;
  const guard = manager.spawn('hearthguard', 0.5, 0.5, { y: 21, persistent: true });
  assert.equal(manager.attack(guard, guard.maximumHealth), true);
  assert.ok(drops.some(({ id, count }) => id === BLOCK.HEARTHGUARD_CORE && count === 1));
  assert.ok(drops.some(({ id, count }) => id === 'iron_ingot' && count >= 2 && count <= 4));
});
