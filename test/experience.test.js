import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK } from '../src/blocks.js';
import {
  blockExperience,
  ExperienceState,
  ExperienceWispManager,
  experienceForNextLevel,
  smeltingExperience,
} from '../src/experience.js';

test('experience uses a rising deterministic level curve and persists exact progress', () => {
  assert.equal(experienceForNextLevel(0), 8);
  assert.ok(experienceForNextLevel(12) > experienceForNextLevel(3));
  const experience = new ExperienceState();
  assert.deepEqual(experience.add(20), { added: 20, levelsGained: 2, level: 2, progress: 0 });
  experience.add(5);
  const restored = new ExperienceState(experience.serialize());
  assert.equal(restored.level, 2);
  assert.equal(restored.progress, 5);
  assert.equal(restored.totalCollected, 25);
  assert.equal(restored.ratio(), 5 / experienceForNextLevel(2));
});

test('level spending is atomic and death loss preserves the retained point total', () => {
  const experience = new ExperienceState();
  experience.add(80);
  assert.equal(experience.spendLevels(experience.level + 1), false);
  const levelBefore = experience.level;
  assert.equal(experience.spendLevels(1), true);
  assert.equal(experience.level, levelBefore - 1);
  experience.add(25);
  const pointsBefore = experience.currentPoints();
  const lost = experience.dropOnDeath(0.65, 100);
  assert.equal(lost, Math.floor(pointsBefore * 0.65));
  assert.equal(experience.currentPoints(), pointsBefore - lost);
});

test('valuable blocks and furnace recipes expose bounded experience rewards', () => {
  assert.equal(blockExperience(BLOCK.DIRT), 0);
  assert.equal(blockExperience(BLOCK.COAL), 1);
  assert.equal(blockExperience(BLOCK.IRON_ORE), 2);
  assert.equal(blockExperience(BLOCK.VOIDGLASS_ORE), 8);
  assert.equal(blockExperience(BLOCK.CINDER_CRYSTAL_ORE), 10);
  assert.equal(blockExperience(BLOCK.SHADOW_DEN), 6);
  assert.equal(smeltingExperience('glass'), 1);
  assert.equal(smeltingExperience('emberite_ingot'), 4);
  assert.equal(smeltingExperience('unknown'), 0);
});

test('experience wisps attract to the player and combine into collected value', () => {
  const player = { position: new THREE.Vector3(0, 1, 0) };
  let collected = 0;
  const manager = new ExperienceWispManager(new THREE.Scene(), { isSolid: () => false }, player, (value) => { collected += value; });
  assert.equal(manager.spawn(25, new THREE.Vector3(2, 1, 0)), 3);
  for (const wisp of manager.wisps) {
    wisp.age = 0.5;
    wisp.velocity.set(0, 0, 0);
  }
  for (let index = 0; index < 60 && manager.wisps.length; index += 1) manager.update(0.05);
  assert.equal(collected, 25);
  assert.equal(manager.wisps.length, 0);
  assert.equal(manager.root.children.length, 0);
});
