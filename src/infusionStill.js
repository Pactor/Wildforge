import { BLOCK } from './blocks.js';
import { itemDefinition } from './inventory.js';

export const MAX_INFUSION_STILLS = 256;
export const STILL_FLASK_CAPACITY = 3;
export const STILL_CATALYST_ITEM = 'lumen_spore';
export const STILL_CATALYST_CHARGES = 3;

export const INFUSION_RECIPES = Object.freeze([
  { id: 'windstep_tonic', output: 'windstep_tonic', ingredients: { windfiber: 2, sunpetal_dye: 1 }, brewTime: 12 },
  { id: 'stoneward_tonic', output: 'stoneward_tonic', ingredients: { [BLOCK.ROOTSTONE]: 2, raw_ashcap: 1 }, brewTime: 12 },
  { id: 'lumen_sight_tonic', output: 'lumen_sight_tonic', ingredients: { lumen_shard: 2, raw_glowkelp: 1 }, brewTime: 12 },
  { id: 'hearthmend_tonic', output: 'hearthmend_tonic', ingredients: { amberroot: 2, lumen_spore: 1 }, brewTime: 12 },
  { id: 'cinderward_tonic', output: 'cinderward_tonic', ingredients: { ashscale: 2, ember_gland: 1, cinder_shard: 1 }, brewTime: 16 },
  { id: 'ashglide_tonic', output: 'ashglide_tonic', ingredients: { ember_membrane: 2, cinder_shard: 1, emberbulb: 1 }, brewTime: 16 },
]);

const recipeById = new Map(INFUSION_RECIPES.map((recipe) => [recipe.id, recipe]));
const ingredientIds = new Set(INFUSION_RECIPES.flatMap((recipe) => Object.keys(recipe.ingredients)));
const boundedCount = (value, maximum = 64) => Math.max(0, Math.min(maximum, Math.floor(Number(value) || 0)));
const validKey = (key) => typeof key === 'string' && /^-?\d+,-?\d+,-?\d+$/.test(key);

function emptySite() {
  return { flasks: 0, catalyst: 0, charges: 0, ingredients: new Map(), output: null, progress: 0, activeRecipe: null };
}

function sanitizeSite(raw) {
  const site = emptySite();
  site.flasks = boundedCount(raw?.flasks, STILL_FLASK_CAPACITY);
  site.catalyst = boundedCount(raw?.catalyst);
  site.charges = boundedCount(raw?.charges, STILL_CATALYST_CHARGES);
  for (const entry of Array.isArray(raw?.ingredients) ? raw.ingredients.slice(0, ingredientIds.size) : []) {
    const [id, count] = entry || [];
    if (!ingredientIds.has(String(id)) || !itemDefinition(id)) continue;
    const amount = boundedCount(count); if (amount) site.ingredients.set(String(id), amount);
  }
  if (raw?.output && itemDefinition(raw.output.id)?.category === 'tonic') {
    const count = boundedCount(raw.output.count);
    if (count) site.output = { id: String(raw.output.id), count };
  }
  site.progress = Math.max(0, Math.min(16, Number(raw?.progress) || 0));
  site.activeRecipe = recipeById.has(raw?.activeRecipe) ? raw.activeRecipe : null;
  if (site.activeRecipe) site.progress = Math.min(site.progress, recipeById.get(site.activeRecipe).brewTime);
  else site.progress = 0;
  return site;
}

export function infusionIngredient(id) { return ingredientIds.has(String(id)); }

export class InfusionStillState {
  constructor(serialized = null) {
    this.stills = new Map(); this.revision = 0;
    for (const [key, raw] of (Array.isArray(serialized?.stills) ? serialized.stills : []).slice(0, MAX_INFUSION_STILLS)) {
      if (!validKey(key) || !raw || this.stills.has(key)) continue;
      this.stills.set(key, sanitizeSite(raw));
    }
  }

  get(key) {
    if (!validKey(key)) return null;
    if (!this.stills.has(key)) {
      if (this.stills.size >= MAX_INFUSION_STILLS) return null;
      this.stills.set(key, emptySite());
    }
    return this.stills.get(key);
  }

  recipeFor(site) {
    if (!site || site.flasks <= 0) return null;
    return INFUSION_RECIPES.find((recipe) => {
      if (site.output && site.output.id !== recipe.output) return false;
      if (site.output?.count >= 64) return false;
      return Object.entries(recipe.ingredients).every(([id, count]) => (site.ingredients.get(String(id)) || 0) >= count);
    }) || null;
  }

  deposit(key, inventory, slot, id, count = 1) {
    const site = this.get(key); count = boundedCount(count);
    if (!site || count <= 0) return false;
    if (slot === 'flask') {
      if (id !== 'empty_flask') return false;
      count = Math.min(count, STILL_FLASK_CAPACITY - site.flasks);
      if (count <= 0 || !inventory.remove(id, count)) return false;
      site.flasks += count;
    } else if (slot === 'catalyst') {
      count = Math.min(count, 64 - site.catalyst);
      if (id !== STILL_CATALYST_ITEM || count <= 0 || !inventory.remove(id, count)) return false;
      site.catalyst += count;
    } else if (slot === 'ingredient') {
      if (!infusionIngredient(id)) return false;
      const itemKey = String(id); count = Math.min(count, 64 - (site.ingredients.get(itemKey) || 0));
      if (count <= 0 || !inventory.remove(id, count)) return false;
      site.ingredients.set(itemKey, (site.ingredients.get(itemKey) || 0) + count);
    } else return false;
    this.revision += 1; return true;
  }

