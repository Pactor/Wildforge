import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK } from '../src/blocks.js';
import { CartManager, railAt, railSurfaceY } from '../src/carts.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { Inventory, RECIPES } from '../src/inventory.js';

class TrackWorld {
  constructor() { this.blocks = new Map(); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) || BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); }
  rail(x, z, id = BLOCK.FORGE_RAIL_NS) {
    this.setBlock(x, 0, z, BLOCK.STONE);
    this.setBlock(x, 1, z, id);
    return this;
  }
}

function playerStub() {
  return {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    collides: () => false,
    syncCamera() {},
  };
}

test('Forge Carts place only on clear rails, reject overlap, and use a complete shaped recipe', () => {
  const world = new TrackWorld().rail(0, 0).rail(0, -1);
  const manager = new CartManager(new THREE.Scene(), world);
  assert.equal(railAt(world, 0.5, 1.2, 0.5).id, BLOCK.FORGE_RAIL_NS);
  const cart = manager.place(0, 1, 0, 0);
  assert.ok(cart);
  assert.equal(manager.place(0, 1, 0, 0), null);
  assert.equal(manager.place(4, 1, 4, 0), null);
  world.setBlock(0, 2, -1, BLOCK.STONE);
  assert.equal(manager.place(0, 1, -1, 0), null);

  const recipe = RECIPES.find(({ id }) => id === 'forge_cart');
  assert.ok(recipe);
  assert.equal(matchCraftingRecipe(['iron_ingot', null, 'iron_ingot', 'iron_ingot', BLOCK.PLANKS, 'iron_ingot', null, BLOCK.PLANKS, null], 3, 'table')?.id, 'forge_cart');
  const inventory = new Inventory({ counts: Object.entries(recipe.ingredients) });
  assert.equal(inventory.craft(recipe, 'table'), true);
  assert.equal(inventory.count('forge_cart'), 1);
});

test('mounted carts accelerate, follow rails, receive Drive Rail boosts, synchronize riders, and dismount safely', () => {
  const world = new TrackWorld();
  for (let z = 2; z >= -4; z -= 1) world.rail(0, z, z === 0 ? BLOCK.POWER_RAIL_NS_ON : BLOCK.FORGE_RAIL_NS);
  const rolls = [];
  const manager = new CartManager(new THREE.Scene(), world, null, { onRoll: (...args) => rolls.push(args) });
  const cart = manager.place(0, 1, 2, 0);
  const player = playerStub();
  assert.equal(manager.mount(cart, player), true);
  assert.equal(manager.mount(cart, player), false);
  let maximumSpeed = 0;
  for (let index = 0; index < 80; index += 1) {
    manager.update(0.05, new Set(['KeyW']), player);
    maximumSpeed = Math.max(maximumSpeed, Math.abs(cart.velocity));
  }
  assert.ok(maximumSpeed > 2);
  assert.ok(cart.model.position.z < 1.5);
  assert.equal(player.position.x, cart.model.position.x);
  assert.equal(player.position.z, cart.model.position.z);
  assert.ok(rolls.length > 0);
  assert.equal(manager.unmount(player), true);
  assert.equal(manager.mounted, null);
  assert.ok(player.position.distanceTo(cart.model.position) > 0.9);
});

test('carts route through curves, stop at track ends, persist motion, and recover safely', () => {
  const world = new TrackWorld()
    .rail(0, 1, BLOCK.FORGE_RAIL_NS)
    .rail(0, 0, BLOCK.FORGE_RAIL_SW)
    .rail(-1, 0, BLOCK.FORGE_RAIL_EW)
    .rail(-2, 0, BLOCK.FORGE_RAIL_EW);
  const manager = new CartManager(new THREE.Scene(), world);
  const cart = manager.place(0, 1, 1, 0);
  cart.velocity = 4;
  for (let index = 0; index < 25; index += 1) manager.update(0.05);
  assert.equal(cart.direction, 'W');
  assert.ok(cart.model.position.x < 0.5);
  for (let index = 0; index < 80; index += 1) manager.update(0.05);
  assert.equal(cart.velocity, 0);

  const saved = manager.serialize();
  const restored = new CartManager(new THREE.Scene(), world, saved);
  assert.equal(restored.carts.length, 1);
  assert.equal(restored.carts[0].direction, 'W');
  const position = restored.remove(restored.carts[0]);
  assert.ok(position instanceof THREE.Vector3);
  assert.equal(restored.carts.length, 0);
});

