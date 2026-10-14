import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { FISHING_LOOT, FishingSystem, fishingLoot } from '../src/fishing.js';

function sequence(values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

test('casts show a low-poly bobber and transition into a bounded bite window', () => {
  const scene = new THREE.Scene();
  const fishing = new FishingSystem(scene, sequence([0, 0.1, 0]));
  assert.equal(fishing.cast(new THREE.Vector3(2.5, 4.88, -3.5)), true);
  assert.equal(fishing.root.visible, true);
  assert.equal(fishing.line.visible, true);
  assert.equal(fishing.update(2.99, new THREE.Vector3()), null);
  assert.deepEqual(fishing.update(0.02, new THREE.Vector3()), { type: 'bite' });
  assert.equal(fishing.phase, 'bite');
  assert.deepEqual(fishing.reel(), { status: 'caught', loot: { id: 'raw_silverfin', count: 1 } });
  assert.equal(fishing.active, false);
  assert.equal(fishing.root.visible, false);
});

test('early reels cancel safely and missed bite windows escape', () => {
  const early = new FishingSystem(null, () => 0);
  early.cast(new THREE.Vector3());
  assert.deepEqual(early.reel(), { status: 'early' });
  assert.equal(early.active, false);
  const missed = new FishingSystem(null, () => 0);
  missed.cast(new THREE.Vector3());
  assert.deepEqual(missed.update(3.01), { type: 'bite' });
  assert.deepEqual(missed.update(1.66), { type: 'escaped' });
  assert.equal(missed.phase, 'idle');
});

test('fishing loot weights are complete and reach ordinary, salvage, and treasure catches', () => {
  assert.ok(Math.abs(FISHING_LOOT.reduce((sum, entry) => sum + entry.weight, 0) - 1) < 1e-9);
  assert.equal(fishingLoot(sequence([0.1, 0])).id, 'raw_silverfin');
  assert.equal(fishingLoot(sequence([0.8, 0])).id, 'tidefiber');
  assert.equal(fishingLoot(sequence([0.99, 0])).id, 'lumen_shard');
});
