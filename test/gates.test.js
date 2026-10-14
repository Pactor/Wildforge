import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { breakGate, gateIdFor, gateInfo, placeGate, toggleGate } from '../src/gates.js';

class FakeWorld {
  constructor() { this.blocks = new Map([['0,0,0', BLOCK.STONE]]); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) || BLOCK.AIR; }
  isSolid(x, y, z) { return this.getBlock(x, y, z) !== BLOCK.AIR; }
  setBlock(x, y, z, id) { id === BLOCK.AIR ? this.blocks.delete(this.key(x, y, z)) : this.blocks.set(this.key(x, y, z), id); }
}

test('gates place by facing, toggle collision state, and break into one base item', () => {
  const world = new FakeWorld();
  assert.equal(gateInfo(gateIdFor(0)).orientation, 'z');
  assert.equal(gateInfo(gateIdFor(Math.PI / 2)).orientation, 'x');
  assert.equal(placeGate(world, 0, 1, 0, Math.PI / 2), true);
  assert.deepEqual(gateInfo(world.getBlock(0, 1, 0)), { orientation: 'x', open: false });
  assert.equal(toggleGate(world, 0, 1, 0), true);
  assert.deepEqual(gateInfo(world.getBlock(0, 1, 0)), { orientation: 'x', open: true });
  assert.deepEqual(breakGate(world, 0, 1, 0), { x: 0, y: 1, z: 0 });
  assert.equal(world.getBlock(0, 1, 0), BLOCK.AIR);
});
