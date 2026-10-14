import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { CircuitSystem, poweredVariant, ramCanMoveBlock } from '../src/circuits.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { DISPENSER_BLOCKS, RuneDispenserState, dispenserBounds, dispenserDirection, dispenserIdForSupport, isRuneDispenser } from '../src/dispensers.js';
import { blastProtected } from '../src/explosives.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { placementPlan, previewBoxes } from '../src/placementPreview.js';
import { dispenserKey, StorageState } from '../src/storage.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

class MemoryStorage { constructor() { this.values = new Map(); } getItem(key) { return this.values.get(key) ?? null; } setItem(key, value) { this.values.set(key, String(value)); } }
class MemoryWorld {
  constructor(entries = []) { this.blocks = new Map(entries); this.edits = new Map(entries); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); this.edits.set(this.key(x, y, z), id); return true; }
}
class MemoryDrops { constructor() { this.spawned = []; this.allow = true; } spawn(id, count, position, durability, enchantments, state) { const value = { id, count, position: position.toArray(), durability, enchantments, state }; if (this.allow) this.spawned.push(value); return this.allow ? value : null; } }

test('Rune Dispenser owns twelve protected states and its Ejector-plus-Windbow recipe', () => {
  assert.deepEqual(DISPENSER_BLOCKS, Array.from({ length: 12 }, (_, index) => 311 + index));
  for (const id of DISPENSER_BLOCKS) { assert.equal(isRuneDispenser(id), true); assert.deepEqual(blockDrops(id), ['rune_dispenser']); assert.equal(blastProtected(id), true); assert.equal(ramCanMoveBlock(id), false); }
  const grid = [null, 'windbow', null, 'lumen_shard', 'forge_ejector', 'lumen_shard', null, null, null]; assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'rune_dispenser');
  const inventory = new Inventory({ counts: [['forge_ejector', 1], ['windbow', 1], ['lumen_shard', 2]] }); assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'rune_dispenser'), 'table'), true); assert.equal(inventory.count('rune_dispenser'), 1);
});

test('all six clicked faces and powered variants retain exact output vectors', () => {
  const p = { x: 3, y: 4, z: 5 }; const supports = [[{ x: 3, y: 4, z: 4 }, [0, 0, -1]], [{ x: 4, y: 4, z: 5 }, [1, 0, 0]], [{ x: 3, y: 4, z: 6 }, [0, 0, 1]], [{ x: 2, y: 4, z: 5 }, [-1, 0, 0]], [{ x: 3, y: 5, z: 5 }, [0, 1, 0]], [{ x: 3, y: 3, z: 5 }, [0, -1, 0]]];
  supports.forEach(([support, vector], index) => { const id = dispenserIdForSupport(p, support); assert.equal(id, 311 + index); assert.deepEqual(dispenserDirection(id), vector); assert.equal(poweredVariant(id, true), id + 6); });
  assert.equal(placementPlan('rune_dispenser', p, 0, supports[5][0]).parts[0].id, BLOCK.RUNE_DISPENSER_DOWN_OFF);
});

test('Spark rising edges fire one real arrow and held power never repeats', () => {
  const world = new MemoryWorld([['0,1,0', BLOCK.SPARK_SWITCH_OFF], ['1,1,0', BLOCK.SUNWIRE_OFF], ['2,1,0', BLOCK.RUNE_DISPENSER_E_OFF]]); const storage = new StorageState(); storage.get(dispenserKey(2, 1, 0)).add('arrow', 2);
  let shots = 0; const state = new RuneDispenserState(world, storage, new MemoryDrops(), { shootArrow: ({ direction }) => { shots += 1; assert.deepEqual(direction, [1, 0, 0]); return true; } }); state.restore();
  const circuits = new CircuitSystem(world, { onStateChange: (point, oldId, newId) => { if (BLOCKS[newId]?.runeDispenser && BLOCKS[newId].powered && !BLOCKS[oldId]?.powered) state.activate(point.x, point.y, point.z); } });
  circuits.toggleSwitch(0, 1, 0); circuits.recomputeAround(1, 1, 0); assert.equal(shots, 1); assert.equal(storage.get(dispenserKey(2, 1, 0)).count('arrow'), 1); circuits.toggleSwitch(0, 1, 0); circuits.toggleSwitch(0, 1, 0); assert.equal(shots, 2);
});

test('water and lava pails place sources and return exact empty pails', () => {
  for (const [item, expectedKind] of [['water_pail', 'water'], ['lava_pail', 'lava']]) {
    const world = new MemoryWorld([['0,1,0', BLOCK.RUNE_DISPENSER_E_OFF]]); const storage = new StorageState(); const inventory = storage.get(dispenserKey(0, 1, 0)); inventory.add(item, 1); let poured = null;
    const state = new RuneDispenserState(world, storage, new MemoryDrops(), { pourFluid: (kind, context) => { poured = { kind, front: context.front }; return true; } }); state.restore(); assert.equal(state.activate(0, 1, 0).type, 'fluid');
    assert.deepEqual(poured, { kind: expectedKind, front: [1, 1, 0] }); assert.equal(inventory.count(item), 0); assert.equal(inventory.count('forged_pail'), 1);
  }
});

