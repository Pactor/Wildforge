import { BLOCK, BLOCKS } from './blocks.js';

export const COMPOSTABLE_ITEMS = Object.freeze([
  BLOCK.LEAVES,
  BLOCK.FROSTPINE_NEEDLES,
  BLOCK.WINDGRASS,
  BLOCK.SUNPETAL,
  BLOCK.EMBERBELL,
  BLOCK.DUSKMUSHROOM,
  'wheat_seeds',
  'amberroot_seed',
  'wheat',
  'amberroot',
  'tidefiber',
  'raw_glowkelp',
  'raw_ashcap',
  'lumen_spore',
]);

const compostable = new Set(COMPOSTABLE_ITEMS.map(String));

export function isComposter(id) {
  return Boolean(BLOCKS[id]?.composter);
}

export function compostLevel(id) {
  return isComposter(id) ? BLOCKS[id].compostLevel : null;
}

export function composterId(level) {
  return BLOCK.COMPOSTER_0 + Math.max(0, Math.min(7, Math.floor(Number(level) || 0)));
}

export function canCompost(itemId) {
  return compostable.has(String(itemId));
}

export function addCompost(world, x, y, z, itemId) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  const level = compostLevel(world.getBlock(x, y, z));
  if (level == null || level >= 7 || !canCompost(itemId)) return { accepted: false, level, ready: level === 7 };
  const next = level + 1;
  world.setBlock(x, y, z, composterId(next));
  return { accepted: true, level: next, ready: next === 7 };
}

export function extractCompost(world, x, y, z) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  if (compostLevel(world.getBlock(x, y, z)) !== 7) return null;
  world.setBlock(x, y, z, BLOCK.COMPOSTER_0);
  return { id: 'rich_compost', count: 1 };
}

export function breakComposter(world, x, y, z) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  if (!isComposter(world.getBlock(x, y, z))) return null;
  world.setBlock(x, y, z, BLOCK.AIR);
  return { x, y, z, item: BLOCK.COMPOSTER_0 };
}
