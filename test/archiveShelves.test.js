import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { ARCHIVE_SHELF_OFFSETS, archiveResonanceTier, MAX_ARCHIVE_RESONANCE, runeforgeResonance } from '../src/archiveShelves.js';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { RuneforgeState, runeforgeOfferTuning } from '../src/enchanting.js';
import { ExperienceState } from '../src/experience.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { previewBoxes } from '../src/placementPreview.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

class MockWorld {
  constructor() { this.blocks = new Map(); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { id === BLOCK.AIR ? this.blocks.delete(this.key(x, y, z)) : this.blocks.set(this.key(x, y, z), id); }
}

test('renewable sheets and hide bind into folios that craft one canonical Archive Shelf', () => {
  assert.equal(BLOCK.ARCHIVE_SHELF, 266); assert.equal(BLOCKS[BLOCK.ARCHIVE_SHELF].archiveShelf, true);
  assert.deepEqual(blockDrops(BLOCK.ARCHIVE_SHELF), [BLOCK.ARCHIVE_SHELF]);
  assert.equal(matchCraftingRecipe(['chart_sheet', 'chart_sheet', 'chart_sheet', null, 'tough_hide', null, null, null, null], 3, 'table').id, 'lore_folios');
  const folios = new Inventory({ counts: [['chart_sheet', 3], ['tough_hide', 1]] });
  assert.equal(folios.craft(RECIPES.find((recipe) => recipe.id === 'lore_folios'), 'table'), true); assert.equal(folios.count('lore_folio'), 3);
  assert.equal(heldItemProfile('lore_folio').type, 'folio');
  folios.add(BLOCK.PLANKS, 6);
  assert.equal(folios.craft(RECIPES.find((recipe) => recipe.id === 'archive_shelf'), 'table'), true); assert.equal(folios.count(BLOCK.ARCHIVE_SHELF), 1);
});

test('Runeforge resonance counts only shelves in the two-high outer ring with an open air gap', () => {
  assert.equal(ARCHIVE_SHELF_OFFSETS.length, 32); assert.equal(MAX_ARCHIVE_RESONANCE, 15);
  const world = new MockWorld(); const origin = { x: 10, y: 5, z: -4 };
  for (const offset of ARCHIVE_SHELF_OFFSETS.slice(0, 17)) world.setBlock(origin.x + offset.dx, origin.y + offset.dy, origin.z + offset.dz, BLOCK.ARCHIVE_SHELF);
  assert.deepEqual(runeforgeResonance(world, origin.x, origin.y, origin.z), { shelves: 15, tier: 3, blocked: 0, maximum: 15 });
  const blockedWorld = new MockWorld(); const offset = ARCHIVE_SHELF_OFFSETS[0];
  blockedWorld.setBlock(origin.x + offset.dx, origin.y + offset.dy, origin.z + offset.dz, BLOCK.ARCHIVE_SHELF);
  blockedWorld.setBlock(origin.x + Math.sign(offset.dx) * Math.ceil(Math.abs(offset.dx) / 2), origin.y + offset.dy, origin.z + Math.sign(offset.dz) * Math.ceil(Math.abs(offset.dz) / 2), BLOCK.STONE);
  assert.deepEqual(runeforgeResonance(blockedWorld, origin.x, origin.y, origin.z), { shelves: 0, tier: 0, blocked: 1, maximum: 15 });
  blockedWorld.setBlock(origin.x + 5, origin.y, origin.z, BLOCK.ARCHIVE_SHELF);
  assert.equal(runeforgeResonance(blockedWorld, origin.x, origin.y, origin.z).shelves, 0, 'distant shelves do not resonate');
});

test('five-shelf resonance tiers strengthen rune levels and reduce costs without bypassing validation', () => {
  assert.deepEqual([0, 4, 5, 9, 10, 14, 15, 99].map(archiveResonanceTier), [0, 0, 1, 1, 2, 2, 3, 3]);
  assert.deepEqual(runeforgeOfferTuning(15), { resonance: 15, tier: 3, costs: [1, 1, 4], reagents: [1, 1, 2] });
  const forge = new RuneforgeState(12121); const inventory = new Inventory({ counts: [['iron_pickaxe', 1], ['lumen_shard', 20]] });
  const base = forge.offers('iron_pickaxe', [], 0); const resonant = forge.offers('iron_pickaxe', [], 15);
  assert.ok(resonant.every((offer, index) => offer.level >= base[index].level && offer.cost <= base[index].cost && offer.reagent <= base[index].reagent));
  const experience = new ExperienceState(); experience.add(1000); const offer = resonant[0];
  assert.equal(forge.apply(inventory, experience, 'iron_pickaxe', offer, 0), false, 'an offer cannot retain vanished shelf authority');
  assert.equal(forge.apply(inventory, experience, 'iron_pickaxe', offer, 15), true);
});

test('Archive Shelves have original pixel identity, authored book geometry, full collision, preview, and held art', () => {
  const atlas = createBlockAtlas(); const tile = 117; const tileX = tile % ATLAS_COLUMNS; const tileY = Math.floor(tile / ATLAS_COLUMNS);
  const colors = new Set();
  for (const [x, y] of [[1, 1], [4, 4], [7, 7], [10, 11], [14, 14]]) {
    const offset = ((tileY * TILE_SIZE + y) * atlas.image.width + tileX * TILE_SIZE + x) * 4;
    colors.add([...atlas.image.data.slice(offset, offset + 3)].join(','));
  }
  assert.ok(colors.size >= 3); assert.equal(heldItemProfile(BLOCK.ARCHIVE_SHELF).type, 'archiveShelf'); assert.equal(previewBoxes(BLOCK.ARCHIVE_SHELF).length, 4);
  const storage = new Map(); globalThis.localStorage = { getItem(key) { return storage.get(key) ?? null; }, setItem(key, value) { storage.set(key, value); } };
  const world = new VoxelWorld(new THREE.Scene(), 12122); const y = WORLD_HEIGHT - 2; world.setBlock(8, y, 8, BLOCK.ARCHIVE_SHELF);
  assert.deepEqual(world.collisionBoxes(8, y, 8), [[0, 0, 0, 1, 1, 1]]);
  const geometry = world.buildGeometry(0, 0); assert.ok(geometry.getAttribute('position').count > 0);
  geometry.dispose(); atlas.dispose();
});
