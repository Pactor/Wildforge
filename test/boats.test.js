import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK } from '../src/blocks.js';
import { BoatManager, boatSurfaceY } from '../src/boats.js';

class TestWaterWorld {
  getBlock(x, y, z) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    return y === 16 && Math.abs(x) <= 4 && Math.abs(z) <= 4 ? BLOCK.WATER : BLOCK.AIR;
  }
}

function testPlayer() {
  return {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    collides: () => false,
    syncs: 0,
    syncCamera() { this.syncs += 1; },
  };
}

test('boats require broad open water and reject overlapping launches', () => {
  const world = new TestWaterWorld();
  assert.equal(boatSurfaceY(world, 0, 0, 16), 16.82);
  assert.equal(boatSurfaceY(world, 8, 0, 16), null);
  const manager = new BoatManager(new THREE.Scene(), world);
  const boat = manager.place(0, 16, 0, 0);
  assert.ok(boat);
  assert.equal(manager.place(0, 16, 0, 0), null);
  assert.equal(manager.place(5, 16, 0, 0), null, 'shoreline placement needs water under the full hull');
});

test('mounted boats accelerate, steer, float, synchronize riders, and dismount safely', () => {
  let paddleSounds = 0;
  const manager = new BoatManager(new THREE.Scene(), new TestWaterWorld(), null, { onPaddle: () => { paddleSounds += 1; } });
  const boat = manager.place(0, 16, 2, 0);
  const player = testPlayer();
  assert.equal(manager.mount(boat, player), true);
  assert.equal(manager.mount(boat, player), false);
  const keys = new Set(['KeyW', 'KeyA']);
  for (let step = 0; step < 24; step += 1) manager.update(0.05, keys, player);
  assert.ok(boat.velocity > 0);
  assert.notEqual(boat.yaw, 0);
  assert.ok(boat.model.position.z < 2.5);
  assert.ok(Math.abs(boat.model.position.y - 16.82) < 0.01);
  assert.equal(player.position.x, boat.model.position.x);
  assert.equal(player.position.z, boat.model.position.z);
  assert.ok(player.syncs > 0 && paddleSounds > 0);
  assert.equal(manager.unmount(player), true);
  assert.equal(manager.mounted, null);
  assert.ok(player.position.distanceTo(boat.model.position) > 1);
});

test('boats stop at shorelines, persist motion state, and can be recovered', () => {
  const world = new TestWaterWorld();
  const manager = new BoatManager(new THREE.Scene(), world);
  const boat = manager.place(0, 16, 3, 0);
  boat.velocity = -2;
  for (let step = 0; step < 100; step += 1) manager.update(0.05);
  assert.ok(boat.model.position.z < 4.5, 'the hull must not cross onto dry shoreline blocks');
  const saved = manager.serialize();
  const restored = new BoatManager(new THREE.Scene(), world, saved);
  assert.equal(restored.boats.length, 1);
  assert.ok(Number.isFinite(restored.boats[0].velocity));
  const position = restored.remove(restored.boats[0]);
  assert.ok(position instanceof THREE.Vector3);
  assert.equal(restored.boats.length, 0);
});
