import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK } from '../src/blocks.js';
import { CircuitSystem } from '../src/circuits.js';
import { VoxelWorld } from '../src/world.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

function firstHall(world) {
  for (let cellZ = -28; cellZ <= 28; cellZ += 1) {
    for (let cellX = -28; cellX <= 28; cellX += 1) {
      const hall = world.sunstepPulseHallForCell(cellX, cellZ);
      if (hall) return hall;
    }
  }
  return null;
}

test('Sunstep Pulse Halls deterministically generate three independently wired rhythm gates and rewards', () => {
  globalThis.localStorage = new MemoryStorage();
  const first = new VoxelWorld(new THREE.Scene(), 76031);
  const second = new VoxelWorld(new THREE.Scene(), 76031);
  const hall = firstHall(first);
  assert.ok(hall, 'expected a deterministic Sunstep Pulse Hall');
  assert.deepEqual(hall, second.sunstepPulseHallForCell(hall.cellX, hall.cellZ));
  const features = first.sunstepPulseHallFeatures(hall);
  assert.equal(features.plates.length, 3);
  assert.equal(features.sequencers.length, 3);
  assert.equal(features.gates.length, 3);
  assert.deepEqual(features.sequencers.map(({ pulseCount }) => pulseCount), [3, 3, 3]);
  assert.deepEqual(first.sunstepPulseHallOpen(hall), [false, false, false]);
  for (const gate of features.gates) assert.deepEqual(first.collisionBoxes(gate.x, gate.y, gate.z), [[0, 0, 0, 1, 2, 1]]);
  assert.equal(first.generatedCircuitNodesNear(hall.originX, hall.originZ, 26).length, features.nodes.length);
  const loot = first.generatedContainerLoot(features.chest.x, features.chest.y, features.chest.z);
  assert.deepEqual(loot, second.generatedContainerLoot(features.chest.x, features.chest.y, features.chest.z));
  assert.equal(loot.key, hall.key);
  assert.ok(loot.items.some(({ id }) => id === 'pulse_sequencer'));
  assert.ok(first.generatedLightsNear(hall.originX, hall.originZ, 26)
    .some(({ x, y, z }) => x === features.lantern.x && y === features.lantern.y && z === features.lantern.z));
});

test('each Pulse Hall stage emits a three-beat retriggerable gate window through the live circuit system', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 76031);
  const hall = firstHall(world);
  const features = world.sunstepPulseHallFeatures(hall);
  const circuits = new CircuitSystem(world);
  assert.equal(circuits.discover(features.nodes), features.nodes.length);
  assert.deepEqual(circuits.serialize().sequencers.map(([, pulses]) => pulses), [3, 3, 3]);

  const actorAt = (index) => ({
    x: features.plates[index].x + 0.5,
    y: features.plates[index].y,
    z: features.plates[index].z + 0.5,
  });
  circuits.update(0.1, { actors: [actorAt(0)] });
  assert.deepEqual(world.sunstepPulseHallOpen(hall), [true, false, false]);
  circuits.update(0.16, { actors: [] });
  assert.deepEqual(world.sunstepPulseHallOpen(hall), [false, false, false]);
  circuits.update(0.25, { actors: [] });
  assert.deepEqual(world.sunstepPulseHallOpen(hall), [true, false, false], 'the second beat must reopen only the first gate');
  circuits.update(1, { actors: [] });
  assert.deepEqual(world.sunstepPulseHallOpen(hall), [false, false, false]);

  circuits.update(0.1, { actors: [actorAt(1)] });
  assert.deepEqual(world.sunstepPulseHallOpen(hall), [false, true, false]);
  circuits.update(1.5, { actors: [] });
  circuits.update(0.1, { actors: [actorAt(0)] });
  assert.equal(world.sunstepPulseHallOpen(hall)[0], true, 'completed stages must remain retriggerable after leaving their plate');
});
