import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { CircuitSystem, circuitItem, comparatorModeVariant, COMPARATOR_SAMPLE_INTERVAL, directionalCircuitId, poweredVariant } from '../src/circuits.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { placementPlan, previewBoxes } from '../src/placementPreview.js';
import { StorageState, inventorySignalStrength } from '../src/storage.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';

const COMPARE_OFF = [BLOCK.SPARK_COMPARATOR_N_COMPARE_OFF, BLOCK.SPARK_COMPARATOR_E_COMPARE_OFF, BLOCK.SPARK_COMPARATOR_S_COMPARE_OFF, BLOCK.SPARK_COMPARATOR_W_COMPARE_OFF];
const COMPARE_ON = [BLOCK.SPARK_COMPARATOR_N_COMPARE_ON, BLOCK.SPARK_COMPARATOR_E_COMPARE_ON, BLOCK.SPARK_COMPARATOR_S_COMPARE_ON, BLOCK.SPARK_COMPARATOR_W_COMPARE_ON];
const SUBTRACT_OFF = [BLOCK.SPARK_COMPARATOR_N_SUBTRACT_OFF, BLOCK.SPARK_COMPARATOR_E_SUBTRACT_OFF, BLOCK.SPARK_COMPARATOR_S_SUBTRACT_OFF, BLOCK.SPARK_COMPARATOR_W_SUBTRACT_OFF];
const SUBTRACT_ON = [BLOCK.SPARK_COMPARATOR_N_SUBTRACT_ON, BLOCK.SPARK_COMPARATOR_E_SUBTRACT_ON, BLOCK.SPARK_COMPARATOR_S_SUBTRACT_ON, BLOCK.SPARK_COMPARATOR_W_SUBTRACT_ON];

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

test('Spark Comparator owns sixteen exact facing, mode, power, recipe, and recovery states', () => {
  for (const id of [...COMPARE_OFF, ...COMPARE_ON, ...SUBTRACT_OFF, ...SUBTRACT_ON]) {
    assert.equal(BLOCKS[id].circuitRole, 'comparator'); assert.equal(circuitItem(id), 'spark_comparator'); assert.deepEqual(blockDrops(id), ['spark_comparator']);
  }
  for (let index = 0; index < 4; index += 1) {
    assert.equal(poweredVariant(COMPARE_OFF[index], true), COMPARE_ON[index]); assert.equal(poweredVariant(SUBTRACT_ON[index], false), SUBTRACT_OFF[index]);
    assert.equal(comparatorModeVariant(COMPARE_ON[index], 'subtract'), SUBTRACT_ON[index]); assert.equal(comparatorModeVariant(SUBTRACT_OFF[index], 'compare'), COMPARE_OFF[index]);
  }
  const grid = [null, BLOCK.TORCH, null, BLOCK.TORCH, 'lumen_shard', BLOCK.TORCH, BLOCK.STONE_SLAB, BLOCK.STONE_SLAB, BLOCK.STONE_SLAB];
  assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'spark_comparator');
  const inventory = new Inventory({ counts: [[BLOCK.TORCH, 3], [BLOCK.STONE_SLAB, 3], ['lumen_shard', 1]] }); assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'spark_comparator'), 'table'), true); assert.equal(inventory.count('spark_comparator'), 1);
});

test('container fullness produces faithful bounded analog strengths', () => {
  const storage = new StorageState(); const source = new Inventory({ counts: [[BLOCK.STONE, 64], [BLOCK.DIRT, 32]] });
  assert.equal(inventorySignalStrength(new Inventory(), 27), 0); assert.equal(inventorySignalStrength(source, 27), 1);
  const full = new Inventory({ counts: [[BLOCK.STONE, 27 * 64]] }); assert.equal(inventorySignalStrength(full, 27), 15);
  storage.get('crate').add(BLOCK.STONE, 27 * 32); assert.equal(storage.signalStrength('crate'), 8);
});

test('all four placement facings start in compare mode and preserve orientation', () => {
  const yaws = [0, -Math.PI / 2, Math.PI, Math.PI / 2]; yaws.forEach((yaw, index) => assert.equal(directionalCircuitId('spark_comparator', yaw), COMPARE_OFF[index]));
  const plan = placementPlan('spark_comparator', { x: 2, y: 3, z: 4 }, Math.PI / 2); assert.equal(plan.kind, 'comparator'); assert.equal(plan.parts[0].id, BLOCK.SPARK_COMPARATOR_W_COMPARE_OFF);
});

