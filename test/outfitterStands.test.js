import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { detachUnsupportedOutfitterStand, MAX_OUTFITTER_STANDS, outfitterSlotForItem, OUTFITTER_SLOTS, OutfitterStandRenderer, OutfitterStandState } from '../src/outfitterStands.js';
import { previewBoxes } from '../src/placementPreview.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';
import { heldItemProfile } from '../src/heldItemView.js';

class MockWorld {
  constructor() { this.blocks = new Map(); this.edits = this.blocks; }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { id === BLOCK.AIR ? this.blocks.delete(this.key(x, y, z)) : this.blocks.set(this.key(x, y, z), id); return 1; }
}

test('Outfitter Stand crafts as a supported authored fixture with faithful preview and held silhouette', () => {
  const grid = ['stick', 'stick', 'stick', null, 'stick', null, 'stick', BLOCK.STONE_SLAB, 'stick'];
  assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'outfitter_stand');
  const inventory = new Inventory({ counts: [['stick', 6], [BLOCK.STONE_SLAB, 1]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'outfitter_stand'), 'table'), true);
  assert.equal(inventory.count(BLOCK.OUTFITTER_STAND), 1);
  assert.equal(BLOCKS[BLOCK.OUTFITTER_STAND].requiresSupport, true);
  assert.equal(heldItemProfile(BLOCK.OUTFITTER_STAND).type, 'outfitterStand');
  assert.deepEqual(blockDrops(BLOCK.OUTFITTER_STAND), [BLOCK.OUTFITTER_STAND]);
  assert.equal(previewBoxes(BLOCK.OUTFITTER_STAND).length, 4);
});

test('six equipment categories map to exact stand slots while unrelated items are rejected', () => {
  assert.equal(outfitterSlotForItem('iron_helmet'), 'head');
  assert.equal(outfitterSlotForItem('iron_chestplate'), 'chest');
  assert.equal(outfitterSlotForItem('iron_leggings'), 'legs');
  assert.equal(outfitterSlotForItem('iron_boots'), 'feet');
  assert.equal(outfitterSlotForItem('oak_shield'), 'shield');
  assert.equal(outfitterSlotForItem('suncrest_regalia'), 'regalia');
  assert.equal(outfitterSlotForItem('iron_pickaxe'), null);
  assert.deepEqual(OUTFITTER_SLOTS, ['head', 'chest', 'legs', 'feet', 'shield', 'regalia']);
});

test('equipment swaps and save reload preserve exact durability, runes, focus, and previous item', () => {
  const state = new OutfitterStandState();
  const first = { id: 'iron_helmet', durability: 87, enchantments: [{ id: 'warding', level: 2 }] };
  assert.deepEqual(state.equip(3, 8, 4, first), { slot: 'head', previous: null, item: first });
  const replacement = { id: 'emberite_helmet', durability: 122, enchantments: [{ id: 'enduring', level: 1 }] };
  assert.deepEqual(state.equip(3, 8, 4, replacement).previous, first);
  assert.equal(state.cycle(3, 8, 4), 'chest');
  const restored = new OutfitterStandState(state.serialize());
  assert.equal(restored.get(3, 8, 4).selectedSlot, 1);
  assert.deepEqual(restored.take(3, 8, 4, 'head'), { slot: 'head', item: replacement });
});

test('stand data is bounded and sanitized, and destruction or stale recovery ejects each real item once', () => {
  const records = Array.from({ length: MAX_OUTFITTER_STANDS + 8 }, (_, x) => ({
    x, y: 5, z: 0, selectedSlot: 99,
    slots: { head: { id: 'iron_helmet', durability: 9999, enchantments: [{ id: 'warding', level: 99 }, { nope: true }] }, shield: { id: 'stone', durability: 2 } },
  }));
  const state = new OutfitterStandState(records);
  assert.equal(state.entries().length, MAX_OUTFITTER_STANDS);
  assert.equal(state.entries()[0].selectedSlot, 5);
  assert.equal(state.entries()[0].slots.head.durability, 166);
  assert.deepEqual(state.entries()[0].slots.head.enchantments, [{ id: 'warding', level: 3 }]);
  assert.equal(state.entries()[0].slots.shield, null);
  assert.equal(state.blockChanged(0, 5, 0, BLOCK.OUTFITTER_STAND, BLOCK.AIR).length, 1);
  assert.deepEqual(state.blockChanged(0, 5, 0, BLOCK.OUTFITTER_STAND, BLOCK.AIR), []);

  const stale = new OutfitterStandState([{ x: 2, y: 4, z: 6, slots: { feet: { id: 'hide_boots', durability: 12 } } }]);
  const recovered = stale.recoverStale(new MockWorld());
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].item.id, 'hide_boots');
  assert.equal(stale.entries().length, 0);
});

test('unsupported stands detach with base and contents separated, while loaded equipment renders visibly', () => {
  const world = new MockWorld();
  world.setBlock(4, 3, 4, BLOCK.STONE);
  world.setBlock(4, 4, 4, BLOCK.OUTFITTER_STAND);
  assert.equal(detachUnsupportedOutfitterStand(world, 4, 3, 4), null);
  world.setBlock(4, 3, 4, BLOCK.AIR);
  assert.deepEqual(detachUnsupportedOutfitterStand(world, 4, 3, 4), { x: 4, y: 4, z: 4, id: BLOCK.OUTFITTER_STAND });
  assert.equal(world.getBlock(4, 4, 4), BLOCK.AIR);

  const storage = new Map();
  globalThis.localStorage = { getItem(key) { return storage.get(key) ?? null; }, setItem(key, value) { storage.set(key, value); } };
  const voxelWorld = new VoxelWorld(new THREE.Scene(), 11515);
  const y = WORLD_HEIGHT - 2;
  voxelWorld.setBlock(8, y, 8, BLOCK.OUTFITTER_STAND);
  assert.equal(voxelWorld.collisionBoxes(8, y, 8).length, 2);
  const geometry = voxelWorld.buildGeometry(0, 0);
  assert.ok(geometry.getAttribute('position').count > 0);
  const state = new OutfitterStandState([{ x: 8, y, z: 8, slots: {
    head: { id: 'iron_helmet', durability: 80, enchantments: [{ id: 'warding', level: 1 }] },
    chest: { id: 'hide_chestplate', durability: 50 }, shield: { id: 'oak_shield', durability: 90 }, regalia: { id: 'suncrest_regalia' },
  } }]);
  const renderer = new OutfitterStandRenderer(new THREE.Scene(), voxelWorld, state);
  assert.equal(renderer.meshes.size, 1);
  assert.ok([...renderer.meshes.values()][0].children.length >= 8);
  geometry.dispose();
});
