import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { CircuitSystem, circuitItem, directionalCircuitId, poweredVariant, ramCanMoveBlock } from '../src/circuits.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { placementPlan, previewBoxes } from '../src/placementPreview.js';
import { ATLAS_ROWS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

class MemoryWorld {
  constructor(entries = [], sky = 15) {
    this.blocks = new Map(entries);
    this.sky = sky;
  }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) || BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); }
  setBlocks(changes) { for (const change of changes) this.setBlock(change.x, change.y, change.z, change.id); }
  skyLightAt() { return this.sky; }
}

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

test('directional Relay, Ram, and Pulse Sequencer variants preserve facing, power, items, and previews', () => {
  assert.equal(directionalCircuitId('spark_relay', 0), BLOCK.SPARK_RELAY_N_OFF);
  assert.equal(directionalCircuitId('spark_relay', -Math.PI / 2), BLOCK.SPARK_RELAY_E_OFF);
  assert.equal(directionalCircuitId('forge_ram', Math.PI), BLOCK.FORGE_RAM_S_OFF);
  assert.equal(directionalCircuitId('pulse_sequencer', Math.PI / 2), BLOCK.PULSE_SEQUENCER_W_OFF);
  assert.equal(poweredVariant(BLOCK.SPARK_RELAY_W_OFF, true), BLOCK.SPARK_RELAY_W_ON);
  assert.equal(poweredVariant(BLOCK.FORGE_RAM_E_ON, false), BLOCK.FORGE_RAM_E_OFF);
  assert.equal(circuitItem(BLOCK.SPARK_RELAY_S_ON), 'spark_relay');
  assert.equal(circuitItem(BLOCK.FORGE_RAM_N_ON), 'forge_ram');
  assert.equal(circuitItem(BLOCK.PULSE_SEQUENCER_E_ON), 'pulse_sequencer');
  const relayPlan = placementPlan('spark_relay', { x: 2, y: 3, z: 4 }, -Math.PI / 2);
  const ramPlan = placementPlan('forge_ram', { x: 5, y: 3, z: 4 }, Math.PI);
  const sequencerPlan = placementPlan('pulse_sequencer', { x: 7, y: 3, z: 4 }, -Math.PI / 2);
  assert.equal(relayPlan.parts[0].id, BLOCK.SPARK_RELAY_E_OFF);
  assert.equal(relayPlan.orientation, 'E');
  assert.equal(ramPlan.parts[0].id, BLOCK.FORGE_RAM_S_OFF);
  assert.equal(sequencerPlan.parts[0].id, BLOCK.PULSE_SEQUENCER_E_OFF);
  assert.ok(previewBoxes(relayPlan.parts[0].id)[0][4] < 0.5);
  assert.equal(previewBoxes(ramPlan.parts[0].id)[0][4], 0.96);
  assert.ok(previewBoxes(sequencerPlan.parts[0].id)[0][4] < 0.5);
});

test('Pulse Sequencers isolate their terminals, emit exact rising-edge pulse programs, and resume mid-beat', () => {
  const world = new MemoryWorld([
    ['0,1,0', BLOCK.SPARK_SWITCH_OFF],
    ['1,1,0', BLOCK.SUNWIRE_OFF],
    ['2,1,0', BLOCK.PULSE_SEQUENCER_E_OFF],
    ['3,1,0', BLOCK.SUNWIRE_OFF],
    ['4,1,0', BLOCK.FORGE_LAMP_OFF],
  ]);
  let lampRises = 0;
  const circuits = new CircuitSystem(world, {
    onStateChange(position, oldId, newId) {
      if (position.x === 4 && oldId === BLOCK.FORGE_LAMP_OFF && newId === BLOCK.FORGE_LAMP_ON) lampRises += 1;
    },
  });
  circuits.blockChanged(2, 1, 0, BLOCK.AIR, BLOCK.PULSE_SEQUENCER_E_OFF);
  circuits.toggleSwitch(0, 1, 0);
  assert.equal(world.getBlock(2, 1, 0), BLOCK.PULSE_SEQUENCER_E_ON);
  assert.equal(world.getBlock(4, 1, 0), BLOCK.FORGE_LAMP_ON);
  circuits.update(0.1);
  const saved = circuits.serialize();
  assert.equal(saved.sequencers[0][1], 3);
  assert.ok(saved.sequencers[0][3] > 0.14 && saved.sequencers[0][3] < 0.16);

  const restored = new CircuitSystem(world, { saved });
  restored.update(0.14);
  assert.equal(world.getBlock(4, 1, 0), BLOCK.FORGE_LAMP_ON);
  restored.update(0.02);
  assert.equal(world.getBlock(4, 1, 0), BLOCK.FORGE_LAMP_OFF);
  restored.update(1.3);
  assert.equal(world.getBlock(2, 1, 0), BLOCK.PULSE_SEQUENCER_E_OFF);
  assert.equal(world.getBlock(4, 1, 0), BLOCK.FORGE_LAMP_OFF);
  assert.equal(lampRises, 1, 'restored callbacks are independent while the original captured the first rise');

  restored.toggleSwitch(0, 1, 0);
  restored.toggleSwitch(0, 1, 0);
  assert.equal(world.getBlock(4, 1, 0), BLOCK.FORGE_LAMP_ON, 'a fresh rising input retriggers only after input release');
  assert.deepEqual(restored.cycleSequencer(2, 1, 0), { pulses: 4, interval: 0.25, duration: 2 });
});

