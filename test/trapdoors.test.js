import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { breakTrapdoor, placeTrapdoor, toggleTrapdoor, trapdoorIdFor, trapdoorInfo } from '../src/trapdoors.js';

class FakeWorld {
  constructor() { this.blocks = new Map(); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) || BLOCK.AIR; }
  setBlock(x, y, z, id) { id === BLOCK.AIR ? this.blocks.delete(this.key(x, y, z)) : this.blocks.set(this.key(x, y, z), id); }
}

test('trapdoors retain facing while toggling and break into one base item', () => {
  assert.deepEqual(trapdoorInfo(trapdoorIdFor(0)), { orientation: 'n', open: false });
  assert.deepEqual(trapdoorInfo(trapdoorIdFor(-Math.PI / 2)), { orientation: 'e', open: false });
  assert.deepEqual(trapdoorInfo(trapdoorIdFor(Math.PI)), { orientation: 's', open: false });
  assert.deepEqual(trapdoorInfo(trapdoorIdFor(Math.PI / 2)), { orientation: 'w', open: false });
  const world = new FakeWorld();
  assert.equal(placeTrapdoor(world, 3, 4, 5, -Math.PI / 2), true);
  assert.equal(toggleTrapdoor(world, 3, 4, 5), true);
  assert.deepEqual(trapdoorInfo(world.getBlock(3, 4, 5)), { orientation: 'e', open: true });
  assert.equal(toggleTrapdoor(world, 3, 4, 5), true);
  assert.deepEqual(trapdoorInfo(world.getBlock(3, 4, 5)), { orientation: 'e', open: false });
  assert.deepEqual(breakTrapdoor(world, 3, 4, 5), { x: 3, y: 4, z: 5 });
});
