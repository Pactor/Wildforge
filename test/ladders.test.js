import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK } from '../src/blocks.js';
import { placementPlan, previewBoxes } from '../src/placementPreview.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { canPlaceLadder, detachUnsupportedLadders, ladderAt, ladderIdForSupport, ladderInfo, placeLadder } from '../src/ladders.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

class MockWorld {
  constructor() { this.blocks = new Map(); }
  key(x, y, z) { return `${x},${y},${z}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(Math.floor(x), Math.floor(y), Math.floor(z))) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { id === BLOCK.AIR ? this.blocks.delete(this.key(x, y, z)) : this.blocks.set(this.key(x, y, z), id); }
}

test('ladders attach to the clicked solid face and detach when backing is removed', () => {
  const world = new MockWorld();
  world.setBlock(2, 4, 2, BLOCK.STONE);
  const position = { x: 2, y: 4, z: 3 };
  const support = { x: 2, y: 4, z: 2 };
  const id = ladderIdForSupport(position, support);
  assert.equal(id, BLOCK.LADDER_N);
  assert.deepEqual(ladderInfo(id), { orientation: 'n', support: { x: 0, z: -1 } });
  assert.equal(canPlaceLadder(world, position.x, position.y, position.z, id), true);
  assert.equal(placeLadder(world, position.x, position.y, position.z, id), true);
  assert.equal(ladderAt(world, new THREE.Vector3(2.5, 4, 3.5))?.id, id);
  assert.deepEqual(blockDrops(id), ['oak_ladder']);
  const invalid = new MockWorld();
  invalid.setBlock(2, 4, 2, BLOCK.GLASS);
  assert.equal(canPlaceLadder(invalid, position.x, position.y, position.z, id), false, 'transparent blocks cannot back a ladder');

  world.setBlock(support.x, support.y, support.z, BLOCK.AIR);
  assert.deepEqual(detachUnsupportedLadders(world, support.x, support.y, support.z), [{ ...position, id }]);
  assert.equal(world.getBlock(position.x, position.y, position.z), BLOCK.AIR);
});

test('ladder recipe, directional preview, collision, and low-poly geometry are canonical', () => {
  const inventory = new Inventory({ counts: [['stick', 7]] });
  const recipe = RECIPES.find((candidate) => candidate.id === 'oak_ladders');
  assert.equal(inventory.craft(recipe, 'table'), true);
  assert.equal(inventory.count('oak_ladder'), 3);

  const support = { x: 5, y: 7, z: 5 };
  const plan = placementPlan('oak_ladder', { x: 6, y: 7, z: 5 }, 0, support);
  assert.equal(plan.parts[0].id, BLOCK.LADDER_W);
  assert.equal(plan.orientation, 'W');
  assert.equal(previewBoxes(BLOCK.LADDER_W).length, 1);

  const records = new Map();
  globalThis.localStorage = { getItem(key) { return records.get(key) ?? null; }, setItem(key, value) { records.set(key, value); } };
  const world = new VoxelWorld(new THREE.Scene(), 9199);
  const y = WORLD_HEIGHT - 2;
  world.setBlock(8, y, 8, BLOCK.STONE);
  const baselineGeometry = world.buildGeometry(0, 0);
  const withoutLadder = baselineGeometry.getAttribute('position').count;
  baselineGeometry.dispose();
  world.setBlock(9, y, 8, BLOCK.LADDER_W);
  assert.deepEqual(world.collisionBoxes(9, y, 8), []);
  const geometry = world.buildGeometry(0, 0);
  assert.ok(geometry.getAttribute('position').count > withoutLadder, 'ladder rails and rungs add visible geometry');
  assert.equal(heldItemProfile('oak_ladder').type, 'ladder');
  const restored = new VoxelWorld(new THREE.Scene(), 9199);
  assert.equal(restored.getBlock(9, y, 8), BLOCK.LADDER_W);
  geometry.dispose();
});
