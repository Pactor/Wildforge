import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { ChangeSentryState, isChangeSentry, SENTRY_BLOCKS, SENTRY_DELAY, SENTRY_PULSE, sentryBounds, sentryDirection, sentryIdForSupport, sentryVariant } from '../src/changeSentries.js';
import { CircuitSystem, poweredVariant, ramCanMoveBlock } from '../src/circuits.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { blastProtected } from '../src/explosives.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { placementPlan, previewBoxes } from '../src/placementPreview.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

class MemoryWorld {
  constructor(entries = []) { this.blocks = new Map(entries); this.edits = new Map(entries); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); this.edits.set(this.key(x, y, z), id); return true; }
}

function texturePixel(texture, tile, x, y) {
  const width = texture.image.width; const px = tile % ATLAS_COLUMNS * TILE_SIZE + x; const py = Math.floor(tile / ATLAS_COLUMNS) * TILE_SIZE + y; const offset = (py * width + px) * 4;
  return Array.from(texture.image.data.slice(offset, offset + 4));
}

test('Change Sentry owns twelve protected directional states and an exact circuit recipe', () => {
  assert.deepEqual(SENTRY_BLOCKS, Array.from({ length: 12 }, (_, index) => 323 + index));
  for (const id of SENTRY_BLOCKS) { assert.equal(isChangeSentry(id), true); assert.deepEqual(blockDrops(id), ['change_sentry']); assert.equal(blastProtected(id), true); assert.equal(ramCanMoveBlock(id), false); }
  const grid = [BLOCK.STONE, BLOCK.STONE, BLOCK.STONE, BLOCK.SUNWIRE_OFF, 'lumen_shard', BLOCK.SUNWIRE_OFF, BLOCK.STONE, BLOCK.STONE, BLOCK.STONE];
  assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'change_sentry');
  const inventory = new Inventory({ counts: [[BLOCK.STONE, 6], [BLOCK.SUNWIRE_OFF, 2], ['lumen_shard', 1]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'change_sentry'), 'table'), true); assert.equal(inventory.count('change_sentry'), 1);
});

test('clicked supports author all six watch faces with rear-facing output variants', () => {
  const position = { x: 4, y: 5, z: 6 };
  const cases = [[{ x: 4, y: 5, z: 5 }, [0, 0, -1]], [{ x: 5, y: 5, z: 6 }, [1, 0, 0]], [{ x: 4, y: 5, z: 7 }, [0, 0, 1]], [{ x: 3, y: 5, z: 6 }, [-1, 0, 0]], [{ x: 4, y: 6, z: 6 }, [0, 1, 0]], [{ x: 4, y: 4, z: 6 }, [0, -1, 0]]];
  cases.forEach(([support, direction], index) => { const id = sentryIdForSupport(position, support); assert.equal(id, 323 + index); assert.deepEqual(sentryDirection(id), direction); assert.equal(sentryVariant(id, true), id + 6); assert.equal(poweredVariant(id, true), id + 6); });
  assert.equal(placementPlan('change_sentry', position, 0, cases[4][0]).parts[0].id, BLOCK.CHANGE_SENTRY_UP_OFF);
});

test('front changes emit one delayed bounded pulse only through the rear terminal', () => {
  const world = new MemoryWorld([['1,1,0', BLOCK.CHANGE_SENTRY_E_OFF], ['0,1,0', BLOCK.SUNWIRE_OFF], ['-1,1,0', BLOCK.FORGE_LAMP_OFF], ['2,1,0', BLOCK.STONE]]);
  const circuits = new CircuitSystem(world); let state;
  state = new ChangeSentryState(world, { setPowered: (x, y, z, powered) => { const changed = circuits.setState(x, y, z, sentryVariant(world.getBlock(x, y, z), powered)); const output = circuits.sentryOutput(x, y, z); if (changed) circuits.recomputeAround(...output); return changed; } });
  state.restore(); world.setBlock(2, 1, 0, BLOCK.DIRT); assert.equal(state.blockChanged(2, 1, 0, BLOCK.STONE, BLOCK.DIRT), 1);
  state.update(SENTRY_DELAY - 0.01); assert.equal(world.getBlock(1, 1, 0), BLOCK.CHANGE_SENTRY_E_OFF);
  state.update(0.01); assert.equal(world.getBlock(1, 1, 0), BLOCK.CHANGE_SENTRY_E_ON); assert.equal(world.getBlock(0, 1, 0), BLOCK.SUNWIRE_ON); assert.equal(world.getBlock(-1, 1, 0), BLOCK.FORGE_LAMP_ON); assert.equal(circuits.sinkPowered([2, 1, 0]), false);
  state.update(SENTRY_PULSE); assert.equal(world.getBlock(1, 1, 0), BLOCK.CHANGE_SENTRY_E_OFF); assert.equal(world.getBlock(-1, 1, 0), BLOCK.FORGE_LAMP_OFF);
});

