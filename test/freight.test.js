import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { CartManager } from '../src/carts.js';
import { CircuitSystem, directionalCircuitId, poweredVariant } from '../src/circuits.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { freightEndpoints, transferFreight } from '../src/freight.js';
import { blockDrops, RECIPES } from '../src/inventory.js';
import { placementPlan, previewBoxes } from '../src/placementPreview.js';
import { containerKey, StorageState } from '../src/storage.js';

class FreightWorld {
  constructor() { this.blocks = new Map(); }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) || BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); }
}

function setup(mode = 'load') {
  const world = new FreightWorld();
  world.setBlock(0, 0, -1, BLOCK.STONE);
  world.setBlock(0, 1, -1, BLOCK.FORGE_RAIL_NS);
  world.setBlock(0, 1, 1, BLOCK.CHEST);
  const off = mode === 'load' ? BLOCK.FREIGHT_LOADER_N_OFF : BLOCK.FREIGHT_UNLOADER_N_OFF;
  world.setBlock(0, 1, 0, off);
  const carts = new CartManager(new THREE.Scene(), world);
  const cart = carts.place(0, 1, -1, 0, 'cargo');
  const storage = new StorageState();
  return { world, carts, cart, storage, off };
}

test('powered freight loaders and unloaders move one bounded stack between real inventories', () => {
  const loaded = setup('load');
  const chestKey = containerKey(0, 1, 1);
  loaded.storage.get(chestKey).add(BLOCK.DIRT, 130);
  const loaderOn = poweredVariant(loaded.off, true);
  const first = transferFreight(loaded.world, loaded.storage, loaded.carts, 0, 1, 0, loaderOn);
  assert.deepEqual({ moved: first.moved, itemId: first.itemId, mode: first.mode }, { moved: 64, itemId: String(BLOCK.DIRT), mode: 'load' });
  assert.equal(loaded.storage.get(chestKey).count(BLOCK.DIRT), 66);
  assert.equal(loaded.storage.get(loaded.cart.storageKey).count(BLOCK.DIRT), 64);

  loaded.world.setBlock(0, 1, 0, BLOCK.FREIGHT_UNLOADER_N_ON);
  const unloaded = transferFreight(loaded.world, loaded.storage, loaded.carts, 0, 1, 0);
  assert.equal(unloaded.moved, 64);
  assert.equal(loaded.storage.get(chestKey).count(BLOCK.DIRT), 130);
  assert.equal(loaded.storage.get(loaded.cart.storageKey).count(BLOCK.DIRT), 0);
});

test('freight transfer rejects invalid endpoints and only circuit rising edges invoke work', () => {
  const { world, carts, storage, off } = setup('load');
  const chestKey = containerKey(0, 1, 1);
  storage.get(chestKey).add(BLOCK.STONE, 70);
  world.setBlock(-2, 1, 0, BLOCK.SPARK_SWITCH_OFF);
  world.setBlock(-1, 1, 0, BLOCK.SUNWIRE_OFF);
  let transfers = 0;
  const circuits = new CircuitSystem(world, {
    onStateChange(position, oldId, newId) {
      if (BLOCKS[newId]?.circuitRole === 'freightStation' && BLOCKS[newId].powered && !BLOCKS[oldId]?.powered) {
        transfers += transferFreight(world, storage, carts, position.x, position.y, position.z, newId).moved;
      }
    },
  });
  circuits.blockChanged(0, 1, 0, BLOCK.AIR, off);
  circuits.toggleSwitch(-2, 1, 0);
  assert.equal(transfers, 64);
  circuits.recomputeAround(-1, 1, 0);
  assert.equal(transfers, 64);
  circuits.toggleSwitch(-2, 1, 0);
  circuits.toggleSwitch(-2, 1, 0);
  assert.equal(transfers, 70);

  world.setBlock(0, 1, 1, BLOCK.AIR);
  assert.equal(transferFreight(world, storage, carts, 0, 1, 0).reason, 'no-chest');
});

test('freight stations have directional plans, original geometry, recipes, and canonical recovery', () => {
  assert.equal(directionalCircuitId('freight_loader', 0), BLOCK.FREIGHT_LOADER_N_OFF);
  assert.equal(directionalCircuitId('freight_unloader', Math.PI), BLOCK.FREIGHT_UNLOADER_S_OFF);
  assert.equal(placementPlan('freight_loader', { x: 2, y: 3, z: 4 }, -Math.PI / 2).parts[0].id, BLOCK.FREIGHT_LOADER_E_OFF);
  assert.ok(previewBoxes(BLOCK.FREIGHT_LOADER_N_OFF)[0][4] >= 0.9);
  assert.deepEqual(blockDrops(BLOCK.FREIGHT_LOADER_E_ON), ['freight_loader']);
  assert.deepEqual(blockDrops(BLOCK.FREIGHT_UNLOADER_W_ON), ['freight_unloader']);
  assert.equal(freightEndpoints(new FreightWorld(), 0, 1, 0, BLOCK.FREIGHT_LOADER_E_OFF).cart.x, 1);
  assert.ok(RECIPES.find(({ id }) => id === 'freight_loader'));
  assert.equal(matchCraftingRecipe(['iron_ingot', 'iron_ingot', 'iron_ingot', null, BLOCK.CHEST, null, null, 'lumen_shard', null], 3, 'table')?.id, 'freight_loader');
});
