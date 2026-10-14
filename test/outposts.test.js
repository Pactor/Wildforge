import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { EntityManager } from '../src/entities.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { isCharterPost, OutpostState } from '../src/outposts.js';
import { previewBoxes } from '../src/placementPreview.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

class MemoryWorld {
  constructor() { this.blocks = new Map(); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) || BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); }
}

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

function foundingBuild(world) {
  world.setBlock(0, 1, 0, BLOCK.CHARTER_POST_DORMANT);
  world.setBlock(2, 1, 0, BLOCK.BED_N_FOOT);
  world.setBlock(2, 3, 0, BLOCK.PLANKS);
  world.setBlock(-2, 1, 0, BLOCK.CHEST);
  world.setBlock(0, 1, 3, BLOCK.CRAFTING_TABLE);
}

test('Charter Posts found and upgrade only from real nearby facilities and reputation', () => {
  const world = new MemoryWorld();
  const outposts = new OutpostState(world);
  world.setBlock(0, 1, 0, BLOCK.CHARTER_POST_DORMANT);
  let status = outposts.inspect(0, 1, 0, 0);
  assert.equal(status.ready, false);
  assert.ok(status.missing.includes('Moss Bed'));
  foundingBuild(world);
  status = outposts.advance(0, 1, 0, 0);
  assert.equal(status.advanced, true);
  assert.equal(status.tier, 1);
  assert.equal(world.getBlock(0, 1, 0), BLOCK.CHARTER_POST_CAMP);

  world.setBlock(3, 1, 0, BLOCK.FURNACE);
  world.setBlock(-3, 1, 0, BLOCK.HEARTHFIRE_UNLIT);
  for (let x = -1; x <= 2; x += 1) world.setBlock(x, 0, 4, BLOCK.FARMLAND);
  assert.equal(outposts.inspect(0, 1, 0, 7).ready, false);
  assert.equal(outposts.advance(0, 1, 0, 8).tier, 2);
  assert.equal(world.getBlock(0, 1, 0), BLOCK.CHARTER_POST_STEAD);

  world.setBlock(4, 1, 0, BLOCK.FORGE_RAIL_NS);
  world.setBlock(4, 1, 2, BLOCK.FREIGHT_LOADER_N_OFF);
  world.setBlock(-4, 1, 0, BLOCK.RUNEFORGE);
  assert.equal(outposts.advance(0, 1, 0, 24).tier, 3);
  assert.equal(outposts.inspect(0, 1, 0, 24).maximum, true);
  assert.equal(world.getBlock(0, 1, 0), BLOCK.CHARTER_POST_FORGE);

  const restoredWorld = new MemoryWorld();
  const restored = new OutpostState(restoredWorld, outposts.serialize());
  assert.equal(restored.entries()[0].tier, 3);
  assert.equal(restoredWorld.getBlock(0, 1, 0), BLOCK.CHARTER_POST_FORGE);
  assert.equal(restored.removeAt(0, 1, 0).tier, 3);
  assert.equal(restored.entries().length, 0);
});

test('founded outposts attract one persistent scheduled Wayfarer and remove it on teardown', () => {
  const terrain = {
    terrainHeight() { return 20; }, biomeAt() { return { id: 'plains' }; }, hearthsteadsNear() { return []; },
  };
  const records = [{ key: '0,1,0', x: 0, y: 1, z: 0, tier: 1 }];
  const schedule = { phase: 'work', label: 'Working at the outpost', target: { x: 2, y: 21, z: 0 }, tradingOpen: true, speedMultiplier: 1 };
  const manager = new EntityManager(new THREE.Scene(), terrain, { position: new THREE.Vector3(0, 21, 0), inWater: false }, 887, {
    getOutposts: () => records,
    getResidentSchedule: () => schedule,
  });
  assert.equal(manager.ensureOutpostResidents(), 1);
  assert.equal(manager.ensureOutpostResidents(), 0);
  const resident = manager.entities[0];
  assert.equal(resident.outpostKey, records[0].key);
  assert.equal(resident.settlementKey, `outpost:${records[0].key}:resident:0`);
  assert.equal(resident.persistent, true);
  manager.spawnTimer = 99;
  manager.update(0.05, 0.8, 0.5);
  assert.equal(resident.schedulePhase, 'work');
  const saved = manager.serialize();
  assert.equal(saved[0].outpostKey, records[0].key);
  records[0].tier = 3;
  assert.equal(manager.ensureOutpostResidents(), 2);
  assert.deepEqual(manager.entities.map((entity) => entity.residentSlot), [0, 1, 2]);
  assert.equal(manager.removeOutpostResidents(records[0].key), 3);
  assert.equal(manager.entities.length, 0);
});

test('Charter Posts craft, preview, render, collide, emit at top tier, and recover canonically', () => {
  assert.equal(isCharterPost(BLOCK.CHARTER_POST_DORMANT), true);
  assert.equal(BLOCKS[BLOCK.CHARTER_POST_FORGE].light.color, 0x70e8dd);
  assert.deepEqual(blockDrops(BLOCK.CHARTER_POST_FORGE), [BLOCK.CHARTER_POST_DORMANT]);
  assert.equal(previewBoxes(BLOCK.CHARTER_POST_DORMANT).length, 2);
  const recipe = RECIPES.find(({ id }) => id === 'charter_post');
  assert.ok(recipe);
  assert.equal(matchCraftingRecipe([null, 'iron_ingot', null, BLOCK.PLANKS, 'hearthmark', BLOCK.PLANKS, BLOCK.WOOD, 'hearthmark', BLOCK.WOOD], 3, 'table')?.id, 'charter_post');
  const inventory = new Inventory({ counts: Object.entries(recipe.ingredients) });
  assert.equal(inventory.craft(recipe, 'table'), true);
  assert.equal(inventory.count(BLOCK.CHARTER_POST_DORMANT), 1);

  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 4491);
  const y = WORLD_HEIGHT - 2;
  world.setBlock(3, y, 3, BLOCK.CHARTER_POST_FORGE);
  assert.equal(world.collisionBoxes(3, y, 3).length, 2);
  const positions = world.buildGeometry(0, 0).getAttribute('position').array;
  assert.ok([...positions].some((value, index) => index % 3 === 1 && value > y + 1.6));
});
