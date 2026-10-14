import { BLOCK, BLOCKS } from './blocks.js';

export const MOSSWEAVE_BLOCKS = Object.freeze([
  BLOCK.MOSSWEAVE_NATURAL, BLOCK.MOSSWEAVE_SUN, BLOCK.MOSSWEAVE_EMBER, BLOCK.MOSSWEAVE_FROST, BLOCK.MOSSWEAVE_HOLLOW,
]);
export const MOSSWEAVE_CARPETS = Object.freeze([
  BLOCK.MOSSWEAVE_CARPET_NATURAL, BLOCK.MOSSWEAVE_CARPET_SUN, BLOCK.MOSSWEAVE_CARPET_EMBER, BLOCK.MOSSWEAVE_CARPET_FROST, BLOCK.MOSSWEAVE_CARPET_HOLLOW,
]);
export const MOSSWEAVE_PALETTES = Object.freeze(['natural', 'sun', 'ember', 'frost', 'hollow']);

export function isMossweave(id) { return MOSSWEAVE_BLOCKS.includes(Number(id)); }
export function isMossweaveCarpet(id) { return MOSSWEAVE_CARPETS.includes(Number(id)); }

export function mossweaveFamily(palette) {
  const index = MOSSWEAVE_PALETTES.indexOf(String(palette));
  return index < 0 ? null : { palette: MOSSWEAVE_PALETTES[index], block: MOSSWEAVE_BLOCKS[index], carpet: MOSSWEAVE_CARPETS[index] };
}

export function detachUnsupportedMossweaveCarpet(world, supportX, supportY, supportZ) {
  const x = Math.floor(supportX); const y = Math.floor(supportY) + 1; const z = Math.floor(supportZ);
  const id = world.getBlock(x, y, z);
  if (!isMossweaveCarpet(id) || BLOCKS[world.getBlock(x, y - 1, z)]?.solid) return null;
  world.setBlock(x, y, z, BLOCK.AIR);
  return { x, y, z, id };
}
