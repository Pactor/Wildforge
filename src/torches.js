import { BLOCK, BLOCKS } from './blocks.js';

const IDS = Object.freeze({ n: BLOCK.TORCH_WALL_N, e: BLOCK.TORCH_WALL_E, s: BLOCK.TORCH_WALL_S, w: BLOCK.TORCH_WALL_W });
const OFFSETS = Object.freeze({
  floor: Object.freeze({ x: 0, y: -1, z: 0 }),
  n: Object.freeze({ x: 0, y: 0, z: -1 }),
  e: Object.freeze({ x: 1, y: 0, z: 0 }),
  s: Object.freeze({ x: 0, y: 0, z: 1 }),
  w: Object.freeze({ x: -1, y: 0, z: 0 }),
});

export const isTorch = (id) => Boolean(BLOCKS[id]?.torch);

export function torchInfo(id) {
  const facing = BLOCKS[id]?.torchFacing;
  return facing && OFFSETS[facing] ? { facing, support: OFFSETS[facing] } : null;
}

function supportIsFull(id) {
  const definition = BLOCKS[id];
  return Boolean(definition?.solid && !definition.transparent && !definition.model && !definition.door && !definition.gate
    && !definition.trapdoor && !definition.bed && !definition.storageContainer && id !== BLOCK.CHEST);
}

export function torchIdForSupport(position, support, fallbackYaw = 0) {
  if (position && support) {
    const dx = Math.floor(support.x) - Math.floor(position.x);
    const dy = Math.floor(support.y) - Math.floor(position.y);
    const dz = Math.floor(support.z) - Math.floor(position.z);
    if (dx === 0 && dy === -1 && dz === 0) return BLOCK.TORCH;
    if (dy === 0 && Math.abs(dx) + Math.abs(dz) === 1) return dx < 0 ? IDS.w : dx > 0 ? IDS.e : dz < 0 ? IDS.n : IDS.s;
  }
  const dx = -Math.sin(Number(fallbackYaw) || 0); const dz = -Math.cos(Number(fallbackYaw) || 0);
  return Math.abs(dx) > Math.abs(dz) ? IDS[dx > 0 ? 'w' : 'e'] : IDS[dz > 0 ? 'n' : 's'];
}

export function canPlaceTorch(world, x, y, z, id) {
  const info = torchInfo(id);
  if (!info || world.getBlock(x, y, z) !== BLOCK.AIR) return false;
  return supportIsFull(world.getBlock(x + info.support.x, y + info.support.y, z + info.support.z));
}

export function placeTorch(world, x, y, z, id) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  if (!canPlaceTorch(world, x, y, z, id)) return false;
  world.setBlock(x, y, z, id);
  return true;
}

export function detachUnsupportedTorches(world, supportX, supportY, supportZ) {
  supportX = Math.floor(supportX); supportY = Math.floor(supportY); supportZ = Math.floor(supportZ);
  const removed = [];
  for (const [dx, dy, dz] of [[0, 1, 0], [-1, 0, 0], [1, 0, 0], [0, 0, -1], [0, 0, 1]]) {
    const x = supportX + dx; const y = supportY + dy; const z = supportZ + dz;
    const id = world.getBlock(x, y, z); const info = torchInfo(id);
    if (!info || x + info.support.x !== supportX || y + info.support.y !== supportY || z + info.support.z !== supportZ) continue;
    if (supportIsFull(world.getBlock(supportX, supportY, supportZ))) continue;
    world.setBlock(x, y, z, BLOCK.AIR); removed.push({ x, y, z, id });
  }
  return removed;
}

export function torchGeometry(id) {
  const facing = torchInfo(id)?.facing;
  if (!facing) return [];
  if (facing === 'floor') return [
    { material: BLOCK.WOOD, bounds: [0.45, 0, 0.45, 0.55, 0.62, 0.55] },
    { material: id, bounds: [0.38, 0.58, 0.38, 0.62, 0.78, 0.62] },
  ];
  const data = {
    n: [[0.44, 0.34, 0.02, 0.56, 0.46, 0.24], [0.44, 0.42, 0.18, 0.56, 0.7, 0.32], [0.37, 0.66, 0.18, 0.63, 0.84, 0.44]],
    s: [[0.44, 0.34, 0.76, 0.56, 0.46, 0.98], [0.44, 0.42, 0.68, 0.56, 0.7, 0.82], [0.37, 0.66, 0.56, 0.63, 0.84, 0.82]],
    w: [[0.02, 0.34, 0.44, 0.24, 0.46, 0.56], [0.18, 0.42, 0.44, 0.32, 0.7, 0.56], [0.18, 0.66, 0.37, 0.44, 0.84, 0.63]],
    e: [[0.76, 0.34, 0.44, 0.98, 0.46, 0.56], [0.68, 0.42, 0.44, 0.82, 0.7, 0.56], [0.56, 0.66, 0.37, 0.82, 0.84, 0.63]],
  }[facing];
  return data.map((bounds, index) => ({ material: index === data.length - 1 ? id : BLOCK.WOOD, bounds }));
}
