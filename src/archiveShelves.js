import { BLOCK } from './blocks.js';

export const MAX_ARCHIVE_RESONANCE = 15;
export const ARCHIVE_TIER_SIZE = 5;

export const ARCHIVE_SHELF_OFFSETS = Object.freeze((() => {
  const offsets = [];
  for (const dy of [0, 1]) for (let dz = -2; dz <= 2; dz += 1) for (let dx = -2; dx <= 2; dx += 1) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) === 2) offsets.push(Object.freeze({ dx, dy, dz }));
  }
  return offsets;
})());

const inwardStep = (value) => Math.sign(value) * Math.ceil(Math.abs(value) / 2);

export function archiveResonanceTier(shelves) {
  return Math.max(0, Math.min(3, Math.floor((Number(shelves) || 0) / ARCHIVE_TIER_SIZE)));
}

export function runeforgeResonance(world, x, y, z) {
  x = Math.floor(Number(x) || 0); y = Math.floor(Number(y) || 0); z = Math.floor(Number(z) || 0);
  let shelves = 0; let blocked = 0;
  for (const offset of ARCHIVE_SHELF_OFFSETS) {
    if (shelves >= MAX_ARCHIVE_RESONANCE) break;
    const sx = x + offset.dx; const sy = y + offset.dy; const sz = z + offset.dz;
    if (world.getBlock(sx, sy, sz) !== BLOCK.ARCHIVE_SHELF) continue;
    const gapX = x + inwardStep(offset.dx); const gapZ = z + inwardStep(offset.dz);
    if (world.getBlock(gapX, sy, gapZ) !== BLOCK.AIR) { blocked += 1; continue; }
    shelves += 1;
  }
  return { shelves, tier: archiveResonanceTier(shelves), blocked, maximum: MAX_ARCHIVE_RESONANCE };
}
