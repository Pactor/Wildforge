import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK } from '../src/blocks.js';
import { ladderVerticalSpeed, movementSpeed, PlayerController } from '../src/player.js';

function stepHeightFor(blockHeight) {
  const controller = {
    radius: 0.3,
    height: 1.8,
    collisionBoxesAt: PlayerController.prototype.collisionBoxesAt,
    world: {
      collisionHeight(x, y, z) {
        return x === 1 && y === 1 && z === 0 ? blockHeight : 0;
      },
      isSolid() { return false; },
    },
  };
  return PlayerController.prototype.stepHeight.call(controller, new THREE.Vector3(0.8, 1, 0.5));
}

test('automatic stepping climbs slabs but cannot climb fences or walls', () => {
  assert.equal(stepHeightFor(0.5), 0.5);
  assert.equal(stepHeightFor(1.5), null);
});

test('holding jump lets a rising swimmer climb a one-block shoreline', () => {
  const controller = {
    radius: 0.3,
    height: 1.8,
    inWater: true,
    keys: new Set(['Space']),
    position: new THREE.Vector3(0.5, 1, 0.5),
    velocity: new THREE.Vector3(2, 2.5, 0),
    crouching: false,
    world: {
      collisionBoxes(x, y, z) {
        return x === 1 && y === 1 && z === 0 ? [[0, 0, 0, 1, 1, 1]] : [];
      },
    },
    collisionBoxesAt: PlayerController.prototype.collisionBoxesAt,
    collides(position) {
      return position.x + this.radius > 1 && position.y < 2;
    },
    stepHeight: PlayerController.prototype.stepHeight,
  };
  PlayerController.prototype.moveAxis.call(controller, 'x', 0.35);
  assert.equal(controller.position.x, 0.85);
  assert.equal(controller.position.y, 2.01);
  assert.equal(controller.velocity.x, 2);
});

test('shoreline assist handles a swimmer whose feet are below the block top', () => {
  const controller = {
    radius: 0.3,
    height: 1.8,
    inWater: true,
    keys: new Set(['Space']),
    position: new THREE.Vector3(0.5, 0.7, 0.5),
    velocity: new THREE.Vector3(2, 2.5, 0),
    crouching: false,
    world: {
      collisionBoxes(x, y, z) {
        return x === 1 && y === 1 && z === 0 ? [[0, 0, 0, 1, 1, 1]] : [];
      },
    },
    collisionBoxesAt: PlayerController.prototype.collisionBoxesAt,
    collides(position) {
      return position.x + this.radius > 1 && position.y < 2;
    },
    stepHeight: PlayerController.prototype.stepHeight,
  };
  PlayerController.prototype.moveAxis.call(controller, 'x', 0.35);
  assert.equal(controller.position.x, 0.85);
  assert.equal(controller.position.y, 2.01);
});

test('saved spawn points drive respawn with an obstructed fallback', () => {
  const controller = {
    world: { terrainHeight() { return 10; } },
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(2, 3, 4),
    fallDistance: 9,
    spawnPoint: null,
    collides() { return false; },
    syncCamera() {},
  };
  assert.equal(PlayerController.prototype.setSpawn.call(controller, new THREE.Vector3(4, 5, 6)), true);
  PlayerController.prototype.respawn.call(controller);
  assert.deepEqual(controller.position.toArray(), [4, 5, 6]);
  assert.deepEqual(controller.velocity.toArray(), [0, 0, 0]);
  controller.collides = (position) => position.x === 4;
  PlayerController.prototype.respawn.call(controller);
  assert.deepEqual(controller.position.toArray(), [0.5, 13, 0.5]);
});

test('landing reports meaningful fall distance for farmland trampling hooks', () => {
  let landed = 0;
  const controller = {
    position: new THREE.Vector3(0.5, 2, 0.5),
    velocity: new THREE.Vector3(0, -4, 0),
    fallDistance: 1.4,
    grounded: false,
    onDamage() {},
    onLand: (distance) => { landed = distance; },
    collides() { return true; },
  };
  PlayerController.prototype.moveAxis.call(controller, 'y', -0.2);
  assert.equal(landed, 1.4);
  assert.equal(controller.fallDistance, 0);
  assert.equal(controller.grounded, true);
});

