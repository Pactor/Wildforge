import { BLOCK } from './blocks.js';
import { itemDefinition } from './inventory.js';

export const STONECUTTING_RECIPES = Object.freeze([
  { id: 'stone_slabs', name: 'Stone Slabs ×2', input: BLOCK.STONE, inputCount: 1, output: BLOCK.STONE_SLAB, count: 2 },
  { id: 'stone_stairs', name: 'Stone Stairs', input: BLOCK.STONE, inputCount: 1, output: 'stone_stairs', count: 1 },
  { id: 'stone_wall', name: 'Stone Wall', input: BLOCK.STONE, inputCount: 1, output: BLOCK.STONE_WALL, count: 1 },
  { id: 'polished_stone', name: 'Polished Stone', input: BLOCK.STONE, inputCount: 1, output: BLOCK.POLISHED_STONE, count: 1 },
  { id: 'chiseled_stone', name: 'Chiseled Stone', input: BLOCK.STONE, inputCount: 1, output: BLOCK.CHISELED_STONE, count: 1 },
  { id: 'polished_to_chiseled', name: 'Chiseled Stone', input: BLOCK.POLISHED_STONE, inputCount: 1, output: BLOCK.CHISELED_STONE, count: 1 },
  { id: 'chiseled_rootstone', name: 'Chiseled Rootstone', input: BLOCK.ROOTSTONE, inputCount: 1, output: BLOCK.CHISELED_ROOTSTONE, count: 1 },
  { id: 'tidebrick_mosaic', name: 'Tidebrick Mosaic ×4', input: BLOCK.TIDEBRICK, inputCount: 4, supplements: { lumen_shard: 1 }, output: BLOCK.TIDEBRICK_MOSAIC, count: 4 },
]);

const byId = new Map(STONECUTTING_RECIPES.map((recipe) => [recipe.id, recipe]));

export function availableStonecuts(inventory) {
  return STONECUTTING_RECIPES.map((recipe) => ({
    ...recipe,
    available: inventory?.count(recipe.input) || 0,
    affordable: Boolean(inventory && inventory.count(recipe.input) >= recipe.inputCount
      && Object.entries(recipe.supplements || {}).every(([id, count]) => inventory.count(id) >= count)),
  }));
}

export function applyStonecut(inventory, recipeId) {
  const recipe = byId.get(String(recipeId));
  if (!recipe || !itemDefinition(recipe.input) || !itemDefinition(recipe.output)) return null;
  const requirements = { [recipe.input]: recipe.inputCount, ...(recipe.supplements || {}) };
  if (!inventory?.has(requirements)) return null;
  const removed = [];
  for (const [id, count] of Object.entries(requirements)) {
    if (!inventory.remove(id, count)) {
      for (const [restoreId, restoreCount] of removed) inventory.add(restoreId, restoreCount);
      return null;
    }
    removed.push([id, count]);
  }
  if (!inventory.add(recipe.output, recipe.count)) {
    for (const [id, count] of removed) inventory.add(id, count);
    return null;
  }
  return { id: recipe.id, output: recipe.output, count: recipe.count };
}
