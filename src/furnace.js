import { BLOCK } from './blocks.js';

export const FURNACE_RECIPES = Object.freeze([
  { id: 'iron_ingot', input: BLOCK.IRON_ORE, output: 'iron_ingot', cookTime: 8 },
  { id: 'emberite_ingot', input: BLOCK.EMBERITE_ORE, output: 'emberite_ingot', cookTime: 10 },
  { id: 'glass', input: BLOCK.SAND, output: BLOCK.GLASS, cookTime: 7 },
  { id: 'fired_tidebrick', input: 'tideclay_lump', output: 'fired_tidebrick', cookTime: 6 },
  { id: 'cooked_meat', input: 'raw_meat', output: 'cooked_meat', cookTime: 6 },
  { id: 'roasted_bramble', input: 'raw_bramble', output: 'roasted_bramble', cookTime: 6 },
  { id: 'baked_bramble_egg', input: 'bramble_egg', output: 'baked_bramble_egg', cookTime: 5 },
  { id: 'roasted_glowkelp', input: 'raw_glowkelp', output: 'roasted_glowkelp', cookTime: 5 },
  { id: 'cooked_silverfin', input: 'raw_silverfin', output: 'cooked_silverfin', cookTime: 6 },
  { id: 'seared_ashcap', input: 'raw_ashcap', output: 'seared_ashcap', cookTime: 5 },
  { id: 'roasted_rimepod', input: 'rimepod', output: 'roasted_rimepod', cookTime: 5 },
  { id: 'roasted_emberbulb', input: 'emberbulb', output: 'roasted_emberbulb', cookTime: 6 },
]);

export const FURNACE_FUELS = Object.freeze({ coal: 24 });

export const FURNACE_MODES = Object.freeze({
  furnace: Object.freeze({ id: 'furnace', label: 'Stone Furnace', speed: 1, description: 'Smelts minerals and cooks provisions.' }),
  kiln: Object.freeze({ id: 'kiln', label: 'Forge Kiln', speed: 0.5, description: 'Smelts ores, sand, and clay twice as quickly.' }),
  smoker: Object.freeze({ id: 'smoker', label: 'Hearth Smoker', speed: 0.5, description: 'Cooks raw provisions twice as quickly.' }),
});

const MINERAL_RECIPE_IDS = new Set(['iron_ingot', 'emberite_ingot', 'glass', 'fired_tidebrick']);
export const furnaceRecipeKind = (recipe) => MINERAL_RECIPE_IDS.has(recipe?.id) ? 'mineral' : 'food';
const normalizedMode = (mode) => FURNACE_MODES[mode]?.id || 'furnace';
const modeAccepts = (mode, recipe) => mode === 'kiln'
  ? furnaceRecipeKind(recipe) === 'mineral'
  : mode === 'smoker' ? furnaceRecipeKind(recipe) === 'food' : true;

const copySlot = (slot) => slot && slot.id != null && slot.count > 0
  ? { id: slot.id, count: Math.floor(slot.count) }
  : null;

export class FurnaceState {
  constructor(serialized = null) {
    this.furnaces = new Map();
    this.revision = 0;
    for (const [key, value] of serialized?.furnaces || []) {
      if (typeof key !== 'string' || !value) continue;
      this.furnaces.set(key, {
        input: copySlot(value.input),
        fuel: copySlot(value.fuel),
        output: copySlot(value.output),
        progress: Math.max(0, Number(value.progress) || 0),
        burnRemaining: Math.max(0, Number(value.burnRemaining) || 0),
        burnTotal: Math.max(0, Number(value.burnTotal) || 0),
        mode: normalizedMode(value.mode),
      });
    }
  }

  get(key) {
    if (!this.furnaces.has(key)) {
      this.furnaces.set(key, {
        input: null,
        fuel: null,
        output: null,
        progress: 0,
        burnRemaining: 0,
        burnTotal: 0,
        mode: 'furnace',
      });
    }
    return this.furnaces.get(key);
  }

  configure(key, mode = 'furnace') {
    const furnace = this.get(key);
    const next = normalizedMode(mode);
    if (furnace.mode === next) return furnace;
    furnace.mode = next;
    const recipe = FURNACE_RECIPES.find((entry) => String(entry.input) === String(furnace.input?.id));
    if (recipe && !modeAccepts(next, recipe)) furnace.progress = 0;
    else if (recipe) furnace.progress = Math.min(furnace.progress, recipe.cookTime * FURNACE_MODES[next].speed);
    this.revision += 1;
    return furnace;
  }

  modeFor(key) {
    return normalizedMode(this.get(key).mode);
  }

