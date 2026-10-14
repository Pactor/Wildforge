import { BLOCK, BLOCKS } from './blocks.js';

export const CAMPFIRE_RECIPES = Object.freeze({
  raw_meat: Object.freeze({ output: 'cooked_meat', cookTime: 24, experience: 1 }),
  raw_bramble: Object.freeze({ output: 'roasted_bramble', cookTime: 22, experience: 1 }),
  bramble_egg: Object.freeze({ output: 'baked_bramble_egg', cookTime: 18, experience: 1 }),
  raw_silverfin: Object.freeze({ output: 'cooked_silverfin', cookTime: 24, experience: 1 }),
  raw_glowkelp: Object.freeze({ output: 'roasted_glowkelp', cookTime: 18, experience: 1 }),
  raw_ashcap: Object.freeze({ output: 'seared_ashcap', cookTime: 18, experience: 1 }),
  rimepod: Object.freeze({ output: 'roasted_rimepod', cookTime: 20, experience: 1 }),
  emberbulb: Object.freeze({ output: 'roasted_emberbulb', cookTime: 22, experience: 1 }),
});

const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const pointFor = (key) => key.split(',').map(Number);

function sanitizeSlot(slot) {
  const recipe = CAMPFIRE_RECIPES[slot?.input];
  if (!recipe) return null;
  const total = recipe.cookTime;
  return {
    input: slot.input,
    output: recipe.output,
    total,
    remaining: Math.max(0.05, Math.min(total, Number(slot.remaining) || total)),
  };
}

export class CampfireState {
  constructor(world, serialized = null, callbacks = {}) {
    this.world = world;
    this.onBlockChanged = callbacks.onBlockChanged || (() => {});
    this.onComplete = callbacks.onComplete || (() => {});
    this.onExtinguish = callbacks.onExtinguish || (() => {});
    this.sites = new Map();
    for (const [key, value] of serialized?.sites || []) {
      if (typeof key !== 'string') continue;
      const slots = (value?.slots || []).map(sanitizeSlot).filter(Boolean).slice(0, 4);
      const wet = Math.max(0, Math.min(4, Number(value?.wet) || 0));
      if (slots.length || wet > 0) this.sites.set(key, { slots, wet });
    }
    for (const [key, id] of world.edits || []) if (id === BLOCK.HEARTHFIRE_LIT && !this.sites.has(key)) this.sites.set(key, { slots: [], wet: 0 });
  }

  get(x, y, z) {
    const key = keyFor(x, y, z);
    if (!this.sites.has(key)) this.sites.set(key, { slots: [], wet: 0 });
    return this.sites.get(key);
  }

  isCampfire(x, y, z) {
    return Boolean(BLOCKS[this.world.getBlock(x, y, z)]?.campfire);
  }

  isLit(x, y, z) {
    return this.world.getBlock(x, y, z) === BLOCK.HEARTHFIRE_LIT;
  }

  setLit(x, y, z, lit) {
    if (!this.isCampfire(x, y, z)) return false;
    const id = lit ? BLOCK.HEARTHFIRE_LIT : BLOCK.HEARTHFIRE_UNLIT;
    if (this.world.getBlock(x, y, z) === id) return false;
    this.world.setBlock(x, y, z, id);
    this.get(x, y, z).wet = 0;
    this.onBlockChanged({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) }, id);
    return true;
  }

  addFood(x, y, z, input) {
    const recipe = CAMPFIRE_RECIPES[input];
    if (!recipe || !this.isLit(x, y, z)) return null;
    const site = this.get(x, y, z);
    if (site.slots.length >= 4) return null;
    const slot = { input, output: recipe.output, total: recipe.cookTime, remaining: recipe.cookTime };
    site.slots.push(slot);
    return { slot: site.slots.length, ...slot };
  }

  status(x, y, z) {
    if (!this.isCampfire(x, y, z)) return null;
    const site = this.get(x, y, z);
    return {
      lit: this.isLit(x, y, z),
      slots: site.slots.length,
      capacity: 4,
      progress: site.slots.map((slot) => 1 - slot.remaining / slot.total),
      wet: site.wet,
    };
  }

  update(dt, environment = {}) {
    const completed = [];
    if (!Number.isFinite(dt) || dt <= 0) return completed;
    for (const [key, site] of [...this.sites]) {
      const [x, y, z] = pointFor(key);
      if (!this.isCampfire(x, y, z)) {
        this.sites.delete(key);
        continue;
      }
      const lit = this.isLit(x, y, z);
      const exposed = environment.isExposed?.(x, y, z) ?? false;
      const raining = environment.isRaining?.(x, z) ?? Boolean(environment.raining);
      if (lit && raining && exposed) {
        site.wet = Math.min(4, site.wet + dt);
        if (site.wet >= 4) {
          this.setLit(x, y, z, false);
          this.onExtinguish({ x, y, z }, 'rain');
          continue;
        }
      } else site.wet = Math.max(0, site.wet - dt * 2);
      if (!lit) continue;
      for (const slot of [...site.slots]) {
        slot.remaining -= dt;
        if (slot.remaining > 0) continue;
        site.slots.splice(site.slots.indexOf(slot), 1);
        const recipe = CAMPFIRE_RECIPES[slot.input];
        const result = { x, y, z, input: slot.input, output: slot.output, experience: recipe.experience };
        completed.push(result);
        this.onComplete(result);
      }
      if (!lit && !site.slots.length && site.wet <= 0) this.sites.delete(key);
    }
    return completed;
  }

  drain(x, y, z) {
    const key = keyFor(x, y, z);
    const site = this.sites.get(key);
    this.sites.delete(key);
    return (site?.slots || []).map((slot) => slot.input);
  }

  litSites() {
    const sites = [];
    for (const key of this.sites.keys()) {
      const [x, y, z] = pointFor(key);
      if (this.isLit(x, y, z)) sites.push({ x, y, z });
    }
    return sites;
  }

  serialize() {
    return {
      sites: [...this.sites.entries()].map(([key, site]) => [key, {
        wet: site.wet,
        slots: site.slots.map((slot) => ({ input: slot.input, remaining: slot.remaining })),
      }]),
    };
  }
}
