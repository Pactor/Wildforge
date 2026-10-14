import { itemDefinition } from './inventory.js';

export const MAX_RUNEGRIND_EXPERIENCE = 24;

export function runegrindValue(enchantments = []) {
  const levels = (Array.isArray(enchantments) ? enchantments : []).reduce((total, entry) => {
    const level = Math.max(0, Math.min(3, Math.floor(Number(entry?.level) || 0)));
    return total + level;
  }, 0);
  return Math.min(MAX_RUNEGRIND_EXPERIENCE, levels * 2);
}

export function runegrindEligible(inventory) {
  if (!inventory) return [];
  return inventory.entries().flatMap(([id, count]) => {
    const definition = itemDefinition(id);
    const enchantments = inventory.enchantments(id);
    return definition?.durability && enchantments.length
      ? [{ id, count, durability: inventory.durability(id), enchantments, experience: runegrindValue(enchantments) }]
      : [];
  });
}

export function applyRunegrind(inventory, experience, id) {
  const definition = itemDefinition(id);
  const enchantments = inventory?.enchantments(id) || [];
  const value = runegrindValue(enchantments);
  if (!definition?.durability || !experience?.add || value <= 0) return null;
  const instance = inventory.takeInstance(id);
  if (!instance) return null;
  if (!inventory.addInstance(id, instance.durability, [])) {
    inventory.addInstance(id, instance.durability, instance.enchantments);
    return null;
  }
  const reward = experience.add(value);
  return {
    id,
    durability: instance.durability,
    removed: enchantments.map((entry) => ({ ...entry })),
    experience: reward.added,
  };
}
