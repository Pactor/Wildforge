import { itemDefinition } from './inventory.js';
import { enchantmentLevel } from './enchanting.js';

export const EQUIPMENT_SLOTS = Object.freeze(['head', 'chest', 'legs', 'feet']);

export class EquipmentState {
  constructor(serialized = null) {
    this.slots = Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, null]));
    this.conditions = Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, null]));
    this.enchantments = Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, []]));
    this.offhand = null;
    this.offhandCondition = null;
    this.offhandEnchantments = [];
    this.cosmetic = itemDefinition(serialized?.cosmetic)?.category === 'cosmetic' ? serialized.cosmetic : null;
    for (const slot of EQUIPMENT_SLOTS) {
      const id = serialized?.slots?.[slot];
      const definition = id ? itemDefinition(id) : null;
      if (definition?.category === 'armor' && definition.slot === slot) {
        this.slots[slot] = id;
        const saved = Number(serialized?.conditions?.[slot]);
        this.conditions[slot] = Number.isFinite(saved) ? Math.max(1, Math.min(definition.durability, Math.floor(saved))) : definition.durability;
        this.enchantments[slot] = Array.isArray(serialized?.enchantments?.[slot]) ? serialized.enchantments[slot].map((entry) => ({ ...entry })) : [];
      }
    }
    const offhandDefinition = itemDefinition(serialized?.offhand);
    if (offhandDefinition?.category === 'shield') {
      this.offhand = serialized.offhand;
      const saved = Number(serialized?.offhandCondition);
      this.offhandCondition = Number.isFinite(saved)
        ? Math.max(1, Math.min(offhandDefinition.durability, Math.floor(saved)))
        : offhandDefinition.durability;
      this.offhandEnchantments = Array.isArray(serialized?.offhandEnchantments) ? serialized.offhandEnchantments.map((entry) => ({ ...entry })) : [];
    }
  }

  equip(inventory, id) {
    const definition = itemDefinition(id);
    if (definition?.category !== 'armor' || !EQUIPMENT_SLOTS.includes(definition.slot)) return false;
    const instance = inventory.takeInstance(id);
    if (!instance) return false;
    const previous = this.slots[definition.slot];
    if (previous) inventory.addInstance(previous, this.conditions[definition.slot], this.enchantments[definition.slot]);
    this.slots[definition.slot] = id;
    this.conditions[definition.slot] = instance.durability ?? definition.durability;
    this.enchantments[definition.slot] = instance.enchantments || [];
    return true;
  }

  unequip(inventory, slot) {
    if (!EQUIPMENT_SLOTS.includes(slot) || !this.slots[slot]) return false;
    inventory.addInstance(this.slots[slot], this.conditions[slot], this.enchantments[slot]);
    this.slots[slot] = null;
    this.conditions[slot] = null;
    this.enchantments[slot] = [];
    return true;
  }

  condition(slot) {
    const id = this.slots[slot];
    const maximum = itemDefinition(id)?.durability;
    const remaining = this.conditions[slot];
    if (!id || !maximum || !Number.isFinite(remaining)) return null;
    return { remaining, maximum, ratio: remaining / maximum };
  }

  equipShield(inventory, id) {
    const definition = itemDefinition(id);
    if (definition?.category !== 'shield') return false;
    const instance = inventory.takeInstance(id);
    if (!instance) return false;
    if (this.offhand) inventory.addInstance(this.offhand, this.offhandCondition, this.offhandEnchantments);
    this.offhand = id;
    this.offhandCondition = instance.durability ?? definition.durability;
    this.offhandEnchantments = instance.enchantments || [];
    return true;
  }

  unequipShield(inventory) {
    if (!this.offhand) return false;
    inventory.addInstance(this.offhand, this.offhandCondition, this.offhandEnchantments);
    this.offhand = null;
    this.offhandCondition = null;
    this.offhandEnchantments = [];
    return true;
  }

  shieldCondition() {
    const maximum = itemDefinition(this.offhand)?.durability;
    if (!this.offhand || !maximum || !Number.isFinite(this.offhandCondition)) return null;
    return { remaining: this.offhandCondition, maximum, ratio: this.offhandCondition / maximum };
  }

  hasShield() {
    return Boolean(this.offhand && this.offhandCondition > 0);
  }

  climateInsulation() {
    const insulated = Object.values(this.slots).filter((id) => typeof id === 'string' && id.startsWith('hide_')).length;
    return insulated / EQUIPMENT_SLOTS.length;
  }

  equipCosmetic(inventory, id) {
    if (itemDefinition(id)?.category !== 'cosmetic' || inventory.count(id) <= 0) return false;
    if (!inventory.remove(id, 1)) return false;
    if (this.cosmetic) inventory.add(this.cosmetic, 1);
    this.cosmetic = id;
    return true;
  }

  unequipCosmetic(inventory) {
    if (!this.cosmetic) return false;
    inventory.add(this.cosmetic, 1);
    this.cosmetic = null;
    return true;
  }

  blockDamage(amount, blocking = false) {
    if (amount <= 0 || !blocking || !this.hasShield()) return { damage: Math.max(0, amount), blocked: 0, wear: 0, broke: null };
    const warding = enchantmentLevel(this.offhandEnchantments, 'warding');
    const damage = Math.max(1, Math.ceil(amount * Math.max(0.15, 0.35 - warding * 0.05)));
    const blocked = Math.max(0, amount - damage);
    const wear = Math.max(1, Math.ceil(amount));
    if (!(enchantmentLevel(this.offhandEnchantments, 'enduring') > 0
      && Math.random() < enchantmentLevel(this.offhandEnchantments, 'enduring') / (enchantmentLevel(this.offhandEnchantments, 'enduring') + 2))) this.offhandCondition -= wear;
    let broke = null;
    if (this.offhandCondition <= 0) {
      broke = this.offhand;
      this.offhand = null;
      this.offhandCondition = null;
      this.offhandEnchantments = [];
    }
    return { damage, blocked, wear, broke };
  }

  armorPoints() {
    return EQUIPMENT_SLOTS.reduce((total, slot) => total + (itemDefinition(this.slots[slot])?.armor || 0)
      + enchantmentLevel(this.enchantments[slot], 'warding'), 0);
  }

  reduceDamage(amount) {
    if (amount <= 0) return 0;
    const reduction = Math.min(0.8, this.armorPoints() * 0.04);
    return Math.max(1, Math.ceil(amount * (1 - reduction)));
  }

  absorbDamage(amount) {
    const damage = this.reduceDamage(amount);
    const broken = [];
    if (amount <= 0 || this.armorPoints() <= 0) return { damage, wear: 0, broken };
    const wear = Math.max(1, Math.ceil(amount / 4));
    for (const slot of EQUIPMENT_SLOTS) {
      if (!this.slots[slot]) continue;
      const enduring = enchantmentLevel(this.enchantments[slot], 'enduring');
      if (!(enduring > 0 && Math.random() < enduring / (enduring + 2))) this.conditions[slot] -= wear;
      if (this.conditions[slot] > 0) continue;
      broken.push(this.slots[slot]);
      this.slots[slot] = null;
      this.conditions[slot] = null;
      this.enchantments[slot] = [];
    }
    return { damage, wear, broken };
  }

  drainAll() {
    const drained = [];
    for (const slot of EQUIPMENT_SLOTS) {
      if (!this.slots[slot]) continue;
      drained.push({
        id: this.slots[slot],
        count: 1,
        durability: this.conditions[slot],
        enchantments: this.enchantments[slot].map((entry) => ({ ...entry })),
      });
      this.slots[slot] = null;
      this.conditions[slot] = null;
      this.enchantments[slot] = [];
    }
    if (this.offhand) {
      drained.push({
        id: this.offhand,
        count: 1,
        durability: this.offhandCondition,
        enchantments: this.offhandEnchantments.map((entry) => ({ ...entry })),
      });
      this.offhand = null;
      this.offhandCondition = null;
      this.offhandEnchantments = [];
    }
    if (this.cosmetic) {
      drained.push({ id: this.cosmetic, count: 1 });
      this.cosmetic = null;
    }
    return drained;
  }

  serialize() {
    return {
      slots: { ...this.slots },
      conditions: { ...this.conditions },
      enchantments: Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, this.enchantments[slot].map((entry) => ({ ...entry }))])),
      offhand: this.offhand,
      offhandCondition: this.offhandCondition,
      offhandEnchantments: this.offhandEnchantments.map((entry) => ({ ...entry })),
      cosmetic: this.cosmetic,
    };
  }
}
