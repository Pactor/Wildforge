import { BLOCK, BLOCKS } from './blocks.js';

const DIRECTIONS = Object.freeze({
  n: { x: 0, z: -1 }, e: { x: 1, z: 0 }, s: { x: 0, z: 1 }, w: { x: -1, z: 0 },
});

const IDS = Object.freeze({
  n: { foot: BLOCK.BED_N_FOOT, head: BLOCK.BED_N_HEAD },
  e: { foot: BLOCK.BED_E_FOOT, head: BLOCK.BED_E_HEAD },
  s: { foot: BLOCK.BED_S_FOOT, head: BLOCK.BED_S_HEAD },
  w: { foot: BLOCK.BED_W_FOOT, head: BLOCK.BED_W_HEAD },
});

export function isBed(id) {
  return Boolean(BLOCKS[id]?.bed);
}

export function bedInfo(id) {
  const definition = BLOCKS[id];
  return definition?.bed ? { orientation: definition.bedOrientation, part: definition.bedPart } : null;
}

function orientationFor(yaw) {
  const dx = -Math.sin(yaw);
  const dz = -Math.cos(yaw);
  return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'e' : 'w') : (dz > 0 ? 's' : 'n');
}

export function bedPlan(x, y, z, yaw) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  const orientation = orientationFor(yaw);
  const direction = DIRECTIONS[orientation];
  return {
    orientation,
    foot: { x, y, z, id: IDS[orientation].foot },
    head: { x: x + direction.x, y, z: z + direction.z, id: IDS[orientation].head },
  };
}

export function placeBed(world, x, y, z, yaw) {
  const plan = bedPlan(x, y, z, yaw);
  for (const part of [plan.foot, plan.head]) {
    if (world.getBlock(part.x, part.y, part.z) !== BLOCK.AIR || !world.isSolid(part.x, part.y - 1, part.z)) return false;
  }
  if (world.setBlocks) world.setBlocks([plan.foot, plan.head]);
  else {
    world.setBlock(plan.foot.x, plan.foot.y, plan.foot.z, plan.foot.id);
    world.setBlock(plan.head.x, plan.head.y, plan.head.z, plan.head.id);
  }
  return true;
}

export function bedParts(world, x, y, z) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  const info = bedInfo(world.getBlock(x, y, z));
  if (!info) return null;
  const direction = DIRECTIONS[info.orientation];
  const foot = info.part === 'foot' ? { x, y, z } : { x: x - direction.x, y, z: z - direction.z };
  return { orientation: info.orientation, foot, head: { x: foot.x + direction.x, y, z: foot.z + direction.z } };
}

export function breakBed(world, x, y, z) {
  const parts = bedParts(world, x, y, z);
  if (!parts) return null;
  world.setBlock(parts.foot.x, parts.foot.y, parts.foot.z, BLOCK.AIR);
  world.setBlock(parts.head.x, parts.head.y, parts.head.z, BLOCK.AIR);
  return parts.foot;
}

export function isSleepingTime(worldTime) {
  const time = ((Number(worldTime) || 0) % 1 + 1) % 1;
  return time < 0.23 || time > 0.77;
}
