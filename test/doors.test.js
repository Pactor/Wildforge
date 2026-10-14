import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { breakDoor, doorInfo, placeDoor, toggleDoor } from '../src/doors.js';

class FakeWorld {
  constructor() { this.blocks = new Map([['0,0,0', BLOCK.STONE]]); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) || BLOCK.AIR; }
  isSolid(x, y, z) { return this.getBlock(x, y, z) !== BLOCK.AIR; }
  setBlock(x, y, z, id) { id === BLOCK.AIR ? this.blocks.delete(this.key(x, y, z)) : this.blocks.set(this.key(x, y, z), id); }
}

test('doors place as paired blocks, toggle, and break together', () => {
  const world = new FakeWorld();
  assert.equal(placeDoor(world, 0, 1, 0, 0), true);
  assert.equal(doorInfo(world.getBlock(0, 1, 0)).top, false);
  assert.equal(doorInfo(world.getBlock(0, 2, 0)).top, true);
  assert.equal(toggleDoor(world, 0, 2, 0), true);
  assert.equal(doorInfo(world.getBlock(0, 1, 0)).open, true);
  assert.deepEqual(breakDoor(world, 0, 2, 0), { x: 0, y: 1, z: 0 });
  assert.equal(world.getBlock(0, 1, 0), BLOCK.AIR);
  assert.equal(world.getBlock(0, 2, 0), BLOCK.AIR);
});
