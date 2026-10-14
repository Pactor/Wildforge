import { BLOCK, BLOCKS } from './blocks.js';

const INFO = new Map([
  [BLOCK.GATE_X, { orientation: 'x', open: false }],
  [BLOCK.GATE_Z, { orientation: 'z', open: false }],
  [BLOCK.GATE_OPEN_X, { orientation: 'x', open: true }],
  [BLOCK.GATE_OPEN_Z, { orientation: 'z', open: true }],
]);

export function gateInfo(id) {
  return INFO.get(id) || null;
}

export function isGate(id) {
  return Boolean(BLOCKS[id]?.gate);
}

export function gateIdFor(yaw, open = false) {
  const orientation = Math.abs(Math.sin(yaw)) > Math.abs(Math.cos(yaw)) ? 'x' : 'z';
  if (orientation === 'x') return open ? BLOCK.GATE_OPEN_X : BLOCK.GATE_X;
  return open ? BLOCK.GATE_OPEN_Z : BLOCK.GATE_Z;
}

export function placeGate(world, x, y, z, yaw) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  if (!world.isSolid(x, y - 1, z) || world.getBlock(x, y, z) !== BLOCK.AIR) return false;
  world.setBlock(x, y, z, gateIdFor(yaw, false));
  return true;
}

export function toggleGate(world, x, y, z) {
  const info = gateInfo(world.getBlock(x, y, z));
  if (!info) return false;
  const next = info.orientation === 'x'
    ? (info.open ? BLOCK.GATE_X : BLOCK.GATE_OPEN_X)
    : (info.open ? BLOCK.GATE_Z : BLOCK.GATE_OPEN_Z);
  world.setBlock(x, y, z, next);
  return true;
}

export function breakGate(world, x, y, z) {
  if (!isGate(world.getBlock(x, y, z))) return null;
  const position = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
  world.setBlock(position.x, position.y, position.z, BLOCK.AIR);
  return position;
}
