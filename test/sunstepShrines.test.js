import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { CircuitSystem, ramCanMoveBlock } from '../src/circuits.js';
import { breakDuration } from '../src/mining.js';
import { Inventory } from '../src/inventory.js';
import { VoxelWorld } from '../src/world.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

function firstShrine(world) {
  for (let cellZ = -18; cellZ <= 18; cellZ += 1) {
    for (let cellX = -18; cellX <= 18; cellX += 1) {
      const shrine = world.sunstepShrineForCell(cellX, cellZ);
      if (shrine) return shrine;
    }
  }
  return null;
}

test('Sunstep Shrines deterministically author a sealed live-circuit timing puzzle and one-time reward', () => {
  globalThis.localStorage = new MemoryStorage();
  const first = new VoxelWorld(new THREE.Scene(), 24680);
  const second = new VoxelWorld(new THREE.Scene(), 24680);
  const shrine = firstShrine(first);
  assert.ok(shrine, 'expected a deterministic Sunstep Shrine');
  assert.deepEqual(shrine, second.sunstepShrineForCell(shrine.cellX, shrine.cellZ));
  const features = first.sunstepShrineFeatures(shrine);
  assert.equal(first.getBlock(features.plate.x, features.plate.y, features.plate.z), BLOCK.TRAIL_PLATE_OFF);
  assert.equal(first.getBlock(features.relay.x, features.relay.y, features.relay.z), features.relay.id);
  assert.equal(first.getBlock(features.ram.x, features.ram.y, features.ram.z), features.ram.id);
  assert.equal(first.getBlock(features.keystone.x, features.keystone.y, features.keystone.z), BLOCK.SHRINE_KEYSTONE);
  assert.equal(first.getBlock(features.destination.x, features.destination.y, features.destination.z), BLOCK.AIR);
  assert.equal(first.getBlock(features.entrance.x, features.entrance.y + 1, features.entrance.z), BLOCK.AIR);
  assert.equal(first.getBlock(features.chest.x, features.chest.y, features.chest.z), BLOCK.CHEST);
  assert.equal(first.sunstepShrineSolved(shrine), false);
  assert.equal(first.generatedCircuitNodesNear(shrine.originX, shrine.originZ, 20).length, features.nodes.length);
  const loot = first.generatedContainerLoot(features.chest.x, features.chest.y, features.chest.z);
  assert.deepEqual(loot, second.generatedContainerLoot(features.chest.x, features.chest.y, features.chest.z));
  assert.equal(loot.key, shrine.key);
  assert.ok(loot.items.some((item) => item.id === BLOCK.SUNWIRE_OFF && item.count >= 4));
  assert.ok(loot.items.some((item) => item.id === 'spark_relay' && item.count === 1));
  assert.ok(first.generatedLightsNear(shrine.originX, shrine.originZ, 20).some((position) => position.x === features.lantern.x && position.z === features.lantern.z));
});

test('holding the authored plate through its relay delay moves the keystone sideways and the solved passage persists', () => {
  const storage = new MemoryStorage();
  globalThis.localStorage = storage;
  const world = new VoxelWorld(new THREE.Scene(), 7331);
  const shrine = firstShrine(world);
  const features = world.sunstepShrineFeatures(shrine);
  const moves = [];
  const circuits = new CircuitSystem(world, { onMove: (move) => moves.push(move) });
  assert.equal(circuits.discover(features.nodes), features.nodes.length);
  assert.equal(circuits.discover(features.nodes), 0);
  const actor = { x: features.plate.x + 0.5, y: features.plate.y, z: features.plate.z + 0.5 };
  circuits.update(0.1, { actors: [actor] });
  assert.equal(world.getBlock(features.plate.x, features.plate.y, features.plate.z), BLOCK.TRAIL_PLATE_ON);
  circuits.update(0.39, { actors: [actor] });
  assert.equal(world.sunstepShrineSolved(shrine), false, 'the lock must not open before the default 0.5 second delay');
  circuits.update(0.02, { actors: [actor] });
  assert.equal(world.sunstepShrineSolved(shrine), true);
  assert.equal(moves.length, 1);
  assert.deepEqual(moves[0].from, [features.keystone.x, features.keystone.y, features.keystone.z]);
  assert.deepEqual(moves[0].to, [features.destination.x, features.destination.y, features.destination.z]);
  assert.equal(world.getBlock(features.entrance.x, features.entrance.y, features.entrance.z), BLOCK.AIR);
  assert.equal(world.getBlock(features.entrance.x, features.entrance.y + 1, features.entrance.z), BLOCK.AIR);
  circuits.update(0.1, { actors: [] });
  circuits.update(0.51, { actors: [] });
  assert.equal(BLOCKS[world.getBlock(features.ram.x, features.ram.y, features.ram.z)].powered, false);
  assert.equal(world.sunstepShrineSolved(shrine), true, 'retracting the Ram must not pull the keystone back');

  const restored = new VoxelWorld(new THREE.Scene(), 7331);
  assert.equal(restored.sunstepShrineSolved(shrine), true, 'normal world edits must preserve the solved lock across reconstruction');
});

test('Sunstep shells and locks reject mining bypass while the authored Ram alone may move the keystone', () => {
  assert.equal(BLOCKS[BLOCK.SHRINE_STONE].breakable, false);
  assert.equal(BLOCKS[BLOCK.SHRINE_KEYSTONE].breakable, false);
  assert.equal(breakDuration(BLOCK.SHRINE_STONE, new Inventory(), null), Infinity);
  assert.equal(breakDuration(BLOCK.SHRINE_KEYSTONE, new Inventory({ counts: [['echo_pickaxe', 1]] }), 'echo_pickaxe'), Infinity);
  assert.equal(ramCanMoveBlock(BLOCK.SHRINE_KEYSTONE), true);
  assert.equal(ramCanMoveBlock(BLOCK.SHRINE_STONE), false);
});
