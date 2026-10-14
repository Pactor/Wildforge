import { BLOCK, BLOCKS } from './blocks.js';

const IDS = Object.freeze({
  oak_stairs: { n: BLOCK.OAK_STAIR_N, e: BLOCK.OAK_STAIR_E, s: BLOCK.OAK_STAIR_S, w: BLOCK.OAK_STAIR_W },
  stone_stairs: { n: BLOCK.STONE_STAIR_N, e: BLOCK.STONE_STAIR_E, s: BLOCK.STONE_STAIR_S, w: BLOCK.STONE_STAIR_W },
});

export function isStair(id) {
  return Boolean(BLOCKS[id]?.stair);
}

export function stairInfo(id) {
  const definition = BLOCKS[id];
  if (!definition?.stair) return null;
  return { material: definition.stairItem === 'oak_stairs' ? 'oak' : 'stone', orientation: definition.model.slice(-1).toLowerCase(), item: definition.stairItem };
}

export function stairIdFor(item, yaw) {
  const ids = IDS[item];
  if (!ids) return null;
  const dx = -Math.sin(yaw);
  const dz = -Math.cos(yaw);
  const orientation = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'e' : 'w') : (dz > 0 ? 's' : 'n');
  return ids[orientation];
}

export function placeStair(world, x, y, z, item, yaw) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  const id = stairIdFor(item, yaw);
  if (id == null || world.getBlock(x, y, z) !== BLOCK.AIR) return false;
  world.setBlock(x, y, z, id);
  return true;
}

export function breakStair(world, x, y, z) {
  const info = stairInfo(world.getBlock(x, y, z));
  if (!info) return null;
  const position = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
  world.setBlock(position.x, position.y, position.z, BLOCK.AIR);
  return { ...position, item: info.item };
}
