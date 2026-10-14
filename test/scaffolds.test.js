import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { placementPlan, previewBoxes } from '../src/placementPreview.js';
import { PlayerController } from '../src/player.js';
import {
  MAX_SCAFFOLD_REACH,
  canPlaceScaffold,
  detachUnsupportedScaffolds,
  placeScaffold,
  scaffoldAt,
  scaffoldSupportDistance,
} from '../src/scaffolds.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

class MockWorld {
  constructor() { this.blocks = new Map(); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) {
    const blockKey = this.key(x, y, z);
    if (id === BLOCK.AIR) this.blocks.delete(blockKey);
    else this.blocks.set(blockKey, id);
    return 1;
  }
  setBlocks(changes) { for (const change of changes) this.setBlock(change.x, change.y, change.z, change.id); return changes.length; }
  collisionBoxes(x, y, z) { return this.getBlock(x, y, z) === BLOCK.SILKFRAME_SCAFFOLD ? [[0, 0.88, 0, 1, 1, 1]] : []; }
}

test('Silkframe Scaffolds stack vertically and bridge no farther than six frames', () => {
  const world = new MockWorld();
  world.setBlock(0, 3, 0, BLOCK.STONE);
  assert.equal(placeScaffold(world, 0, 4, 0), true);
  assert.equal(placeScaffold(world, 0, 5, 0), true, 'a founded scaffold column supports vertical stacking');
  for (let x = 1; x <= MAX_SCAFFOLD_REACH; x += 1) assert.equal(placeScaffold(world, x, 4, 0), true, `bridge frame ${x} should be supported`);
  assert.equal(scaffoldSupportDistance(world, MAX_SCAFFOLD_REACH, 4, 0), MAX_SCAFFOLD_REACH);
  assert.equal(canPlaceScaffold(world, MAX_SCAFFOLD_REACH + 1, 4, 0), false, 'a seventh unsupported horizontal frame must be rejected');
  assert.equal(world.getBlock(MAX_SCAFFOLD_REACH + 1, 4, 0), BLOCK.AIR);
});

test('support loss atomically detaches every orphaned frame while preserving independently founded spans', () => {
  const world = new MockWorld();
  world.setBlock(0, 3, 0, BLOCK.STONE);
  for (let x = 0; x <= 4; x += 1) assert.equal(placeScaffold(world, x, 4, 0), true);
  assert.equal(placeScaffold(world, 0, 5, 0), true);
  world.setBlock(0, 3, 0, BLOCK.AIR);
  const detached = detachUnsupportedScaffolds(world, 0, 0);
  assert.equal(detached.length, 6);
  assert.ok(detached.every(({ x, y, z }) => world.getBlock(x, y, z) === BLOCK.AIR));

  world.setBlock(0, 3, 0, BLOCK.STONE);
  world.setBlock(4, 3, 0, BLOCK.STONE);
  for (let x = 0; x <= 4; x += 1) placeScaffold(world, x, 4, 0);
  world.setBlock(0, 3, 0, BLOCK.AIR);
  assert.deepEqual(detachUnsupportedScaffolds(world, 0, 0), []);
  assert.equal(scaffoldSupportDistance(world, 0, 4, 0), 4, 'the opposite foundation keeps the span intact');
});

test('scaffolds are climbable through their platform and allow deliberate top descent', () => {
  const world = new MockWorld();
  world.setBlock(2, 4, 2, BLOCK.SILKFRAME_SCAFFOLD);
  assert.equal(scaffoldAt(world, new THREE.Vector3(2.5, 4.1, 2.5))?.id, BLOCK.SILKFRAME_SCAFFOLD);
  assert.equal(scaffoldAt(world, new THREE.Vector3(2.5, 5, 2.5)), null);
  assert.equal(scaffoldAt(world, new THREE.Vector3(2.5, 5, 2.5), 0.3, 1.8, true)?.y, 4);

  const player = Object.create(PlayerController.prototype);
  Object.assign(player, {
    world,
    position: new THREE.Vector3(2.5, 5, 2.5),
    radius: 0.3,
    height: 1.8,
    inLiquid: false,
    keys: new Set(['ShiftLeft']),
    ladder: null,
    scaffold: null,
  });
  assert.equal(player.updateClimbingState()?.id, BLOCK.SILKFRAME_SCAFFOLD);
  assert.equal(player.climbing, true);
  assert.deepEqual(player.collisionBoxesAt(2, 4, 2), [], 'the top plate stops colliding while climbing through it');
});

test('scaffold recipe, canonical drop, preview, held art, geometry, and save restoration agree', () => {
  const recipe = RECIPES.find(({ id }) => id === 'silkframe_scaffolds');
  const inventory = new Inventory({ counts: [['stick', 6], ['silk_cord', 3]] });
  assert.equal(inventory.craft(recipe, 'table'), true);
  assert.equal(inventory.count(BLOCK.SILKFRAME_SCAFFOLD), 6);
  assert.equal(matchCraftingRecipe(['stick', 'silk_cord', 'stick', 'stick', 'silk_cord', 'stick', 'stick', 'silk_cord', 'stick'], 3, 'table')?.id, recipe.id);
  assert.deepEqual(blockDrops(BLOCK.SILKFRAME_SCAFFOLD), [BLOCK.SILKFRAME_SCAFFOLD]);
  assert.equal(placementPlan(BLOCK.SILKFRAME_SCAFFOLD, { x: 3, y: 4, z: 5 }, 0)?.parts[0].id, BLOCK.SILKFRAME_SCAFFOLD);
  assert.ok(previewBoxes(BLOCK.SILKFRAME_SCAFFOLD).length >= 8);
  assert.equal(heldItemProfile(BLOCK.SILKFRAME_SCAFFOLD).type, 'scaffold');

  const records = new Map();
  globalThis.localStorage = { getItem(key) { return records.get(key) ?? null; }, setItem(key, value) { records.set(key, value); } };
  const world = new VoxelWorld(new THREE.Scene(), 11110);
  const y = WORLD_HEIGHT - 2;
  world.setBlock(8, y - 1, 8, BLOCK.STONE);
  const baseline = world.buildGeometry(0, 0);
  const without = baseline.getAttribute('position').count;
  baseline.dispose();
  world.setBlock(8, y, 8, BLOCK.SILKFRAME_SCAFFOLD);
  assert.deepEqual(world.collisionBoxes(8, y, 8), [[0, 0.88, 0, 1, 1, 1]]);
  const geometry = world.buildGeometry(0, 0);
  assert.ok(geometry.getAttribute('position').count > without);
  const restored = new VoxelWorld(new THREE.Scene(), 11110);
  assert.equal(restored.getBlock(8, y, 8), BLOCK.SILKFRAME_SCAFFOLD);
  geometry.dispose();
});
