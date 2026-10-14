import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { addCompost, breakComposter, canCompost, compostLevel, composterId, extractCompost } from '../src/composter.js';

class FakeWorld {
  constructor() { this.block = BLOCK.COMPOSTER_0; }
  getBlock() { return this.block; }
  setBlock(x, y, z, id) { this.block = id; }
}

test('Compost Bins accept plant matter through seven visible persistent levels', () => {
  const world = new FakeWorld();
  assert.equal(canCompost('wheat_seeds'), true);
  assert.equal(canCompost(BLOCK.FROSTPINE_NEEDLES), true);
  assert.equal(canCompost('tidefiber'), true);
  assert.equal(canCompost('raw_glowkelp'), true);
  assert.equal(canCompost('raw_ashcap'), true);
  assert.equal(canCompost('lumen_spore'), true);
  assert.equal(canCompost(BLOCK.STONE), false);
  for (let level = 1; level <= 7; level += 1) {
    const result = addCompost(world, 1, 2, 3, 'wheat_seeds');
    assert.equal(result.accepted, true);
    assert.equal(result.level, level);
    assert.equal(world.block, composterId(level));
    assert.equal(compostLevel(world.block), level);
  }
  assert.deepEqual(addCompost(world, 1, 2, 3, 'wheat'), { accepted: false, level: 7, ready: true });
});

test('ready bins extract Rich Compost and any level breaks into an empty bin', () => {
  const world = new FakeWorld();
  world.block = BLOCK.COMPOSTER_7;
  assert.deepEqual(extractCompost(world, 0, 0, 0), { id: 'rich_compost', count: 1 });
  assert.equal(world.block, BLOCK.COMPOSTER_0);
  world.block = BLOCK.COMPOSTER_4;
  assert.deepEqual(breakComposter(world, 2.8, 3.1, -1.2), { x: 2, y: 3, z: -2, item: BLOCK.COMPOSTER_0 });
  assert.equal(world.block, BLOCK.AIR);
});
