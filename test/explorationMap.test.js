import test from 'node:test';
import assert from 'node:assert/strict';
import { ExplorationMapState, MAP_CELL_SIZE, MAX_EXPLORED_CELLS } from '../src/explorationMap.js';

const world = {
  terrainHeight(x, z) { return x < 0 ? 15 : 20 + Math.floor(Math.abs(z) / 100); },
  biomeAt(x, z) { return { id: x < 0 ? 'plains' : z < 0 ? 'forest' : 'desert' }; },
};

test('Trailcharts reveal only bounded nearby cells with deterministic terrain summaries', () => {
  const map = new ExplorationMapState();
  assert.equal(map.reveal(world, 0, 0, 1), 5);
  assert.equal(map.reveal(world, 0, 0, 1), 0);
  assert.equal(map.entries().length, 5);
  assert.equal(map.get(-1, 0).water, true);
  assert.equal(map.get(0, -1).biome, 'forest');
  assert.equal(map.get(0, 0).elevation, 20);
  assert.deepEqual(map.bounds(), { minX: -1, maxX: 1, minZ: -1, maxZ: 1 });
  assert.equal(MAP_CELL_SIZE, 16);
});

test('explored cells persist exactly while malformed and excessive save data is bounded', () => {
  const source = new ExplorationMapState();
  source.reveal(world, 32, 48, 2);
  const restored = new ExplorationMapState(source.serialize());
  assert.deepEqual(restored.entries(), source.entries());
  const malformed = new ExplorationMapState({ cells: [
    { x: 'bad', z: 0, elevation: 20, biome: 'forest' },
    { x: 1, z: 2, elevation: 999, biome: 'unknown', water: 1 },
    ...Array.from({ length: MAX_EXPLORED_CELLS + 20 }, (_, index) => ({ x: index % 100, z: Math.floor(index / 100), elevation: 20, biome: 'plains' })),
  ] });
  assert.ok(malformed.entries().length <= MAX_EXPLORED_CELLS);
  assert.deepEqual(malformed.get(1, 2), { x: 1, z: 2, elevation: 63, biome: 'plains', water: true });
});

test('Trailcharts do not reveal cells without a valid world or position', () => {
  const map = new ExplorationMapState();
  assert.equal(map.reveal(null, 0, 0), 0);
  assert.equal(map.reveal(world, Number.NaN, 0), 0);
  assert.equal(map.entries().length, 0);
  assert.equal(map.bounds(), null);
});
