import { BLOCK, BLOCKS, isLiquidBlock } from './blocks.js';
import { WORLD_HEIGHT, WORLD_MIN_Y } from './worldBounds.js';

export const MAX_SCAFFOLD_REACH = 6;
const HORIZONTAL = Object.freeze([[-1, 0], [1, 0], [0, -1], [0, 1]]);

const key = (x, y, z) => `${x},${y},${z}`;

export function isScaffold(id) {
  return Boolean(BLOCKS[id]?.scaffold);
}

function availableScaffold(world, x, y, z, removed) {
  return isScaffold(world.getBlock(x, y, z)) && !removed?.has(key(x, y, z));
}

function columnHasFoundation(world, x, y, z, removed) {
  let belowY = y - 1;
  while (belowY >= WORLD_MIN_Y && availableScaffold(world, x, belowY, z, removed)) belowY -= 1;
  if (belowY < WORLD_MIN_Y || removed?.has(key(x, belowY, z))) return false;
  const support = BLOCKS[world.getBlock(x, belowY, z)];
  return Boolean(support?.solid && !support.scaffold);
}

export function scaffoldSupportDistance(world, x, y, z, removed = null) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  if (!world || y <= WORLD_MIN_Y || y >= WORLD_HEIGHT) return null;
  const visited = new Set([key(x, y, z)]);
  let frontier = [{ x, z, distance: 0 }];
  while (frontier.length) {
    const next = [];
    for (const node of frontier) {
      if (columnHasFoundation(world, node.x, y, node.z, removed)) return node.distance;
      if (node.distance >= MAX_SCAFFOLD_REACH) continue;
      for (const [dx, dz] of HORIZONTAL) {
        const nx = node.x + dx;
        const nz = node.z + dz;
        const nodeKey = key(nx, y, nz);
        if (visited.has(nodeKey) || !availableScaffold(world, nx, y, nz, removed)) continue;
        visited.add(nodeKey);
        next.push({ x: nx, z: nz, distance: node.distance + 1 });
      }
    }
    frontier = next;
  }
  return null;
}

export function canPlaceScaffold(world, x, y, z) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  const existing = world?.getBlock(x, y, z);
  if (existing !== BLOCK.AIR && !isLiquidBlock(existing)) return false;
  return scaffoldSupportDistance(world, x, y, z) != null;
}

export function placeScaffold(world, x, y, z) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  if (!canPlaceScaffold(world, x, y, z)) return false;
  world.setBlock(x, y, z, BLOCK.SILKFRAME_SCAFFOLD);
  return true;
}

export function detachUnsupportedScaffolds(world, originX, originZ) {
  const radius = MAX_SCAFFOLD_REACH * 2 + 1;
  const minX = Math.floor(originX) - radius;
  const maxX = Math.floor(originX) + radius;
  const minZ = Math.floor(originZ) - radius;
  const maxZ = Math.floor(originZ) + radius;
  const candidates = [];
  for (let y = WORLD_MIN_Y + 1; y < WORLD_HEIGHT; y += 1) {
    for (let z = minZ; z <= maxZ; z += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (isScaffold(world.getBlock(x, y, z))) candidates.push({ x, y, z, id: BLOCK.SILKFRAME_SCAFFOLD });
      }
    }
  }
  const removed = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const candidate of candidates) {
      const candidateKey = key(candidate.x, candidate.y, candidate.z);
      if (removed.has(candidateKey)) continue;
      if (scaffoldSupportDistance(world, candidate.x, candidate.y, candidate.z, removed) != null) continue;
      removed.add(candidateKey);
      changed = true;
    }
  }
  const detached = candidates.filter((candidate) => removed.has(key(candidate.x, candidate.y, candidate.z)));
  if (detached.length) world.setBlocks(detached.map(({ x, y, z }) => ({ x, y, z, id: BLOCK.AIR })));
  return detached;
}

export function scaffoldAt(world, position, radius = 0.3, height = 1.8, includeBelow = false) {
  if (!world || !position) return null;
  const lower = position.y - (includeBelow ? 0.12 : -0.05);
  for (let y = Math.floor(lower); y <= Math.floor(position.y + height - 0.05); y += 1) {
    for (let z = Math.floor(position.z - radius); z <= Math.floor(position.z + radius); z += 1) {
      for (let x = Math.floor(position.x - radius); x <= Math.floor(position.x + radius); x += 1) {
        const id = world.getBlock(x, y, z);
        if (isScaffold(id)) return { x, y, z, id };
      }
    }
  }
  return null;
}
