import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { EntityManager } from '../src/entities.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { Inventory, RECIPES } from '../src/inventory.js';
import { MAX_TETHERS, TETHER_BREAK_DISTANCE, TetherSystem, tetherEligible } from '../src/tethers.js';

class MockWorld {
  constructor() { this.blocks = new Map(); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { id === BLOCK.AIR ? this.blocks.delete(this.key(x, y, z)) : this.blocks.set(this.key(x, y, z), id); }
  terrainHeight() { return 20; }
  biomeAt() { return { id: 'plains' }; }
  isSolid(x, y, z) { return this.getBlock(x, y, z) !== BLOCK.AIR; }
}

const creature = (key = 'animal-1', x = 7) => ({
  id: 1,
  persistentKey: key,
  persistent: false,
  isBaby: false,
  downed: false,
  definition: { name: 'Mossback Grazer', hostile: false, resident: false, aquatic: false, flying: false, boss: false },
  root: new THREE.Group(),
  heading: 0,
});

test('Trail Tethers craft renewably and expose a dedicated held loop silhouette', () => {
  const recipe = RECIPES.find(({ id }) => id === 'trail_tethers');
  const inventory = new Inventory({ counts: [['silk_cord', 4], ['glob_resin', 1]] });
  assert.equal(inventory.craft(recipe, 'table'), true);
  assert.equal(inventory.count('trail_tether'), 2);
  assert.equal(matchCraftingRecipe(['silk_cord', null, 'silk_cord', null, 'glob_resin', null, 'silk_cord', null, 'silk_cord'], 3, 'table')?.id, recipe.id);
  assert.equal(heldItemProfile('trail_tether').type, 'tether');
});

test('passive creatures receive stable saved identities while hostile and resident roles remain ineligible', () => {
  const world = new MockWorld();
  const manager = new EntityManager(new THREE.Scene(), world, { position: new THREE.Vector3() }, 7111);
  const grazer = manager.spawn('grazer', 2, 2, { persistent: true });
  assert.match(grazer.persistentKey, /^creature-7111-/);
  assert.equal(tetherEligible(grazer), true);
  assert.equal(manager.serialize()[0].persistentKey, grazer.persistentKey);
  const restored = new EntityManager(new THREE.Scene(), world, { position: new THREE.Vector3() }, 7111);
  assert.equal(restored.restore(manager.serialize()), 1);
  assert.equal(restored.entities[0].persistentKey, grazer.persistentKey);
  assert.equal(tetherEligible({ ...grazer, definition: { ...grazer.definition, hostile: true } }), false);
  assert.equal(tetherEligible({ ...grazer, definition: { ...grazer.definition, resident: true } }), false);
});

test('player-held tethers pull without teleporting, render a line, and snap with exact recovery beyond the hard limit', () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  const player = { position: new THREE.Vector3(0, 21, 0) };
  const animal = creature();
  animal.root.position.set(7, 21, 0);
  const drops = [];
  const system = new TetherSystem(scene, world, player, () => [animal], null, { onDrop: (id, count, position) => drops.push({ id, count, position }) });
  assert.equal(system.attach(animal, 'overworld'), true);
  assert.equal(animal.persistent, true);
  system.update(0.05, 'overworld');
  assert.ok(animal.root.position.x < 7, 'the animal should be pulled toward the player after crossing the soft limit');
  assert.equal(system.lines.size, 1);
  animal.root.position.x = TETHER_BREAK_DISTANCE + 1;
  system.update(0.05, 'overworld');
  assert.equal(system.has(animal), false);
  assert.equal(system.lines.size, 0);
  assert.deepEqual(drops.map(({ id, count }) => ({ id, count })), [{ id: 'trail_tether', count: 1 }]);
});

test('multiple animals secure to one fence, restore exactly, and recover when that anchor breaks', () => {
  const scene = new THREE.Scene();
  const world = new MockWorld();
  world.setBlock(4, 20, 4, BLOCK.OAK_FENCE);
  const player = { position: new THREE.Vector3(4, 21, 2) };
  const first = creature('animal-a', 4); first.root.position.set(4, 21, 3);
  const second = creature('animal-b', 5); second.root.position.set(5, 21, 4);
  const drops = [];
  const system = new TetherSystem(scene, world, player, () => [first, second], null, { onDrop: (id, count, position) => drops.push({ id, count, position }) });
  assert.equal(system.attach(first, 'overworld'), true);
  assert.equal(system.attach(second, 'overworld'), true);
  assert.equal(system.anchorPlayerTethers(4, 20, 4, 'overworld'), 2);
  assert.equal(system.serialize().records.every(({ anchor }) => anchor === 'fence'), true);

  const restored = new TetherSystem(new THREE.Scene(), world, player, () => [first, second], system.serialize(), { onDrop: (id, count, position) => drops.push({ id, count, position }) });
  restored.update(0.05, 'overworld');
  assert.equal(restored.lines.size, 2);
  world.setBlock(4, 20, 4, BLOCK.AIR);
  assert.equal(restored.blockChanged(4, 20, 4, BLOCK.OAK_FENCE, BLOCK.AIR, 'overworld'), 2);
  assert.equal(restored.serialize().records.length, 0);
  assert.deepEqual(drops.map(({ id, count }) => ({ id, count })), [{ id: 'trail_tether', count: 2 }]);
});

test('saved tether input is sanitized, deduplicated, realm-isolated, and hard bounded', () => {
  const records = Array.from({ length: MAX_TETHERS + 10 }, (_, index) => ({
    entityKey: `animal-${index}`,
    realm: 'overworld',
    anchor: index % 2 ? 'player' : 'fence',
    x: 1,
    y: 20,
    z: 1,
  }));
  records[1] = { ...records[0] };
  records[2] = { entityKey: '../bad', realm: 'overworld', anchor: 'player' };
  const system = new TetherSystem(new THREE.Scene(), new MockWorld(), { position: new THREE.Vector3() }, () => [], { records });
  assert.ok(system.serialize().records.length <= MAX_TETHERS);
  assert.equal(new Set(system.serialize().records.map(({ entityKey }) => entityKey)).size, system.serialize().records.length);
  assert.equal(system.serialize().records.some(({ entityKey }) => entityKey === '../bad'), false);
});
