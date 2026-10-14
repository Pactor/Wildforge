import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { bedInfo, bedParts, breakBed, isSleepingTime, placeBed } from '../src/beds.js';

class FakeWorld {
  constructor() { this.blocks = new Map([['0,0,0', BLOCK.STONE], ['0,0,-1', BLOCK.STONE]]); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) || BLOCK.AIR; }
  isSolid(x, y, z) { return this.getBlock(x, y, z) !== BLOCK.AIR; }
  setBlock(x, y, z, id) { id === BLOCK.AIR ? this.blocks.delete(this.key(x, y, z)) : this.blocks.set(this.key(x, y, z), id); }
}

test('beds place paired head/foot states, resolve either half, and break together', () => {
  const world = new FakeWorld();
  assert.equal(placeBed(world, 0, 1, 0, 0), true);
  assert.deepEqual(bedInfo(world.getBlock(0, 1, 0)), { orientation: 'n', part: 'foot' });
  assert.deepEqual(bedInfo(world.getBlock(0, 1, -1)), { orientation: 'n', part: 'head' });
  assert.deepEqual(bedParts(world, 0, 1, -1), {
    orientation: 'n', foot: { x: 0, y: 1, z: 0 }, head: { x: 0, y: 1, z: -1 },
  });
  assert.deepEqual(breakBed(world, 0, 1, -1), { x: 0, y: 1, z: 0 });
  assert.equal(world.getBlock(0, 1, 0), BLOCK.AIR);
  assert.equal(world.getBlock(0, 1, -1), BLOCK.AIR);
  assert.equal(isSleepingTime(0.9), true);
  assert.equal(isSleepingTime(0.1), true);
  assert.equal(isSleepingTime(0.5), false);
});
