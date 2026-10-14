import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { CircuitSystem, poweredVariant } from '../src/circuits.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { placementPlan, previewBoxes } from '../src/placementPreview.js';
import { cycleRailJunction, isPoweredRail, isRail, isRailJunction, placeRail, railConnections, railPlacementId, refreshRailsAround } from '../src/rails.js';
import { ATLAS_ROWS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
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

function supportedWorld(radius = 4) {
  const world = new MemoryWorld();
  for (let z = -radius; z <= radius; z += 1) for (let x = -radius; x <= radius; x += 1) world.setBlock(x, 0, z, BLOCK.STONE);
  return world;
}

test('Forge Rails auto-shape into straights, curves, and four-way junctions', () => {
  const world = supportedWorld();
  assert.ok(placeRail(world, 0, 1, 0, 'forge_rail', 0));
  assert.equal(world.getBlock(0, 1, 0), BLOCK.FORGE_RAIL_NS);
  placeRail(world, 1, 1, 0, 'forge_rail', -Math.PI / 2);
  assert.equal(world.getBlock(0, 1, 0), BLOCK.FORGE_RAIL_EW);
  placeRail(world, 1, 1, 1, 'forge_rail', 0);
  assert.equal(world.getBlock(1, 1, 0), BLOCK.FORGE_RAIL_SW);
  assert.deepEqual(new Set(railConnections(world.getBlock(1, 1, 0))), new Set(['S', 'W']));

  const junction = supportedWorld();
  placeRail(junction, 0, 1, 0, 'forge_rail', 0);
  placeRail(junction, 0, 1, -1, 'forge_rail', 0);
  placeRail(junction, 0, 1, 1, 'forge_rail', 0);
  placeRail(junction, 1, 1, 0, 'forge_rail', -Math.PI / 2);
  assert.equal(junction.getBlock(0, 1, 0), BLOCK.FORGE_RAIL_JUNCTION);
  assert.deepEqual(new Set(railConnections(BLOCK.FORGE_RAIL_JUNCTION)), new Set(['N', 'E', 'S', 'W']));
});

test('rail junction routes cycle visibly and remain stable through neighbor refreshes', () => {
  const world = new MemoryWorld();
  world.setBlock(0, 1, 0, BLOCK.FORGE_RAIL_JUNCTION);
  for (const [x, z] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) world.setBlock(x, 1, z, BLOCK.FORGE_RAIL_NS);
  assert.equal(isRailJunction(world.getBlock(0, 1, 0)), true);
  assert.equal(cycleRailJunction(world, 0, 1, 0).direction, 'E');
  refreshRailsAround(world, 0, 1, 0);
  assert.equal(world.getBlock(0, 1, 0), BLOCK.FORGE_RAIL_JUNCTION_E);
  assert.equal(cycleRailJunction(world, 0, 1, 0).direction, 'S');
});

test('ordinary rails auto-shape upward toward one-block raised neighbors and flatten when removed', () => {
  const world = new MemoryWorld();
  world.setBlock(0, 1, 0, BLOCK.FORGE_RAIL_NS);
  world.setBlock(0, 2, -1, BLOCK.FORGE_RAIL_NS);
  world.setBlock(0, 1, 1, BLOCK.FORGE_RAIL_NS);
  refreshRailsAround(world, 0, 2, -1);
  assert.equal(world.getBlock(0, 1, 0), BLOCK.FORGE_RAIL_ASC_N);
  assert.equal(BLOCKS[world.getBlock(0, 1, 0)].slopeDirection, 'N');
  assert.deepEqual(railConnections(world.getBlock(0, 1, 0)), ['N', 'S']);
  assert.equal(world.getBlock(0, 2, -1), BLOCK.FORGE_RAIL_NS);
  world.setBlock(0, 2, -1, BLOCK.AIR);
  refreshRailsAround(world, 0, 2, -1);
  assert.equal(world.getBlock(0, 1, 0), BLOCK.FORGE_RAIL_NS);
});

test('Drive Rails preserve orientation and become energized circuit sinks', () => {
  const world = supportedWorld();
  world.setBlock(0, 1, 0, BLOCK.SPARK_SWITCH_OFF);
  world.setBlock(1, 1, 0, BLOCK.SUNWIRE_OFF);
  world.setBlock(2, 1, 0, BLOCK.POWER_RAIL_EW_OFF);
  const circuits = new CircuitSystem(world);
  circuits.toggleSwitch(0, 1, 0);
  assert.equal(world.getBlock(2, 1, 0), BLOCK.POWER_RAIL_EW_ON);
  assert.equal(isPoweredRail(world.getBlock(2, 1, 0)), true);
  assert.equal(poweredVariant(BLOCK.POWER_RAIL_NS_ON, false), BLOCK.POWER_RAIL_NS_OFF);
  circuits.toggleSwitch(0, 1, 0);
  assert.equal(world.getBlock(2, 1, 0), BLOCK.POWER_RAIL_EW_OFF);
});

test('rail items have directional previews, original low geometry, recipes, and canonical drops', () => {
  assert.equal(railPlacementId('forge_rail', 0), BLOCK.FORGE_RAIL_NS);
  assert.equal(railPlacementId('powered_rail', -Math.PI / 2), BLOCK.POWER_RAIL_EW_OFF);
  assert.equal(placementPlan('forge_rail', { x: 2, y: 3, z: 4 }, 0).kind, 'rail');
  assert.ok(previewBoxes(BLOCK.FORGE_RAIL_NS)[0][4] < 0.15);
  assert.equal(isRail(BLOCK.FORGE_RAIL_NE), true);
  assert.deepEqual(blockDrops(BLOCK.FORGE_RAIL_JUNCTION), ['forge_rail']);
  assert.deepEqual(blockDrops(BLOCK.FORGE_RAIL_ASC_W), ['forge_rail']);
  assert.deepEqual(blockDrops(BLOCK.POWER_RAIL_NS_ON), ['powered_rail']);

  const normal = RECIPES.find(({ id }) => id === 'forge_rails');
  const powered = RECIPES.find(({ id }) => id === 'powered_rails');
  assert.ok(normal && powered);
  assert.equal(matchCraftingRecipe(['iron_ingot', null, 'iron_ingot', 'iron_ingot', 'stick', 'iron_ingot', 'iron_ingot', null, 'iron_ingot'], 3, 'table')?.id, 'forge_rails');
  const inventory = new Inventory({ counts: Object.entries(powered.ingredients) });
  assert.equal(inventory.craft(powered, 'table'), true);
  assert.equal(inventory.count('powered_rail'), 6);

  const atlas = createBlockAtlas();
  assert.equal(atlas.image.width, TILE_SIZE * 8);
  assert.equal(atlas.image.height, TILE_SIZE * ATLAS_ROWS);
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 7717);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(4, y, 4, BLOCK.FORGE_RAIL_NE);
  world.setBlock(6, y, 4, BLOCK.POWER_RAIL_EW_ON);
  world.setBlock(8, y, 4, BLOCK.FORGE_RAIL_ASC_E);
  assert.deepEqual(world.collisionBoxes(4, y, 4), []);
  const positions = world.buildGeometry(0, 0).getAttribute('position').array;
  assert.ok([...positions].some((value, index) => index % 3 === 1 && value > y && value < y + 0.13));
  assert.ok([...positions].some((value, index) => index % 3 === 1 && value > y + 0.8 && value < y + 1));
});
