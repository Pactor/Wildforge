import test from 'node:test';
import assert from 'node:assert/strict';
import { compassReading, discoverLandmarks, NavigationState } from '../src/navigation.js';

test('compass bearings use stable world cardinals and camera-relative needle angles', () => {
  const north = compassReading({ x: 0, z: 0 }, { x: 0, z: -10 }, 0);
  assert.equal(north.distance, 10);
  assert.equal(north.direction, 'N');
  assert.equal(north.relative, 0);
  assert.equal(compassReading({ x: 0, z: 0 }, { x: 10, z: 0 }, 0).direction, 'E');
  assert.ok(Math.abs(compassReading({ x: 0, z: 0 }, { x: -10, z: 0 }, 0).relative - Math.PI / 2) < 1e-9);
  assert.ok(compassReading({ x: 0, z: 0 }, { x: 0, z: 10 }, Math.PI - 0.1).relative < 0.2);
});

test('trailmarks are persistent, bounded, sanitized, selectable, and removable nearby', () => {
  const navigation = new NavigationState(null, { x: 4.5, z: -3.5 });
  const mark = navigation.addTrailmark(10.2, 12.8, '<b>River\nCamp</b>');
  assert.equal(mark.label, 'b River Camp /b');
  assert.equal(navigation.active().id, mark.id);
  assert.equal(navigation.removeNearest(0, 0), null);
  assert.equal(navigation.removeNearest(10, 13).id, mark.id);
  for (let index = 0; index < 30; index += 1) navigation.addTrailmark(index, index);
  assert.equal(navigation.trailmarks.length, 24);
  assert.equal(navigation.addTrailmark(99, 99), null);
  const restored = new NavigationState(navigation.serialize(), { x: 999, z: 999 });
  assert.equal(restored.origin.x, 4.5);
  assert.equal(restored.trailmarks.length, 24);
  assert.equal(restored.cycle(restored.targets()).id, restored.origin.id, 'cycling after the last trailmark wraps to origin');
});

test('bounded landmark clues deduplicate world discoveries and persist them', () => {
  const world = {
    ruinsNear: () => [{ key: 'ruin:1', originX: 12, originZ: 8 }, { key: 'ruin:1', originX: 12, originZ: 8 }],
    hearthsteadsNear: () => [{ key: 'stead:1', originX: 40, originZ: 0 }],
    shadowDensNear: () => [{ key: 'far', x: 500, z: 0 }],
    cinderwatchesNear: () => [{ key: 'far-watch', originX: 500, originZ: 500 }],
  };
  const clues = discoverLandmarks(world, 0, 0, 64);
  assert.deepEqual(clues.map((clue) => clue.label), ['Trailforge Ruin', 'Hearthstead']);
  const navigation = new NavigationState(null, { x: 0, z: 0 });
  assert.equal(navigation.discover(clues), 2);
  assert.equal(navigation.discover(clues), 0);
  const restored = new NavigationState(navigation.serialize());
  assert.equal(restored.discoveries.length, 2);
  assert.equal(restored.targets().length, 3);
});
