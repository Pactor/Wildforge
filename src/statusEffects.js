export const STATUS_EFFECTS = Object.freeze({
  windstep: Object.freeze({ name: 'Windstep', duration: 120, color: 0x8ed07a, speedMultiplier: 1.22 }),
  stoneward: Object.freeze({ name: 'Stoneward', duration: 120, color: 0x9fa7a2, damageMultiplier: 0.72 }),
  lumen_sight: Object.freeze({ name: 'Lumen Sight', duration: 180, color: 0x73e4cf, nightVision: true }),
  hearthmend: Object.freeze({ name: 'Hearthmend', duration: 36, color: 0xe47865, heal: 1, pulseInterval: 3 }),
  cinderward: Object.freeze({ name: 'Cinderward', duration: 180, color: 0xf07b3d, heatWard: true }),
  ashglide: Object.freeze({ name: 'Ashglide', duration: 180, color: 0xe89055, fallMultiplier: 0.25 }),
});

export const TONIC_EFFECTS = Object.freeze({
  windstep_tonic: 'windstep',
  stoneward_tonic: 'stoneward',
  lumen_sight_tonic: 'lumen_sight',
  hearthmend_tonic: 'hearthmend',
  cinderward_tonic: 'cinderward',
  ashglide_tonic: 'ashglide',
});

export class StatusEffectState {
  constructor(serialized = null) {
    this.effects = new Map();
    for (const [id, value] of serialized?.effects || []) {
      const definition = STATUS_EFFECTS[id];
      if (!definition) continue;
      const remaining = Math.max(0, Math.min(definition.duration * 2, Number(value?.remaining) || 0));
      if (remaining <= 0) continue;
      this.effects.set(id, { remaining, pulse: Math.max(0, Number(value?.pulse) || 0) });
    }
  }

  apply(id, duration = null) {
    const definition = STATUS_EFFECTS[id];
    if (!definition) return null;
    const amount = Math.max(1, Math.min(definition.duration * 2, Number(duration) || definition.duration));
    const current = this.effects.get(id);
    const remaining = Math.min(definition.duration * 2, Math.max(current?.remaining || 0, amount));
    this.effects.set(id, { remaining, pulse: current?.pulse || 0 });
    return { id, ...definition, remaining };
  }

  drink(itemId) {
    const id = TONIC_EFFECTS[itemId];
    return id ? this.apply(id) : null;
  }

  has(id) {
    return (this.effects.get(id)?.remaining || 0) > 0;
  }

  remaining(id) {
    return this.effects.get(id)?.remaining || 0;
  }

  speedMultiplier() {
    return [...this.effects.keys()].reduce((value, id) => value * (STATUS_EFFECTS[id].speedMultiplier || 1), 1);
  }

  damageMultiplier() {
    return [...this.effects.keys()].reduce((value, id) => value * (STATUS_EFFECTS[id].damageMultiplier || 1), 1);
  }

  fallMultiplier() {
    return [...this.effects.keys()].reduce((value, id) => value * (STATUS_EFFECTS[id].fallMultiplier || 1), 1);
  }

  fallDamage(amount) {
    return Math.max(0, Math.round(Math.max(0, Number(amount) || 0) * this.fallMultiplier()));
  }

  update(dt, onPulse = () => {}) {
    const expired = [];
    if (!Number.isFinite(dt) || dt <= 0) return expired;
    for (const [id, state] of [...this.effects]) {
      const definition = STATUS_EFFECTS[id];
      state.remaining = Math.max(0, state.remaining - dt);
      if (definition.pulseInterval && state.remaining > 0) {
        state.pulse += dt;
        while (state.pulse >= definition.pulseInterval) {
          state.pulse -= definition.pulseInterval;
          onPulse({ id, ...definition });
        }
      }
      if (state.remaining <= 0) {
        this.effects.delete(id);
        expired.push(id);
      }
    }
    return expired;
  }

  entries() {
    return [...this.effects.entries()].map(([id, state]) => ({ id, ...STATUS_EFFECTS[id], remaining: state.remaining }));
  }

  clear() {
    const count = this.effects.size;
    this.effects.clear();
    return count;
  }

  serialize() {
    return { effects: [...this.effects.entries()].map(([id, state]) => [id, { remaining: state.remaining, pulse: state.pulse }]) };
  }
}
