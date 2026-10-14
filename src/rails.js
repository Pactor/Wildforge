import { BLOCK, BLOCKS } from './blocks.js';

export const RAIL_DIRECTIONS = Object.freeze({
  N: [0, 0, -1],
  E: [1, 0, 0],
  S: [0, 0, 1],
  W: [-1, 0, 0],
});

const NORMAL_RAILS = Object.freeze([
  BLOCK.FORGE_RAIL_NS, BLOCK.FORGE_RAIL_EW, BLOCK.FORGE_RAIL_NE,
  BLOCK.FORGE_RAIL_ES, BLOCK.FORGE_RAIL_SW, BLOCK.FORGE_RAIL_WN,
  BLOCK.FORGE_RAIL_JUNCTION, BLOCK.FORGE_RAIL_JUNCTION_E,
  BLOCK.FORGE_RAIL_JUNCTION_S, BLOCK.FORGE_RAIL_JUNCTION_W,
  BLOCK.FORGE_RAIL_ASC_N, BLOCK.FORGE_RAIL_ASC_E, BLOCK.FORGE_RAIL_ASC_S, BLOCK.FORGE_RAIL_ASC_W,
]);
const POWER_RAILS = Object.freeze([
  BLOCK.POWER_RAIL_NS_OFF, BLOCK.POWER_RAIL_EW_OFF,
  BLOCK.POWER_RAIL_NS_ON, BLOCK.POWER_RAIL_EW_ON,
]);

export function isRail(id) {
  return NORMAL_RAILS.includes(id) || POWER_RAILS.includes(id);
}

export function isPoweredRail(id) {
  return POWER_RAILS.includes(id);
}

const JUNCTIONS = Object.freeze([
  BLOCK.FORGE_RAIL_JUNCTION,
  BLOCK.FORGE_RAIL_JUNCTION_E,
  BLOCK.FORGE_RAIL_JUNCTION_S,
  BLOCK.FORGE_RAIL_JUNCTION_W,
]);

export function isRailJunction(id) {
  return JUNCTIONS.includes(id);
}

export function cycleRailJunction(world, x, y, z) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  const previous = world.getBlock(x, y, z);
  const index = JUNCTIONS.indexOf(previous);
  if (index < 0) return null;
  const id = JUNCTIONS[(index + 1) % JUNCTIONS.length];
  world.setBlock(x, y, z, id);
  return { x, y, z, previous, id, direction: BLOCKS[id].junctionExit };
}

export function railConnections(id) {
  const shape = BLOCKS[id]?.railShape || '';
  return [...shape].filter((direction) => RAIL_DIRECTIONS[direction]);
}

export function railPlacementId(itemId, yaw = 0) {
  const alongX = Math.abs(Math.sin(Number(yaw) || 0)) > Math.abs(Math.cos(Number(yaw) || 0));
  if (itemId === 'forge_rail') return alongX ? BLOCK.FORGE_RAIL_EW : BLOCK.FORGE_RAIL_NS;
  if (itemId === 'powered_rail') return alongX ? BLOCK.POWER_RAIL_EW_OFF : BLOCK.POWER_RAIL_NS_OFF;
  return null;
}

function neighborDirections(world, x, y, z) {
  const neighbors = [];
  for (const [direction, [dx, , dz]] of Object.entries(RAIL_DIRECTIONS)) {
    const elevation = [0, 1, -1].find((dy) => isRail(world.getBlock(x + dx, y + dy, z + dz)));
    if (elevation != null) neighbors.push({ direction, dy: elevation, id: world.getBlock(x + dx, y + elevation, z + dz) });
  }
  return neighbors;
}

const SLOPE_IDS = Object.freeze({ N: BLOCK.FORGE_RAIL_ASC_N, E: BLOCK.FORGE_RAIL_ASC_E, S: BLOCK.FORGE_RAIL_ASC_S, W: BLOCK.FORGE_RAIL_ASC_W });

