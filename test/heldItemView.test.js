import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK } from '../src/blocks.js';
import { heldItemPose, heldItemProfile, HeldItemView } from '../src/heldItemView.js';

test('held-item profiles cover blocks and every important interaction silhouette', () => {
  assert.equal(heldItemProfile(null).type, 'hand');
  assert.equal(heldItemProfile(BLOCK.STONE).type, 'block');
  assert.equal(heldItemProfile('iron_pickaxe').type, 'pickaxe');
  assert.equal(heldItemProfile('emberite_axe').type, 'axe');
  assert.equal(heldItemProfile('stone_shovel').type, 'shovel');
  assert.equal(heldItemProfile('voidglass_hoe').type, 'hoe');
  assert.equal(heldItemProfile('iron_sword').type, 'sword');
  assert.equal(heldItemProfile('warden_maul').type, 'maul');
  assert.equal(heldItemProfile('windbow').type, 'bow');
  assert.equal(heldItemProfile('tide_rod').type, 'rod');
  assert.equal(heldItemProfile('moss_shears').type, 'shears');
  assert.equal(heldItemProfile('wayfinder_compass').type, 'compass');
  assert.equal(heldItemProfile('trailchart').type, 'map');
  assert.equal(heldItemProfile('water_pail').type, 'pail');
  assert.equal(heldItemProfile('bread').type, 'consumable');
});

test('first-person poses are bounded and react to movement, actions, draw, and blocking', () => {
  const idle = heldItemPose({ time: 1 });
  const active = heldItemPose({ time: 1, moving: true, sprinting: true, mining: true, attack: 0.5, bowCharge: 1, blocking: true });
  assert.notDeepEqual(active, idle);
  assert.ok(active.x >= 0.3 && active.x <= 0.65);
  assert.ok(active.y >= -0.7 && active.y <= -0.3);
  assert.equal(active.bow, 1);
  assert.ok(active.shieldY > idle.shieldY);
});

test('reduced-motion held poses remove bob while retaining subdued action feedback', () => {
  const ordinary = heldItemPose({ time: 0.4, moving: true, sprinting: true, mining: true, attack: 0.5 });
  const reduced = heldItemPose({ time: 0.4, moving: true, sprinting: true, mining: true, attack: 0.5, reducedMotion: true });
  const resting = heldItemPose({ time: 0.4 });
  assert.equal(reduced.x, resting.x);
  assert.ok(Math.abs(reduced.rotationY - resting.rotationY) < Math.abs(ordinary.rotationY - resting.rotationY));
  assert.ok(reduced.y > ordinary.y, 'reduced sprint lowering should be smaller');
});

test('held-item runtime rebuilds only on selection changes and animates bow and shield state', () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const view = new HeldItemView(scene, camera);
  view.update(0.016, { id: 'windbow', visible: true, bowCharge: 0.8, hasShield: true, blocking: true, cosmetic: { primary: 0xf0c64a } });
  const firstChildren = [...view.itemRoot.children];
  assert.equal(view.root.visible, true);
  assert.equal(view.shieldRoot.visible, true);
  assert.ok(view.itemRoot.scale.z > 1);
  assert.equal(view.cuff.material.color.getHex(), 0xf0c64a);
  view.update(0.016, { id: 'windbow', visible: true, bowCharge: 0.2 });
  assert.deepEqual(view.itemRoot.children, firstChildren);
  view.update(0.016, { id: BLOCK.STONE, visible: false });
  assert.equal(view.profile.type, 'block');
  assert.equal(view.root.visible, false);
  assert.equal(view.shieldRoot.visible, false);
});
