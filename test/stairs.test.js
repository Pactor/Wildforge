import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { breakStair, placeStair, stairIdFor, stairInfo } from '../src/stairs.js';

class FakeWorld {
  constructor() { this.blocks = new Map(); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) || BLOCK.AIR; }
  setBlock(x, y, z, id) { id === BLOCK.AIR ? this.blocks.delete(this.key(x, y, z)) : this.blocks.set(this.key(x, y, z), id); }
}

test('stairs quantize player facing, preserve material, and break into their base item', () => {
  assert.equal(stairInfo(stairIdFor('oak_stairs', 0)).orientation, 'n');
  assert.equal(stairInfo(stairIdFor('oak_stairs', -Math.PI / 2)).orientation, 'e');
  assert.equal(stairInfo(stairIdFor('stone_stairs', Math.PI)).orientation, 's');
  assert.equal(stairInfo(stairIdFor('stone_stairs', Math.PI / 2)).orientation, 'w');
  const world = new FakeWorld();
  assert.equal(placeStair(world, 2, 3, 4, 'stone_stairs', -Math.PI / 2), true);
  assert.deepEqual(stairInfo(world.getBlock(2, 3, 4)), { material: 'stone', orientation: 'e', item: 'stone_stairs' });
  assert.deepEqual(breakStair(world, 2, 3, 4), { x: 2, y: 3, z: 4, item: 'stone_stairs' });
  assert.equal(world.getBlock(2, 3, 4), BLOCK.AIR);
});
