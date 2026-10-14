import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { ramCanMoveBlock } from '../src/circuits.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { blastProtected } from '../src/explosives.js';
import {
  detachUnsupportedHearthcake,
  eatHearthcake,
  HEARTHCAKE_SERVINGS,
  HEARTHCAKE_STATES,
  hearthcakeBounds,
  isHearthcake,
} from '../src/hearthcake.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { previewBoxes } from '../src/placementPreview.js';
import { SurvivalState } from '../src/survival.js';
import { ATLAS_COLUMNS, ATLAS_ROWS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { lightPasses } from '../src/voxelLighting.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

class MemoryWorld {
  constructor() { this.blocks = new Map(); }
  key(x, y, z) { return `${x},${y},${z}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); return true; }
}

test('Hearthcake has seven canonical persistent states and returns both recipe pails', () => {
  assert.equal(BLOCK.HEARTHCAKE_FULL, 279); assert.equal(BLOCK.HEARTHCAKE_BITE_6, 285);
  assert.equal(HEARTHCAKE_STATES.length, 7); assert.equal(HEARTHCAKE_SERVINGS, 7);
  HEARTHCAKE_STATES.forEach((id, bites) => {
    assert.equal(BLOCKS[id].hearthcake, true); assert.equal(BLOCKS[id].cakeBites, bites);
    assert.equal(BLOCKS[id].placeable, bites === 0); assert.equal(isHearthcake(id), true);
  });
  assert.deepEqual(blockDrops(BLOCK.HEARTHCAKE_FULL), [BLOCK.HEARTHCAKE_FULL]);
  assert.deepEqual(blockDrops(BLOCK.HEARTHCAKE_BITE_1), []);
  const grid = ['suncomb', 'bramble_egg', 'suncomb', 'mossmilk_pail', null, 'mossmilk_pail', 'wheat', 'wheat', 'wheat'];
  assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'hearthcake');
  const inventory = new Inventory({ counts: [['suncomb', 2], ['bramble_egg', 1], ['mossmilk_pail', 2], ['wheat', 3]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'hearthcake'), 'table'), true);
  assert.equal(inventory.count(BLOCK.HEARTHCAKE_FULL), 1); assert.equal(inventory.count('forged_pail'), 2);
});

test('each Hearthcake use restores hunger and advances exactly one saved block state', () => {
  const world = new MemoryWorld(); const survival = new SurvivalState({ hunger: 2, saturation: 0 });
  world.setBlock(4, 5, 6, BLOCK.HEARTHCAKE_FULL);
  for (let bite = 1; bite <= 7; bite += 1) {
    const result = eatHearthcake(world, 4, 5, 6, survival);
    assert.deepEqual(result, { bite, remaining: 7 - bite, finished: bite === 7 });
    assert.equal(world.getBlock(4, 5, 6), bite === 7 ? BLOCK.AIR : HEARTHCAKE_STATES[bite]);
  }
  assert.equal(survival.hunger, 16); assert.equal(survival.saturation, 3.5);
});

test('full or invalid eat attempts are atomic and cannot erase or advance a cake', () => {
  const world = new MemoryWorld(); world.setBlock(1, 2, 3, BLOCK.HEARTHCAKE_BITE_3);
  const full = new SurvivalState({ hunger: 20, saturation: 5 });
  assert.equal(eatHearthcake(world, 1, 2, 3, full), null);
  assert.equal(world.getBlock(1, 2, 3), BLOCK.HEARTHCAKE_BITE_3);
  assert.equal(eatHearthcake(world, 9, 9, 9, full), null);
});

test('support loss removes every cake state without duplicating recoverable food', () => {
  for (const id of HEARTHCAKE_STATES) {
    const world = new MemoryWorld(); world.setBlock(3, 3, 3, BLOCK.STONE); world.setBlock(3, 4, 3, id);
    assert.equal(detachUnsupportedHearthcake(world, 3, 3, 3), null);
    world.setBlock(3, 3, 3, BLOCK.AIR);
    assert.deepEqual(detachUnsupportedHearthcake(world, 3, 3, 3), { x: 3, y: 4, z: 3, id });
    assert.equal(world.getBlock(3, 4, 3), BLOCK.AIR);
    assert.equal(detachUnsupportedHearthcake(world, 3, 3, 3), null);
  }
});

test('Hearthcake uses shrinking partial geometry, original atlas art, and safe world mechanics', () => {
  const full = hearthcakeBounds(BLOCK.HEARTHCAKE_FULL); const last = hearthcakeBounds(BLOCK.HEARTHCAKE_BITE_6);
  assert.deepEqual(full, [0.08, 0, 0.12, 0.92, 0.5, 0.88]); assert.ok(last[0] > full[0]);
  assert.equal(previewBoxes(BLOCK.HEARTHCAKE_FULL).length, 3);
  assert.equal(heldItemProfile(BLOCK.HEARTHCAKE_FULL).type, 'hearthcake');
  assert.equal(lightPasses(BLOCK.HEARTHCAKE_FULL), true); assert.equal(ramCanMoveBlock(BLOCK.HEARTHCAKE_FULL), false); assert.equal(blastProtected(BLOCK.HEARTHCAKE_FULL), false);
  const atlas = createBlockAtlas(); assert.ok(ATLAS_ROWS >= 17); const colors = new Set();
  const tileX = 130 % ATLAS_COLUMNS; const tileY = Math.floor(130 / ATLAS_COLUMNS);
  for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) {
    const offset = ((tileY * TILE_SIZE + y) * atlas.image.width + tileX * TILE_SIZE + x) * 4;
    colors.add(`${atlas.image.data[offset]},${atlas.image.data[offset + 1]},${atlas.image.data[offset + 2]}`);
  }
  assert.ok(colors.size >= 4);
  const memory = new Map(); globalThis.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const world = new VoxelWorld(new THREE.Scene(), 12900); const y = WORLD_HEIGHT - 2;
  world.setBlock(8, y, 8, BLOCK.HEARTHCAKE_BITE_4);
  assert.deepEqual(world.collisionBoxes(8, y, 8), [hearthcakeBounds(BLOCK.HEARTHCAKE_BITE_4)]);
  assert.ok(world.buildGeometry(0, 0).getAttribute('position').count > 0);
  atlas.dispose();
});