  withdraw(key, inventory, slot, id = null, count = 1) {
    const site = this.get(key); count = boundedCount(count);
    if (!site || count <= 0) return false;
    let moved = 0; let itemId = id;
    if (slot === 'flask') { itemId = 'empty_flask'; moved = Math.min(count, site.flasks); site.flasks -= moved; }
    else if (slot === 'catalyst') { itemId = STILL_CATALYST_ITEM; moved = Math.min(count, site.catalyst); site.catalyst -= moved; }
    else if (slot === 'ingredient' && infusionIngredient(id)) {
      const itemKey = String(id); moved = Math.min(count, site.ingredients.get(itemKey) || 0);
      if (moved) {
        const left = site.ingredients.get(itemKey) - moved;
        if (left) site.ingredients.set(itemKey, left); else site.ingredients.delete(itemKey);
      }
    } else if (slot === 'output' && site.output) {
      itemId = site.output.id; moved = Math.min(count, site.output.count); site.output.count -= moved;
      if (site.output.count <= 0) site.output = null;
    }
    if (!moved) return false;
    inventory.add(itemId, moved); site.progress = 0; site.activeRecipe = null; this.revision += 1; return true;
  }

  update(dt) {
    const completed = []; if (!Number.isFinite(dt) || dt <= 0) return completed;
    for (const [key, site] of this.stills) {
      let remaining = dt;
      while (remaining > 0) {
        const recipe = this.recipeFor(site);
        if (!recipe) { site.progress = 0; site.activeRecipe = null; break; }
        if (site.activeRecipe !== recipe.id) { site.activeRecipe = recipe.id; site.progress = 0; }
        if (site.charges <= 0) {
          if (site.catalyst <= 0) break;
          site.catalyst -= 1; site.charges = STILL_CATALYST_CHARGES; this.revision += 1;
        }
        site.progress = Math.max(0, Math.min(recipe.brewTime, site.progress));
        const step = Math.min(remaining, Math.max(0, recipe.brewTime - site.progress));
        site.progress += step; remaining -= step;
        if (site.progress + 1e-6 < recipe.brewTime) break;
        site.flasks -= 1; site.charges -= 1;
        for (const [id, count] of Object.entries(recipe.ingredients)) {
          const left = (site.ingredients.get(String(id)) || 0) - count;
          if (left > 0) site.ingredients.set(String(id), left); else site.ingredients.delete(String(id));
        }
        if (site.output) site.output.count += 1; else site.output = { id: recipe.output, count: 1 };
        site.progress = 0; site.activeRecipe = null; completed.push({ key, recipeId: recipe.id, output: recipe.output }); this.revision += 1;
      }
    }
    return completed;
  }

  progress(key) {
    const site = this.get(key); const recipe = this.recipeFor(site);
    return recipe ? Math.min(1, site.progress / recipe.brewTime) : 0;
  }

  status(key) {
    const site = this.get(key); const recipe = this.recipeFor(site);
    return site && { flasks: site.flasks, catalyst: site.catalyst, charges: site.charges, ingredients: [...site.ingredients], output: site.output && { ...site.output }, recipe, progress: recipe ? Math.min(1, site.progress / recipe.brewTime) : 0 };
  }

  drain(key) {
    const site = this.stills.get(key); if (!site) return [];
    const entries = [];
    if (site.flasks) entries.push(['empty_flask', site.flasks]);
    if (site.catalyst) entries.push([STILL_CATALYST_ITEM, site.catalyst]);
    for (const entry of site.ingredients) entries.push([...entry]);
    if (site.output) entries.push([site.output.id, site.output.count]);
    this.stills.delete(key); this.revision += 1; return entries;
  }

  recoverStale(world) {
    const recovered = [];
    for (const key of [...this.stills.keys()]) {
      const id = world.edits instanceof Map ? (world.edits.get(key) ?? BLOCK.AIR) : (() => { const [x, y, z] = key.split(',').map(Number); return world.getBlock(x, y, z); })();
      if (id === BLOCK.INFUSION_STILL) continue;
      const position = key.split(',').map(Number); recovered.push({ key, position, items: this.drain(key) });
    }
    return recovered;
  }

  serialize() {
    return { stills: [...this.stills.entries()].filter(([, site]) => site.flasks || site.catalyst || site.charges || site.ingredients.size || site.output || site.progress)
      .slice(0, MAX_INFUSION_STILLS).map(([key, site]) => [key, {
        flasks: site.flasks, catalyst: site.catalyst, charges: site.charges, ingredients: [...site.ingredients], output: site.output && { ...site.output }, progress: site.progress, activeRecipe: site.activeRecipe,
      }]) };
  }
}
