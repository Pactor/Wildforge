import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { canPlaceKeepsakeFrame, detachUnsupportedKeepsakeFrames, isKeepsakeFrame, KeepsakeFrameRenderer, KeepsakeFrameState, keepsakeFrameIdForSupport, keepsakeFrameInfo, MAX_KEEPSAKE_FRAMES, placeKeepsakeFrame } from '../src/keepsakeFrames.js';
import { placementPlan, previewBoxes } from '../src/placementPreview.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';
import { heldItemProfile } from '../src/heldItemView.js';

class MockWorld {
  constructor() { this.blocks = new Map(); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { id === BLOCK.AIR ? this.blocks.delete(this.key(x, y, z)) : this.blocks.set(this.key(x, y, z), id); return 1; }
}

test('Keepsake Frames attach to every clicked wall face and detach when that exact support disappears', () => {
  const cases = [
    [{ x: 2, y: 5, z: 3 }, { x: 2, y: 5, z: 2 }, BLOCK.KEEPSAKE_FRAME_N, 'n'],
    [{ x: 3, y: 5, z: 2 }, { x: 2, y: 5, z: 2 }, BLOCK.KEEPSAKE_FRAME_W, 'w'],
    [{ x: 2, y: 5, z: 1 }, { x: 2, y: 5, z: 2 }, BLOCK.KEEPSAKE_FRAME_S, 's'],
    [{ x: 1, y: 5, z: 2 }, { x: 2, y: 5, z: 2 }, BLOCK.KEEPSAKE_FRAME_E, 'e'],
  ];
  for (const [position, support, expected, facing] of cases) {
    const world = new MockWorld();
    world.setBlock(support.x, support.y, support.z, BLOCK.STONE);
    const id = keepsakeFrameIdForSupport(position, support);
    assert.equal(id, expected);
    assert.equal(keepsakeFrameInfo(id).orientation, facing);
    assert.equal(canPlaceKeepsakeFrame(world, position.x, position.y, position.z, id), true);
    assert.equal(placeKeepsakeFrame(world, position.x, position.y, position.z, id), true);
    world.setBlock(support.x, support.y, support.z, BLOCK.AIR);
    assert.deepEqual(detachUnsupportedKeepsakeFrames(world, support.x, support.y, support.z), [{ ...position, id }]);
    assert.equal(world.getBlock(position.x, position.y, position.z), BLOCK.AIR);
  }
  const transparent = new MockWorld();
  transparent.setBlock(0, 4, 0, BLOCK.GLASS);
  assert.equal(canPlaceKeepsakeFrame(transparent, 0, 4, 1, BLOCK.KEEPSAKE_FRAME_N), false);
});

test('Keepsake Frames craft in useful quantities and expose faithful directional previews and drops', () => {
  const grid = ['stick', 'stick', 'stick', 'stick', 'tough_hide', 'stick', 'stick', 'stick', 'stick'];
  assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'keepsake_frames');
  const inventory = new Inventory({ counts: [['stick', 8], ['tough_hide', 1]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'keepsake_frames'), 'table'), true);
  assert.equal(inventory.count('keepsake_frame'), 4);
  assert.equal(heldItemProfile('keepsake_frame').type, 'frame');
  const plan = placementPlan('keepsake_frame', { x: 4, y: 7, z: 5 }, 0, { x: 4, y: 7, z: 4 });
  assert.equal(plan.kind, 'keepsakeFrame');
  assert.equal(plan.parts[0].id, BLOCK.KEEPSAKE_FRAME_N);
  assert.deepEqual(blockDrops(BLOCK.KEEPSAKE_FRAME_N), ['keepsake_frame']);
  for (const id of [BLOCK.KEEPSAKE_FRAME_N, BLOCK.KEEPSAKE_FRAME_E, BLOCK.KEEPSAKE_FRAME_S, BLOCK.KEEPSAKE_FRAME_W]) {
    assert.equal(isKeepsakeFrame(id), true);
    assert.deepEqual(previewBoxes(id)[0].length, 6);
  }
});

