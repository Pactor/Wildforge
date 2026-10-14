import { BLOCKS } from './blocks.js';

export const PANE_THICKNESS = 0.125;
const CARDINALS = Object.freeze([
  Object.freeze({ key: 'west', dx: -1, dz: 0 }),
  Object.freeze({ key: 'east', dx: 1, dz: 0 }),
  Object.freeze({ key: 'north', dx: 0, dz: -1 }),
  Object.freeze({ key: 'south', dx: 0, dz: 1 }),
]);

export function paneConnectable(id) {
  const definition = BLOCKS[id];
  if (!definition) return false;
  if (definition.pane) return true;
  return Boolean(definition.solid && !definition.model && !definition.door && !definition.trapdoor && !definition.bed);
}

export function paneConnections(world, x, y, z) {
  const connections = {};
  for (const { key, dx, dz } of CARDINALS) connections[key] = paneConnectable(world.getBlock(x + dx, y, z + dz));
  return Object.freeze(connections);
}

export function paneBoxesForConnections(connections = {}) {
  const half = PANE_THICKNESS / 2;
  const boxes = [[0.5 - half, 0, 0.5 - half, 0.5 + half, 1, 0.5 + half]];
  if (connections.west) boxes.push([0, 0, 0.5 - half, 0.5, 1, 0.5 + half]);
  if (connections.east) boxes.push([0.5, 0, 0.5 - half, 1, 1, 0.5 + half]);
  if (connections.north) boxes.push([0.5 - half, 0, 0, 0.5 + half, 1, 0.5]);
  if (connections.south) boxes.push([0.5 - half, 0, 0.5, 0.5 + half, 1, 1]);
  return boxes;
}

export const paneBoxes = (world, x, y, z) => paneBoxesForConnections(paneConnections(world, x, y, z));

