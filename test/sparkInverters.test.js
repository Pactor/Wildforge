import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { CircuitSystem, circuitItem, directionalCircuitId, INVERTER_DELAY, poweredVariant } from '../src/circuits.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { placementPlan, previewBoxes } from '../src/placementPreview.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';

const OFF = [BLOCK.SPARK_INVERTER_N_OFF, BLOCK.SPARK_INVERTER_E_OFF, BLOCK.SPARK_INVERTER_S_OFF, BLOCK.SPARK_INVERTER_W_OFF];
const ON = [BLOCK.SPARK_INVERTER_N_ON, BLOCK.SPARK_INVERTER_E_ON, BLOCK.SPARK_INVERTER_S_ON, BLOCK.SPARK_INVERTER_W_ON];

class MemoryWorld {
  constructor(entries = []) { this.blocks = new Map(entries); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); return true; }
}

const pixel = (texture, tile, x, y) => {
  const px = tile % ATLAS_COLUMNS * TILE_SIZE + x; const py = Math.floor(tile / ATLAS_COLUMNS) * TILE_SIZE + y; const offset = (py * texture.image.width + px) * 4;
  return Array.from(texture.image.data.slice(offset, offset + 4));
};

test('Spark Inverter owns eight directional states and a canonical torch circuit recipe', () => {
  for (const id of [...OFF, ...ON]) { assert.equal(BLOCKS[id].circuitRole, 'inverter'); assert.equal(circuitItem(id), 'spark_inverter'); assert.deepEqual(blockDrops(id), ['spark_inverter']); }
  const grid = [null, BLOCK.TORCH, null, 'lumen_shard', BLOCK.SUNWIRE_OFF, 'lumen_shard', null, BLOCK.STONE_SLAB, null]; assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'spark_inverter');
  const inventory = new Inventory({ counts: [[BLOCK.TORCH, 1], [BLOCK.SUNWIRE_OFF, 1], [BLOCK.STONE_SLAB, 1], ['lumen_shard', 2]] }); assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'spark_inverter'), 'table'), true); assert.equal(inventory.count('spark_inverter'), 1);
});

test('all four facings retain exact off/on variants and placement orientation', () => {
  const yaws = [0, -Math.PI / 2, Math.PI, Math.PI / 2]; yaws.forEach((yaw, index) => { assert.equal(directionalCircuitId('spark_inverter', yaw), OFF[index]); assert.equal(poweredVariant(OFF[index], true), ON[index]); assert.equal(poweredVariant(ON[index], false), OFF[index]); });
  assert.equal(placementPlan('spark_inverter', { x: 1, y: 2, z: 3 }, Math.PI).parts[0].id, BLOCK.SPARK_INVERTER_S_OFF);
});

test('an unpowered input produces one delayed output while front and rear networks remain isolated', () => {
  const world = new MemoryWorld([['0,1,0', BLOCK.SPARK_SWITCH_OFF], ['1,1,0', BLOCK.SPARK_INVERTER_E_OFF], ['2,1,0', BLOCK.SUNWIRE_OFF], ['3,1,0', BLOCK.FORGE_LAMP_OFF]]); const circuits = new CircuitSystem(world);
  circuits.blockChanged(1, 1, 0, BLOCK.AIR, BLOCK.SPARK_INVERTER_E_OFF); assert.equal(world.getBlock(2, 1, 0), BLOCK.SUNWIRE_OFF); circuits.update(INVERTER_DELAY - 0.01); assert.equal(world.getBlock(1, 1, 0), BLOCK.SPARK_INVERTER_E_OFF);
  const events = circuits.update(0.01); assert.equal(events.at(-1).type, 'inverter'); assert.equal(world.getBlock(1, 1, 0), BLOCK.SPARK_INVERTER_E_ON); assert.equal(world.getBlock(2, 1, 0), BLOCK.SUNWIRE_ON); assert.equal(world.getBlock(3, 1, 0), BLOCK.FORGE_LAMP_ON); assert.equal(world.getBlock(0, 1, 0), BLOCK.SPARK_SWITCH_OFF);
});

