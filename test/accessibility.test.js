import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { soundCaptionText, spatialCaptionDirection } from '../src/accessibility.js';
import { BlockParticles } from '../src/effects.js';

test('spatial captions report stable listener-relative eight-way directions', () => {
  const listener = { x: 0, z: 0 };
  const forward = { x: 0, z: -1 };
  assert.equal(spatialCaptionDirection(listener, { x: 0, z: -8 }, forward), 'ahead');
  assert.equal(spatialCaptionDirection(listener, { x: 8, z: 0 }, forward), 'right');
  assert.equal(spatialCaptionDirection(listener, { x: -8, z: 0 }, forward), 'left');
  assert.equal(spatialCaptionDirection(listener, { x: 0, z: 8 }, forward), 'behind');
  assert.equal(spatialCaptionDirection(listener, { x: 0.1, z: 0.1 }, forward), 'nearby');
  assert.equal(soundCaptionText('Riftstalker', 'attack', listener, { x: 8, z: 0 }, forward), 'Riftstalker attacks · right · 8m');
});

test('reduced particle motion keeps concise action feedback and suppresses ambient smoke', () => {
  const scene = new THREE.Scene();
  const particles = new BlockParticles(scene);
  assert.equal(particles.setReducedMotion(true), true);
  particles.burst(new THREE.Vector3(), 0xffffff, 20);
  assert.equal(particles.particles.length, 2);
  assert.ok(particles.particles.every((particle) => particle.velocity.length() < 1));
  particles.smoke(new THREE.Vector3(), 5);
  assert.equal(particles.particles.length, 2);
  particles.update(1);
  assert.equal(particles.particles.length, 0);
});
