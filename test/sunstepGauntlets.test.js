import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { CircuitSystem } from '../src/circuits.js';
import { VoxelWorld } from '../src/world.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

function firstGauntlet(world) {
  for (let cellZ = -24; cellZ <= 24; cellZ += 1) {
    for (let cellX = -24; cellX <= 24; cellX += 1) {
      const gauntlet = world.sunstepGauntletForCell(cellX, cellZ);
      if (gauntlet) return gauntlet;
    }
  }
  return null;
}

test('Sunstep Gauntlets deterministically author two sealed gates, live nodes, light, and one-time loot', () => {
  globalThis.localStorage = new MemoryStorage();
  const first = new VoxelWorld(new THREE.Scene(), 42075);
  const second = new VoxelWorld(new THREE.Scene(), 42075);
  const gauntlet = firstGauntlet(first);
  assert.ok(gauntlet, 'expected a deterministic Sunstep Gauntlet');
  assert.deepEqual(gauntlet, second.sunstepGauntletForCell(gauntlet.cellX, gauntlet.cellZ));
  const features = first.sunstepGauntletFeatures(gauntlet);
  assert.equal(features.plates.length, 2);
  assert.equal(features.relays.length, 2);
  assert.deepEqual(features.relays.map(({ delayIndex }) => delayIndex), [3, 1]);
  assert.deepEqual(first.sunstepGauntletOpen(gauntlet), [false, false]);
  for (const gate of features.gates) {
    assert.equal(first.getBlock(gate.x, gate.y, gate.z), BLOCK.SUNSTEP_GATE_CLOSED);
    assert.equal(first.getBlock(gate.x, gate.y + 1, gate.z), BLOCK.AIR);
    assert.deepEqual(first.collisionBoxes(gate.x, gate.y, gate.z), [[0, 0, 0, 1, 2, 1]]);
  }
  assert.equal(first.getBlock(features.chest.x, features.chest.y, features.chest.z), BLOCK.CHEST);
  assert.equal(first.generatedCircuitNodesNear(gauntlet.originX, gauntlet.originZ, 24).length, features.nodes.length);
  const loot = first.generatedContainerLoot(features.chest.x, features.chest.y, features.chest.z);
  assert.deepEqual(loot, second.generatedContainerLoot(features.chest.x, features.chest.y, features.chest.z));
  assert.equal(loot.key, gauntlet.key);
  assert.ok(loot.items.some(({ id }) => id === 'forge_ram'));
  assert.ok(loot.items.some(({ id }) => id === 'sun_eye'));
  assert.ok(first.generatedLightsNear(gauntlet.originX, gauntlet.originZ, 24)
    .some(({ x, y, z }) => x === features.lantern.x && y === features.lantern.y && z === features.lantern.z));
  assert.equal(BLOCKS[BLOCK.SUNSTEP_GATE_CLOSED].breakable, false);
  assert.equal(BLOCKS[BLOCK.SUNSTEP_GATE_OPEN].solid, false);
});

test('the authored two-stage handoff opens both gates and fully resets for another attempt', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 42075);
  const gauntlet = firstGauntlet(world);
  const features = world.sunstepGauntletFeatures(gauntlet);
  const circuits = new CircuitSystem(world);
  assert.equal(circuits.discover(features.nodes), features.nodes.length);
  assert.equal(circuits.discover(features.nodes), 0);
  assert.deepEqual(circuits.serialize().relays.map(([, delay]) => delay).sort(), [1, 3]);

  const actorA = { x: features.plates[0].x + 0.5, y: features.plates[0].y, z: features.plates[0].z + 0.5 };
  circuits.update(0.1, { actors: [actorA] });
  circuits.update(1.89, { actors: [actorA] });
  assert.deepEqual(world.sunstepGauntletOpen(gauntlet), [false, false]);
  circuits.update(0.02, { actors: [actorA] });
  assert.deepEqual(world.sunstepGauntletOpen(gauntlet), [true, false]);

  const actorB = { x: features.plates[1].x + 0.5, y: features.plates[1].y, z: features.plates[1].z + 0.5 };
  circuits.update(0.1, { actors: [actorB] });
  assert.deepEqual(world.sunstepGauntletOpen(gauntlet), [true, false], 'the interior plate must hold the first gate during handoff');
  circuits.update(0.41, { actors: [actorB] });
  assert.deepEqual(world.sunstepGauntletOpen(gauntlet), [true, true]);

  circuits.update(0.1, { actors: [] });
  circuits.update(0.51, { actors: [] });
  assert.deepEqual(world.sunstepGauntletOpen(gauntlet), [true, false], 'the first relay must preserve its full falling-edge grace period');
  circuits.update(1.5, { actors: [] });
  assert.deepEqual(world.sunstepGauntletOpen(gauntlet), [false, false]);
  assert.deepEqual(world.collisionBoxes(features.gates[0].x, features.gates[0].y, features.gates[0].z), [[0, 0, 0, 1, 2, 1]]);

  circuits.update(0.1, { actors: [actorA] });
  circuits.update(2.01, { actors: [actorA] });
  assert.equal(world.sunstepGauntletOpen(gauntlet)[0], true, 'the reset mechanism must be immediately reusable');
});
