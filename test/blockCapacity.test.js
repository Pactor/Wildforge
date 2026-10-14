import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCK_ID_BITS, BLOCKS, isRegisteredBlockId, MAX_BLOCK_ID } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { createEditsEnvelope, EDITS_FORMAT, EDITS_SCHEMA_VERSION, loadWorldEdits, MAX_PERSISTED_BLOCK_ID, sanitizeWorldEdits, writeWorldEdits } from '../src/saveSystem.js';
import { ATLAS_COLUMNS, ATLAS_ROWS } from '../src/textures.js';
import { CHUNK_SIZE, chunkVoxelIndex, VoxelWorld, VOXEL_ARRAY_TYPE, VOXEL_ID_BITS, WORLD_DEPTH, WORLD_HEIGHT } from '../src/world.js';

class MemoryStorage {
  constructor(entries = []) { this.values = new Map(entries); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

test('the authoritative registry and chunk representation expose a real sixteen-bit block capacity', () => {
  assert.equal(BLOCK_ID_BITS, 16); assert.equal(VOXEL_ID_BITS, 16);
  assert.equal(MAX_BLOCK_ID, 65535); assert.equal(MAX_PERSISTED_BLOCK_ID, MAX_BLOCK_ID);
  assert.equal(VOXEL_ARRAY_TYPE, Uint16Array);
  assert.equal(BLOCK.TIDEBRICK_MOSAIC, 256);
  assert.equal(isRegisteredBlockId(BLOCK.TIDEBRICK_MOSAIC), true);
  assert.equal(isRegisteredBlockId(65536), false);
  assert.equal(isRegisteredBlockId(65534), false, 'unknown IDs are rejected even when numerically in range');
  assert.ok(BLOCKS[BLOCK.TIDEBRICK_MOSAIC]);
});

test('high-ID blocks survive live chunk writes, geometry builds, and a fresh world reload without wrapping', () => {
  const storage = new MemoryStorage(); globalThis.localStorage = storage;
  const world = new VoxelWorld(new THREE.Scene(), 11818);
  const chunk = world.generateChunk(0, 0);
  assert.ok(chunk instanceof Uint16Array);
  const y = WORLD_HEIGHT - 2;
  assert.equal(world.setBlock(8, y, 8, BLOCK.TIDEBRICK_MOSAIC), 1);
  assert.equal(world.getBlock(8, y, 8), 256);
  assert.equal(world.chunks.get('0,0')[chunkVoxelIndex(8, y, 8)], 256);
  const geometry = world.buildGeometry(0, 0);
  assert.ok(geometry.getAttribute('position').count > 0);
  const restored = new VoxelWorld(new THREE.Scene(), 11818);
  assert.equal(restored.getBlock(8, y, 8), 256);
  geometry.dispose();
});

test('edit schema v2 accepts registered high IDs, migrates v1 envelopes, and rejects unknown or overflowing values', () => {
  assert.equal(EDITS_SCHEMA_VERSION, 2);
  assert.deepEqual(sanitizeWorldEdits([['1,2,3', 256], ['2,2,3', 65534], ['3,2,3', 65536], ['4,2,3', -1]]), [['1,2,3', 256]]);
  const envelope = createEditsEnvelope([['1,2,3', 256]], 44);
  assert.deepEqual(envelope, { format: EDITS_FORMAT, schemaVersion: 2, savedAt: 44, edits: [['1,2,3', 256]] });
  const storage = new MemoryStorage([['edits', JSON.stringify({ format: EDITS_FORMAT, schemaVersion: 1, savedAt: 1, edits: [['1,2,3', 7]] })]]);
  const migrated = loadWorldEdits(storage, 'edits');
  assert.equal(migrated.status, 'migrated'); assert.deepEqual(migrated.edits, [['1,2,3', 7]]);
  assert.equal(JSON.parse(storage.getItem('edits')).schemaVersion, 2);
  assert.equal(writeWorldEdits(storage, 'high', [['9,8,7', 256]]).ok, true);
  assert.deepEqual(loadWorldEdits(storage, 'high').edits, [['9,8,7', 256]]);
  assert.deepEqual(sanitizeWorldEdits([['1,-80,3', 256], ['1,-129,3', 256], ['1,64,3', 256]]), [['1,-80,3', 256]]);
});

test('Tidebrick Mosaic is a craftable, recoverable, textured first post-255 building block', () => {
  const grid = [BLOCK.TIDEBRICK, BLOCK.TIDEBRICK, null, BLOCK.TIDEBRICK, BLOCK.TIDEBRICK, null, null, 'lumen_shard', null];
  assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'tidebrick_mosaic');
  const inventory = new Inventory({ counts: [[BLOCK.TIDEBRICK, 4], ['lumen_shard', 1]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'tidebrick_mosaic'), 'table'), true);
  assert.equal(inventory.count(BLOCK.TIDEBRICK_MOSAIC), 4);
  assert.deepEqual(blockDrops(BLOCK.TIDEBRICK_MOSAIC), [BLOCK.TIDEBRICK_MOSAIC]);
  assert.ok(BLOCKS[BLOCK.TIDEBRICK_MOSAIC].texture < ATLAS_COLUMNS * ATLAS_ROWS);
});

test('chunk integrity rejects old-width buffers even at the correct length to prevent silent high-ID truncation', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 11819);
  const size = CHUNK_SIZE * WORLD_DEPTH * CHUNK_SIZE;
  const legacyWidth = new Uint8Array(size); legacyWidth.fill(BLOCK.STONE); legacyWidth[0] = BLOCK.TIDEBRICK_MOSAIC;
  assert.equal(legacyWidth[0], 0, 'the old representation demonstrably wraps ID 256 to air');
  assert.equal(world.chunkDataIsHealthy(legacyWidth), false);
  const currentWidth = new Uint16Array(size); currentWidth.fill(BLOCK.STONE); currentWidth[0] = BLOCK.TIDEBRICK_MOSAIC;
  assert.equal(world.chunkDataIsHealthy(currentWidth), true);
});
