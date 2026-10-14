import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK, isSnowLayer, snowLayerLevel } from '../src/blocks.js';
import { exposedSnowPosition, SnowAccumulationState } from '../src/snowAccumulation.js';

class SnowWorld {
  constructor() { this.blocks = new Map(); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) {
    const key = this.key(x, y, z);
    if (this.blocks.has(key)) return this.blocks.get(key);
    return Math.floor(y) === 5 ? BLOCK.SNOWY_GRASS : BLOCK.AIR;
  }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); }
}

test('exposed full blocks accept four partial snow layers and then pack solid', () => {
  const world = new SnowWorld();
  const snow = new SnowAccumulationState(world, 9);
  assert.deepEqual(exposedSnowPosition(world, 2, 3), { x: 2, y: 6, z: 3, id: BLOCK.AIR, existing: false });
  for (let level = 1; level <= 4; level += 1) {
    const change = snow.accumulateAt(2, 3);
    assert.equal(isSnowLayer(change.id), true);
    assert.equal(snowLayerLevel(change.id), level);
  }
  assert.equal(snow.accumulateAt(2, 3).id, BLOCK.SNOW);
});

test('only tracked weather deposits melt back through every exact layer', () => {
  const world = new SnowWorld();
  const snow = new SnowAccumulationState(world, 11);
  for (let index = 0; index < 5; index += 1) snow.accumulateAt(0, 0);
  const record = snow.serialize().records[0];
  const expected = [BLOCK.SNOW_LAYER_4, BLOCK.SNOW_LAYER_3, BLOCK.SNOW_LAYER_2, BLOCK.SNOW_LAYER_1, BLOCK.AIR];
  for (const id of expected) assert.equal(snow.meltAt(record).id, id);
  assert.equal(snow.serialize().records.length, 0);
  world.setBlock(4, 6, 4, BLOCK.SNOW);
  snow.update(10, { weatherKind: 'clear', daylight: 1, biomeAt: () => 'plains' });
  assert.equal(world.getBlock(4, 6, 4), BLOCK.SNOW, 'untracked generated snow remains intact');
});

test('bounded accumulation sampling is seeded and its active deposits persist exactly', () => {
  const context = { playerPosition: { x: 0, z: 0 }, weatherKind: 'storm', daylight: 0.3, biomeAt: () => 'snowy_highlands' };
  const first = new SnowAccumulationState(new SnowWorld(), 8128);
  const second = new SnowAccumulationState(new SnowWorld(), 8128);
  assert.deepEqual(first.update(0.25, context), second.update(0.25, context));
  assert.deepEqual(first.serialize(), second.serialize());
  const restored = new SnowAccumulationState(first.world, 1, first.serialize());
  assert.deepEqual(restored.serialize(), first.serialize());
  assert.ok(restored.serialize().records.length <= 512);
});