test('Trail Plates and Sun Eyes are automatic authoritative sources with shelter-aware state', () => {
  const pressureWorld = new MemoryWorld([
    ['0,1,0', BLOCK.TRAIL_PLATE_OFF],
    ['1,1,0', BLOCK.SUNWIRE_OFF],
    ['2,1,0', BLOCK.FORGE_LAMP_OFF],
  ]);
  const pressure = new CircuitSystem(pressureWorld);
  pressure.blockChanged(0, 1, 0, BLOCK.AIR, BLOCK.TRAIL_PLATE_OFF);
  pressure.update(0.1, { actors: [{ x: 0.4, y: 1, z: 0.5 }], daylight: 0 });
  assert.equal(pressureWorld.getBlock(0, 1, 0), BLOCK.TRAIL_PLATE_ON);
  assert.equal(pressureWorld.getBlock(2, 1, 0), BLOCK.FORGE_LAMP_ON);
  pressure.update(0.1, { actors: [], daylight: 0 });
  assert.equal(pressureWorld.getBlock(0, 1, 0), BLOCK.TRAIL_PLATE_OFF);
  assert.equal(pressureWorld.getBlock(2, 1, 0), BLOCK.FORGE_LAMP_OFF);

  const sunWorld = new MemoryWorld([
    ['0,1,0', BLOCK.SUN_EYE_OFF],
    ['1,1,0', BLOCK.SUNWIRE_OFF],
    ['2,1,0', BLOCK.FORGE_LAMP_OFF],
  ], 15);
  const sun = new CircuitSystem(sunWorld);
  sun.blockChanged(0, 1, 0, BLOCK.AIR, BLOCK.SUN_EYE_OFF);
  sun.update(0.1, { daylight: 0.8 });
  assert.equal(sunWorld.getBlock(0, 1, 0), BLOCK.SUN_EYE_ON);
  sunWorld.sky = 4;
  sun.update(0.1, { daylight: 0.8 });
  assert.equal(sunWorld.getBlock(0, 1, 0), BLOCK.SUN_EYE_OFF);
});