  recipeFor(id, mode = 'furnace') {
    const recipe = FURNACE_RECIPES.find((entry) => String(entry.input) === String(id)) || null;
    return recipe && modeAccepts(normalizedMode(mode), recipe) ? recipe : null;
  }

  acceptsInput(id, key = null) {
    return Boolean(this.recipeFor(id, key == null ? 'furnace' : this.modeFor(key)));
  }

  acceptsFuel(id) {
    return FURNACE_FUELS[id] > 0;
  }

  deposit(key, inventory, slotName, id, count = 1) {
    if (slotName === 'input' && !this.acceptsInput(id, key)) return false;
    if (slotName === 'fuel' && !this.acceptsFuel(id)) return false;
    if (!['input', 'fuel'].includes(slotName) || count <= 0) return false;
    const furnace = this.get(key);
    const slot = furnace[slotName];
    if (slot && String(slot.id) !== String(id)) return false;
    if (!inventory.remove(id, count)) return false;
    furnace[slotName] = { id, count: (slot?.count || 0) + count };
    this.revision += 1;
    return true;
  }

  withdraw(key, inventory, slotName, count = 1) {
    const furnace = this.get(key);
    const slot = furnace[slotName];
    if (!slot || count <= 0) return false;
    const moved = Math.min(Math.floor(count), slot.count);
    inventory.add(slot.id, moved);
    slot.count -= moved;
    if (slot.count <= 0) furnace[slotName] = null;
    if (slotName === 'input') furnace.progress = 0;
    this.revision += 1;
    return true;
  }

  canOutput(furnace, recipe) {
    return !furnace.output || String(furnace.output.id) === String(recipe.output);
  }

  update(dt) {
    const completed = [];
    if (!Number.isFinite(dt) || dt <= 0) return completed;
    for (const [key, furnace] of this.furnaces) {
      let remaining = dt;
      while (remaining > 0) {
        const recipe = this.recipeFor(furnace.input?.id, furnace.mode);
        if (!recipe || !this.canOutput(furnace, recipe)) {
          furnace.progress = 0;
          break;
        }
        if (furnace.burnRemaining <= 0) {
          if (!furnace.fuel || !this.acceptsFuel(furnace.fuel.id)) break;
          furnace.burnTotal = FURNACE_FUELS[furnace.fuel.id];
          furnace.burnRemaining = furnace.burnTotal;
          furnace.fuel.count -= 1;
          if (furnace.fuel.count <= 0) furnace.fuel = null;
          this.revision += 1;
        }
        const cookTime = recipe.cookTime * FURNACE_MODES[normalizedMode(furnace.mode)].speed;
        const step = Math.min(remaining, furnace.burnRemaining, cookTime - furnace.progress);
        furnace.progress += step;
        furnace.burnRemaining -= step;
        remaining -= step;
        if (furnace.progress + 1e-6 < cookTime) break;
        furnace.input.count -= 1;
        if (furnace.input.count <= 0) furnace.input = null;
        if (furnace.output) furnace.output.count += 1;
        else furnace.output = { id: recipe.output, count: 1 };
        furnace.progress = 0;
        completed.push({ key, recipeId: recipe.id, output: recipe.output });
        this.revision += 1;
      }
    }
    return completed;
  }

  progress(key) {
    const furnace = this.get(key);
    const mode = normalizedMode(furnace.mode);
    const recipe = this.recipeFor(furnace.input?.id, mode);
    return recipe ? Math.min(1, furnace.progress / (recipe.cookTime * FURNACE_MODES[mode].speed)) : 0;
  }

  burnProgress(key) {
    const furnace = this.get(key);
    return furnace.burnTotal > 0 ? Math.min(1, furnace.burnRemaining / furnace.burnTotal) : 0;
  }

  drain(key) {
    const furnace = this.furnaces.get(key);
    if (!furnace) return [];
    const entries = ['input', 'fuel', 'output']
      .map((slot) => furnace[slot])
      .filter(Boolean)
      .map(({ id, count }) => [id, count]);
    this.furnaces.delete(key);
    this.revision += 1;
    return entries;
  }

  serialize() {
    return {
      furnaces: [...this.furnaces.entries()]
        .filter(([, furnace]) => furnace.input || furnace.fuel || furnace.output || furnace.burnRemaining > 0)
        .map(([key, furnace]) => [key, {
          input: copySlot(furnace.input),
          fuel: copySlot(furnace.fuel),
          output: copySlot(furnace.output),
          progress: furnace.progress,
          burnRemaining: furnace.burnRemaining,
          burnTotal: furnace.burnTotal,
          mode: normalizedMode(furnace.mode),
        }]),
    };
  }
}
