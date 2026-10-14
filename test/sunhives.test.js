import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { CREATURES, EntityManager, realmSpawnProfile } from '../src/entities.js';
import { FarmingState } from '../src/farming.js';
import { Inventory, itemDefinition, RECIPES, blockDrops } from '../src/inventory.js';
import { previewBoxes } from '../src/placementPreview.js';
import { NECTAR_VISITS_PER_LEVEL, SunhiveState, sunhiveBlock, sunhiveLevel } from '../src/sunhives.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

class MockWorld {
  constructor() { this.blocks = new Map(); this.edits = new Map(); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) {
    const recordKey = this.key(x, y, z);
    if (id === BLOCK.AIR) this.blocks.delete(recordKey);
    else this.blocks.set(recordKey, id);
    this.edits.set(recordKey, id);
    return 1;
  }
  terrainHeight() { return 20; }
  biomeAt() { return { id: 'plains' }; }
  isSolid(x, y, z) { return Boolean(BLOCKS[this.getBlock(x, y, z)]?.solid); }
}

const sunmoth = () => {
  const root = new THREE.Group();
  root.position.set(0.5, 21.75, 0.5);
  root.userData.nectarPouch = { visible: false };
  return {
    definition: CREATURES.sunmoth,
    root,
    heading: 0,
    flightTargetY: 23,
    thinkTimer: 0,
    carryingNectar: false,
    pollinationCooldown: 0,
    forageScanCooldown: 0,
    forageTarget: null,
    persistent: false,
    downed: false,
  };
};

test('Sunhives use four canonical visual states, recover their empty frame, and craft from renewable building resources', () => {
  for (let level = 0; level <= 3; level += 1) {
    const id = sunhiveBlock(level);
    assert.equal(sunhiveLevel(id), level);
    assert.equal(BLOCKS[id].sunhive, true);
    assert.deepEqual(blockDrops(id), [BLOCK.SUNHIVE_0]);
  }
  const recipe = RECIPES.find(({ id }) => id === 'sunhive');
  const inventory = new Inventory({ counts: [[BLOCK.PLANKS, 6], ['silk_cord', 3]] });
  assert.equal(inventory.craft(recipe, 'table'), true);
  assert.equal(inventory.count(BLOCK.SUNHIVE_0), 1);
  assert.equal(matchCraftingRecipe([BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, 'silk_cord', 'silk_cord', 'silk_cord', BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS], 3, 'table')?.id, recipe.id);
  assert.ok(previewBoxes(BLOCK.SUNHIVE_0).length >= 6);
  assert.equal(itemDefinition('sunnectar_flask').containerReturn, 'empty_flask');
});

test('Sunmoths visit real flowers, visibly carry nectar, advance crops, and fill a saved hive in discrete visits', () => {
  const world = new MockWorld();
  world.setBlock(0, 21, 0, BLOCK.SUNPETAL);
  world.setBlock(3, 21, 0, BLOCK.SUNHIVE_0);
  const farming = new FarmingState(null, 441);
  farming.till(1, 20, 0);
  farming.plant(1, 21, 0, 'wheat');
  const pollinated = [];
  const deposits = [];
  const state = new SunhiveState(world, null, {
    onPollinate: (crop) => pollinated.push(crop),
    onDeposit: (_hive, level, progress) => deposits.push({ level, progress }),
  });
  state.blockChanged(3, 21, 0, BLOCK.AIR, BLOCK.SUNHIVE_0);
  const moth = sunmoth();

  for (let visit = 0; visit < NECTAR_VISITS_PER_LEVEL * 3; visit += 1) {
    moth.root.position.set(0.5, 21.75, 0.5);
    moth.pollinationCooldown = 0;
    moth.forageTarget = null;
    state.update(0.05, [moth], farming);
    assert.equal(moth.carryingNectar, true);
    assert.equal(moth.root.userData.nectarPouch.visible, true);
    moth.root.position.set(3.5, 21.7, 0.5);
    state.update(0.05, [moth], farming);
    assert.equal(moth.carryingNectar, false);
  }
  assert.equal(pollinated.length > 0, true);
  assert.equal(farming.entries()[0].stage > 0, true);
  assert.equal(world.getBlock(3, 21, 0), BLOCK.SUNHIVE_3);
  assert.equal(state.status(3, 21, 0).full, true);
  assert.equal(deposits.length, NECTAR_VISITS_PER_LEVEL * 3);
});

