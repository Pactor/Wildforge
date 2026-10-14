import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { ramCanMoveBlock } from '../src/circuits.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { blastProtected } from '../src/explosives.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { paneBoxes, paneBoxesForConnections, paneConnectable, paneConnections, PANE_THICKNESS } from '../src/panes.js';
import { previewBoxes } from '../src/placementPreview.js';
import { ATLAS_COLUMNS, ATLAS_ROWS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { lightPasses } from '../src/voxelLighting.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

class MemoryWorld {
  constructor() { this.blocks = new Map(); }
  key(x, y, z) { return `${x},${y},${z}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) || BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); }
}

test('Glass Panes and Forged Lattice are canonical sixteen-output building recipes', () => {
  assert.equal(BLOCK.GLASS_PANE, 277); assert.equal(BLOCK.FORGED_LATTICE, 278);
  for (const id of [BLOCK.GLASS_PANE, BLOCK.FORGED_LATTICE]) {
    assert.equal(BLOCKS[id].pane, true); assert.deepEqual(blockDrops(id), [id]);
  }
  const glassGrid = [BLOCK.GLASS, BLOCK.GLASS, BLOCK.GLASS, BLOCK.GLASS, BLOCK.GLASS, BLOCK.GLASS, null, null, null];
  const ironGrid = ['iron_ingot', 'iron_ingot', 'iron_ingot', 'iron_ingot', 'iron_ingot', 'iron_ingot', null, null, null];
  assert.equal(matchCraftingRecipe(glassGrid, 3, 'table').id, 'glass_panes');
  assert.equal(matchCraftingRecipe(ironGrid, 3, 'table').id, 'forged_lattice');
  const inventory = new Inventory({ counts: [[BLOCK.GLASS, 6], ['iron_ingot', 6]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'glass_panes'), 'table'), true);
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'forged_lattice'), 'table'), true);
  assert.equal(inventory.count(BLOCK.GLASS_PANE), 16); assert.equal(inventory.count(BLOCK.FORGED_LATTICE), 16);
});

test('pane connections include pane families and full cubes but reject partial furniture', () => {
  assert.equal(paneConnectable(BLOCK.GLASS_PANE), true); assert.equal(paneConnectable(BLOCK.FORGED_LATTICE), true);
  assert.equal(paneConnectable(BLOCK.STONE), true); assert.equal(paneConnectable(BLOCK.GLASS), true);
  assert.equal(paneConnectable(BLOCK.STONE_SLAB), false); assert.equal(paneConnectable(BLOCK.WAYVAULT_CHEST), false);
  const world = new MemoryWorld(); world.setBlock(0, 1, 0, BLOCK.GLASS_PANE);
  world.setBlock(1, 1, 0, BLOCK.STONE); world.setBlock(0, 1, -1, BLOCK.FORGED_LATTICE); world.setBlock(-1, 1, 0, BLOCK.STONE_SLAB);
  assert.deepEqual(paneConnections(world, 0, 1, 0), { west: false, east: true, north: true, south: false });
  const boxes = paneBoxes(world, 0, 1, 0);
  assert.equal(boxes.length, 3); assert.deepEqual(boxes[1], [0.5, 0, 0.5 - PANE_THICKNESS / 2, 1, 1, 0.5 + PANE_THICKNESS / 2]);
  world.setBlock(1, 1, 0, BLOCK.AIR); assert.equal(paneBoxes(world, 0, 1, 0).length, 2, 'collision retracts when support disappears');
});

test('preview and live collision share the same exact thin-arm authority', () => {
  const all = paneBoxesForConnections({ west: true, east: true, north: true, south: true });
  assert.equal(all.length, 5); assert.deepEqual(previewBoxes(BLOCK.GLASS_PANE), all); assert.deepEqual(previewBoxes(BLOCK.FORGED_LATTICE), all);
  const world = new MemoryWorld(); world.setBlock(3, 4, 3, BLOCK.GLASS_PANE);
  assert.deepEqual(paneBoxes(world, 3, 4, 3), [[0.4375, 0, 0.4375, 0.5625, 1, 0.5625]]);
});

test('panes pass skylight, resist Ram displacement, and remain ordinarily destructible', () => {
  for (const id of [BLOCK.GLASS_PANE, BLOCK.FORGED_LATTICE]) {
    assert.equal(lightPasses(id), true); assert.equal(ramCanMoveBlock(id), false); assert.equal(blastProtected(id), false);
  }
  assert.equal(BLOCKS[BLOCK.GLASS_PANE].transparent, true); assert.notEqual(BLOCKS[BLOCK.FORGED_LATTICE].transparent, true);
});

test('seventeenth-row panes have distinct original pixels and visible connected geometry and held art', () => {
  assert.ok(ATLAS_ROWS >= 17); const atlas = createBlockAtlas(); const signatures = [];
  for (const tile of [128, 129]) {
    const colors = new Set(); const tileX = tile % ATLAS_COLUMNS; const tileY = Math.floor(tile / ATLAS_COLUMNS);
    for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) {
      const offset = ((tileY * TILE_SIZE + y) * atlas.image.width + tileX * TILE_SIZE + x) * 4;
      colors.add(`${atlas.image.data[offset]},${atlas.image.data[offset + 1]},${atlas.image.data[offset + 2]}`);
    }
    assert.ok(colors.size >= 4); signatures.push([...colors].sort().join('|'));
  }
  assert.notEqual(signatures[0], signatures[1]);
  const memory = new Map(); globalThis.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const world = new VoxelWorld(new THREE.Scene(), 12800); const y = WORLD_HEIGHT - 2;
  world.setBlock(8, y, 8, BLOCK.GLASS_PANE); world.setBlock(9, y, 8, BLOCK.FORGED_LATTICE);
  const transparent = world.buildGeometry(0, 0, false, true); const solid = world.buildGeometry(0, 0);
  assert.equal(transparent.getAttribute('position').count, 48, 'glass pane publishes its center and one connected arm to the transparent pass');
  assert.ok(solid.getAttribute('position').count > 36, 'iron lattice publishes to solid pass');
  assert.equal(heldItemProfile(BLOCK.GLASS_PANE).type, 'pane'); assert.equal(heldItemProfile(BLOCK.GLASS_PANE).variant, 'glass');
  assert.equal(heldItemProfile(BLOCK.FORGED_LATTICE).variant, 'iron');
  transparent.dispose(); solid.dispose(); atlas.dispose();
});
