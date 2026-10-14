import { BLOCKS } from './blocks.js';
import { itemDefinition } from './inventory.js';
import { enchantmentLevel } from './enchanting.js';

export function activeMiningTool(inventory, selectedId = null) {
  const definition = itemDefinition(selectedId);
  if (definition?.miningKind && definition.miningSpeed > 0 && inventory.count(selectedId) > 0) {
    const enchantments = inventory.enchantments(selectedId);
    const swift = enchantmentLevel(enchantments, 'swift');
    return { id: selectedId, name: definition.name, kind: definition.miningKind, speed: definition.miningSpeed * (1 + swift * 0.18), tier: definition.miningTier || 0, enchantments };
  }
  return { id: 'hand', name: 'Bare Hands', kind: 'hand', speed: 1, tier: 0 };
}

export function activeCombatTool(inventory, selectedId = null) {
  const tools = {
    wooden_sword: { name: 'Wooden Sword', damage: 4, recovery: 0.62, knockback: 3.1 },
    stone_sword: { name: 'Stone Sword', damage: 5, recovery: 0.58, knockback: 3.25 },
    iron_sword: { name: 'Iron Sword', damage: 7, recovery: 0.54, knockback: 3.5 },
    wooden_pickaxe: { name: 'Wooden Pickaxe', damage: 3, recovery: 0.78, knockback: 2.35 },
    stone_pickaxe: { name: 'Stone Pickaxe', damage: 4, recovery: 0.73, knockback: 2.5 },
    iron_pickaxe: { name: 'Iron Pickaxe', damage: 5, recovery: 0.68, knockback: 2.65 },
  };
  const tool = tools[selectedId];
  if (tool && inventory.count(selectedId) > 0) {
    const keen = enchantmentLevel(inventory.enchantments(selectedId), 'keen');
    return { id: selectedId, ...tool, damage: tool.damage + keen * 1.25 };
  }
  const definition = itemDefinition(selectedId);
  if ((definition?.category === 'tool' || definition?.category === 'weapon') && inventory.count(selectedId) > 0) {
    return {
      id: selectedId,
      name: definition.name,
      damage: (definition.attackDamage || 2.5) + enchantmentLevel(inventory.enchantments(selectedId), 'keen') * 1.25,
      recovery: definition.attackRecovery || 0.74,
      knockback: definition.attackKnockback || 2.4,
    };
  }
  return { id: 'hand', name: 'Bare Hands', damage: 2, recovery: 0.48, knockback: 2 };
}

export function canHarvestBlock(blockId, inventory, selectedId = null) {
  const block = BLOCKS[blockId];
  if (!block?.harvestTier) return true;
  const tool = activeMiningTool(inventory, selectedId);
  return tool.kind === block.tool && tool.tier >= block.harvestTier;
}

export function breakDuration(blockId, inventory, selectedId = null) {
  const block = BLOCKS[blockId];
  if (!block || block.breakable === false || block.hardness <= 0) return Infinity;
  const tool = activeMiningTool(inventory, selectedId);
  const correctTool = block.tool == null || tool.kind === block.tool;
  const speed = correctTool ? tool.speed : 1;
  const penalty = block.tool && !correctTool ? 1.65 : 1;
  return Math.max(0.06, block.hardness * 0.72 * penalty / speed);
}
