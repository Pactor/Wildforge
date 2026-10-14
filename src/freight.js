import { BLOCK, BLOCKS } from './blocks.js';
import { itemStackSize } from './inventory.js';
import { chestInfo } from './storage.js';

export function freightEndpoints(world, x, y, z, id = world.getBlock(x, y, z)) {
  const definition = BLOCKS[id];
  if (definition?.circuitRole !== 'freightStation' || !definition.circuitFacing) return null;
  const [dx, , dz] = definition.circuitFacing;
  return {
    mode: definition.freightMode,
    cart: { x: x + dx, y, z: z + dz },
    chest: { x: x - dx, y, z: z - dz },
  };
}

export function transferFreight(world, storage, carts, x, y, z, id = world.getBlock(x, y, z)) {
  const endpoints = freightEndpoints(world, x, y, z, id);
  if (!endpoints || !BLOCKS[id]?.powered) return { moved: 0, reason: 'unpowered' };
  if (world.getBlock(endpoints.chest.x, endpoints.chest.y, endpoints.chest.z) !== BLOCK.CHEST) return { moved: 0, reason: 'no-chest' };
  const cart = carts.cargoAt(endpoints.cart.x, endpoints.cart.y, endpoints.cart.z);
  if (!cart) return { moved: 0, reason: 'no-cart' };

  const chestKey = storage.prepare(chestInfo(world, endpoints.chest.x, endpoints.chest.y, endpoints.chest.z));
  const sourceKey = endpoints.mode === 'load' ? chestKey : cart.storageKey;
  const targetKey = endpoints.mode === 'load' ? cart.storageKey : chestKey;
  const entry = storage.entries(sourceKey)[0];
  if (!entry) return { moved: 0, reason: 'empty' };
  const [itemId, count] = entry;
  const amount = Math.min(count, itemStackSize(itemId), storage.spaceFor(targetKey, itemId));
  if (amount <= 0 || !storage.deposit(targetKey, storage.get(sourceKey), itemId, amount)) return { moved: 0, reason: 'full' };
  return { moved: amount, itemId, mode: endpoints.mode, cart, chestKey };
}
