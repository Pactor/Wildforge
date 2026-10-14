import { itemDefinition } from './inventory.js';

const GEAR_SUFFIXES = Object.freeze(['pickaxe', 'axe', 'shovel', 'sword', 'hoe', 'helmet', 'chestplate', 'leggings', 'boots']);

export const SMITHING_UPGRADES = Object.freeze(GEAR_SUFFIXES.flatMap((suffix) => [
  { id: `iron_${suffix}_to_emberite`, input: `iron_${suffix}`, material: 'emberite_ingot', output: `emberite_${suffix}`, tier: 1 },
  { id: `emberite_${suffix}_to_voidglass`, input: `emberite_${suffix}`, material: 'voidglass_shard', output: `voidglass_${suffix}`, tier: 2 },
]));

const byInput = new Map(SMITHING_UPGRADES.map((upgrade) => [upgrade.input, upgrade]));

export function smithingUpgradeFor(id) {
  const upgrade = byInput.get(String(id));
  return upgrade ? { ...upgrade } : null;
}

export function availableSmithingUpgrades(inventory) {
  if (!inventory) return [];
  return inventory.entries().flatMap(([id, count]) => {
    const upgrade = smithingUpgradeFor(id);
    return upgrade ? [{ ...upgrade, count, affordable: inventory.count(upgrade.material) > 0 }] : [];
  });
}

export function applySmithingUpgrade(inventory, inputId) {
  const upgrade = smithingUpgradeFor(inputId);
  const inputDefinition = itemDefinition(inputId);
  const outputDefinition = itemDefinition(upgrade?.output);
  if (!upgrade || !inputDefinition?.durability || !outputDefinition?.durability
    || inventory.count(inputId) <= 0 || inventory.count(upgrade.material) <= 0) return null;

  const instance = inventory.takeInstance(inputId);
  if (!instance) return null;
  if (!inventory.remove(upgrade.material, 1)) {
    inventory.addInstance(instance.id, instance.durability, instance.enchantments);
    return null;
  }
  const ratio = Math.max(1 / inputDefinition.durability, Math.min(1, (instance.durability || inputDefinition.durability) / inputDefinition.durability));
  const durability = Math.max(1, Math.round(outputDefinition.durability * ratio));
  if (!inventory.addInstance(upgrade.output, durability, instance.enchantments)) {
    inventory.add(upgrade.material, 1);
    inventory.addInstance(instance.id, instance.durability, instance.enchantments);
    return null;
  }
  return {
    ...upgrade,
    durability,
    maximum: outputDefinition.durability,
    ratio,
    enchantments: (instance.enchantments || []).map((entry) => ({ ...entry })),
  };
}
