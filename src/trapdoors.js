import { BLOCK, BLOCKS } from './blocks.js';

const IDS = Object.freeze({
  n: { closed: BLOCK.TRAP_CLOSED_N, open: BLOCK.TRAP_OPEN_N },
  e: { closed: BLOCK.TRAP_CLOSED_E, open: BLOCK.TRAP_OPEN_E },
  s: { closed: BLOCK.TRAP_CLOSED_S, open: BLOCK.TRAP_OPEN_S },
  w: { closed: BLOCK.TRAP_CLOSED_W, open: BLOCK.TRAP_OPEN_W },
});

export function isTrapdoor(id) {
  return Boolean(BLOCKS[id]?.trapdoor);
}

export function trapdoorInfo(id) {
  const definition = BLOCKS[id];
  if (!definition?.trapdoor) return null;
  return {
    orientation: definition.model.slice(-1).toLowerCase(),
    open: definition.model.startsWith('trapOpen'),
  };
}

export function trapdoorIdFor(yaw, open = false) {
  const dx = -Math.sin(yaw);
  const dz = -Math.cos(yaw);
  const orientation = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'e' : 'w') : (dz > 0 ? 's' : 'n');
  return IDS[orientation][open ? 'open' : 'closed'];
}

export function placeTrapdoor(world, x, y, z, yaw) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  if (world.getBlock(x, y, z) !== BLOCK.AIR) return false;
  world.setBlock(x, y, z, trapdoorIdFor(yaw));
  return true;
}

export function toggleTrapdoor(world, x, y, z) {
  const info = trapdoorInfo(world.getBlock(x, y, z));
  if (!info) return false;
  world.setBlock(Math.floor(x), Math.floor(y), Math.floor(z), IDS[info.orientation][info.open ? 'closed' : 'open']);
  return true;
}

export function breakTrapdoor(world, x, y, z) {
  if (!isTrapdoor(world.getBlock(x, y, z))) return null;
  const position = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
  world.setBlock(position.x, position.y, position.z, BLOCK.AIR);
  return position;
}
