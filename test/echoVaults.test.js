import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { CREATURES, EntityManager } from '../src/entities.js';
import { Inventory, itemDefinition, RECIPES } from '../src/inventory.js';
import { breakDuration } from '../src/mining.js';
import { EchoVaultState } from '../src/vaults.js';
import { VoxelWorld } from '../src/world.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

function firstVault(world) {
  for (let cellZ = -16; cellZ <= 16; cellZ += 1) {
    for (let cellX = -16; cellX <= 16; cellX += 1) {
      const vault = world.echoVaultForCell(cellX, cellZ);
      if (vault) return vault;
    }
  }
  return null;
}

test('Echo Vaults deterministically generate an accessible sealed dungeon and seeded treasure', () => {
  globalThis.localStorage = new MemoryStorage();
  const first = new VoxelWorld(new THREE.Scene(), 24680);
  const second = new VoxelWorld(new THREE.Scene(), 24680);
  const vault = firstVault(first);
  assert.ok(vault, 'expected a deterministic Echo Vault');
  assert.deepEqual(vault, second.echoVaultForCell(vault.cellX, vault.cellZ));
  const features = first.echoVaultFeatures(vault);
  assert.equal(first.getBlock(features.entry.x, features.entry.y, features.entry.z), BLOCK.WATER);
  assert.equal(first.getBlock(features.trap.x, features.trap.y, features.trap.z), BLOCK.ECHO_SPIKES_ARMED);
  assert.ok(features.seal.every((position) => first.getBlock(position.x, position.y, position.z) === BLOCK.VAULT_SEAL));
  const sideBarrier = first.echoVaultPoint(vault, 5, 4);
  assert.equal(first.getBlock(sideBarrier.x, vault.y + 2, sideBarrier.z), BLOCK.ECHO_BRICK);
  assert.equal(first.getBlock(features.chest.x, features.chest.y, features.chest.z), BLOCK.CHEST);
  const loot = first.generatedContainerLoot(features.chest.x, features.chest.y, features.chest.z);
  assert.deepEqual(loot, second.generatedContainerLoot(features.chest.x, features.chest.y, features.chest.z));
  assert.equal(loot.key, vault.key);
  assert.ok(loot.items.some((item) => item.id === 'lumen_shard' && item.count >= 2));
  assert.ok(first.generatedLightsNear(vault.originX, vault.originZ, 20).some((position) => position.x === features.lights[0].x));
});

test('Echo Vault trap and clear state persist and permanently dissolve the treasure seal', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 7331);
  const vault = firstVault(world);
  const features = world.echoVaultFeatures(vault);
  const events = [];
  const state = new EchoVaultState(world, null, {
    onTrap: (event) => events.push(event),
    onClear: () => events.push({ cleared: true }),
  });
  state.update(1, new THREE.Vector3(features.trap.x + 0.5, features.trap.y + 0.9, features.trap.z + 0.5));
  assert.equal(events[0].damage, 4);
  assert.equal(world.getBlock(features.trap.x, features.trap.y, features.trap.z), BLOCK.ECHO_SPIKES_SPENT);
  assert.equal(state.clear(vault), true);
  assert.equal(state.clear(vault), false);
  assert.ok(features.seal.every((position) => world.getBlock(position.x, position.y, position.z) === BLOCK.AIR));
  const restored = new EchoVaultState(world, state.serialize());
  assert.equal(restored.isTriggered(vault.key), true);
  assert.equal(restored.isCleared(vault.key), true);
});

test('Echo Sentinels spawn once per uncleared vault underground and carry their vault identity through saves', () => {
  const vault = { key: 'echo-vault:0,0', originX: 2, originZ: 0, y: 9 };
  const guardian = { x: 2.5, y: 10, z: 0.5 };
  const world = {
    terrainHeight: () => 25,
    biomeAt: () => ({ id: 'plains' }),
    echoVaultsNear: () => [vault],
    echoVaultFeatures: () => ({ guardian }),
    getBlock: () => BLOCK.AIR,
  };
  const player = { position: new THREE.Vector3(0, 10, 0) };
  const drops = [];
  const defeats = [];
  const manager = new EntityManager(new THREE.Scene(), world, player, 44, {
    onDrop: (id, count) => drops.push({ id, count }),
    onDefeat: (type, amount, _position, entity) => defeats.push({ type, amount, vaultKey: entity.vaultKey }),
  });
  assert.equal(manager.ensureEchoVaultGuardians(), 1);
  assert.equal(manager.ensureEchoVaultGuardians(), 0);
  const sentinel = manager.entities[0];
  assert.equal(sentinel.type, 'echo_sentinel');
  assert.equal(sentinel.root.position.y, guardian.y);
  assert.equal(sentinel.vaultKey, vault.key);
  assert.equal(manager.serialize()[0].vaultKey, vault.key);
  sentinel.hurtTimer = 0;
  assert.equal(manager.attack(sentinel, CREATURES.echo_sentinel.health), true);
  assert.deepEqual(defeats, [{ type: 'echo_sentinel', amount: 18, vaultKey: vault.key }]);
  assert.ok(drops.some((drop) => drop.id === 'echo_core' && drop.count === 1));
  const clearedManager = new EntityManager(new THREE.Scene(), world, player, 44, { isVaultCleared: () => true });
  assert.equal(clearedManager.ensureEchoVaultGuardians(), 0);
});

test('the Echo Sentinel core crafts a durable endgame Echo Chisel', () => {
  assert.equal(BLOCKS[BLOCK.VAULT_SEAL].breakable, false);
  assert.equal(breakDuration(BLOCK.VAULT_SEAL, new Inventory(), null), Infinity);
  assert.equal(breakDuration(BLOCK.ECHO_BRICK, new Inventory({ counts: [['voidglass_pickaxe', 1]] }), 'voidglass_pickaxe'), Infinity);
  assert.equal(itemDefinition('echo_pickaxe').miningTier, 4);
  const recipe = RECIPES.find((candidate) => candidate.id === 'echo_pickaxe');
  assert.ok(recipe);
  assert.equal(matchCraftingRecipe([
    'voidglass_shard', 'echo_core', 'voidglass_shard',
    null, 'stick', null,
    null, 'stick', null,
  ], 3, 'table')?.id, 'echo_pickaxe');
  const inventory = new Inventory({ counts: [['echo_core', 1], ['voidglass_shard', 2], ['stick', 2]] });
  assert.equal(inventory.craft(recipe, 'table'), true);
  assert.deepEqual(inventory.durability('echo_pickaxe'), { remaining: 640, maximum: 640, ratio: 1 });
});