test('rear container levels propagate through an isolated front terminal', () => {
  let level = 8;
  const world = new MemoryWorld([['0,1,0', BLOCK.SPARK_COMPARATOR_N_COMPARE_OFF], ['0,1,-1', BLOCK.SUNWIRE_OFF], ['0,1,-2', BLOCK.FORGE_LAMP_OFF], ['0,1,1', BLOCK.CHEST]]);
  const circuits = new CircuitSystem(world, { readContainerSignal: (x, y, z) => x === 0 && y === 1 && z === 1 ? level : 0 }); circuits.blockChanged(0, 1, 0, BLOCK.AIR, BLOCK.SPARK_COMPARATOR_N_COMPARE_OFF);
  const events = circuits.update(COMPARATOR_SAMPLE_INTERVAL); assert.equal(events[0].outputLevel, 8); assert.equal(world.getBlock(0, 1, 0), BLOCK.SPARK_COMPARATOR_N_COMPARE_ON); assert.equal(world.getBlock(0, 1, -2), BLOCK.FORGE_LAMP_ON); assert.equal(world.getBlock(1, 1, 0), BLOCK.AIR);
  level = 0; circuits.update(COMPARATOR_SAMPLE_INTERVAL); assert.equal(world.getBlock(0, 1, 0), BLOCK.SPARK_COMPARATOR_N_COMPARE_OFF); assert.equal(world.getBlock(0, 1, -2), BLOCK.FORGE_LAMP_OFF);
});

test('compare and subtract modes honor the strongest side input at analog precision', () => {
  const mainKey = '0,1,0'; const sideKey = '1,1,0';
  const world = new MemoryWorld([[mainKey, BLOCK.SPARK_COMPARATOR_N_COMPARE_OFF], [sideKey, BLOCK.SPARK_COMPARATOR_W_COMPARE_ON]]);
  const circuits = new CircuitSystem(world, { readContainerSignal: (x, y, z) => x === 0 && y === 1 && z === 1 ? 8 : 0, saved: { comparators: [[sideKey, 5, 5, 0, COMPARATOR_SAMPLE_INTERVAL]] } });
  circuits.blockChanged(0, 1, 0, BLOCK.AIR, BLOCK.SPARK_COMPARATOR_N_COMPARE_OFF); let result = circuits.evaluateComparator([0, 1, 0]); assert.equal(result.outputLevel, 8);
  result = circuits.toggleComparator(0, 1, 0); assert.equal(result.mode, 'subtract'); assert.equal(result.outputLevel, 3); assert.equal(world.getBlock(0, 1, 0), BLOCK.SPARK_COMPARATOR_N_SUBTRACT_ON);
  circuits.comparators.get(sideKey).outputLevel = 9; result = circuits.toggleComparator(0, 1, 0); assert.equal(result.mode, 'compare'); assert.equal(result.outputLevel, 0); assert.equal(world.getBlock(0, 1, 0), BLOCK.SPARK_COMPARATOR_N_COMPARE_OFF);
});

test('analog records persist, sanitize, rediscover, and remove stale devices', () => {
  const world = new MemoryWorld([['2,1,2', BLOCK.SPARK_COMPARATOR_E_COMPARE_ON]]);
  const circuits = new CircuitSystem(world, { saved: { comparators: [['2,1,2', 9, 12, 3, 0.04], ['bad', 99, -4, 80, 7]] } });
  let saved = circuits.serialize().comparators; assert.deepEqual(saved.find(([key]) => key === '2,1,2'), ['2,1,2', 9, 12, 3, 0.04]); assert.deepEqual(saved.find(([key]) => key === 'bad').slice(1), [15, 0, 15, COMPARATOR_SAMPLE_INTERVAL]);
  circuits.blockChanged(2, 1, 2, BLOCK.SPARK_COMPARATOR_E_COMPARE_ON, BLOCK.AIR); saved = circuits.serialize().comparators; assert.equal(saved.some(([key]) => key === '2,1,2'), false);
  const editWorld = new MemoryWorld([['4,1,4', BLOCK.SPARK_COMPARATOR_S_COMPARE_OFF], ['4,1,3', BLOCK.SPARK_SWITCH_ON]]); const discovered = new CircuitSystem(editWorld); assert.equal(discovered.discover([{ x: 4, y: 1, z: 4 }]), 1); discovered.update(COMPARATOR_SAMPLE_INTERVAL); assert.equal(editWorld.getBlock(4, 1, 4), BLOCK.SPARK_COMPARATOR_S_COMPARE_ON);
});

test('support recovery and original atlas, preview, and held silhouettes agree', () => {
  const world = new MemoryWorld([['0,0,0', BLOCK.STONE], ['0,1,0', BLOCK.SPARK_COMPARATOR_E_SUBTRACT_ON]]); const circuits = new CircuitSystem(world); circuits.blockChanged(0, 1, 0, BLOCK.AIR, BLOCK.SPARK_COMPARATOR_E_SUBTRACT_ON); world.setBlock(0, 0, 0, BLOCK.AIR); assert.deepEqual(circuits.detachUnsupportedAbove(0, 0, 0), { id: 'spark_comparator', x: 0, y: 1, z: 0 });
  const atlas = createBlockAtlas(); assert.notDeepEqual(pixel(atlas, 141, 0, 0), pixel(atlas, 141, 7, 12)); assert.notDeepEqual(pixel(atlas, 141, 7, 12), pixel(atlas, 141, 7, 7)); assert.equal(heldItemProfile('spark_comparator').type, 'sparkComparator'); assert.deepEqual(previewBoxes(BLOCK.SPARK_COMPARATOR_N_COMPARE_OFF), [[0.06, 0, 0.06, 0.94, 0.36, 0.94]]); atlas.dispose();
});