function normalShapeId(neighbors, fallbackId) {
  const directions = neighbors.map(({ direction }) => direction);
  const connected = new Set(directions);
  if (connected.size >= 3) return isRailJunction(fallbackId) ? fallbackId : BLOCK.FORGE_RAIL_JUNCTION;
  const raised = neighbors.filter(({ dy }) => dy > 0);
  if (raised.length === 1) {
    const up = raised[0].direction;
    const opposite = { N: 'S', E: 'W', S: 'N', W: 'E' }[up];
    if (connected.size === 1 || connected.has(opposite)) return SLOPE_IDS[up];
  }
  if (connected.size === 2) {
    if (connected.has('N') && connected.has('S')) return BLOCK.FORGE_RAIL_NS;
    if (connected.has('E') && connected.has('W')) return BLOCK.FORGE_RAIL_EW;
    if (connected.has('N') && connected.has('E')) return BLOCK.FORGE_RAIL_NE;
    if (connected.has('E') && connected.has('S')) return BLOCK.FORGE_RAIL_ES;
    if (connected.has('S') && connected.has('W')) return BLOCK.FORGE_RAIL_SW;
    if (connected.has('W') && connected.has('N')) return BLOCK.FORGE_RAIL_WN;
  }
  if (connected.has('N') || connected.has('S')) return BLOCK.FORGE_RAIL_NS;
  if (connected.has('E') || connected.has('W')) return BLOCK.FORGE_RAIL_EW;
  if (BLOCKS[fallbackId]?.slopeDirection) return ['N', 'S'].includes(BLOCKS[fallbackId].slopeDirection) ? BLOCK.FORGE_RAIL_NS : BLOCK.FORGE_RAIL_EW;
  return NORMAL_RAILS.includes(fallbackId) ? fallbackId : BLOCK.FORGE_RAIL_NS;
}

function poweredShapeId(directions, currentId) {
  const powered = BLOCKS[currentId]?.powered;
  const ns = directions.includes('N') || directions.includes('S');
  const ew = directions.includes('E') || directions.includes('W');
  const currentNS = [BLOCK.POWER_RAIL_NS_OFF, BLOCK.POWER_RAIL_NS_ON].includes(currentId);
  const alongNS = ns && !ew ? true : ew && !ns ? false : currentNS;
  if (alongNS) return powered ? BLOCK.POWER_RAIL_NS_ON : BLOCK.POWER_RAIL_NS_OFF;
  return powered ? BLOCK.POWER_RAIL_EW_ON : BLOCK.POWER_RAIL_EW_OFF;
}

export function refreshRailAt(world, x, y, z) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  const current = world.getBlock(x, y, z);
  if (!isRail(current)) return null;
  const directions = neighborDirections(world, x, y, z);
  const next = isPoweredRail(current) ? poweredShapeId(directions.map(({ direction }) => direction), current) : normalShapeId(directions, current);
  if (next === current) return null;
  world.setBlock(x, y, z, next);
  return { x, y, z, previous: current, id: next };
}

export function refreshRailsAround(world, x, y, z) {
  const changes = [];
  const offsets = [[0, 0, 0]];
  for (const [dx, , dz] of Object.values(RAIL_DIRECTIONS)) for (const dy of [-1, 0, 1]) offsets.push([dx, dy, dz]);
  for (const [dx, dy, dz] of offsets) {
    const change = refreshRailAt(world, x + dx, y + dy, z + dz);
    if (change) changes.push(change);
  }
  return changes;
}

export function placeRail(world, x, y, z, itemId, yaw = 0) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  const id = railPlacementId(itemId, yaw);
  if (id == null || world.getBlock(x, y, z) !== BLOCK.AIR || !BLOCKS[world.getBlock(x, y - 1, z)]?.solid) return null;
  world.setBlock(x, y, z, id);
  const changes = [{ x, y, z, previous: BLOCK.AIR, id }];
  changes.push(...refreshRailsAround(world, x, y, z));
  return { x, y, z, id: world.getBlock(x, y, z), changes };
}
