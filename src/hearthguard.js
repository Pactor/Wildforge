import { BLOCK } from './blocks.js';

export const MAX_HEARTHGUARDS = 8;

const point = (x, y, z) => ({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) });

export function hearthguardPlan(world, corePosition) {
  if (!world || typeof world.getBlock !== 'function' || !corePosition) return null;
  const core = point(corePosition.x, corePosition.y, corePosition.z);
  if (world.getBlock(core.x, core.y, core.z) !== BLOCK.HEARTHGUARD_CORE) return null;
  for (const [axis, arms] of [
    ['x', [[-1, 0], [1, 0]]],
    ['z', [[0, -1], [0, 1]]],
  ]) {
    const parts = [
      core,
      point(core.x, core.y - 1, core.z),
      point(core.x + arms[0][0], core.y - 1, core.z + arms[0][1]),
      point(core.x + arms[1][0], core.y - 1, core.z + arms[1][1]),
      point(core.x, core.y - 2, core.z),
    ];
    if (parts.slice(1).every((part) => world.getBlock(part.x, part.y, part.z) === BLOCK.FORGED_IRON_BLOCK)) {
      return { axis, core, parts, spawn: { x: core.x + 0.5, y: core.y - 2, z: core.z + 0.5 } };
    }
  }
  return null;
}

export function awakenHearthguard(world, corePosition, spawn) {
  const plan = hearthguardPlan(world, corePosition);
  if (!plan || typeof spawn !== 'function') return null;
  const entity = spawn(plan.spawn, plan);
  if (!entity) return null;
  const consumed = world.setBlocks(plan.parts.map((part) => ({ ...part, id: BLOCK.AIR })));
  if (consumed !== plan.parts.length) return null;
  return { entity, ...plan };
}