test('crouching lowers the player and cannot stand into a low ceiling', () => {
  const controller = {
    crouching: false,
    standingHeight: 1.8,
    crouchedHeight: 1.5,
    height: 1.8,
    standingEyeHeight: 1.62,
    crouchedEyeHeight: 1.28,
    eyeHeight: 1.62,
    position: new THREE.Vector3(0.5, 1, 0.5),
    collides() { return this.height > 1.5; },
    syncCamera() {},
  };
  assert.equal(PlayerController.prototype.setCrouching.call(controller, true), true);
  assert.equal(controller.height, 1.5);
  assert.equal(controller.eyeHeight, 1.28);
  assert.equal(PlayerController.prototype.setCrouching.call(controller, false), false);
  assert.equal(controller.crouching, true);
  assert.equal(controller.height, 1.5);
  controller.collides = () => false;
  assert.equal(PlayerController.prototype.setCrouching.call(controller, false), true);
  assert.equal(controller.height, 1.8);
  assert.equal(controller.eyeHeight, 1.62);
});

test('sneaking uses shape-aware support and refuses to walk off a ledge', () => {
  const controller = {
    radius: 0.3,
    height: 1.5,
    crouching: true,
    position: new THREE.Vector3(0.5, 1, 0.5),
    velocity: new THREE.Vector3(2, 0, 0),
    world: {
      collisionBoxes(x, y, z) {
        return x === 0 && y === 0 && z === 0 ? [[0, 0, 0, 1, 1, 1]] : [];
      },
    },
    collisionBoxesAt: PlayerController.prototype.collisionBoxesAt,
    collides() { return false; },
    hasSupport: PlayerController.prototype.hasSupport,
  };
  assert.equal(PlayerController.prototype.hasSupport.call(controller, controller.position), true);
  PlayerController.prototype.moveAxis.call(controller, 'x', 0.8);
  assert.equal(controller.position.x, 0.5);
  assert.equal(controller.velocity.x, 0);
});

test('liquid state distinguishes water from hazardous lava at body and eye height', () => {
  const controller = {
    position: new THREE.Vector3(2.5, 4, 2.5),
    eyeHeight: 1.62,
    world: {
      getBlock(x, y) { return y > 5 ? BLOCK.LAVA : BLOCK.WATER; },
    },
  };
  PlayerController.prototype.updateLiquidState.call(controller);
  assert.equal(controller.inWater, true);
  assert.equal(controller.inLava, false);
  assert.equal(controller.inLiquid, true);
  assert.equal(controller.submerged, false);
  assert.equal(controller.submergedLava, true);
});

test('partial fluid height does not submerge body samples above shallow flow', () => {
  const controller = {
    position: new THREE.Vector3(0.5, 5, 0.5),
    eyeHeight: 1.62,
    world: { getBlock: () => BLOCK.WATER_7 },
  };
  PlayerController.prototype.updateLiquidState.call(controller);
  assert.equal(controller.inWater, false);
  assert.equal(controller.submerged, false);
  controller.world.getBlock = () => BLOCK.WATER;
  PlayerController.prototype.updateLiquidState.call(controller);
  assert.equal(controller.inWater, true);
});

test('raising a shield has a distinct slow stance and takes priority over sprinting', () => {
  assert.equal(movementSpeed({}), 4.6);
  assert.equal(movementSpeed({ sprinting: true }), 7.2);
  assert.equal(movementSpeed({ blocking: true, sprinting: true }), 1.95);
  assert.ok(movementSpeed({ blocking: true }) < movementSpeed({ crouching: true }));
  assert.ok(Math.abs(movementSpeed({ sprinting: true, speedMultiplier: 1.22 }) - 8.784) < 1e-9);
});

test('ladder contact enables bounded climbing, descent, and fall arrest', () => {
  const controller = {
    world: { getBlock(x, y, z) { return x === 0 && y >= 1 && y <= 2 && z === 0 ? BLOCK.LADDER_N : BLOCK.AIR; } },
    position: new THREE.Vector3(0.5, 1, 0.5),
    radius: 0.3,
    height: 1.8,
    inLiquid: false,
    climbing: false,
    ladder: null,
  };
  const contact = PlayerController.prototype.updateClimbingState.call(controller);
  assert.equal(contact.orientation, 'n');
  assert.equal(controller.climbing, true);
  assert.equal(movementSpeed(controller), 2.5);
  assert.equal(ladderVerticalSpeed(new Set(['KeyW'])), 3.4);
  assert.equal(ladderVerticalSpeed(new Set(['Space'])), 3.4);
  assert.equal(ladderVerticalSpeed(new Set(['ShiftLeft'])), -2.7);
  assert.equal(ladderVerticalSpeed(new Set()), -0.42);
  controller.inLiquid = true;
  assert.equal(PlayerController.prototype.updateClimbingState.call(controller), null);
  assert.equal(controller.climbing, false);
});
