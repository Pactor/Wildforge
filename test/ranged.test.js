import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK } from '../src/blocks.js';
import { bowShot, ProjectileManager } from '../src/ranged.js';

test('bow charge curves from a minimum draw to a stronger full-power shot', () => {
  assert.equal(bowShot(0.1), null);
  const partial = bowShot(0.5);
  const full = bowShot(1);
  assert.ok(partial.power > 0 && partial.power < 1);
  assert.ok(full.damage > partial.damage);
  assert.ok(full.speed > partial.speed);
  assert.ok(full.knockback > partial.knockback);
  assert.deepEqual(bowShot(5), full);
});

test('projectile substeps hit creatures and solid voxels without tunneling', () => {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 5, 0);
  camera.updateMatrixWorld(true);
  const target = { id: 1 };
  let damage = 0;
  const entities = {
    entityAtPoint(point) { return point.z < -1.5 ? target : null; },
    attack(entity, amount) { assert.equal(entity, target); damage = amount; return true; },
  };
  const impacts = [];
  const full = bowShot(1);
  const manager = new ProjectileManager(
    new THREE.Scene(),
    { getBlock() { return BLOCK.AIR; } },
    entities,
    (entity) => impacts.push(entity),
  );
  manager.shoot(camera, full);
  manager.update(0.1);
  assert.equal(damage, full.damage);
  assert.deepEqual(impacts, [target]);
  assert.equal(manager.projectiles.length, 0);

  const terrainImpacts = [];
  const terrainManager = new ProjectileManager(
    new THREE.Scene(),
    { getBlock(x, y, z) { return z < -1.2 ? BLOCK.STONE : BLOCK.AIR; } },
    { entityAtPoint() { return null; } },
    (entity) => terrainImpacts.push(entity),
  );
  terrainManager.shoot(camera, full);
  terrainManager.update(0.1);
  assert.deepEqual(terrainImpacts, [null]);
  assert.equal(terrainManager.projectiles.length, 0);
});