test('powered input disables output after the exact delay and held input never oscillates', () => {
  const world = new MemoryWorld([['0,1,0', BLOCK.SPARK_SWITCH_OFF], ['1,1,0', BLOCK.SPARK_INVERTER_E_OFF], ['2,1,0', BLOCK.FORGE_LAMP_OFF]]); const changes = []; const circuits = new CircuitSystem(world, { onStateChange: (position, oldId, newId) => changes.push({ position, oldId, newId }) });
  circuits.blockChanged(1, 1, 0, BLOCK.AIR, BLOCK.SPARK_INVERTER_E_OFF); circuits.update(INVERTER_DELAY); assert.equal(world.getBlock(2, 1, 0), BLOCK.FORGE_LAMP_ON); circuits.toggleSwitch(0, 1, 0); circuits.update(INVERTER_DELAY);
  assert.equal(world.getBlock(1, 1, 0), BLOCK.SPARK_INVERTER_E_OFF); assert.equal(world.getBlock(2, 1, 0), BLOCK.FORGE_LAMP_OFF); const count = changes.length; for (let i = 0; i < 10; i += 1) { circuits.recomputeAround(0, 1, 0); circuits.update(0.2); } assert.equal(changes.length, count);
});

test('mid-delay state persists exactly while malformed timers and stale entries are bounded', () => {
  const world = new MemoryWorld([['1,2,3', BLOCK.SPARK_INVERTER_N_OFF]]); const restored = new CircuitSystem(world, { saved: { inverters: [['1,2,3', true, 0.06, false], ['bad', true, 99, false], ['9,9,9', false, -4, true]] } });
  const saved = restored.serialize().inverters; assert.deepEqual(saved.find(([key]) => key === '1,2,3'), ['1,2,3', true, 0.06, false]); assert.equal(saved.find(([key]) => key === 'bad')[2], INVERTER_DELAY); restored.update(0.06); assert.equal(world.getBlock(1, 2, 3), BLOCK.SPARK_INVERTER_N_ON);
  restored.blockChanged(1, 2, 3, BLOCK.SPARK_INVERTER_N_ON, BLOCK.AIR); assert.equal(restored.serialize().inverters.some(([key]) => key === '1,2,3'), false);
  const editWorld = new MemoryWorld([['4,1,4', BLOCK.SPARK_INVERTER_N_OFF]]); const discovered = new CircuitSystem(editWorld); assert.equal(discovered.discover([{ x: 4, y: 1, z: 4 }]), 1); discovered.update(INVERTER_DELAY); assert.equal(editWorld.getBlock(4, 1, 4), BLOCK.SPARK_INVERTER_N_ON);
});

test('support loss recovers one item and original pixels, preview, and held silhouette agree', () => {
  const world = new MemoryWorld([['0,0,0', BLOCK.STONE], ['0,1,0', BLOCK.SPARK_INVERTER_N_ON]]); const circuits = new CircuitSystem(world); circuits.blockChanged(0, 1, 0, BLOCK.AIR, BLOCK.SPARK_INVERTER_N_ON); world.setBlock(0, 0, 0, BLOCK.AIR); assert.deepEqual(circuits.detachUnsupportedAbove(0, 0, 0), { id: 'spark_inverter', x: 0, y: 1, z: 0 });
  const atlas = createBlockAtlas(); assert.notDeepEqual(pixel(atlas, 140, 0, 0), pixel(atlas, 140, 7, 13)); assert.notDeepEqual(pixel(atlas, 140, 7, 13), pixel(atlas, 140, 7, 7)); assert.equal(heldItemProfile('spark_inverter').type, 'sparkInverter'); assert.deepEqual(previewBoxes(BLOCK.SPARK_INVERTER_E_ON), [[0.08, 0, 0.08, 0.92, 0.46, 0.92]]); atlas.dispose();
});
