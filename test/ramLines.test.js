import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { CircuitSystem, MAX_RAM_PUSH } from '../src/circuits.js';

class MemoryWorld {
  constructor(entries = []) { this.blocks = new Map(entries); this.batches = 0; }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); }
  setBlocks(changes) { this.batches += 1; for (const change of changes) this.setBlock(change.x, change.y, change.z, change.id); return changes.length; }
}

const lineWorld = (length, ram = BLOCK.FORGE_RAM_E_OFF) => new MemoryWorld([['0,1,0', ram], ...Array.from({ length }, (_, index) => [`${index + 1},1,0`, index % 2 ? BLOCK.PLANKS : BLOCK.STONE])]);

test('Forge Rams push mixed contiguous block lines in one farthest-first batch', () => {
  const world = lineWorld(3); const moves = []; const circuits = new CircuitSystem(world, { onMove: (result) => moves.push(result) }); const result = circuits.moveWithRam([0, 1, 0], BLOCK.FORGE_RAM_E_OFF);
  assert.equal(result.count, 3); assert.equal(world.batches, 1); assert.equal(world.getBlock(1, 1, 0), BLOCK.AIR); assert.equal(world.getBlock(2, 1, 0), BLOCK.STONE); assert.equal(world.getBlock(3, 1, 0), BLOCK.PLANKS); assert.equal(world.getBlock(4, 1, 0), BLOCK.STONE);
  assert.deepEqual(result.moved.map(({ from, to }) => [from[0], to[0]]), [[1, 2], [2, 3], [3, 4]]); assert.equal(moves.length, 1);
});

test('the exact twelve-block limit succeeds while a thirteenth block rejects atomically', () => {
  assert.equal(MAX_RAM_PUSH, 12); const maximum = lineWorld(MAX_RAM_PUSH); const result = new CircuitSystem(maximum).moveWithRam([0, 1, 0], BLOCK.FORGE_RAM_E_OFF); assert.equal(result.count, 12); assert.equal(maximum.getBlock(13, 1, 0), BLOCK.PLANKS);
  const excessive = lineWorld(MAX_RAM_PUSH + 1); const before = [...excessive.blocks]; assert.equal(new CircuitSystem(excessive).moveWithRam([0, 1, 0], BLOCK.FORGE_RAM_E_OFF), null); assert.deepEqual([...excessive.blocks], before); assert.equal(excessive.batches, 0);
});

test('one protected block or blocked terminal rejects the complete line without partial edits', () => {
  const protectedWorld = new MemoryWorld([['0,1,0', BLOCK.FORGE_RAM_E_OFF], ['1,1,0', BLOCK.STONE], ['2,1,0', BLOCK.CHEST], ['3,1,0', BLOCK.PLANKS]]); const before = [...protectedWorld.blocks]; assert.equal(new CircuitSystem(protectedWorld).moveWithRam([0, 1, 0], BLOCK.FORGE_RAM_E_OFF), null); assert.deepEqual([...protectedWorld.blocks], before);
  const blocked = lineWorld(3); blocked.setBlock(4, 1, 0, BLOCK.VAULT_SEAL); const snapshot = [...blocked.blocks]; assert.equal(new CircuitSystem(blocked).moveWithRam([0, 1, 0], BLOCK.FORGE_RAM_E_OFF), null); assert.deepEqual([...blocked.blocks], snapshot);
});

test('actor safety is checked at the final line destination before any block changes', () => {
  const world = lineWorld(4); let checked = null; const circuits = new CircuitSystem(world, { canMoveInto: (destination, source, id) => { checked = { destination, source, id }; return false; } });
  assert.equal(circuits.moveWithRam([0, 1, 0], BLOCK.FORGE_RAM_E_OFF), null); assert.deepEqual(checked, { destination: [5, 1, 0], source: [4, 1, 0], id: BLOCK.PLANKS }); assert.equal(world.batches, 0); assert.equal(world.getBlock(1, 1, 0), BLOCK.STONE);
});

test('Binding Rams push the full line but pull only the nearest block on release', () => {
  const world = new MemoryWorld([['0,1,0', BLOCK.SPARK_SWITCH_OFF], ['1,1,0', BLOCK.SUNWIRE_OFF], ['2,1,0', BLOCK.BINDING_RAM_E_OFF], ['3,1,0', BLOCK.STONE], ['4,1,0', BLOCK.PLANKS], ['5,1,0', BLOCK.DIRT]]); const moves = [];
  const circuits = new CircuitSystem(world, { onMove: (move) => moves.push(move) }); circuits.blockChanged(2, 1, 0, BLOCK.AIR, BLOCK.BINDING_RAM_E_OFF); circuits.toggleSwitch(0, 1, 0);
  assert.equal(moves[0].count, 3); assert.deepEqual([world.getBlock(4, 1, 0), world.getBlock(5, 1, 0), world.getBlock(6, 1, 0)], [BLOCK.STONE, BLOCK.PLANKS, BLOCK.DIRT]);
  circuits.toggleSwitch(0, 1, 0); assert.equal(moves[1].retracted, true); assert.equal(world.getBlock(3, 1, 0), BLOCK.STONE); assert.equal(world.getBlock(4, 1, 0), BLOCK.AIR); assert.equal(world.getBlock(5, 1, 0), BLOCK.PLANKS); assert.equal(world.getBlock(6, 1, 0), BLOCK.DIRT);
});