test('Spark Relays isolate two networks, cross the boundary after their saved delay, and switch off after the same delay', () => {
  const world = new MemoryWorld([
    ['0,1,0', BLOCK.SPARK_SWITCH_OFF],
    ['1,1,0', BLOCK.SUNWIRE_OFF],
    ['2,1,0', BLOCK.SPARK_RELAY_E_OFF],
    ['3,1,0', BLOCK.SUNWIRE_OFF],
    ['4,1,0', BLOCK.FORGE_LAMP_OFF],
  ]);
  const circuits = new CircuitSystem(world);
  circuits.blockChanged(2, 1, 0, BLOCK.AIR, BLOCK.SPARK_RELAY_E_OFF);
  circuits.toggleSwitch(0, 1, 0);
  assert.equal(world.getBlock(1, 1, 0), BLOCK.SUNWIRE_ON);
  assert.equal(world.getBlock(3, 1, 0), BLOCK.SUNWIRE_OFF);
  assert.equal(world.getBlock(4, 1, 0), BLOCK.FORGE_LAMP_OFF);
  assert.deepEqual(circuits.update(0.49), []);
  const powered = circuits.update(0.02);
  assert.equal(powered[0].type, 'relay');
  assert.equal(world.getBlock(2, 1, 0), BLOCK.SPARK_RELAY_E_ON);
  assert.equal(world.getBlock(3, 1, 0), BLOCK.SUNWIRE_ON);
  assert.equal(world.getBlock(4, 1, 0), BLOCK.FORGE_LAMP_ON);
  assert.deepEqual(circuits.cycleRelay(2, 1, 0), { delay: 1, step: 3 });
  assert.equal(circuits.serialize().relays[0][1], 2);
  circuits.toggleSwitch(0, 1, 0);
  circuits.update(0.99);
  assert.equal(world.getBlock(4, 1, 0), BLOCK.FORGE_LAMP_ON);
  circuits.update(0.02);
  assert.equal(world.getBlock(2, 1, 0), BLOCK.SPARK_RELAY_E_OFF);
  assert.equal(world.getBlock(4, 1, 0), BLOCK.FORGE_LAMP_OFF);
  const restored = new CircuitSystem(world, { saved: circuits.serialize() });
  assert.equal(restored.cycleRelay(2, 1, 0).delay, 2);

  const directWorld = new MemoryWorld([
    ['0,1,0', BLOCK.SPARK_SWITCH_ON],
    ['1,1,0', BLOCK.SPARK_RELAY_E_OFF],
    ['2,1,0', BLOCK.FORGE_LAMP_OFF],
  ]);
  const direct = new CircuitSystem(directWorld);
  direct.blockChanged(1, 1, 0, BLOCK.AIR, BLOCK.SPARK_RELAY_E_OFF);
  direct.recomputeAround(0, 1, 0);
  direct.update(0.51);
  assert.equal(directWorld.getBlock(2, 1, 0), BLOCK.FORGE_LAMP_ON, 'relay outputs may directly drive adjacent sinks');
});

test('Forge Rams move one eligible ordinary block atomically on each powered rising edge and reject protected states', () => {
  const world = new MemoryWorld([
    ['0,1,0', BLOCK.SPARK_SWITCH_OFF],
    ['1,1,0', BLOCK.SUNWIRE_OFF],
    ['2,1,0', BLOCK.FORGE_RAM_E_OFF],
    ['3,1,0', BLOCK.STONE],
  ]);
  const moves = [];
  const circuits = new CircuitSystem(world, { onMove: (move) => moves.push(move) });
  circuits.blockChanged(2, 1, 0, BLOCK.AIR, BLOCK.FORGE_RAM_E_OFF);
  circuits.toggleSwitch(0, 1, 0);
  assert.equal(world.getBlock(2, 1, 0), BLOCK.FORGE_RAM_E_ON);
  assert.equal(world.getBlock(3, 1, 0), BLOCK.AIR);
  assert.equal(world.getBlock(4, 1, 0), BLOCK.STONE);
  assert.equal(moves.length, 1);
  circuits.toggleSwitch(0, 1, 0);
  circuits.toggleSwitch(0, 1, 0);
  assert.equal(moves.length, 1, 'an empty ram face must not pull or move distant blocks');
  assert.equal(ramCanMoveBlock(BLOCK.PLANKS), true);
  assert.equal(ramCanMoveBlock(BLOCK.CHEST), false);
  assert.equal(ramCanMoveBlock(BLOCK.SUNWIRE_OFF), false);
  assert.equal(ramCanMoveBlock(BLOCK.VAULT_SEAL), false);

  const blocked = new MemoryWorld([
    ['0,1,0', BLOCK.FORGE_RAM_E_OFF],
    ['1,1,0', BLOCK.PLANKS],
    ['2,1,0', BLOCK.CHEST],
  ]);
  assert.equal(new CircuitSystem(blocked).moveWithRam([0, 1, 0], BLOCK.FORGE_RAM_E_OFF), null);
  assert.equal(blocked.getBlock(1, 1, 0), BLOCK.PLANKS);
  assert.equal(blocked.getBlock(2, 1, 0), BLOCK.CHEST);
});

