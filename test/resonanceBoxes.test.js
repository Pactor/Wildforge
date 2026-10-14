import assert from 'node:assert/strict';
import test from 'node:test';
import { AudioManager } from '../src/audio.js';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { CircuitSystem, ramCanMoveBlock } from '../src/circuits.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { blastProtected } from '../src/explosives.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { previewBoxes } from '../src/placementPreview.js';
import { ResonanceBoxState, RESONANCE_PITCHES, resonanceInstrument } from '../src/resonanceBoxes.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';

class MemoryWorld {
  constructor(entries = []) { this.blocks = new Map(entries); this.edits = new Map(entries); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); this.edits.set(this.key(x, y, z), id); return true; }
}

test('Resonance Box has a canonical block, shaped recipe, drop, and safe mechanics', () => {
  assert.equal(BLOCK.RESONANCE_BOX, 291);
  assert.equal(BLOCKS[BLOCK.RESONANCE_BOX].circuitRole, 'resonance');
  assert.equal(BLOCKS[BLOCK.RESONANCE_BOX].resonanceBox, true);
  assert.deepEqual(blockDrops(BLOCK.RESONANCE_BOX), [BLOCK.RESONANCE_BOX]);
  assert.equal(blastProtected(BLOCK.RESONANCE_BOX), true);
  assert.equal(ramCanMoveBlock(BLOCK.RESONANCE_BOX), false);
  const grid = [BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, 'lumen_shard', BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS];
  assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'resonance_box');
  const inventory = new Inventory({ counts: [[BLOCK.PLANKS, 8], ['lumen_shard', 1]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'resonance_box'), 'table'), true);
  assert.equal(inventory.count(BLOCK.RESONANCE_BOX), 1);
});

test('pitch cycling wraps across 25 notes and saved records are sanitized', () => {
  const world = new MemoryWorld([['4,5,6', BLOCK.RESONANCE_BOX]]);
  const state = new ResonanceBoxState([{ x: 4.8, y: 5.2, z: 6.9, pitch: 999, powered: 1 }, { x: 'bad', y: 0, z: 0 }]);
  assert.equal(state.restore(world), 1);
  assert.equal(state.get(4, 5, 6).pitch, 24);
  assert.equal(state.cycle(world, 4, 5, 6).pitch, 0);
  for (let index = 0; index < 25; index += 1) state.cycle(world, 4, 5, 6);
  assert.equal(state.get(4, 5, 6).pitch, 0);
  const restored = new ResonanceBoxState(state.serialize());
  assert.deepEqual(restored.serialize(), state.serialize());
});

test('substrates select distinct original instruments and pitch frequency rises monotonically', () => {
  const substrates = [BLOCK.GLASS, BLOCK.SAND, BLOCK.MOSSWEAVE_NATURAL, BLOCK.STONE, BLOCK.WOOD, BLOCK.GRASS];
  const instruments = substrates.map((id) => {
    const world = new MemoryWorld([['0,0,0', id]]);
    return resonanceInstrument(world, 0, 1, 0).id;
  });
  assert.deepEqual(instruments, ['crystal', 'hollow', 'soft', 'stone', 'timber', 'aether']);
  assert.equal(RESONANCE_PITCHES.length, 25);
  for (let index = 1; index < RESONANCE_PITCHES.length; index += 1) {
    assert.ok(RESONANCE_PITCHES[index].frequency > RESONANCE_PITCHES[index - 1].frequency);
  }
});

test('circuit power plays only on rising edges and can retrigger after release', () => {
  const world = new MemoryWorld([
    ['0,1,0', BLOCK.SPARK_SWITCH_OFF], ['1,1,0', BLOCK.SUNWIRE_OFF], ['2,1,0', BLOCK.RESONANCE_BOX], ['2,0,0', BLOCK.WOOD],
  ]);
  const state = new ResonanceBoxState(); const notes = [];
  const circuits = new CircuitSystem(world, {
    onResonancePower: ([x, y, z], powered) => {
      const note = state.setPowered(world, x, y, z, powered);
      if (note) notes.push(note);
    },
  });
  assert.deepEqual(circuits.toggleSwitch(0, 1, 0), { powered: true, affected: 3 });
  assert.equal(notes.length, 1); assert.equal(notes[0].id, 'timber');
  circuits.recomputeFrom(1, 1, 0); assert.equal(notes.length, 1);
  circuits.toggleSwitch(0, 1, 0); assert.equal(notes.length, 1); assert.equal(state.get(2, 1, 0).powered, false);
  circuits.toggleSwitch(0, 1, 0); assert.equal(notes.length, 2); assert.equal(state.get(2, 1, 0).powered, true);
});

test('Resonance Box art, preview, held silhouette, and headless audio path remain valid', () => {
  assert.equal(previewBoxes(BLOCK.RESONANCE_BOX).length, 4);
  assert.equal(heldItemProfile(BLOCK.RESONANCE_BOX).type, 'resonanceBox');
  const atlas = createBlockAtlas(); const colors = new Set(); const tile = 132;
  const tileX = tile % ATLAS_COLUMNS; const tileY = Math.floor(tile / ATLAS_COLUMNS);
  for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) {
    const offset = ((tileY * TILE_SIZE + y) * atlas.image.width + tileX * TILE_SIZE + x) * 4;
    colors.add([...atlas.image.data.slice(offset, offset + 3)].join(','));
  }
  assert.ok(colors.size >= 4);
  assert.equal(new AudioManager().playResonance(440, { waveform: 'triangle' }), false);
  atlas.dispose();
});
