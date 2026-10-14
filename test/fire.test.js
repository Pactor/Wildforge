import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { adjacentFuel, canIgnite, fireAtActor, FireState, flammability, isFlammable } from '../src/fire.js';
import { PlacedLightManager } from '../src/lights.js';
import { ATLAS_COLUMNS, ATLAS_ROWS, createBlockAtlas, TILE_SIZE, tileUVs } from '../src/textures.js';

class GridWorld {
  constructor() { this.blocks = new Map(); this.listeners = []; this.edits = new Map(); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  onBlockChange(listener) { this.listeners.push(listener); }
  setBlock(x, y, z, id) {
    const key = this.key(x, y, z);
    const previous = this.getBlock(x, y, z);
    if (previous === id) return 0;
    this.blocks.set(key, id);
    this.edits.set(key, id);
    for (const listener of this.listeners) listener(Math.floor(x), Math.floor(y), Math.floor(z), previous, id);
    return 1;
  }
}

test('Spark-facing ignition recognizes only explicit safe fuels and actor contact', () => {
  const world = new GridWorld();
  world.setBlock(0, 1, 0, BLOCK.WOOD);
  assert.equal(isFlammable(BLOCK.WOOD), true);
  assert.equal(flammability(BLOCK.LEAVES) > flammability(BLOCK.WOOD), true);
  assert.equal(isFlammable(BLOCK.CHEST), false, 'stateful containers must never become fire fuel');
  assert.equal(isFlammable(BLOCK.DOOR_X_BOTTOM), false, 'paired stateful blocks remain protected');
  assert.deepEqual(adjacentFuel(world, 0, 2, 0), { x: 0, y: 1, z: 0 });
  assert.equal(canIgnite(world, 0, 2, 0), true);
  assert.equal(canIgnite(world, 4, 2, 0), false);
  world.setBlock(0, 2, 0, BLOCK.EMBERFIRE);
  assert.deepEqual(fireAtActor(world, new THREE.Vector3(0.5, 1.2, 0.5), 1.8), { x: 0, y: 2, z: 0 });
  assert.equal(fireAtActor(world, new THREE.Vector3(2.5, 1.2, 0.5)), null);
});

test('Emberfire persists exact bounded timers and burns fuel without stale records', () => {
  const world = new GridWorld();
  world.setBlock(0, 1, 0, BLOCK.PLANKS);
  const burned = [];
  const fires = new FireState(world, 71, null, { onBurn: (event) => burned.push(event) });
  world.onBlockChange((...change) => fires.blockChanged(...change));
  const record = fires.ignite(0, 2, 0, { fuel: { x: 0, y: 1, z: 0 }, life: 40, burnTimer: 0.1, spreadTimer: 10 });
  assert.ok(record);
  fires.update(0.2);
  assert.equal(world.getBlock(0, 1, 0), BLOCK.AIR);
  assert.deepEqual(burned, [{ x: 0, y: 1, z: 0, id: BLOCK.PLANKS }]);
  fires.update(0.1);
  assert.equal(world.getBlock(0, 2, 0), BLOCK.AIR, 'unsupported flame must extinguish after consuming its final fuel');

  world.setBlock(3, 1, 0, BLOCK.WOOD);
  fires.ignite(3, 2, 0, { life: 33, burnTimer: 12, spreadTimer: 4 });
  fires.update(1.25);
  const saved = fires.serialize();
  const state = saved.fires[0][1];
  assert.ok(state.life > 31 && state.life < 33);
  assert.ok(state.burnTimer > 10 && state.burnTimer < 12);
  const restored = new FireState(world, 71, saved);
  assert.deepEqual(restored.serialize(), saved);
  restored.restore();
  assert.equal(world.getBlock(3, 2, 0), BLOCK.EMBERFIRE);
});

test('rain and adjacent water extinguish fire while spread and population stay bounded', () => {
  const world = new GridWorld();
  const extinguished = [];
  const primed = [];
  const fires = new FireState(world, 91, null, {
    onExtinguish: (event) => extinguished.push(event),
    onExplosive: (...position) => primed.push(position),
  });
  world.onBlockChange((...change) => fires.blockChanged(...change));
  world.setBlock(0, 1, 0, BLOCK.WOOD);
  fires.ignite(0, 2, 0, { life: 40, burnTimer: 30, spreadTimer: 30 });
  fires.update(1, { raining: true, isExposed: () => true });
  fires.update(0.6, { raining: true, isExposed: () => true });
  assert.equal(world.getBlock(0, 2, 0), BLOCK.AIR);
  assert.equal(extinguished.at(-1).reason, 'rain');

  world.setBlock(2, 1, 0, BLOCK.WOOD);
  world.setBlock(3, 2, 0, BLOCK.WATER);
  fires.ignite(2, 2, 0, { life: 40 });
  fires.update(0.1);
  assert.equal(extinguished.at(-1).reason, 'water');

  world.setBlock(5, 1, 0, BLOCK.WOOD);
  world.setBlock(6, 2, 0, BLOCK.BLAST_KEG);
  const source = fires.ignite(5, 2, 0, { life: 40, burnTimer: 30, spreadTimer: 30 });
  fires.update(0.1);
  assert.deepEqual(primed, [[6, 2, 0]]);
  world.setBlock(6, 2, 0, BLOCK.AIR);
  let spread = false;
  world.setBlock(5, 1, 1, BLOCK.PLANKS);
  for (let attempt = 0; attempt < 32 && !spread; attempt += 1) spread = fires.trySpread(5, 2, 0, source, 2);
  assert.equal(spread, true, 'deterministic spread attempts must eventually reach nearby dry fuel');

  const cappedWorld = new GridWorld();
  const capped = new FireState(cappedWorld, 3);
  for (let index = 0; index < 280; index += 1) {
    cappedWorld.setBlock(index * 2, 1, 0, BLOCK.WOOD);
    capped.ignite(index * 2, 2, 0, { life: 50 });
  }
  assert.equal(capped.serialize().fires.length, 256);
});

test('Emberfire has original cutout art, warm light, and controllable flicker', () => {
  const atlas = createBlockAtlas();
  assert.equal(atlas.image.height, TILE_SIZE * ATLAS_ROWS);
  const tile = 104;
  const tileX = tile % ATLAS_COLUMNS;
  const tileY = Math.floor(tile / ATLAS_COLUMNS);
  let alpha = 0;
  const colors = new Set();
  for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) {
    const offset = (((tileY * TILE_SIZE + y) * atlas.image.width) + tileX * TILE_SIZE + x) * 4;
    if (atlas.image.data[offset + 3]) alpha += 1;
    colors.add(`${atlas.image.data[offset]},${atlas.image.data[offset + 1]},${atlas.image.data[offset + 2]}`);
  }
  assert.ok(alpha > 30 && alpha < TILE_SIZE * TILE_SIZE);
  assert.ok(colors.size >= 4);
  assert.ok(tileUVs(tile).every(([u, v]) => u > 0 && u < 1 && v > 0 && v < 1));
  assert.ok(BLOCKS[BLOCK.EMBERFIRE].light.intensity > 1);

  const scene = new THREE.Scene();
  const world = new GridWorld();
  world.setBlock(1, 2, 3, BLOCK.EMBERFIRE);
  const lights = new PlacedLightManager(scene, world);
  assert.equal(lights.setIntensity(1, 2, 3, 0.5), true);
  assert.equal(lights.lights.get('1,2,3').intensity, BLOCKS[BLOCK.EMBERFIRE].light.intensity * 0.5);
});
