import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { CircuitSystem, circuitItem, directionalCircuitId, poweredVariant } from '../src/circuits.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { blastProtected } from '../src/explosives.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { placementPlan, previewBoxes } from '../src/placementPreview.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { VoxelWorld } from '../src/world.js';

const OFF = [BLOCK.BINDING_RAM_N_OFF, BLOCK.BINDING_RAM_E_OFF, BLOCK.BINDING_RAM_S_OFF, BLOCK.BINDING_RAM_W_OFF];
const ON = [BLOCK.BINDING_RAM_N_ON, BLOCK.BINDING_RAM_E_ON, BLOCK.BINDING_RAM_S_ON, BLOCK.BINDING_RAM_W_ON];

class MemoryWorld {
  constructor(entries = []) { this.blocks = new Map(entries); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); return true; }
  setBlocks(changes) { for (const change of changes) this.setBlock(change.x, change.y, change.z, change.id); return true; }
}

function pixel(texture, tile, x, y) {
  const px = tile % ATLAS_COLUMNS * TILE_SIZE + x; const py = Math.floor(tile / ATLAS_COLUMNS) * TILE_SIZE + y; const offset = (py * texture.image.width + px) * 4;
  return Array.from(texture.image.data.slice(offset, offset + 4));
}

test('Binding Ram owns eight protected actuator states and a renewable resin upgrade recipe', () => {
  for (const id of [...OFF, ...ON]) { assert.equal(BLOCKS[id].bindingRam, true); assert.equal(BLOCKS[id].ramSticky, true); assert.equal(circuitItem(id), 'binding_ram'); assert.deepEqual(blockDrops(id), ['binding_ram']); assert.equal(blastProtected(id), true); }
  const grid = ['forge_ram', 'binding_compound', null, null, null, null, null, null, null]; assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'binding_ram');
  const inventory = new Inventory({ counts: [['forge_ram', 1], ['binding_compound', 1]] }); assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'binding_ram'), 'table'), true); assert.equal(inventory.count('binding_ram'), 1);
});

test('four placement facings retain their exact powered family', () => {
  const yaws = [0, -Math.PI / 2, Math.PI, Math.PI / 2];
  yaws.forEach((yaw, index) => { assert.equal(directionalCircuitId('binding_ram', yaw), OFF[index]); assert.equal(poweredVariant(OFF[index], true), ON[index]); assert.equal(poweredVariant(ON[index], false), OFF[index]); });
  assert.equal(placementPlan('binding_ram', { x: 2, y: 3, z: 4 }, -Math.PI / 2).parts[0].id, BLOCK.BINDING_RAM_E_OFF);
});

test('one Spark cycle pushes on the rising edge and pulls back on the falling edge', () => {
  const world = new MemoryWorld([['0,1,0', BLOCK.SPARK_SWITCH_OFF], ['1,1,0', BLOCK.SUNWIRE_OFF], ['2,1,0', BLOCK.BINDING_RAM_E_OFF], ['3,1,0', BLOCK.STONE]]); const moves = [];
  const circuits = new CircuitSystem(world, { onMove: (move) => moves.push(move) }); circuits.blockChanged(2, 1, 0, BLOCK.AIR, BLOCK.BINDING_RAM_E_OFF);
  circuits.toggleSwitch(0, 1, 0); assert.equal(world.getBlock(2, 1, 0), BLOCK.BINDING_RAM_E_ON); assert.equal(world.getBlock(3, 1, 0), BLOCK.AIR); assert.equal(world.getBlock(4, 1, 0), BLOCK.STONE); assert.equal(moves[0].retracted, undefined);
  circuits.toggleSwitch(0, 1, 0); assert.equal(world.getBlock(2, 1, 0), BLOCK.BINDING_RAM_E_OFF); assert.equal(world.getBlock(3, 1, 0), BLOCK.STONE); assert.equal(world.getBlock(4, 1, 0), BLOCK.AIR); assert.equal(moves[1].retracted, true);
  circuits.recomputeAround(1, 1, 0); assert.equal(moves.length, 2, 'quiet recomputation must not repeat either edge');
});

test('retraction refuses occupied gaps, protected blocks, and actor intersections atomically', () => {
  const occupied = new MemoryWorld([['0,1,0', BLOCK.BINDING_RAM_E_ON], ['1,1,0', BLOCK.DIRT], ['2,1,0', BLOCK.STONE]]); assert.equal(new CircuitSystem(occupied).retractWithRam([0, 1, 0], BLOCK.BINDING_RAM_E_ON), null); assert.equal(occupied.getBlock(2, 1, 0), BLOCK.STONE);
  const protectedWorld = new MemoryWorld([['0,1,0', BLOCK.BINDING_RAM_E_ON], ['2,1,0', BLOCK.CHEST]]); assert.equal(new CircuitSystem(protectedWorld).retractWithRam([0, 1, 0], BLOCK.BINDING_RAM_E_ON), null); assert.equal(protectedWorld.getBlock(2, 1, 0), BLOCK.CHEST);
  const actorWorld = new MemoryWorld([['0,1,0', BLOCK.BINDING_RAM_E_ON], ['2,1,0', BLOCK.PLANKS]]); const circuits = new CircuitSystem(actorWorld, { canMoveInto: () => false }); assert.equal(circuits.retractWithRam([0, 1, 0], BLOCK.BINDING_RAM_E_ON), null); assert.equal(actorWorld.getBlock(2, 1, 0), BLOCK.PLANKS);
});

test('a failed pull still retracts the machine without deleting or teleporting distant terrain', () => {
  const world = new MemoryWorld([['0,1,0', BLOCK.SPARK_SWITCH_ON], ['1,1,0', BLOCK.SUNWIRE_ON], ['2,1,0', BLOCK.BINDING_RAM_E_ON], ['5,1,0', BLOCK.STONE]]); const circuits = new CircuitSystem(world); circuits.blockChanged(2, 1, 0, BLOCK.AIR, BLOCK.BINDING_RAM_E_ON);
  circuits.toggleSwitch(0, 1, 0); assert.equal(world.getBlock(2, 1, 0), BLOCK.BINDING_RAM_E_OFF); assert.equal(world.getBlock(5, 1, 0), BLOCK.STONE); assert.equal(world.getBlock(3, 1, 0), BLOCK.AIR);
});

test('original resin pixels, extended geometry, collision, preview, and held silhouette agree', () => {
  const atlas = createBlockAtlas(); assert.notDeepEqual(pixel(atlas, 139, 0, 0), pixel(atlas, 139, 7, 7)); assert.notDeepEqual(pixel(atlas, 139, 7, 7), pixel(atlas, 139, 6, 7));
  assert.equal(heldItemProfile('binding_ram').type, 'bindingRam'); assert.deepEqual(previewBoxes(BLOCK.BINDING_RAM_E_OFF), [[0.04, 0.04, 0.04, 0.96, 0.96, 0.96]]);
  const world = Object.create(VoxelWorld.prototype); world.getBlock = () => BLOCK.BINDING_RAM_E_ON; assert.equal(world.collisionHeight(0, 0, 0), 1); atlas.dispose();
});