test('displayed durable items preserve exact condition, enchantments, rotation, and save data', () => {
  const inventory = new Inventory();
  inventory.addInstance('voidglass_pickaxe', 321, [{ id: 'swiftwork', level: 2 }, { id: 'enduring', level: 1 }]);
  const item = inventory.takeInstance('voidglass_pickaxe');
  const frames = new KeepsakeFrameState();
  assert.ok(frames.insert(1, 8, 2, item));
  assert.equal(frames.insert(1, 8, 2, { id: BLOCK.STONE }), null, 'an occupied frame rejects replacement');
  assert.equal(frames.rotate(1, 8, 2), 1);
  assert.equal(frames.rotate(1, 8, 2), 2);
  const serialized = frames.serialize();
  const restored = new KeepsakeFrameState(serialized);
  assert.equal(restored.get(1, 8, 2).rotation, 2);
  const returned = restored.take(1, 8, 2);
  assert.deepEqual(returned, item);
  inventory.addInstance(returned.id, returned.durability, returned.enchantments);
  assert.equal(inventory.durability('voidglass_pickaxe').remaining, 321);
  assert.deepEqual(inventory.enchantments('voidglass_pickaxe'), item.enchantments);
});

test('saved frame input is sanitized, hard bounded, and block removal ejects its real item once', () => {
  const records = Array.from({ length: MAX_KEEPSAKE_FRAMES + 20 }, (_, index) => ({
    x: index,
    y: 7,
    z: 0,
    rotation: 99,
    item: { id: 'iron_pickaxe', durability: 99999, enchantments: [{ id: 'keen', level: 99 }, { bad: true }] },
  }));
  records.unshift({ x: Number.NaN, y: 0, z: 0, item: { id: 'missing' } });
  const state = new KeepsakeFrameState(records);
  assert.equal(state.entries().length, MAX_KEEPSAKE_FRAMES - 1);
  const record = state.entries()[0];
  assert.equal(record.rotation, 7);
  assert.equal(record.item.durability, 251);
  assert.deepEqual(record.item.enchantments, [{ id: 'keen', level: 3 }]);
  const ejected = state.blockChanged(record.x, record.y, record.z, BLOCK.KEEPSAKE_FRAME_N, BLOCK.AIR);
  assert.equal(ejected.id, 'iron_pickaxe');
  assert.equal(state.blockChanged(record.x, record.y, record.z, BLOCK.KEEPSAKE_FRAME_N, BLOCK.AIR), null);

  const stale = new KeepsakeFrameState([{ x: 3, y: 4, z: 5, item: { id: BLOCK.STONE } }]);
  assert.deepEqual(stale.recoverStale(new MockWorld()), [{ x: 3, y: 4, z: 5, item: { id: BLOCK.STONE, durability: null, enchantments: [] } }]);
  assert.equal(stale.entries().length, 0);
});

test('frame and displayed-item renderers add original non-colliding wall geometry that survives reload', () => {
  const storage = new Map();
  globalThis.localStorage = { getItem(key) { return storage.get(key) ?? null; }, setItem(key, value) { storage.set(key, value); } };
  const world = new VoxelWorld(new THREE.Scene(), 11414);
  const y = WORLD_HEIGHT - 2;
  world.setBlock(8, y, 8, BLOCK.STONE);
  const baseline = world.buildGeometry(0, 0);
  const without = baseline.getAttribute('position').count;
  baseline.dispose();
  world.setBlock(8, y, 9, BLOCK.KEEPSAKE_FRAME_N);
  assert.deepEqual(world.collisionBoxes(8, y, 9), []);
  const geometry = world.buildGeometry(0, 0);
  assert.ok(geometry.getAttribute('position').count > without);

  const state = new KeepsakeFrameState([{ x: 8, y, z: 9, item: { id: 'iron_sword', durability: 144, enchantments: [{ id: 'keen', level: 1 }] }, rotation: 3 }]);
  const scene = new THREE.Scene();
  const renderer = new KeepsakeFrameRenderer(scene, world, state);
  assert.equal(renderer.meshes.size, 1);
  const display = [...renderer.meshes.values()][0];
  assert.equal(display.name, 'Displayed Iron Sword');
  assert.equal(display.position.z, 9.13);
  assert.ok(display.children.length >= 3, 'weapon silhouette and rune ring are visible');
  assert.equal(new VoxelWorld(new THREE.Scene(), 11414).getBlock(8, y, 9), BLOCK.KEEPSAKE_FRAME_N);
  geometry.dispose();
});
