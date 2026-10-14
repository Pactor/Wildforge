import { coordinateRandom, seedFromString } from './noise.js';
import { BLOCK } from './blocks.js';

const COMMON_BUYS = Object.freeze([
  { id: 'wheat', count: 10, output: { id: 'hearthmark', count: 1 } },
  { id: 'raw_meat', count: 5, output: { id: 'hearthmark', count: 1 } },
  { id: 'tidefiber', count: 7, output: { id: 'hearthmark', count: 1 } },
  { id: 'shadow_shard', count: 4, output: { id: 'hearthmark', count: 2 } },
]);

const STOCK = Object.freeze({
  provisioner: [
    { id: 'hearthmark', count: 1, output: { id: 'bread', count: 3 } },
    { id: 'hearthmark', count: 2, output: { id: 'amberroot_seed', count: 2 } },
    { id: 'hearthmark', count: 3, output: { id: 'rich_compost', count: 2 } },
    { id: 'hearthmark', count: 9, output: { id: 'moss_bed', count: 1 } },
  ],
  delver: [
    { id: 'hearthmark', count: 3, output: { id: 'coal', count: 8 } },
    { id: 'hearthmark', count: 5, output: { id: 'iron_ingot', count: 3 } },
    { id: 'hearthmark', count: 7, output: { id: 'lumen_shard', count: 2 } },
    { id: 'hearthmark', count: 13, output: { id: 'emberite_ingot', count: 2 } },
  ],
  outfitter: [
    { id: 'hearthmark', count: 2, output: { id: 'arrow', count: 12 } },
    { id: 'hearthmark', count: 5, output: { id: 'tough_hide', count: 4 } },
    { id: 'hearthmark', count: 8, output: { id: 'windbow', count: 1 } },
    { id: 'hearthmark', count: 12, output: { id: 'trail_saddle', count: 1 } },
  ],
  mechanist: [
    { id: 'hearthmark', count: 3, output: { id: BLOCK.SUNWIRE_OFF, count: 8 } },
    { id: 'hearthmark', count: 5, output: { id: 'spark_relay', count: 1 } },
    { id: 'hearthmark', count: 8, output: { id: 'powered_rail', count: 6 } },
    { id: 'hearthmark', count: 14, output: { id: 'pulse_sequencer', count: 1 } },
  ],
  railwright: [
    { id: 'hearthmark', count: 3, output: { id: 'forge_rail', count: 12 } },
    { id: 'hearthmark', count: 4, output: { id: 'forge_coupler', count: 2 } },
    { id: 'hearthmark', count: 10, output: { id: 'cargo_cart', count: 1 } },
    { id: 'hearthmark', count: 15, output: { id: 'freight_loader', count: 1 } },
  ],
  herbalist: [
    { id: 'hearthmark', count: 2, output: { id: 'raw_ashcap', count: 4 } },
    { id: 'hearthmark', count: 4, output: { id: 'lumen_spore', count: 3 } },
    { id: 'hearthmark', count: 7, output: { id: 'windstep_tonic', count: 1 } },
    { id: 'hearthmark', count: 12, output: { id: 'hearthmend_tonic', count: 1 } },
  ],
});

export const TRADER_TITLES = Object.freeze({
  provisioner: 'Hearthstead Provisioner',
  delver: 'Hearthstead Delver',
  outfitter: 'Hearthstead Outfitter',
  mechanist: 'Hearthstead Mechanist',
  railwright: 'Hearthstead Railwright',
  herbalist: 'Hearthstead Herbalist',
});

export const REPUTATION_TIERS = Object.freeze([
  { id: 'stranger', name: 'Stranger', minimum: 0 },
  { id: 'neighbor', name: 'Neighbor', minimum: 8 },
  { id: 'trusted', name: 'Trusted', minimum: 24 },
  { id: 'hearthkin', name: 'Hearthkin', minimum: 48 },
]);

function traderSeed(seed, key) {
  return (Number(seed) ^ seedFromString(String(key))) >>> 0;
}

export function offersForTrader(seed, key) {
  const mixed = traderSeed(seed, key);
  const professions = Object.keys(STOCK);
  const profession = professions[Math.floor(coordinateRandom(mixed, 0, mixed, 443) * professions.length) % professions.length];
  const buyOffset = Math.floor(coordinateRandom(mixed, 1, mixed, 449) * COMMON_BUYS.length);
  const buys = [0, 1].map((index) => COMMON_BUYS[(buyOffset + index) % COMMON_BUYS.length]);
  return {
    profession,
    title: TRADER_TITLES[profession],
    offers: [...buys, ...STOCK[profession]].map((offer, index) => ({
      ...offer,
      key: `${profession}:${index}`,
      maximumUses: 8,
      requiredReputation: index < 3 ? 0 : index === 3 ? 8 : index === 4 ? 24 : 48,
    })),
  };
}