test('partial hive progress restores exactly, full nectar bottles safely, and breaking returns stored comb', () => {
  const world = new MockWorld();
  world.setBlock(0, 21, 0, BLOCK.SUNPETAL);
  world.setBlock(3, 21, 0, BLOCK.SUNHIVE_0);
  const farming = new FarmingState();
  const moth = sunmoth();
  const first = new SunhiveState(world);
  first.blockChanged(3, 21, 0, BLOCK.AIR, BLOCK.SUNHIVE_0);
  first.update(0.05, [moth], farming);
  moth.root.position.set(3.5, 21.7, 0.5);
  first.update(0.05, [moth], farming);
  assert.equal(first.status(3, 21, 0).progress, 1);

  const drops = [];
  const restored = new SunhiveState(world, first.serialize(), { onDrop: (id, count) => drops.push({ id, count }) });
  assert.equal(restored.status(3, 21, 0).progress, 1);
  for (let visit = 1; visit < NECTAR_VISITS_PER_LEVEL * 3; visit += 1) {
    moth.root.position.set(0.5, 21.75, 0.5);
    moth.pollinationCooldown = 0;
    moth.forageTarget = null;
    restored.update(0.05, [moth], farming);
    moth.root.position.set(3.5, 21.7, 0.5);
    restored.update(0.05, [moth], farming);
  }
  assert.deepEqual(restored.harvest(3, 21, 0), { id: 'sunnectar_flask', count: 1 });
  assert.equal(world.getBlock(3, 21, 0), BLOCK.SUNHIVE_0);
  world.setBlock(3, 21, 0, BLOCK.SUNHIVE_3);
  restored.blockChanged(3, 21, 0, BLOCK.SUNHIVE_0, BLOCK.SUNHIVE_3);
  world.setBlock(3, 21, 0, BLOCK.AIR);
  assert.deepEqual(restored.blockChanged(3, 21, 0, BLOCK.SUNHIVE_3, BLOCK.AIR), { removed: true, comb: 3 });
  assert.deepEqual(drops, [{ id: 'suncomb', count: 3 }]);
});

test('Sunmoths are original passive aerial pollinators with animated nectar state and exact persistence', () => {
  assert.equal(CREATURES.sunmoth.flying, true);
  assert.equal(CREATURES.sunmoth.pollinator, true);
  assert.ok(realmSpawnProfile('plains').passive.includes('sunmoth'));
  const world = new MockWorld();
  const manager = new EntityManager(new THREE.Scene(), world, { position: new THREE.Vector3(0, 21, 0) }, 112);
  const moth = manager.spawn('sunmoth', 2, 2, { persistent: true, carryingNectar: true, pollinationCooldown: 3.5 });
  assert.equal(moth.root.name, 'Sunmoth');
  assert.ok(moth.root.userData.wings.length >= 4);
  assert.ok(moth.root.userData.nectarPouch);
  const saved = manager.serialize()[0];
  assert.equal(saved.carryingNectar, true);
  assert.equal(saved.pollinationCooldown, 3.5);
  const restored = new EntityManager(new THREE.Scene(), world, { position: new THREE.Vector3(0, 21, 0) }, 112);
  assert.equal(restored.restore([saved]), 1);
  assert.equal(restored.entities[0].carryingNectar, true);
  assert.equal(restored.entities[0].pollinationCooldown, 3.5);
});

test('Sunhive geometry shows a partial raised apiary and its block state survives reload', () => {
  const records = new Map();
  globalThis.localStorage = { getItem(name) { return records.get(name) ?? null; }, setItem(name, value) { records.set(name, value); } };
  const world = new VoxelWorld(new THREE.Scene(), 11112);
  const y = WORLD_HEIGHT - 2;
  world.setBlock(8, y - 1, 8, BLOCK.STONE);
  const baseline = world.buildGeometry(0, 0);
  const without = baseline.getAttribute('position').count;
  baseline.dispose();
  world.setBlock(8, y, 8, BLOCK.SUNHIVE_3);
  assert.deepEqual(world.collisionBoxes(8, y, 8), [[0.08, 0, 0.08, 0.92, 0.86, 0.92]]);
  const geometry = world.buildGeometry(0, 0);
  assert.ok(geometry.getAttribute('position').count > without);
  assert.equal(new VoxelWorld(new THREE.Scene(), 11112).getBlock(8, y, 8), BLOCK.SUNHIVE_3);
  geometry.dispose();
});
