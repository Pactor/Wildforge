import { BLOCK } from './blocks.js';

export const DRYING_RECIPES = Object.freeze({
  raw_meat: Object.freeze({ output: 'grazer_jerky', dryTime: 64, experience: 1 }),
  raw_silverfin: Object.freeze({ output: 'dried_silverfin', dryTime: 56, experience: 1 }),
  raw_glowkelp: Object.freeze({ output: 'glowkelp_crisp', dryTime: 42, experience: 1 }),
  raw_ashcap: Object.freeze({ output: 'dried_ashcap', dryTime: 48, experience: 1 }),
});

const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const pointFor = (key) => key.split(',').map(Number);

function sanitizedSlot(slot) {
  const recipe = DRYING_RECIPES[slot?.input];
  if (!recipe) return null;
  return {
    input: slot.input,
    output: recipe.output,
    total: recipe.dryTime,
    remaining: Math.max(0.05, Math.min(recipe.dryTime, Number(slot.remaining) || recipe.dryTime)),
  };
}

export class DryingRackState {
  constructor(world, serialized = null, callbacks = {}) {
    this.world = world;
    this.onComplete = callbacks.onComplete || (() => {});
    this.sites = new Map();
    for (const [key, value] of serialized?.sites || []) {
      if (typeof key !== 'string') continue;
      const slots = (value?.slots || []).map(sanitizedSlot).filter(Boolean).slice(0, 4);
      if (slots.length) this.sites.set(key, { slots, paused: false, rate: 0 });
    }
  }

  isRack(x, y, z) {
    return this.world.getBlock(x, y, z) === BLOCK.DRYING_RACK;
  }

  get(x, y, z) {
    const key = keyFor(x, y, z);
    if (!this.sites.has(key)) this.sites.set(key, { slots: [], paused: false, rate: 0 });
    return this.sites.get(key);
  }

  addFood(x, y, z, input) {
    const recipe = DRYING_RECIPES[input];
    if (!recipe || !this.isRack(x, y, z)) return null;
    const site = this.get(x, y, z);
    if (site.slots.length >= 4) return null;
    const slot = { input, output: recipe.output, total: recipe.dryTime, remaining: recipe.dryTime };
    site.slots.push(slot);
    return { slot: site.slots.length, ...slot };
  }

  status(x, y, z) {
    if (!this.isRack(x, y, z)) return null;
    const site = this.get(x, y, z);
    return {
      slots: site.slots.length,
      capacity: 4,
      progress: site.slots.map((slot) => 1 - slot.remaining / slot.total),
      paused: site.paused,
      rate: site.rate,
    };
  }

  update(dt, environment = {}) {
    const completed = [];
    if (!Number.isFinite(dt) || dt <= 0) return completed;
    const windStrength = Math.max(0, Math.min(1, Number(environment.windStrength) || 0));
    for (const [key, site] of [...this.sites]) {
      const [x, y, z] = pointFor(key);
      if (!this.isRack(x, y, z)) {
        this.sites.delete(key);
        continue;
      }
      const raining = environment.isRaining?.(x, z) ?? Boolean(environment.raining);
      const exposed = environment.isExposed?.(x, y, z) ?? false;
      site.paused = raining && exposed;
      site.rate = site.paused ? 0 : 0.65 + windStrength * 0.7;
      if (site.paused) continue;
      for (const slot of [...site.slots]) {
        slot.remaining -= dt * site.rate;
        if (slot.remaining > 0) continue;
        site.slots.splice(site.slots.indexOf(slot), 1);
        const recipe = DRYING_RECIPES[slot.input];
        const result = { x, y, z, input: slot.input, output: slot.output, experience: recipe.experience };
        completed.push(result);
        this.onComplete(result);
      }
      if (!site.slots.length) this.sites.delete(key);
    }
    return completed;
  }

  drain(x, y, z) {
    const key = keyFor(x, y, z);
    const site = this.sites.get(key);
    this.sites.delete(key);
    return (site?.slots || []).map((slot) => slot.input);
  }

  serialize() {
    return {
      sites: [...this.sites.entries()].filter(([, site]) => site.slots.length).map(([key, site]) => [key, {
        slots: site.slots.map((slot) => ({ input: slot.input, remaining: slot.remaining })),
      }]),
    };
  }
}
