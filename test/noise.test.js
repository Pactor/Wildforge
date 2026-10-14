import assert from 'node:assert/strict';
import test from 'node:test';
import { coordinateRandom, fbm2, fbm3, seedFromString, valueNoise2, valueNoise3 } from '../src/noise.js';

test('world seeds are stable and distinct', () => {
  assert.equal(seedFromString('wildforge'), seedFromString('wildforge'));
  assert.notEqual(seedFromString('wildforge'), seedFromString('another-world'));
});

test('noise generation is deterministic and bounded', () => {
  const samples = Array.from({ length: 100 }, (_, i) => fbm2(i / 9, -i / 13, 12345, 5));
  assert.deepEqual(samples, Array.from({ length: 100 }, (_, i) => fbm2(i / 9, -i / 13, 12345, 5)));
  assert.ok(samples.every((value) => value >= 0 && value <= 1));
});

test('coordinate random does not depend on evaluation order', () => {
  const forward = Array.from({ length: 50 }, (_, i) => coordinateRandom(i, i * -3, 91, 7));
  const reverse = Array.from({ length: 50 }, (_, i) => coordinateRandom(49 - i, (49 - i) * -3, 91, 7)).reverse();
  assert.deepEqual(forward, reverse);
});

test('value noise is continuous at cell boundaries', () => {
  const left = valueNoise2(4.99999, 8.25, 77);
  const right = valueNoise2(5.00001, 8.25, 77);
  assert.ok(Math.abs(left - right) < 0.001);
});

test('3D cave noise is deterministic, bounded, and continuous', () => {
  const first = valueNoise3(4.99999, 2.4, -8.1, 912);
  const second = valueNoise3(5.00001, 2.4, -8.1, 912);
  assert.ok(Math.abs(first - second) < 0.001);
  const samples = Array.from({ length: 50 }, (_, i) => fbm3(i / 7, i / 11, -i / 9, 88));
  assert.ok(samples.every((value) => value >= 0 && value <= 1));
  assert.deepEqual(samples, Array.from({ length: 50 }, (_, i) => fbm3(i / 7, i / 11, -i / 9, 88)));
});
