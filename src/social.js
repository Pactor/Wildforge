export const PROFESSION_GIFTS = Object.freeze({
  provisioner: 'wheat',
  delver: 'coal',
  outfitter: 'tough_hide',
  mechanist: 'lumen_shard',
  railwright: 'iron_ingot',
  herbalist: 'amberroot',
});

const pairKey = (first, second) => [first, second].sort().join('|');

export class SettlementSocialState {
  constructor(serialized = null) {
    this.favors = new Map();
    this.bonds = new Map();
    this.cooldowns = new Map();
    for (const [key, value] of serialized?.favors || []) {
      if (typeof key === 'string' && Number.isFinite(value)) this.favors.set(key, Math.max(0, Math.min(5, Math.floor(value))));
    }
    for (const [key, value] of serialized?.bonds || []) {
      if (typeof key === 'string' && Number.isFinite(value)) this.bonds.set(key, Math.max(0, Math.min(20, Math.floor(value))));
    }
  }

  giftFor(profession) {
    return PROFESSION_GIFTS[profession] || 'bread';
  }

  favor(traderKey) {
    return this.favors.get(traderKey) || 0;
  }

  give(traderKey, profession, inventory) {
    const itemId = this.giftFor(profession);
    const current = this.favor(traderKey);
    if (current >= 5) return { success: false, reason: 'maximum', itemId, favor: current };
    if (!inventory || inventory.count(itemId) < 1 || !inventory.remove(itemId, 1)) return { success: false, reason: 'missing', itemId, favor: current };
    const favor = current + 1;
    this.favors.set(traderKey, favor);
    return { success: true, itemId, favor, discount: Math.floor(favor / 2) };
  }

  bond(firstKey, secondKey) {
    return this.bonds.get(pairKey(firstKey, secondKey)) || 0;
  }

  update(dt, residents = []) {
    dt = Math.max(0, Number(dt) || 0);
    for (const [key, remaining] of [...this.cooldowns]) {
      if (remaining <= dt) this.cooldowns.delete(key);
      else this.cooldowns.set(key, remaining - dt);
    }
    const social = residents.filter((resident) => resident?.definition?.resident && resident.socialKey && resident.residenceKey
      && ['breakfast', 'social'].includes(resident.schedulePhase));
    const events = [];
    for (let firstIndex = 0; firstIndex < social.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < social.length; secondIndex += 1) {
        const first = social[firstIndex];
        const second = social[secondIndex];
        if (first.residenceKey !== second.residenceKey || first.root.position.distanceTo(second.root.position) > 2.6) continue;
        const key = pairKey(first.socialKey, second.socialKey);
        if (this.cooldowns.has(key)) continue;
        this.cooldowns.set(key, 10);
        const bond = Math.min(20, (this.bonds.get(key) || 0) + 1);
        this.bonds.set(key, bond);
        first.heading = Math.atan2(second.root.position.x - first.root.position.x, second.root.position.z - first.root.position.z);
        second.heading = Math.atan2(first.root.position.x - second.root.position.x, first.root.position.z - second.root.position.z);
        events.push({ first, second, bond, key });
      }
    }
    return events;
  }

  serialize() {
    return { favors: [...this.favors.entries()], bonds: [...this.bonds.entries()] };
  }
}