test('new automation definitions use original state models and canonical support rules', () => {
  assert.equal(BLOCKS[BLOCK.TRAIL_PLATE_OFF].sensorKind, 'pressure');
  assert.equal(BLOCKS[BLOCK.SUN_EYE_ON].sensorKind, 'daylight');
  assert.equal(BLOCKS[BLOCK.SPARK_RELAY_N_OFF].requiresSupport, true);
  assert.equal(BLOCKS[BLOCK.FORGE_RAM_W_ON].model, 'forgeRam');
});

test('expanded circuit blocks render distinct low-poly profiles in the enlarged procedural atlas', () => {
  globalThis.localStorage = new MemoryStorage();
  const atlas = createBlockAtlas();
  assert.equal(atlas.image.width, TILE_SIZE * 8);
  assert.equal(atlas.image.height, TILE_SIZE * ATLAS_ROWS);
  const world = new VoxelWorld(new THREE.Scene(), 1414);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(4, y, 4, BLOCK.TRAIL_PLATE_ON);
  world.setBlock(6, y, 4, BLOCK.SUN_EYE_ON);
  world.setBlock(8, y, 4, BLOCK.SPARK_RELAY_E_ON);
  world.setBlock(10, y, 4, BLOCK.FORGE_RAM_E_ON);
  assert.deepEqual(world.collisionBoxes(4, y, 4), []);
  assert.deepEqual(world.collisionBoxes(6, y, 4), []);
  assert.deepEqual(world.collisionBoxes(8, y, 4), []);
  assert.equal(world.collisionHeight(10, y, 4), 1);
  const positions = world.buildGeometry(0, 0).getAttribute('position').array;
  const high = [];
  for (let index = 0; index < positions.length; index += 3) if (positions[index + 1] >= y) high.push([positions[index], positions[index + 1], positions[index + 2]]);
  assert.ok(high.some(([, py]) => py > y && py < y + 0.11), 'plate should remain surface-hugging');
  assert.ok(high.some(([px]) => px > 11.1), 'powered east-facing Ram should visibly extend beyond its voxel');
});

test('all automation recipes craft canonical recoverable base items', () => {
  for (const recipeId of ['trail_plate', 'sun_eye', 'spark_relay', 'forge_ram', 'pulse_sequencer']) {
    const recipe = RECIPES.find((candidate) => candidate.id === recipeId);
    assert.ok(recipe, `${recipeId} recipe missing`);
    assert.equal(matchCraftingRecipe(recipeId === 'trail_plate'
      ? [null, 'iron_ingot', null, BLOCK.STONE_SLAB, 'windfiber', BLOCK.STONE_SLAB, null, null, null]
      : recipeId === 'sun_eye'
        ? [BLOCK.GLASS, 'sunpetal_dye', BLOCK.GLASS, null, 'lumen_shard', null, null, BLOCK.GLASS, null]
        : recipeId === 'spark_relay'
          ? [null, 'lumen_shard', null, 'iron_ingot', 'iron_ingot', null, BLOCK.STONE_SLAB, BLOCK.STONE_SLAB, null]
          : recipeId === 'forge_ram'
            ? ['iron_ingot', 'iron_ingot', 'iron_ingot', BLOCK.STONE, 'emberite_ingot', 'iron_ingot', BLOCK.STONE, BLOCK.STONE, null]
            : ['lumen_shard', 'windfiber', 'lumen_shard', 'iron_ingot', 'iron_ingot', null, BLOCK.STONE_SLAB, BLOCK.STONE_SLAB, null], 3, 'table')?.id, recipeId);
    const inventory = new Inventory({ counts: Object.entries(recipe.ingredients) });
    assert.equal(inventory.craft(recipe, 'table'), true);
    assert.equal(inventory.count(recipe.output.id), recipe.output.count);
  }
  assert.deepEqual(blockDrops(BLOCK.TRAIL_PLATE_ON), [BLOCK.TRAIL_PLATE_OFF]);
  assert.deepEqual(blockDrops(BLOCK.SUN_EYE_ON), [BLOCK.SUN_EYE_OFF]);
  assert.deepEqual(blockDrops(BLOCK.SPARK_RELAY_N_ON), ['spark_relay']);
  assert.deepEqual(blockDrops(BLOCK.FORGE_RAM_W_ON), ['forge_ram']);
  assert.deepEqual(blockDrops(BLOCK.PULSE_SEQUENCER_N_ON), ['pulse_sequencer']);
});
