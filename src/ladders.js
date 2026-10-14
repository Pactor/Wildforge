import { BLOCK, BLOCKS } from './blocks.js';

const IDS = Object.freeze({
  n: BLOCK.LADDER_N,
  e: BLOCK.LADDER_E,
  s: BLOCK.LADDER_S,
  w: BLOCK.LADDER_W,
});

const OFFSETS = Object.freeze({
  n: Object.freeze({ x: 0, z: -1 }),
  e: Object.freeze({ x: 1, z: 0 }),
  s: Object.freeze({ x: 0, z: 1 }),
  w: Object.freeze({ x: -1, z: 0 }),
});

export function ladderInfo(id) {
  const definition = BLOCKS[id];
  return definition?.ladder ? { orientation: definition.ladderFacing, support: OFFSETS[definition.ladderFacing] } : null;
}

export function ladderIdFor(yaw) {
  const dx = -Math.sin(Number(yaw) || 0);
  const dz = -Math.cos(Number(yaw) || 0);
  return Math.abs(dx) > Math.abs(dz) ? IDS[dx > 0 ? 'w' : 'e'] : IDS[dz > 0 ? 'n' : 's'];
}

export function ladderIdForSupport(position, support, fallbackYaw = 0) {
  if (!position || !support) return ladderIdFor(fallbackYaw);
  const dx = Math.floor(support.x) - Math.floor(position.x);
  const dz = Math.floor(support.z) - Math.floor(position.z);
  if (Math.abs(dx) + Math.abs(dz) !== 1) return ladderIdFor(fallbackYaw);
  return dx < 0 ? IDS.w : dx > 0 ? IDS.e : dz < 0 ? IDS.n : IDS.s;
}

export function canPlaceLadder(world, x, y, z, id) {
  const info = ladderInfo(id);
  if (!info || world.getBlock(x, y, z) !== BLOCK.AIR) return false;
  const support = BLOCKS[world.getBlock(x + info.support.x, y, z + info.support.z)];
  return Boolean(support?.solid && !support.transparent && !support.ladder);
}

export function placeLadder(world, x, y, z, id) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  if (!canPlaceLadder(world, x, y, z, id)) return false;
  world.setBlock(x, y, z, id);
  return true;
}

export function detachUnsupportedLadders(world, supportX, supportY, supportZ) {
  const removed = [];
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const x = Math.floor(supportX) + dx;
    const y = Math.floor(supportY);
    const z = Math.floor(supportZ) + dz;
    const id = world.getBlock(x, y, z);
    const info = ladderInfo(id);
    if (!info || x + info.support.x !== Math.floor(supportX) || z + info.support.z !== Math.floor(supportZ)) continue;
    if (canPlaceLadder({ getBlock: (qx, qy, qz) => qx === x && qy === y && qz === z ? BLOCK.AIR : world.getBlock(qx, qy, qz) }, x, y, z, id)) continue;
    world.setBlock(x, y, z, BLOCK.AIR);
    removed.push({ x, y, z, id });
  }
  return removed;
}

export function ladderAt(world, position, radius = 0.3, height = 1.8) {
  if (!world || !position) return null;
  for (let y = Math.floor(position.y + 0.05); y <= Math.floor(position.y + height - 0.05); y += 1) {
    for (let z = Math.floor(position.z - radius); z <= Math.floor(position.z + radius); z += 1) {
      for (let x = Math.floor(position.x - radius); x <= Math.floor(position.x + radius); x += 1) {
        const id = world.getBlock(x, y, z);
        const info = ladderInfo(id);
        if (info) return { x, y, z, id, ...info };
      }
    }
  }
  return null;
}
