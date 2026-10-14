import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { SOUND_PRESETS } from '../src/audio.js';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { blastDamage, blastPlan, blastProtected, PrimedBlastSystem } from '../src/explosives.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { Inventory, RECIPES } from '../src/inventory.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE, tileUVs } from '../src/textures.js';

class GridWorld {
  constructor() { this.blocks = new Map(); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { return this.setBlocks([{ x, y, z, id }]); }
  setBlocks(changes) {
    let count = 0;
    for (const change of changes) {
      const key = this.key(change.x, change.y, change.z);
      if (this.getBlock(change.x, change.y, change.z) === change.id) continue;
      this.blocks.set(key, change.id);
      count += 1;
    }
    return count;
  }
}

test('blast plans break ordinary terrain atomically while protecting stateful and authored puzzle blocks', () => {
  const world = new GridWorld();
  world.setBlock(0, 2, 0, BLOCK.STONE);
  world.setBlock(1, 2, 0, BLOCK.DIRT);
  world.setBlock(-1, 2, 0, BLOCK.CHEST);
  world.setBlock(0, 2, 1, BLOCK.ECHO_BRICK);
  world.setBlock(0, 2, -1, BLOCK.WATER);
  world.setBlock(2, 2, 0, BLOCK.BLAST_KEG);
  world.setBlock(1, 3, 0, BLOCK.WHEAT_2);
  const plan = blastPlan(world, new THREE.Vector3(0.5, 2.5, 0.5));
  const removed = new Set(plan.changes.map(({ x, y, z }) => `${x},${y},${z}`));
  assert.ok(removed.has('0,2,0'));
  assert.ok(removed.has('1,2,0'));
  assert.ok(removed.has('1,3,0'), 'managed crop above destroyed soil should join the atomic edit');
  assert.ok(removed.has('2,2,0'));
  assert.equal(removed.has('-1,2,0'), false);
  assert.equal(removed.has('0,2,1'), false);
  assert.equal(removed.has('0,2,-1'), false);
  assert.deepEqual(plan.chain.map(({ x, y, z }) => [x, y, z]), [[2, 2, 0]]);
  assert.equal(blastProtected(BLOCK.CHEST), true);
  assert.equal(blastProtected(BLOCK.ECHO_BRICK), true);
  assert.equal(blastProtected(BLOCK.DIRT), false);
});

test('blast damage is radial, bounded, and reaches zero outside its pressure wave', () => {
  assert.equal(blastDamage(0), 12);
  assert.ok(blastDamage(2) < blastDamage(1));
  assert.equal(blastDamage(7), 0);
  assert.equal(blastDamage(Number.NaN), 12);
});

test('primed Blast Kegs fall, persist their fuse, detonate, and trigger bounded chain reactions', () => {
  const scene = new THREE.Scene();
  const world = new GridWorld();
  for (let z = -5; z <= 5; z += 1) for (let x = -5; x <= 5; x += 1) world.setBlock(x, 0, z, BLOCK.STONE);
  world.setBlock(0, 3, 0, BLOCK.BLAST_KEG);
  world.setBlock(2, 1, 0, BLOCK.BLAST_KEG);
  const detonations = [];
  const system = new PrimedBlastSystem(scene, world, null, {
    onDetonate: (center, radius, destroyed, chain) => detonations.push({ center: center.toArray(), radius, destroyed, chain }),
  });
  const primed = system.prime(0, 3, 0, 0.35);
  assert.ok(primed);
  system.update(0.1);
  assert.ok(primed.root.position.y < 3.5, 'primed entity should obey gravity');
  const saved = system.serialize();
  assert.equal(saved.primed.length, 1);
  assert.ok(saved.primed[0].fuse > 0 && saved.primed[0].fuse < 0.35);
  const restoredScene = new THREE.Scene();
  const restored = new PrimedBlastSystem(restoredScene, world, saved);
  assert.equal(restored.entities.length, 1);
  restored.clear();
  assert.equal(restoredScene.children.length, 0);

  for (let step = 0; step < 50 && detonations.length < 1; step += 1) system.update(0.1);
  assert.equal(detonations.length, 1);
  assert.equal(detonations[0].chain, 1);
  assert.equal(world.getBlock(2, 1, 0), BLOCK.AIR);
  assert.equal(system.entities.length, 1, 'neighboring keg becomes a shorter-fuse primed entity');
  for (let step = 0; step < 20 && detonations.length < 2; step += 1) system.update(0.1);
  assert.equal(detonations.length, 2);
  assert.equal(system.entities.length, 0);
  for (let index = 0; index < 70; index += 1) system.add(new THREE.Vector3(index, 2, 0), 5);
  assert.equal(system.entities.length, 64, 'primed population must remain bounded');
  system.clear();
});

test('arbitrary blast sources use the protected atomic pipeline and bounded combat context', () => {
  const scene = new THREE.Scene();
  const world = new GridWorld();
  world.setBlock(0, 2, 0, BLOCK.DIRT);
  world.setBlock(1, 2, 0, BLOCK.CHEST);
  const events = [];
  const system = new PrimedBlastSystem(scene, world, null, {
    onDetonate: (center, radius, destroyed, chained, context) => events.push({ center, radius, destroyed, chained, context }),
  });
  const plan = system.explodeAt(new THREE.Vector3(0.5, 2.5, 0.5), 3.2, { source: 'Hushpod', maximumDamage: 10 });
  assert.equal(world.getBlock(0, 2, 0), BLOCK.AIR);
  assert.equal(world.getBlock(1, 2, 0), BLOCK.CHEST);
  assert.equal(plan.radius, 3.2);
  assert.deepEqual(events[0].context, { source: 'Hushpod', maximumDamage: 10 });
  assert.equal(events[0].destroyed, 1);
});

test('Blast Keg and repairable Spark Striker have original art, audio, and canonical recipes', () => {
  assert.equal(BLOCKS[BLOCK.BLAST_KEG].explosive, true);
  const kegRecipe = RECIPES.find((recipe) => recipe.id === 'blast_keg');
  const hushKegRecipe = RECIPES.find((recipe) => recipe.id === 'hush_blast_keg');
  const strikerRecipe = RECIPES.find((recipe) => recipe.id === 'spark_striker');
  assert.equal(matchCraftingRecipe([
    BLOCK.SAND, 'shadow_shard', BLOCK.SAND,
    'shadow_shard', BLOCK.PLANKS, 'shadow_shard',
    BLOCK.SAND, 'shadow_shard', BLOCK.SAND,
  ], 3, 'table').id, 'blast_keg');
  assert.equal(matchCraftingRecipe([
    BLOCK.SAND, 'hush_resin', BLOCK.SAND,
    'hush_resin', BLOCK.PLANKS, 'hush_resin',
    BLOCK.SAND, 'hush_resin', BLOCK.SAND,
  ], 3, 'table').id, 'hush_blast_keg');
  assert.equal(matchCraftingRecipe(['iron_ingot', null, null, 'flint'], 2, 'hand').id, 'spark_striker');
  const inventory = new Inventory({ counts: [[BLOCK.SAND, 4], ['shadow_shard', 4], [BLOCK.PLANKS, 1], ['iron_ingot', 1], ['flint', 1]] });
  assert.equal(inventory.craft(kegRecipe, 'table'), true);
  assert.equal(inventory.count(BLOCK.BLAST_KEG), 1);
  assert.equal(inventory.craft(strikerRecipe, 'hand'), true);
  const renewable = new Inventory({ counts: [[BLOCK.SAND, 4], ['hush_resin', 4], [BLOCK.PLANKS, 1]] });
  assert.equal(renewable.craft(hushKegRecipe, 'table'), true);
  assert.equal(renewable.count(BLOCK.BLAST_KEG), 1);
  assert.equal(inventory.damage('spark_striker', 1).remaining, 63);
  assert.equal(heldItemProfile('spark_striker').type, 'striker');
  assert.ok(SOUND_PRESETS.blast.noise > SOUND_PRESETS.break.noise);

  const atlas = createBlockAtlas();
  const colors = new Set();
  const tile = 103;
  const tileX = tile % ATLAS_COLUMNS;
  const tileY = Math.floor(tile / ATLAS_COLUMNS);
  for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) {
    const offset = (((tileY * TILE_SIZE + y) * atlas.image.width) + tileX * TILE_SIZE + x) * 4;
    colors.add(`${atlas.image.data[offset]},${atlas.image.data[offset + 1]},${atlas.image.data[offset + 2]}`);
  }
  assert.ok(colors.size >= 4);
  assert.ok(tileUVs(103).every(([u, v]) => u > 0 && u < 1 && v > 0 && v < 1));
});
