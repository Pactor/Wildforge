import { BLOCK, BLOCKS } from './blocks.js';

const INFO = new Map([
  [BLOCK.DOOR_X_BOTTOM, { orientation: 'x', open: false, top: false }],
  [BLOCK.DOOR_X_TOP, { orientation: 'x', open: false, top: true }],
  [BLOCK.DOOR_Z_BOTTOM, { orientation: 'z', open: false, top: false }],
  [BLOCK.DOOR_Z_TOP, { orientation: 'z', open: false, top: true }],
  [BLOCK.DOOR_OPEN_X_BOTTOM, { orientation: 'x', open: true, top: false }],
  [BLOCK.DOOR_OPEN_X_TOP, { orientation: 'x', open: true, top: true }],
  [BLOCK.DOOR_OPEN_Z_BOTTOM, { orientation: 'z', open: true, top: false }],
  [BLOCK.DOOR_OPEN_Z_TOP, { orientation: 'z', open: true, top: true }],
]);

export function doorInfo(id) {
  return INFO.get(id) || null;
}

export function isDoor(id) {
  return Boolean(BLOCKS[id]?.door);
}

function idsFor(orientation, open) {
  if (orientation === 'x') return open
    ? [BLOCK.DOOR_OPEN_X_BOTTOM, BLOCK.DOOR_OPEN_X_TOP]
    : [BLOCK.DOOR_X_BOTTOM, BLOCK.DOOR_X_TOP];
  return open
    ? [BLOCK.DOOR_OPEN_Z_BOTTOM, BLOCK.DOOR_OPEN_Z_TOP]
    : [BLOCK.DOOR_Z_BOTTOM, BLOCK.DOOR_Z_TOP];
}

export function doorPlan(x, y, z, yaw) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  const orientation = Math.abs(Math.sin(yaw)) > Math.abs(Math.cos(yaw)) ? 'x' : 'z';
  const [bottom, top] = idsFor(orientation, false);
  return {
    orientation,
    bottom: { x, y, z, id: bottom },
    top: { x, y: y + 1, z, id: top },
  };
}

export function placeDoor(world, x, y, z, yaw) {
  const plan = doorPlan(x, y, z, yaw);
  if (!world.isSolid(plan.bottom.x, plan.bottom.y - 1, plan.bottom.z)
    || world.getBlock(plan.bottom.x, plan.bottom.y, plan.bottom.z) !== BLOCK.AIR
    || world.getBlock(plan.top.x, plan.top.y, plan.top.z) !== BLOCK.AIR) return false;
  if (world.setBlocks) world.setBlocks([plan.bottom, plan.top]);
  else {
    world.setBlock(plan.bottom.x, plan.bottom.y, plan.bottom.z, plan.bottom.id);
    world.setBlock(plan.top.x, plan.top.y, plan.top.z, plan.top.id);
  }
  return true;
}

export function toggleDoor(world, x, y, z) {
  const id = world.getBlock(x, y, z);
  const info = doorInfo(id);
  if (!info) return false;
  const baseY = Math.floor(y) - (info.top ? 1 : 0);
  const [bottom, top] = idsFor(info.orientation, !info.open);
  world.setBlock(x, baseY, z, bottom);
  world.setBlock(x, baseY + 1, z, top);
  return true;
}

export function breakDoor(world, x, y, z) {
  const info = doorInfo(world.getBlock(x, y, z));
  if (!info) return null;
  const baseY = Math.floor(y) - (info.top ? 1 : 0);
  world.setBlock(x, baseY, z, BLOCK.AIR);
  world.setBlock(x, baseY + 1, z, BLOCK.AIR);
  return { x: Math.floor(x), y: baseY, z: Math.floor(z) };
}
