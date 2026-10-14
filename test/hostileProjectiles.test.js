import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK } from '../src/blocks.js';
import { HostileProjectileManager } from '../src/hostileProjectiles.js';

function shooter(position = new THREE.Vector3(0, 20, 0)) {
  const root = new THREE.Group();
  root.position.copy(position);
  return { root, definition: { name: 'Thorncaster' } };
}

test('hostile thorns travel through open space and damage the player once', () => {
  const world = { getBlock: () => BLOCK.AIR };
  const player = { position: new THREE.Vector3(4, 20, 0), velocity: new THREE.Vector3() };
  const hits = [];
  const manager = new HostileProjectileManager(new THREE.Scene(), world, player,
    (damage, source) => hits.push({ damage, source }));
  assert.ok(manager.shoot(shooter(), { speed: 12, damage: 3, gravity: 0 }));
  for (let index = 0; index < 12; index += 1) manager.update(0.05);
  assert.deepEqual(hits, [{ damage: 3, source: 'Thorncaster' }]);
  assert.equal(manager.projectiles.length, 0);
});

test('solid blocks stop hostile thorns before they reach the player', () => {
  const world = { getBlock: (x) => x >= 1.5 && x < 2.5 ? BLOCK.STONE : BLOCK.AIR };
  const player = { position: new THREE.Vector3(4, 20, 0), velocity: new THREE.Vector3() };
  let hits = 0;
  let impacts = 0;
  const manager = new HostileProjectileManager(new THREE.Scene(), world, player,
    () => { hits += 1; }, () => { impacts += 1; });
  manager.shoot(shooter(), { speed: 12, damage: 3, gravity: 0 });
  for (let index = 0; index < 12; index += 1) manager.update(0.05);
  assert.equal(hits, 0);
  assert.equal(impacts, 1);
  assert.equal(manager.projectiles.length, 0);
});

test('hostile projectile cleanup removes every active mesh', () => {
  const manager = new HostileProjectileManager(
    new THREE.Scene(),
    { getBlock: () => BLOCK.AIR },
    { position: new THREE.Vector3(4, 20, 0), velocity: new THREE.Vector3() },
  );
  manager.shoot(shooter(), { speed: 12, damage: 3, gravity: 0 });
  manager.shoot(shooter(), { speed: 12, damage: 3, gravity: 0 });
  manager.clear();
  assert.equal(manager.projectiles.length, 0);
  assert.equal(manager.root.children.length, 0);
});

test('boss bolts carry distinct color and scale while sharing safe projectile physics', () => {
  const manager = new HostileProjectileManager(
    new THREE.Scene(),
    { getBlock: () => BLOCK.AIR },
    { position: new THREE.Vector3(4, 20, 0), velocity: new THREE.Vector3() },
  );
  const projectile = manager.shoot(shooter(), { speed: 10, damage: 5, gravity: 0.5, color: 0xb17be8, projectileScale: 1.65 });
  assert.equal(projectile.mesh.material.color.getHex(), 0xb17be8);
  assert.equal(projectile.mesh.scale.x, 1.65);
  manager.clear();
});