export function reputationTier(reputation = 0) {
  const value = Math.max(0, Math.floor(Number(reputation) || 0));
  return [...REPUTATION_TIERS].reverse().find((tier) => value >= tier.minimum) || REPUTATION_TIERS[0];
}

export function nextReputationTier(reputation = 0) {
  const value = Math.max(0, Math.floor(Number(reputation) || 0));
  return REPUTATION_TIERS.find((tier) => tier.minimum > value) || null;
}

export function pricedOffer(offer, reputation = 0, favor = 0) {
  if (!offer) return null;
  const tierIndex = REPUTATION_TIERS.indexOf(reputationTier(reputation));
  const result = { ...offer, output: { ...offer.output } };
  const favorLevel = Math.max(0, Math.min(5, Math.floor(Number(favor) || 0)));
  if (result.id === 'hearthmark') result.count = Math.max(1, result.count - tierIndex - Math.floor(favorLevel / 2));
  if (result.output.id === 'hearthmark') result.output.count += Math.floor(tierIndex / 2) + (favorLevel >= 4 ? 1 : 0);
  return result;
}

export function wayfarerSchedule(seed, settlementKey, worldTime, features) {
  const trader = offersForTrader(seed, settlementKey);
  const time = ((Number(worldTime) || 0) % 1 + 1) % 1;
  const home = features?.home || features?.trader;
  const commons = features?.trader || home;
  const work = trader.profession === 'delver' || trader.profession === 'mechanist' ? features?.workshop
    : trader.profession === 'provisioner' || trader.profession === 'herbalist' ? features?.garden
      : trader.profession === 'railwright' ? features?.railYard : features?.workshop;
  if (time < 0.25 || time >= 0.88) return { phase: 'rest', label: 'Resting at home', target: home, tradingOpen: false, speedMultiplier: 0.75 };
  if (time < 0.34) return { phase: 'breakfast', label: 'Breakfast at the commons', target: commons, tradingOpen: true, speedMultiplier: 0.9 };
  if (time < 0.67) return { phase: 'work', label: `Working as ${trader.title.replace('Hearthstead ', '')}`, target: work || commons, tradingOpen: true, speedMultiplier: 1 };
  if (time < 0.78) return { phase: 'market', label: 'Trading at the commons', target: commons, tradingOpen: true, speedMultiplier: 0.95 };
  return { phase: 'social', label: 'Evening gathering', target: features?.lantern || commons, tradingOpen: true, speedMultiplier: 0.8 };
}

export class TradingState {
  constructor(serialized = null) {
    this.uses = new Map();
    this.reputation = Math.max(0, Math.floor(Number(serialized?.reputation) || 0));
    for (const [key, value] of serialized?.uses || []) {
      if (typeof key === 'string' && Number.isFinite(value) && value > 0) this.uses.set(key, Math.min(8, Math.floor(value)));
    }
  }

  usageKey(traderKey, offerKey) {
    return `${traderKey}|${offerKey}`;
  }

  remaining(traderKey, offer) {
    return Math.max(0, offer.maximumUses - (this.uses.get(this.usageKey(traderKey, offer.key)) || 0));
  }

  tier() {
    return reputationTier(this.reputation);
  }

  nextTier() {
    return nextReputationTier(this.reputation);
  }

  effectiveOffer(offer, favor = 0) {
    return pricedOffer(offer, this.reputation, favor);
  }

  unlocked(offer) {
    return Boolean(offer && this.reputation >= (offer.requiredReputation || 0));
  }

  canTrade(traderKey, offer, inventory, favor = 0) {
    const priced = this.effectiveOffer(offer, favor);
    return Boolean(priced && this.unlocked(offer) && inventory && this.remaining(traderKey, offer) > 0 && inventory.count(priced.id) >= priced.count);
  }

  trade(traderKey, offer, inventory, favor = 0) {
    if (!this.canTrade(traderKey, offer, inventory, favor)) return false;
    const priced = this.effectiveOffer(offer, favor);
    if (!inventory.remove(priced.id, priced.count)) return false;
    inventory.add(priced.output.id, priced.output.count);
    const key = this.usageKey(traderKey, offer.key);
    this.uses.set(key, (this.uses.get(key) || 0) + 1);
    this.reputation += 1;
    return true;
  }

  restock(traderKey) {
    const prefix = `${traderKey}|`;
    for (const key of [...this.uses.keys()]) if (key.startsWith(prefix)) this.uses.delete(key);
  }

  restockAll() {
    const changed = this.uses.size;
    this.uses.clear();
    return changed;
  }

  serialize() {
    return { reputation: this.reputation, uses: [...this.uses.entries()] };
  }
}