test('unrelated changes are ignored while powered changes coalesce into one follow-up pulse', () => {
  const world = new MemoryWorld([['0,1,0', BLOCK.CHANGE_SENTRY_E_OFF], ['1,1,0', BLOCK.STONE]]); let changes = 0;
  const state = new ChangeSentryState(world, { setPowered: (x, y, z, powered) => { world.setBlock(x, y, z, sentryVariant(world.getBlock(x, y, z), powered)); changes += 1; return true; } }); state.restore();
  assert.equal(state.blockChanged(0, 2, 0, BLOCK.AIR, BLOCK.DIRT), 0); assert.equal(state.blockChanged(1, 1, 0, BLOCK.STONE, BLOCK.DIRT), 1); state.update(SENTRY_DELAY); assert.equal(changes, 1);
  state.blockChanged(1, 1, 0, BLOCK.DIRT, BLOCK.GRASS); state.blockChanged(1, 1, 0, BLOCK.GRASS, BLOCK.STONE); state.update(SENTRY_PULSE); assert.equal(changes, 2); state.update(SENTRY_DELAY); assert.equal(changes, 3); state.update(SENTRY_PULSE); assert.equal(changes, 4); state.update(1); assert.equal(changes, 4);
});

test('mid-pulse persistence restores exact bounded phase and sanitizes stale records', () => {
  const world = new MemoryWorld([['3,4,5', BLOCK.CHANGE_SENTRY_N_ON], ['9,9,9', BLOCK.STONE]]);
  const state = new ChangeSentryState(world, {}, { records: [{ x: 3, y: 4, z: 5, phase: 'powered', timer: 0.12, queued: true }, { x: 9, y: 9, z: 9, phase: 'waiting', timer: 900 }, { x: null, y: 1, z: 2 }] });
  assert.equal(state.restore(), 1); assert.deepEqual(state.serialize().records, [{ x: 3, y: 4, z: 5, phase: 'powered', timer: 0.12, queued: true }]);
  const fresh = new MemoryWorld([['0,0,0', BLOCK.CHANGE_SENTRY_S_OFF]]); const discovered = new ChangeSentryState(fresh); assert.equal(discovered.restore(), 1); assert.equal(discovered.entries()[0].phase, 'idle');
});

test('original sentry pixels, compound geometry, collision, preview, and held art agree', () => {
  const atlas = createBlockAtlas(); assert.notDeepEqual(texturePixel(atlas, 138, 0, 0), texturePixel(atlas, 138, 7, 8)); assert.notDeepEqual(texturePixel(atlas, 138, 5, 8), texturePixel(atlas, 138, 7, 13));
  assert.equal(heldItemProfile('change_sentry').type, 'changeSentry'); assert.deepEqual(previewBoxes(BLOCK.CHANGE_SENTRY_DOWN_OFF), sentryBounds(BLOCK.CHANGE_SENTRY_DOWN_OFF));
  const world = Object.create(VoxelWorld.prototype); world.getBlock = () => BLOCK.CHANGE_SENTRY_E_OFF; assert.deepEqual(world.collisionBoxes(0, 1, 0), [[0.04, 0.04, 0.04, 0.96, 0.96, 0.96]]);
  assert.ok(sentryBounds(BLOCK.CHANGE_SENTRY_E_OFF).length >= 4); atlas.dispose();
});
