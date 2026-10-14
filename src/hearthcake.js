import { BLOCK, BLOCKS } from './blocks.js';

export const HEARTHCAKE_STATES = Object.freeze([
  BLOCK.HEARTHCAKE_FULL,
  BLOCK.HEARTHCAKE_BITE_1,
  BLOCK.HEARTHCAKE_BITE_2,
  BLOCK.HEARTHCAKE_BITE_3,
  BLOCK.HEARTHCAKE_BITE_4,
  BLOCK.HEARTHCAKE_BITE_5,
  BLOCK.HEARTHCAKE_BITE_6,
]);
export const HEARTHCAKE_SERVINGS = HEARTHCAKE_STATES.length;

export const isHearthcake = (id) => HEARTHCAKE_STATES.includes(id);
export const hearthcakeBites = (id) => isHearthcake(id) ? HEARTHCAKE_STATES.indexOf(id) : null;

export function hearthcakeBounds(id) {
  const bites = hearthcakeBites(id);
  if (bites == null) return null;
  const left = 0.08 + bites * (0.84 / HEARTHCAKE_SERVINGS);
  return [left, 0, 0.12, 0.92, 0.5, 0.88];
}

export function eatHearthcake(world, x, y, z, survival) {
  const id = world?.getBlock?.(x, y, z);
  const bites = hearthcakeBites(id);
  if (bites == null || typeof survival?.eat !== 'function' || !survival.eat(2, 0.5)) return null;
  const finished = bites === HEARTHCAKE_SERVINGS - 1;
  world.setBlock(x, y, z, finished ? BLOCK.AIR : HEARTHCAKE_STATES[bites + 1]);
  return { bite: bites + 1, remaining: HEARTHCAKE_SERVINGS - bites - 1, finished };
}

export function detachUnsupportedHearthcake(world, x, y, z) {
  const cakeY = y + 1;
  const id = world?.getBlock?.(x, cakeY, z);
  if (!isHearthcake(id) || BLOCKS[world.getBlock(x, y, z)]?.solid) return null;
  world.setBlock(x, cakeY, z, BLOCK.AIR);
  return { x, y: cakeY, z, id };
}
