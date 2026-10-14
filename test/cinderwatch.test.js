import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { CinderwatchState } from '../src/cinderwatch.js';
import { EntityManager } from '../src/entities.js';
import { discoverLandmarks } from '../src/navigation.js';
import { CINDERREACH_ORIGIN, REALM, realmAt } from '../src/realms.js';
import { CHUNK_SIZE, VoxelWorld } from '../src/world.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

function firstWatch(world, radius = 640) {
  return world.cinderwatchesNear(CINDERREACH_ORIGIN.x, CINDERREACH_ORIGIN.z, radius)[0] || null;
}

test('Cinderwatches deterministically author a rotated multi-chunk sheltered dungeon and realm reward', () => {
  globalThis.localStorage = new MemoryStorage();
  const first = new VoxelWorld(new THREE.Scene(), 9173);
  const second = new VoxelWorld(new THREE.Scene(), 9173);
  const watch = firstWatch(first);
  assert.ok(watch, 'expected a deterministic Cinderwatch near the arrival rift');
  assert.deepEqual(watch, second.cinderwatchForCell(watch.cellX, watch.cellZ));
  assert.equal(realmAt(watch.originX, watch.originZ), REALM.CINDERREACH);
  assert.ok(Math.hypot(watch.originX - CINDERREACH_ORIGIN.x, watch.originZ - CINDERREACH_ORIGIN.z) >= 44);

  const features = first.cinderwatchFeatures(watch);
  assert.equal(first.getBlock(features.entrance.x, features.entrance.y, features.entrance.z), BLOCK.AIR, 'front route must remain open');
  assert.equal(BLOCKS[first.getBlock(watch.originX, watch.ground + 6, watch.originZ)]?.solid, true, 'roof must shelter the interior from realm heat');
  assert.equal(first.getBlock(features.chest.x, features.chest.y, features.chest.z), BLOCK.CHEST);
  for (const light of features.lights) assert.equal(first.getBlock(light.x, light.y, light.z), BLOCK.CINDER_CRYSTAL_ORE);

  const touchedChunks = new Set([
    first.cinderwatchPoint(watch, -6, -10), first.cinderwatchPoint(watch, 6, 8), features.chest,
  ].map((point) => `${Math.floor(point.x / CHUNK_SIZE)},${Math.floor(point.z / CHUNK_SIZE)}`));
  assert.ok(touchedChunks.size > 1, 'known structure must exercise chunk-border generation');
  const loot = first.generatedContainerLoot(features.chest.x, features.chest.y, features.chest.z);
  assert.deepEqual(loot, second.generatedContainerLoot(features.chest.x, features.chest.y, features.chest.z));
  assert.equal(loot.key, watch.key);
  assert.ok(loot.items.some((item) => item.id === 'cinder_shard' && item.count >= 3));
  assert.ok(loot.items.some((item) => item.id === 'ember_gland' && item.count === 1));
  assert.ok(loot.items.some((item) => item.id === 'emberbulb_cutting' && item.count >= 1));
  assert.ok(first.generatedLightsNear(watch.originX, watch.originZ, 24).some((light) => light.x === features.lights[0].x && light.z === features.lights[0].z));
});

test('Cinderwatch discovery is proximity-bounded and Overworld-only landmarks do not leak into Cinderreach', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 9173);
  const watch = firstWatch(world);
  assert.ok(watch);
  const nearby = discoverLandmarks(world, watch.originX, watch.originZ, 48);
  assert.ok(nearby.some((landmark) => landmark.label === 'Cinderwatch' && landmark.id.endsWith(watch.key)));
  assert.equal(nearby.some((landmark) => landmark.label === 'Trailforge Ruin' || landmark.label === 'Buried Echo Vault'), false);
  assert.equal(discoverLandmarks(world, CINDERREACH_ORIGIN.x, CINDERREACH_ORIGIN.z, 24).some((landmark) => landmark.id.endsWith(watch.key)), false);
});

test('two persistent Cinderwatch guardians spawn once and defeat progress survives reload', () => {
  globalThis.localStorage = new MemoryStorage();
  const scene = new THREE.Scene();
  const world = new VoxelWorld(scene, 9173);
  const watch = firstWatch(world);
  const state = new CinderwatchState();
  const player = { position: new THREE.Vector3(watch.originX + 0.5, watch.ground + 2, watch.originZ + 0.5) };
  const manager = new EntityManager(scene, world, player, 9173, {
    cinderwatchRemaining: (key) => state.remaining(key),
    onDefeat: (_type, _experience, _position, entity) => state.recordDefeat(entity.watchKey),
  });
  assert.equal(manager.ensureCinderwatchGuardians(), 2);
  const guardians = manager.entities.filter((entity) => entity.watchKey === watch.key);
  assert.equal(guardians.length, 2);
  assert.ok(guardians.every((entity) => entity.type === 'riftstalker' && entity.persistent));
  for (let tick = 0; tick < 20; tick += 1) manager.update(0.1, 0.8);
  assert.ok(guardians.every((entity) => entity.root.position.y >= watch.ground + 1.75), 'guardians must walk on the raised authored floor');
  assert.equal(manager.ensureCinderwatchGuardians(), 0, 'live guardians must not duplicate');
  for (const guardian of [...guardians]) manager.attack(guardian, 999);
  assert.equal(state.isCleared(watch.key), true);
  assert.equal(manager.ensureCinderwatchGuardians(), 0, 'cleared watch must not refill guardians');
  const restored = new CinderwatchState(state.serialize());
  assert.equal(restored.remaining(watch.key), 0);
  assert.equal(restored.isCleared(watch.key), true);
  assert.equal(new CinderwatchState({ defeats: [['bad', 99], [watch.key, -8], [watch.key, 99]] }).defeated(watch.key), 2);
});