test('Blast Kegs prime while Spark Strikers ignite and wear without being consumed', () => {
  const world = new MemoryWorld([['0,1,0', BLOCK.RUNE_DISPENSER_E_OFF]]); const drops = new MemoryDrops();
  const kegStorage = new StorageState(); kegStorage.get(dispenserKey(0, 1, 0)).add(BLOCK.BLAST_KEG, 1); let primed = 0; const keg = new RuneDispenserState(world, kegStorage, drops, { primeKeg: () => { primed += 1; return true; } }); keg.restore(); assert.equal(keg.activate(0, 1, 0).type, 'keg'); assert.equal(primed, 1);
  const fireStorage = new StorageState(); const source = fireStorage.get(dispenserKey(0, 1, 0)); source.addInstance('spark_striker', 12, [{ id: 'enduring', level: 1 }]); let ignited = 0; const fire = new RuneDispenserState(world, fireStorage, drops, { ignite: () => { ignited += 1; return true; } }); fire.restore(); const result = fire.activate(0, 1, 0);
  assert.equal(result.type, 'ignite'); assert.equal(ignited, 1); assert.equal(source.count('spark_striker'), 1); assert.ok(source.durability('spark_striker').remaining >= 11);
});

test('ordinary and failed special items fall back to metadata-safe directional ejection', () => {
  const world = new MemoryWorld([['0,1,0', BLOCK.RUNE_DISPENSER_W_OFF]]); const storage = new StorageState(); const source = storage.get(dispenserKey(0, 1, 0)); const drops = new MemoryDrops(); source.addInstance('iron_pickaxe', 99, [{ id: 'keen', level: 2 }]);
  const state = new RuneDispenserState(world, storage, drops, {}); state.restore(); assert.equal(state.activate(0, 1, 0).type, 'drop'); assert.deepEqual(drops.spawned[0].state.velocity, [-5.2, 0.7, 0]); assert.equal(drops.spawned[0].durability, 99);
  source.add('arrow', 1); drops.allow = false; assert.equal(state.activate(0, 1, 0), null); assert.equal(source.count('arrow'), 1);
});

test('nine-slot state sanitizes, persists, recovers orphans, and drains once', () => {
  const world = new MemoryWorld([['4,5,6', BLOCK.RUNE_DISPENSER_UP_OFF]]); const storage = new StorageState(); storage.get(dispenserKey(4, 5, 6)).add('arrow', 3); storage.get(dispenserKey(9, 9, 9)).add('coal', 2);
  const state = new RuneDispenserState(world, storage, new MemoryDrops(), {}, { records: [{ x: 4, y: 5, z: 6, pulse: 9e9 }, { x: null, y: 1, z: 1 }] }); const recovered = state.restore();
  assert.equal(storage.capacityFor(dispenserKey(4, 5, 6)), 9); assert.equal(state.entries().length, 1); assert.equal(state.entries()[0].pulse, 1_000_000); assert.deepEqual(recovered.map(({ id, count }) => [id, count]), [['coal', 2]]);
  assert.deepEqual(state.blockChanged(4, 5, 6, BLOCK.RUNE_DISPENSER_UP_OFF, BLOCK.AIR).map(({ id, count }) => [id, count]), [['arrow', 3]]); assert.deepEqual(state.blockChanged(4, 5, 6, BLOCK.RUNE_DISPENSER_UP_OFF, BLOCK.AIR), []);
});

test('original rune pixels, directional geometry, collision, preview, and held art agree', () => {
  assert.equal(heldItemProfile('rune_dispenser').type, 'runeDispenser'); assert.deepEqual(previewBoxes(BLOCK.RUNE_DISPENSER_S_ON), dispenserBounds(BLOCK.RUNE_DISPENSER_S_ON)); assert.notDeepEqual(dispenserBounds(BLOCK.RUNE_DISPENSER_S_ON), dispenserBounds(BLOCK.RUNE_DISPENSER_UP_ON));
  const atlas = createBlockAtlas(); const colors = new Set(); const tileX = 137 % ATLAS_COLUMNS; const tileY = Math.floor(137 / ATLAS_COLUMNS); for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) { const offset = ((tileY * TILE_SIZE + y) * atlas.image.width + tileX * TILE_SIZE + x) * 4; colors.add([...atlas.image.data.slice(offset, offset + 3)].join(',')); } assert.ok(colors.size >= 4);
  globalThis.localStorage = new MemoryStorage(); const world = new VoxelWorld(new THREE.Scene(), 13700); const y = WORLD_HEIGHT - 4; world.setBlock(8, y, 8, BLOCK.RUNE_DISPENSER_N_ON); assert.deepEqual(world.collisionBoxes(8, y, 8), [[0.03, 0.03, 0.03, 0.97, 0.97, 0.97]]); assert.ok(world.buildGeometry(0, 0).getAttribute('position').count > 0); atlas.dispose();
});
