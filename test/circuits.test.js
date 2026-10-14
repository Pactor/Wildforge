import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { CircuitSystem, circuitItem, circuitRole, poweredVariant } from '../src/circuits.js';

class MemoryWorld {
  constructor(entries = []) { this.blocks = new Map(entries); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) || BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); }
}

test('Spark Switches propagate state through connected Sunwire into Forge Lamps', () => {
  const world = new MemoryWorld([
    ['0,1,0', BLOCK.SPARK_SWITCH_OFF],
    ['1,1,0', BLOCK.SUNWIRE_OFF],
    ['2,1,0', BLOCK.SUNWIRE_OFF],
    ['3,1,0', BLOCK.FORGE_LAMP_OFF],
  ]);
  const changes = [];
  const circuits = new CircuitSystem(world, { onStateChange: (position, oldId, newId) => changes.push({ position, oldId, newId }) });
  assert.deepEqual(circuits.toggleSwitch(0, 1, 0), { powered: true, affected: 4 });
  assert.equal(world.getBlock(0, 1, 0), BLOCK.SPARK_SWITCH_ON);
  assert.equal(world.getBlock(1, 1, 0), BLOCK.SUNWIRE_ON);
  assert.equal(world.getBlock(2, 1, 0), BLOCK.SUNWIRE_ON);
  assert.equal(world.getBlock(3, 1, 0), BLOCK.FORGE_LAMP_ON);
  assert.equal(changes.length, 4);
  assert.equal(circuits.toggleSwitch(0, 1, 0).powered, false);
  assert.equal(world.getBlock(3, 1, 0), BLOCK.FORGE_LAMP_OFF);
});

test('breaking a conduit recomputes both sides while multiple sources remain authoritative', () => {
  const world = new MemoryWorld([
    ['0,1,0', BLOCK.SPARK_SWITCH_ON],
    ['1,1,0', BLOCK.SUNWIRE_ON],
    ['2,1,0', BLOCK.SUNWIRE_ON],
    ['3,1,0', BLOCK.SUNWIRE_ON],
    ['4,1,0', BLOCK.FORGE_LAMP_ON],
  ]);
  const circuits = new CircuitSystem(world);
  world.setBlock(2, 1, 0, BLOCK.AIR);
  circuits.blockChanged(2, 1, 0, BLOCK.SUNWIRE_ON, BLOCK.AIR);
  assert.equal(world.getBlock(1, 1, 0), BLOCK.SUNWIRE_ON);
  assert.equal(world.getBlock(3, 1, 0), BLOCK.SUNWIRE_OFF);
  assert.equal(world.getBlock(4, 1, 0), BLOCK.FORGE_LAMP_OFF);
  world.setBlock(4, 1, 1, BLOCK.SPARK_SWITCH_ON);
  world.setBlock(3, 1, 1, BLOCK.SUNWIRE_OFF);
  circuits.blockChanged(3, 1, 1, BLOCK.AIR, BLOCK.SUNWIRE_OFF);
  assert.equal(world.getBlock(3, 1, 0), BLOCK.SUNWIRE_ON);
  assert.equal(world.getBlock(4, 1, 0), BLOCK.FORGE_LAMP_ON);
});

test('circuit roles, powered variants, and collectible base items are canonical', () => {
  assert.equal(circuitRole(BLOCK.SPARK_SWITCH_ON), 'switch');
  assert.equal(circuitRole(BLOCK.SUNWIRE_OFF), 'conduit');
  assert.equal(circuitRole(BLOCK.FORGE_LAMP_ON), 'lamp');
  assert.equal(poweredVariant(BLOCK.SUNWIRE_OFF, true), BLOCK.SUNWIRE_ON);
  assert.equal(circuitItem(BLOCK.FORGE_LAMP_ON), BLOCK.FORGE_LAMP_OFF);
});

test('support removal safely detaches surface circuitry into its base collectible', () => {
  const world = new MemoryWorld([
    ['0,0,0', BLOCK.STONE],
    ['0,1,0', BLOCK.SUNWIRE_ON],
    ['1,1,0', BLOCK.FORGE_LAMP_ON],
  ]);
  const circuits = new CircuitSystem(world);
  world.setBlock(0, 0, 0, BLOCK.AIR);
  assert.deepEqual(circuits.detachUnsupportedAbove(0, 0, 0), { id: BLOCK.SUNWIRE_OFF, x: 0, y: 1, z: 0 });
  assert.equal(world.getBlock(0, 1, 0), BLOCK.AIR);
  assert.equal(world.getBlock(1, 1, 0), BLOCK.FORGE_LAMP_OFF);
});
