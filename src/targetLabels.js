import { BLOCK, BLOCKS } from './blocks.js';

const TIER_NAMES = ['ANY TOOL', 'STONE TIER', 'IRON TIER', 'EMBERITE TIER', 'VOIDGLASS TIER'];

export function blockTargetLabel(id) {
  const definition = BLOCKS[Number(id)];
  if (!definition) return null;
  const details = [];
  if (Number(id) === BLOCK.CHEST || Number(id) === BLOCK.WAYVAULT_CHEST || definition.storageContainer) {
    details.push('RIGHT-CLICK / E TO OPEN');
  }
  if (definition.tool) details.push(`${String(definition.tool).toUpperCase()} WORKS BEST`);
  if (Number.isInteger(definition.harvestTier) && definition.harvestTier > 0) {
    details.push(`${TIER_NAMES[definition.harvestTier] || `TIER ${definition.harvestTier}`} REQUIRED`);
  }
  return {
    name: definition.name,
    detail: details.join(' · '),
  };
}