test('junction authority, cargo identities, and cart collisions are persistent and bounded', () => {
  const world = new TrackWorld()
    .rail(0, 1, BLOCK.FORGE_RAIL_NS)
    .rail(0, 0, BLOCK.FORGE_RAIL_JUNCTION_W)
    .rail(-1, 0, BLOCK.FORGE_RAIL_EW)
    .rail(1, 0, BLOCK.FORGE_RAIL_EW);
  const manager = new CartManager(new THREE.Scene(), world);
  const cargo = manager.place(0, 1, 1, 0, 'cargo');
  assert.equal(cargo.type, 'cargo');
  assert.match(cargo.storageKey, /^cargo:cart-/);
  assert.equal(manager.mount(cargo, playerStub()), false);
  cargo.velocity = 3;
  for (let index = 0; index < 18; index += 1) manager.update(0.05);
  assert.equal(cargo.direction, 'W');

  const restored = new CartManager(new THREE.Scene(), world, manager.serialize());
  assert.equal(restored.carts[0].key, cargo.key);
  assert.equal(restored.carts[0].storageKey, cargo.storageKey);
  assert.equal(restored.carts[0].type, 'cargo');

  const collisionWorld = new TrackWorld();
  for (let z = -2; z <= 2; z += 1) collisionWorld.rail(0, z);
  const collisions = new CartManager(new THREE.Scene(), collisionWorld);
  const first = collisions.place(0, 1, 1, 0);
  const second = collisions.place(0, 1, -1, Math.PI);
  first.velocity = 4;
  second.velocity = 4;
  for (let index = 0; index < 20; index += 1) collisions.update(0.05);
  assert.equal(first.velocity, 0);
  assert.equal(second.velocity, 0);
  assert.ok(first.model.position.distanceTo(second.model.position) >= 0.65);
});

test('carts climb and descend automatically shaped one-block rail grades', () => {
  const world = new TrackWorld()
    .rail(0, 1, BLOCK.FORGE_RAIL_NS)
    .rail(0, 0, BLOCK.FORGE_RAIL_ASC_N);
  world.setBlock(0, 1, -1, BLOCK.STONE);
  world.setBlock(0, 2, -1, BLOCK.FORGE_RAIL_NS);
  world.setBlock(0, 1, -2, BLOCK.STONE);
  world.setBlock(0, 2, -2, BLOCK.FORGE_RAIL_NS);
  const slope = railAt(world, 0.5, 1.2, 0.5);
  assert.equal(slope.slopeDirection, 'N');
  assert.ok(railSurfaceY(slope, 0.5, 0.05) > railSurfaceY(slope, 0.5, 0.95) + 0.8);
  const manager = new CartManager(new THREE.Scene(), world);
  const cart = manager.place(0, 1, 1, 0);
  cart.velocity = 3.5;
  for (let index = 0; index < 35; index += 1) manager.update(0.05);
  assert.ok(cart.model.position.z < -0.5);
  assert.ok(cart.model.position.y > 2);
  cart.velocity = -3;
  for (let index = 0; index < 35; index += 1) manager.update(0.05);
  assert.ok(cart.model.position.y < 1.5);
});

test('Forge Couplers create persistent collision-safe consists with shared motion and clean recovery', () => {
  const world = new TrackWorld();
  for (let z = -6; z <= 4; z += 1) world.rail(0, z);
  const manager = new CartManager(new THREE.Scene(), world);
  const first = manager.place(0, 1, 2, 0);
  const second = manager.place(0, 1, 0, 0, 'cargo');
  assert.equal(manager.link(first, second), true);
  assert.equal(manager.link(first, second), false);
  assert.equal(manager.links.size, 1);
  assert.equal(manager.couplerModels.size, 1);
  const player = playerStub();
  manager.mount(first, player);
  for (let index = 0; index < 35; index += 1) manager.update(0.05, new Set(['KeyW']), player);
  assert.ok(first.model.position.z < 1.5);
  assert.equal(first.velocity, second.velocity);
  assert.ok(first.model.position.distanceTo(second.model.position) > 1.2);

  const restored = new CartManager(new THREE.Scene(), world, manager.serialize());
  assert.equal(restored.links.size, 1);
  assert.equal(restored.coupledComponent(restored.carts[0]).length, 2);
  const detached = restored.disconnect(restored.carts[0]);
  assert.equal(detached, 1);
  assert.equal(restored.links.size, 0);
  assert.equal(restored.couplerModels.size, 0);

  const recipe = RECIPES.find(({ id }) => id === 'forge_couplers');
  assert.ok(recipe);
  assert.equal(matchCraftingRecipe(['iron_ingot', null, 'iron_ingot', null, 'windfiber', null, null, null, null], 3, 'table')?.id, 'forge_couplers');
});
