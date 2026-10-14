import { coordinateRandom, seedFromString } from './noise.js';
import { itemDefinition } from './inventory.js';

export const ENCHANTMENTS = Object.freeze({
  keen: { name: 'Keen Edge', maximum: 3, categories: ['weapon', 'tool'] },
  swift: { name: 'Swiftwork', maximum: 3, miningKinds: ['pickaxe', 'axe', 'shovel'] },
  enduring: { name: 'Enduring', maximum: 3, categories: ['weapon', 'tool', 'armor', 'shield'] },
  warding: { name: 'Warding', maximum: 3, categories: ['armor', 'shield'] },
});

export const ROMAN_LEVELS = Object.freeze(['', 'I', 'II', 'III']);

export function enchantmentLevel(enchantments, id) {
  return Math.max(0, Math.min(ENCHANTMENTS[id]?.maximum || 0,
    Math.floor(Number(enchantments?.find((entry) => entry?.id === id)?.level) || 0)));
}

export function enchantmentLabel(entry) {
  const definition = ENCHANTMENTS[entry?.id];
  const level = enchantmentLevel([entry], entry?.id);
  return definition && level > 0 ? `${definition.name} ${ROMAN_LEVELS[level]}` : '';
}

export function availableEnchantments(itemId) {
  const item = itemDefinition(itemId);
  if (!item?.durability) return [];
  return Object.entries(ENCHANTMENTS)
    .filter(([, enchantment]) => enchantment.categories?.includes(item.category)
      || enchantment.miningKinds?.includes(item.miningKind))
    .map(([id]) => id);
}

function offerSeed(seed, nonce, itemId, tier) {
  return seedFromString(`${seed}:${nonce}:${itemId}:${tier}`);
}

export function runeforgeOfferTuning(shelves = 0) {
  const resonance = Math.max(0, Math.min(15, Math.floor(Number(shelves) || 0)));
  const tier = Math.floor(resonance / 5);
  return {
    resonance,
    tier,
    costs: [2, 4, 7].map((cost) => Math.max(1, cost - tier)),
    reagents: [1, 2, 3].map((count) => Math.max(1, count - Math.floor(tier / 2))),
  };
}

export class RuneforgeState {
  constructor(seed = 1, serialized = null) {
    this.seed = Number(seed) || 1;
    this.nonce = Math.max(0, Math.floor(Number(serialized?.nonce) || 0));
  }

  offers(itemId, enchantments = [], shelves = 0) {
    const eligible = availableEnchantments(itemId)
      .filter((id) => enchantmentLevel(enchantments, id) < ENCHANTMENTS[id].maximum);
    if (!eligible.length) return [];
    const tuning = runeforgeOfferTuning(shelves);
    const used = new Set();
    return tuning.costs.map((cost, tier) => {
      const candidates = eligible.filter((id) => !used.has(id));
      const pool = candidates.length ? candidates : eligible;
      const random = coordinateRandom(this.nonce + tier * 19, seedFromString(String(itemId)), offerSeed(this.seed, this.nonce, itemId, tier), 151);
      const id = pool[Math.floor(random * pool.length) % pool.length];
      used.add(id);
      const current = enchantmentLevel(enchantments, id);
      const targetLevel = Math.min(ENCHANTMENTS[id].maximum, Math.max(current + 1, tier + 1 + tuning.tier));
      return { id, level: targetLevel, cost, reagent: tuning.reagents[tier], tier, resonance: tuning.resonance };
    });
  }

  apply(inventory, experience, itemId, offer, shelves = 0) {
    if (!offer || experience.level < offer.cost || inventory.count('lumen_shard') < offer.reagent) return false;
    const current = this.offers(itemId, inventory.enchantments(itemId), shelves);
    const valid = current.some((candidate) => candidate.id === offer.id && candidate.level === offer.level
      && candidate.cost === offer.cost && candidate.reagent === offer.reagent && candidate.tier === offer.tier && candidate.resonance === offer.resonance);
    if (!valid || !inventory.applyEnchantment(itemId, offer.id, offer.level)) return false;
    if (!inventory.remove('lumen_shard', offer.reagent)) return false;
    if (!experience.spendLevels(offer.cost)) {
      inventory.add('lumen_shard', offer.reagent);
      return false;
    }
    this.nonce += 1;
    return true;
  }

  serialize() {
    return { nonce: this.nonce };
  }
}
