import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { PlacedLightManager } from '../src/lights.js';
import { placementPlan, previewBoxes } from '../src/placementPreview.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { canPlaceTorch, detachUnsupportedTorches, isTorch, placeTorch, torchGeometry, torchIdForSupport, torchInfo } from '../src/torches.js';
import { emittedLightLevel, lightPasses } from '../src/voxelLighting.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

class MockWorld {
  constructor() { this.blocks = new Map(); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { id === BLOCK.AIR ? this.blocks.delete(this.key(x, y, z)) : this.blocks.set(this.key(x, y, z), id); return true; }
}

test('one canonical Forgebrand recipe supplies the floor item and all four wall states', () => {
  const states = [BLOCK.TORCH, BLOCK.TORCH_WALL_N, BLOCK.TORCH_WALL_E, BLOCK.TORCH_WALL_S, BLOCK.TORCH_WALL_W];
  assert.deepEqual(states, [23, 287, 288, 289, 290]);
  states.forEach((id, index) => {
    assert.equal(isTorch(id), true); assert.ok(emittedLightLevel(id) >= 11); assert.equal(lightPasses(id), true);
    assert.deepEqual(blockDrops(id), [BLOCK.TORCH]); assert.equal(BLOCKS[id].placeable, index === 0);
  });
  assert.equal(matchCraftingRecipe(['coal', null, null, 'stick', null, null, null, null, null], 3, 'hand').id, 'torches');
  const inventory = new Inventory({ counts: [['coal', 1], ['stick', 1]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'torches'), 'hand'), true); assert.equal(inventory.count(BLOCK.TORCH), 4);
});

test('clicked full faces author exact floor and cardinal wall Forgebrands', () => {
  const world = new MockWorld(); const position = { x: 5, y: 6, z: 5 };
  const cases = [
    [{ x: 5, y: 5, z: 5 }, BLOCK.TORCH, 'floor'],
    [{ x: 5, y: 6, z: 4 }, BLOCK.TORCH_WALL_N, 'n'],
    [{ x: 6, y: 6, z: 5 }, BLOCK.TORCH_WALL_E, 'e'],
    [{ x: 5, y: 6, z: 6 }, BLOCK.TORCH_WALL_S, 's'],
    [{ x: 4, y: 6, z: 5 }, BLOCK.TORCH_WALL_W, 'w'],
  ];
  for (const [support, id, facing] of cases) {
    world.blocks.clear(); world.setBlock(support.x, support.y, support.z, BLOCK.STONE);
    assert.equal(torchIdForSupport(position, support), id); assert.equal(torchInfo(id).facing, facing);
    assert.equal(canPlaceTorch(world, position.x, position.y, position.z, id), true);
    assert.equal(placeTorch(world, position.x, position.y, position.z, id), true); assert.equal(world.getBlock(5, 6, 5), id);
  }
  world.blocks.clear(); world.setBlock(5, 5, 5, BLOCK.GLASS);
  assert.equal(canPlaceTorch(world, 5, 6, 5, BLOCK.TORCH), false, 'transparent support is rejected');
  world.setBlock(5, 5, 5, BLOCK.STONE_SLAB);
  assert.equal(canPlaceTorch(world, 5, 6, 5, BLOCK.TORCH), false, 'partial support is rejected');
});

test('support loss detaches every matching Forgebrand exactly once', () => {
  const states = [BLOCK.TORCH, BLOCK.TORCH_WALL_N, BLOCK.TORCH_WALL_E, BLOCK.TORCH_WALL_S, BLOCK.TORCH_WALL_W];
  for (const id of states) {
    const world = new MockWorld(); const info = torchInfo(id); const torch = { x: 4, y: 4, z: 4 };
    const support = { x: torch.x + info.support.x, y: torch.y + info.support.y, z: torch.z + info.support.z };
    world.setBlock(support.x, support.y, support.z, BLOCK.STONE); world.setBlock(torch.x, torch.y, torch.z, id);
    assert.deepEqual(detachUnsupportedTorches(world, support.x, support.y, support.z), []);
    world.setBlock(support.x, support.y, support.z, BLOCK.AIR);
    assert.deepEqual(detachUnsupportedTorches(world, support.x, support.y, support.z), [{ ...torch, id }]);
    assert.equal(world.getBlock(torch.x, torch.y, torch.z), BLOCK.AIR); assert.deepEqual(detachUnsupportedTorches(world, support.x, support.y, support.z), []);
  }
});

test('placement plans, previews, and held art expose directional authored geometry', () => {
  const floor = placementPlan(BLOCK.TORCH, { x: 3, y: 4, z: 3 }, 0, { x: 3, y: 3, z: 3 });
  const wall = placementPlan(BLOCK.TORCH, { x: 3, y: 4, z: 3 }, 0, { x: 3, y: 4, z: 2 });
  assert.equal(floor.kind, 'torch'); assert.equal(floor.parts[0].id, BLOCK.TORCH); assert.equal(floor.orientation, 'FLOOR');
  assert.equal(wall.parts[0].id, BLOCK.TORCH_WALL_N); assert.equal(wall.orientation, 'N');
  assert.equal(previewBoxes(BLOCK.TORCH).length, 2); assert.equal(previewBoxes(BLOCK.TORCH_WALL_N).length, 3);
  assert.notDeepEqual(torchGeometry(BLOCK.TORCH_WALL_N), torchGeometry(BLOCK.TORCH_WALL_S));
  assert.equal(heldItemProfile(BLOCK.TORCH).type, 'torch');
});

test('Forgebrands retain original pixels, render as narrow boxes, persist, and own real point lights', () => {
  const atlas = createBlockAtlas(); const colors = new Set(); const tile = 25;
  const tileX = tile % ATLAS_COLUMNS; const tileY = Math.floor(tile / ATLAS_COLUMNS);
  for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) {
    const offset = ((tileY * TILE_SIZE + y) * atlas.image.width + tileX * TILE_SIZE + x) * 4;
    colors.add(`${atlas.image.data[offset]},${atlas.image.data[offset + 1]},${atlas.image.data[offset + 2]}`);
  }
  assert.ok(colors.size >= 4);
  const memory = new Map(); globalThis.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const scene = new THREE.Scene(); const world = new VoxelWorld(scene, 13100); const y = WORLD_HEIGHT - 2;
  world.setBlock(8, y, 8, BLOCK.STONE); world.setBlock(9, y, 8, BLOCK.TORCH_WALL_W);
  assert.deepEqual(world.collisionBoxes(9, y, 8), []);
  const geometry = world.buildGeometry(0, 0); assert.ok(geometry.getAttribute('position').count > 0);
  const lights = new PlacedLightManager(scene, world); assert.equal(lights.lights.get(`9,${y},8`)?.userData.blockId, BLOCK.TORCH_WALL_W);
  const restored = new VoxelWorld(new THREE.Scene(), 13100); assert.equal(restored.getBlock(9, y, 8), BLOCK.TORCH_WALL_W);
  geometry.dispose(); atlas.dispose();
});
