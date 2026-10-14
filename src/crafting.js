import { BLOCK } from './blocks.js';
import { itemDefinition, RECIPES } from './inventory.js';

const P = BLOCK.PLANKS;
const S = BLOCK.STONE;
const I = 'iron_ingot';
const H = 'tough_hide';
const E = 'emberite_ingot';
const V = 'voidglass_shard';
const STICK = 'stick';
const patterns = (shape, alternate = null) => alternate ? [shape, alternate] : [shape];

export const RECIPE_PATTERNS = Object.freeze({
  planks: patterns([[BLOCK.WOOD]]),
  frostpine_planks: patterns([[BLOCK.FROSTPINE_LOG]]),
  tidegrass_bundle: patterns([['tidefiber']]),
  glowkelp_cutting: patterns([['raw_glowkelp']]),
  tide_rod: patterns([[null, null, STICK], [null, STICK, 'tidefiber'], [STICK, null, 'tidefiber']]),
  sticks: patterns([[P], [P]]),
  crafting_table: patterns([[P, P], [P, P]]),
  wood_pickaxe: patterns([[P, P, P], [null, STICK, null], [null, STICK, null]]),
  stone_pickaxe: patterns([[S, S, S], [null, STICK, null], [null, STICK, null]]),
  wood_axe: patterns([[P, P], [P, STICK], [null, STICK]], [[P, P], [STICK, P], [STICK, null]]),
  stone_axe: patterns([[S, S], [S, STICK], [null, STICK]], [[S, S], [STICK, S], [STICK, null]]),
  wood_shovel: patterns([[P], [STICK], [STICK]]),
  stone_shovel: patterns([[S], [STICK], [STICK]]),
  furnace: patterns([[S, S, S], [S, null, S], [S, S, S]]),
  wood_sword: patterns([[P], [P], [STICK]]),
  stone_sword: patterns([[S], [S], [STICK]]),
  iron_pickaxe: patterns([[I, I, I], [null, STICK, null], [null, STICK, null]]),
  iron_axe: patterns([[I, I], [I, STICK], [null, STICK]], [[I, I], [STICK, I], [STICK, null]]),
  iron_shovel: patterns([[I], [STICK], [STICK]]),
  iron_sword: patterns([[I], [I], [STICK]]),
  wood_hoe: patterns([[P, P], [STICK, null], [STICK, null]], [[P, P], [null, STICK], [null, STICK]]),
  stone_hoe: patterns([[S, S], [STICK, null], [STICK, null]], [[S, S], [null, STICK], [null, STICK]]),
  iron_hoe: patterns([[I, I], [STICK, null], [STICK, null]], [[I, I], [null, STICK], [null, STICK]]),
  emberite_pickaxe: patterns([[E, E, E], [null, STICK, null], [null, STICK, null]]),
  emberite_axe: patterns([[E, E], [E, STICK], [null, STICK]], [[E, E], [STICK, E], [STICK, null]]),
  emberite_shovel: patterns([[E], [STICK], [STICK]]),
  emberite_sword: patterns([[E], [E], [STICK]]),
  emberite_hoe: patterns([[E, E], [STICK, null], [STICK, null]], [[E, E], [null, STICK], [null, STICK]]),
  voidglass_pickaxe: patterns([[V, V, V], [null, STICK, null], [null, STICK, null]]),
  voidglass_axe: patterns([[V, V], [V, STICK], [null, STICK]], [[V, V], [STICK, V], [STICK, null]]),
  voidglass_shovel: patterns([[V], [STICK], [STICK]]),
  voidglass_sword: patterns([[V], [V], [STICK]]),
  voidglass_hoe: patterns([[V, V], [STICK, null], [STICK, null]], [[V, V], [null, STICK], [null, STICK]]),
  bread: patterns([['wheat', 'wheat', 'wheat']]),
  rimepot_stew: patterns([['roasted_rimepod', 'cooked_meat', 'roasted_rimepod'], [null, 'dried_ashcap', null]]),
  hearthcurd: patterns([['mossmilk_pail', 'dried_ashcap'], ['amberroot', null]]),
  chest: patterns([[P, P, P], [P, null, P], [P, P, P]]),
  torches: patterns([['coal'], [STICK]]),
  lumen_lantern: patterns([[I, BLOCK.GLASS, I], [BLOCK.GLASS, 'lumen_shard', BLOCK.GLASS], [I, BLOCK.GLASS, I]]),
  doors: patterns([[P, P], [P, P], [P, P]]),
  sunpetal_dye: patterns([[BLOCK.SUNPETAL]]),
  ember_dye: patterns([[BLOCK.EMBERBELL]]),
  windfiber: patterns([[BLOCK.WINDGRASS, BLOCK.WINDGRASS], [BLOCK.WINDGRASS, null]]),
  silk_cord: patterns([['night_silk'], ['night_silk']]),
  silkframe_scaffolds: patterns([[STICK, 'silk_cord', STICK], [STICK, 'silk_cord', STICK], [STICK, 'silk_cord', STICK]]),
  trail_tethers: patterns([['silk_cord', null, 'silk_cord'], [null, 'glob_resin', null], ['silk_cord', null, 'silk_cord']]),
  sunhive: patterns([[P, P, P], ['silk_cord', 'silk_cord', 'silk_cord'], [P, P, P]]),
  forged_iron_block: patterns([[I, I, I], [I, I, I], [I, I, I]]),
  unpack_forged_iron: patterns([[BLOCK.FORGED_IRON_BLOCK]]),
  hearthguard_core: patterns([[I, P, I], [P, 'lumen_shard', P], [I, P, I]]),
  keepsake_frames: patterns([[STICK, STICK, STICK], [STICK, H, STICK], [STICK, STICK, STICK]]),
  outfitter_stand: patterns([[STICK, STICK, STICK], [null, STICK, null], [STICK, BLOCK.STONE_SLAB, STICK]]),
  tidebrick_block: patterns([['fired_tidebrick', 'fired_tidebrick'], ['fired_tidebrick', 'fired_tidebrick']]),
  hearthpot: patterns([['fired_tidebrick', null, 'fired_tidebrick'], [null, 'fired_tidebrick', null]]),
  natural_mossweave: patterns([['mosswool', 'mosswool'], ['mosswool', 'mosswool']]),
  sun_mossweave: patterns([[BLOCK.MOSSWEAVE_NATURAL, 'sunpetal_dye']]),
  ember_mossweave: patterns([[BLOCK.MOSSWEAVE_NATURAL, 'ember_dye']]),
  frost_mossweave: patterns([[BLOCK.MOSSWEAVE_NATURAL, 'snow_clump']]),
  hollow_mossweave: patterns([[BLOCK.MOSSWEAVE_NATURAL, 'shadow_shard', 'lumen_spore']]),
  natural_mossweave_carpet: patterns([[BLOCK.MOSSWEAVE_NATURAL, BLOCK.MOSSWEAVE_NATURAL]]),
  sun_mossweave_carpet: patterns([[BLOCK.MOSSWEAVE_SUN, BLOCK.MOSSWEAVE_SUN]]),
  ember_mossweave_carpet: patterns([[BLOCK.MOSSWEAVE_EMBER, BLOCK.MOSSWEAVE_EMBER]]),
  frost_mossweave_carpet: patterns([[BLOCK.MOSSWEAVE_FROST, BLOCK.MOSSWEAVE_FROST]]),
  hollow_mossweave_carpet: patterns([[BLOCK.MOSSWEAVE_HOLLOW, BLOCK.MOSSWEAVE_HOLLOW]]),
  tidebrick_mosaic: patterns([[BLOCK.TIDEBRICK, BLOCK.TIDEBRICK], [BLOCK.TIDEBRICK, BLOCK.TIDEBRICK], [null, 'lumen_shard']]),
  natural_trail_banner: patterns([[BLOCK.MOSSWEAVE_NATURAL, BLOCK.MOSSWEAVE_NATURAL, BLOCK.MOSSWEAVE_NATURAL], [BLOCK.MOSSWEAVE_NATURAL, BLOCK.MOSSWEAVE_NATURAL, BLOCK.MOSSWEAVE_NATURAL], [null, STICK, null]]),
  sun_trail_banner: patterns([[BLOCK.MOSSWEAVE_SUN, BLOCK.MOSSWEAVE_SUN, BLOCK.MOSSWEAVE_SUN], [BLOCK.MOSSWEAVE_SUN, BLOCK.MOSSWEAVE_SUN, BLOCK.MOSSWEAVE_SUN], [null, STICK, null]]),
  ember_trail_banner: patterns([[BLOCK.MOSSWEAVE_EMBER, BLOCK.MOSSWEAVE_EMBER, BLOCK.MOSSWEAVE_EMBER], [BLOCK.MOSSWEAVE_EMBER, BLOCK.MOSSWEAVE_EMBER, BLOCK.MOSSWEAVE_EMBER], [null, STICK, null]]),
  frost_trail_banner: patterns([[BLOCK.MOSSWEAVE_FROST, BLOCK.MOSSWEAVE_FROST, BLOCK.MOSSWEAVE_FROST], [BLOCK.MOSSWEAVE_FROST, BLOCK.MOSSWEAVE_FROST, BLOCK.MOSSWEAVE_FROST], [null, STICK, null]]),
  hollow_trail_banner: patterns([[BLOCK.MOSSWEAVE_HOLLOW, BLOCK.MOSSWEAVE_HOLLOW, BLOCK.MOSSWEAVE_HOLLOW], [BLOCK.MOSSWEAVE_HOLLOW, BLOCK.MOSSWEAVE_HOLLOW, BLOCK.MOSSWEAVE_HOLLOW], [null, STICK, null]]),
  raincatch_basin: patterns([[I, null, I], [I, null, I], [I, I, I]]),
  lore_folios: patterns([['chart_sheet', 'chart_sheet', 'chart_sheet'], [null, 'tough_hide', null]]),
  archive_shelf: patterns([[P, P, P], ['lore_folio', 'lore_folio', 'lore_folio'], [P, P, P]]),
  infusion_still: patterns([[null, 'lumen_shard', null], ['iron_ingot', BLOCK.GLASS, 'iron_ingot'], [BLOCK.TIDEBRICK, BLOCK.TIDEBRICK, BLOCK.TIDEBRICK]]),
  forgeheart_anvil: patterns([[I, 'emberite_ingot', I], [I, 'lumen_shard', I], [BLOCK.STONE_SLAB, BLOCK.STONE_SLAB, BLOCK.STONE_SLAB]]),
  runegrind_wheel: patterns([[STICK, BLOCK.STONE_SLAB, STICK], [P, null, P]]),
  stonewright_cutter: patterns([[I, null, I], [BLOCK.STONE_SLAB, BLOCK.STONE_SLAB, BLOCK.STONE_SLAB], [P, null, P]]),
  forge_kiln: patterns([[I, I, I], [I, BLOCK.FURNACE, I], [BLOCK.POLISHED_STONE, BLOCK.POLISHED_STONE, BLOCK.POLISHED_STONE]]),
  hearth_smoker: patterns([[BLOCK.WOOD, null, BLOCK.WOOD], [BLOCK.WOOD, BLOCK.FURNACE, BLOCK.WOOD]]),
  wayvault_chest: patterns([[V, V, V], [V, 'lumen_shard', V], [V, V, V]]),
  glass_panes: patterns([[BLOCK.GLASS, BLOCK.GLASS, BLOCK.GLASS], [BLOCK.GLASS, BLOCK.GLASS, BLOCK.GLASS]]),
  forged_lattice: patterns([[I, I, I], [I, I, I]]),
  hearthcake: patterns([['suncomb', 'bramble_egg', 'suncomb'], ['mossmilk_pail', null, 'mossmilk_pail'], ['wheat', 'wheat', 'wheat']]),
  trailbarrel: patterns([[P, BLOCK.WOOD_SLAB, P], [P, null, P], [P, BLOCK.WOOD_SLAB, P]]),
  resonance_box: patterns([[P, P, P], [P, 'lumen_shard', P], [P, P, P]]),
  waystar: patterns([[BLOCK.GLASS, BLOCK.GLASS, BLOCK.GLASS], [BLOCK.GLASS, 'warden_core', BLOCK.GLASS], [V, V, V]]),
  hearthsong_player: patterns([[P, P, P], [P, 'echo_core', P], [P, P, P]]),
  forge_funnel: patterns([['iron_ingot', null, 'iron_ingot'], ['iron_ingot', BLOCK.CHEST, 'iron_ingot'], [null, 'iron_ingot', null]]),
  binding_compound: patterns([[BLOCK.SAND, 'glob_resin'], [null, 'glob_resin']]),
  windbow: patterns([[null, STICK, 'windfiber'], [STICK, null, 'windfiber'], [null, STICK, 'windfiber']]),
  silk_windbow: patterns([[null, STICK, 'silk_cord'], [STICK, null, 'silk_cord'], [null, STICK, 'silk_cord']]),
  arrows: patterns([[S], [STICK]]),
  bramble_arrows: patterns([['flint'], [STICK], ['bramble_feather']]),
  thorn_arrows: patterns([['thorn_spine'], [STICK]]),
  flint_arrows: patterns([['flint'], [STICK], ['windfiber']]),
  spark_striker: patterns([['iron_ingot', null], [null, 'flint']], [[null, 'iron_ingot'], ['flint', null]]),
  blast_keg: patterns([[BLOCK.SAND, 'shadow_shard', BLOCK.SAND], ['shadow_shard', P, 'shadow_shard'], [BLOCK.SAND, 'shadow_shard', BLOCK.SAND]]),
  hush_blast_keg: patterns([[BLOCK.SAND, 'hush_resin', BLOCK.SAND], ['hush_resin', P, 'hush_resin'], [BLOCK.SAND, 'hush_resin', BLOCK.SAND]]),
  moss_bed: patterns([['mosswool', 'mosswool', 'mosswool'], [P, P, P]]),
  moss_shears: patterns([[I, null], [null, I]]),
  drying_rack: patterns([[STICK, 'windfiber', STICK], [STICK, 'windfiber', STICK], [P, null, P]]),
  silk_drying_rack: patterns([[STICK, 'silk_cord', STICK], [STICK, 'silk_cord', STICK], [P, null, P]]),
  oak_signs: patterns([[P, P, P], [P, P, P], [null, STICK, null]]),
  oak_skiff: patterns([[P, null, P], [P, P, P]]),
  lumen_bloom: patterns([['lumen_spore', 'lumen_spore']]),
  ashcap_cutting: patterns([['raw_ashcap']]),
  stone_slabs: patterns([[S, S, S]]),
  wood_slabs: patterns([[P, P, P]]),
  compost_bin: patterns([[BLOCK.WOOD_SLAB, null, BLOCK.WOOD_SLAB], [BLOCK.WOOD_SLAB, null, BLOCK.WOOD_SLAB], [BLOCK.WOOD_SLAB, BLOCK.WOOD_SLAB, BLOCK.WOOD_SLAB]]),
  repair_bench: patterns([[I, I, I], [null, I, null], [BLOCK.STONE_SLAB, BLOCK.STONE_SLAB, BLOCK.STONE_SLAB]]),
  runeforge: patterns([['lumen_shard', 'voidglass_shard', 'lumen_shard'], [BLOCK.STONE, 'voidglass_shard', BLOCK.STONE], [BLOCK.STONE, 'lumen_shard', BLOCK.STONE]]),
  oak_fences: patterns([[P, STICK, P], [P, STICK, P]]),
  oak_gate: patterns([[STICK, P, STICK], [STICK, P, STICK]]),
  stone_walls: patterns([[S, S, S], [S, S, S]]),
  bound_stone_walls: patterns([[S, S, S], [null, 'binding_compound', null]]),
  oak_stairs: patterns([[P, null, null], [P, P, null], [P, P, P]], [[null, null, P], [null, P, P], [P, P, P]]),
  stone_stairs: patterns([[S, null, null], [S, S, null], [S, S, S]], [[null, null, S], [null, S, S], [S, S, S]]),
  oak_trapdoors: patterns([[P, P, P], [P, P, P]]),
  oak_ladders: patterns([[STICK, null, STICK], [STICK, STICK, STICK], [STICK, null, STICK]]),
  oak_shield: patterns([[P, I, P], [P, P, P], [null, P, null]]),
  trail_saddle: patterns([[I, H, I], ['windfiber', H, 'windfiber'], [null, H, null]]),
  warden_sigil: patterns([['shadow_shard', 'lumen_shard', 'shadow_shard'], ['lumen_shard', 'voidglass_shard', 'lumen_shard'], ['shadow_shard', null, 'shadow_shard']]),
  warden_maul: patterns([['voidglass_shard', 'warden_core', 'voidglass_shard'], [null, STICK, null], [null, STICK, null]]),
  echo_pickaxe: patterns([['voidglass_shard', 'echo_core', 'voidglass_shard'], [null, STICK, null], [null, STICK, null]]),
  spark_switch: patterns([[null, STICK, null], [S, 'emberite_ingot', S]]),
  sunwire: patterns([['windfiber', 'lumen_shard', 'windfiber']]),
  forge_lamp: patterns([[I, BLOCK.GLASS, I], [BLOCK.GLASS, 'lumen_shard', BLOCK.GLASS], [I, BLOCK.GLASS, I]]),
  trail_plate: patterns([[null, I, null], [BLOCK.STONE_SLAB, 'windfiber', BLOCK.STONE_SLAB]]),
  sun_eye: patterns([[BLOCK.GLASS, 'sunpetal_dye', BLOCK.GLASS], [null, 'lumen_shard', null], [null, BLOCK.GLASS, null]]),
  spark_relay: patterns([[null, 'lumen_shard', null], [I, I, null], [BLOCK.STONE_SLAB, BLOCK.STONE_SLAB, null]]),
  forge_ram: patterns([[I, I, I], [BLOCK.STONE, 'emberite_ingot', I], [BLOCK.STONE, BLOCK.STONE, null]]),
  pulse_sequencer: patterns([['lumen_shard', 'windfiber', 'lumen_shard'], [I, I, null], [BLOCK.STONE_SLAB, BLOCK.STONE_SLAB, null]]),
  forge_rails: patterns([[I, null, I], [I, STICK, I], [I, null, I]]),
  powered_rails: patterns([[I, 'emberite_ingot', I], [I, 'lumen_shard', I]]),
  forge_cart: patterns([[I, null, I], [I, P, I], [null, P, null]]),
  cargo_cart: patterns([[null, null, null], [null, BLOCK.CHEST, null], [null, 'forge_cart', null]]),
  freight_loader: patterns([[I, I, I], [null, BLOCK.CHEST, null], [null, 'lumen_shard', null]]),
  freight_unloader: patterns([[null, 'lumen_shard', null], [null, BLOCK.CHEST, null], [I, I, I]]),
  forge_ejector: patterns([[BLOCK.STONE, BLOCK.STONE, BLOCK.STONE], [BLOCK.STONE, null, BLOCK.STONE], [BLOCK.STONE, 'lumen_shard', BLOCK.STONE]]),
  rune_dispenser: patterns([[null, 'windbow', null], ['lumen_shard', 'forge_ejector', 'lumen_shard']]),
  change_sentry: patterns([[BLOCK.STONE, BLOCK.STONE, BLOCK.STONE], [BLOCK.SUNWIRE_OFF, 'lumen_shard', BLOCK.SUNWIRE_OFF], [BLOCK.STONE, BLOCK.STONE, BLOCK.STONE]]),
  binding_ram: patterns([['forge_ram', 'binding_compound']]),
  spark_inverter: patterns([[null, BLOCK.TORCH, null], ['lumen_shard', BLOCK.SUNWIRE_OFF, 'lumen_shard'], [null, BLOCK.STONE_SLAB, null]]),
  spark_comparator: patterns([[null, BLOCK.TORCH, null], [BLOCK.TORCH, 'lumen_shard', BLOCK.TORCH], [BLOCK.STONE_SLAB, BLOCK.STONE_SLAB, BLOCK.STONE_SLAB]]),
  forge_couplers: patterns([[I, null, I], [null, 'windfiber', null], [null, null, null]]),
  bound_forge_couplers: patterns([[I, 'binding_compound', I]]),
  charter_post: patterns([[null, I, null], [P, 'hearthmark', P], [BLOCK.WOOD, 'hearthmark', BLOCK.WOOD]]),
  hearthfire: patterns([[null, STICK, null], [STICK, 'coal', STICK], [BLOCK.WOOD, BLOCK.WOOD, BLOCK.WOOD]]),
  empty_flasks: patterns([[BLOCK.GLASS, null, BLOCK.GLASS], [null, BLOCK.GLASS, null]]),
  forged_pail: patterns([[I, null, I], [null, I, null]]),
  packed_snow: patterns([['snow_clump', 'snow_clump'], ['snow_clump', 'snow_clump']]),
  stormglass: patterns([[I, BLOCK.GLASS, I], [BLOCK.GLASS, 'lumen_shard', BLOCK.GLASS], [null, BLOCK.GLASS, null]]),
  wayfinder_compass: patterns([[null, I, null], [I, 'lumen_shard', I], [null, I, null]]),
  chart_sheets: patterns([['tidefiber', 'tidefiber', 'tidefiber']]),
  trailchart: patterns([['chart_sheet', 'chart_sheet', 'chart_sheet'], ['chart_sheet', 'wayfinder_compass', 'chart_sheet'], ['chart_sheet', 'chart_sheet', 'chart_sheet']]),
  cinder_gate: patterns([[V, E, V], [E, 'warden_core', E], [V, E, V]]),
  suncrest_regalia: patterns([['sunpetal_dye', 'lumen_shard', 'sunpetal_dye'], ['windfiber', null, 'windfiber']]),
  emberline_regalia: patterns([['ember_dye', 'tough_hide', 'ember_dye'], ['tough_hide', 'emberite_ingot', 'tough_hide']]),
  frostveil_regalia: patterns([['frost_fang', 'snow_clump', 'frost_fang'], ['tidefiber', 'snow_clump', 'tidefiber'], [null, 'snow_clump', null]]),
  hollow_regalia: patterns([['shadow_shard', 'lumen_shard', 'shadow_shard'], ['lumen_spore', 'voidglass_shard', 'lumen_spore'], ['shadow_shard', null, 'shadow_shard']]),
  windstep_tonic: patterns([['windfiber', 'sunpetal_dye', 'windfiber'], [null, 'empty_flask', null]]),
  stoneward_tonic: patterns([[BLOCK.ROOTSTONE, 'raw_ashcap', BLOCK.ROOTSTONE], [null, 'empty_flask', null]]),
  lumen_sight_tonic: patterns([['lumen_shard', 'raw_glowkelp', 'lumen_shard'], [null, 'empty_flask', null]]),
  hearthmend_tonic: patterns([['amberroot', 'lumen_spore', 'amberroot'], [null, 'empty_flask', null]]),
  cinderward_tonic: patterns([['ashscale', 'ember_gland', 'ashscale'], [null, 'cinder_shard', null], [null, 'empty_flask', null]]),
  ashglide_tonic: patterns([['ember_membrane', 'cinder_shard', 'ember_membrane'], [null, 'emberbulb', null], [null, 'empty_flask', null]]),
  hide_helmet: patterns([[H, H, H], [H, null, H]]),
  hide_chestplate: patterns([[H, null, H], [H, H, H], [H, H, H]]),
  hide_leggings: patterns([[H, H, H], [H, null, H], [H, null, H]]),
  hide_boots: patterns([[H, null, H], [H, null, H]]),
  iron_helmet: patterns([[I, I, I], [I, null, I]]),
  iron_chestplate: patterns([[I, null, I], [I, I, I], [I, I, I]]),
  iron_leggings: patterns([[I, I, I], [I, null, I], [I, null, I]]),
  iron_boots: patterns([[I, null, I], [I, null, I]]),
  emberite_helmet: patterns([[E, E, E], [E, null, E]]),
  emberite_chestplate: patterns([[E, null, E], [E, E, E], [E, E, E]]),
  emberite_leggings: patterns([[E, E, E], [E, null, E], [E, null, E]]),
  emberite_boots: patterns([[E, null, E], [E, null, E]]),
  voidglass_helmet: patterns([[V, V, V], [V, null, V]]),
  voidglass_chestplate: patterns([[V, null, V], [V, V, V], [V, V, V]]),
  voidglass_leggings: patterns([[V, V, V], [V, null, V], [V, null, V]]),
  voidglass_boots: patterns([[V, null, V], [V, null, V]]),
});

function normalize(matrix) {
  let rows = matrix.map((row) => [...row]);
  while (rows.length && rows[0].every((id) => id == null)) rows.shift();
  while (rows.length && rows.at(-1).every((id) => id == null)) rows.pop();
  if (!rows.length) return [];
  let left = 0;
  let right = Math.max(...rows.map((row) => row.length)) - 1;
  while (left <= right && rows.every((row) => row[left] == null)) left += 1;
  while (right >= left && rows.every((row) => row[right] == null)) right -= 1;
  return rows.map((row) => Array.from({ length: right - left + 1 }, (_, index) => row[left + index] ?? null));
}

function sameShape(a, b) {
  if (a.length !== b.length || a.some((row, index) => row.length !== b[index]?.length)) return false;
  return a.every((row, y) => row.every((id, x) => (id == null && b[y][x] == null) || String(id) === String(b[y][x])));
}

export function recipePattern(recipeId) {
  return RECIPE_PATTERNS[recipeId]?.[0] || null;
}

export function matchCraftingRecipe(slots, size, station = 'hand') {
  if (!Array.isArray(slots) || slots.length !== size * size) return null;
  const grid = normalize(Array.from({ length: size }, (_, y) => slots.slice(y * size, y * size + size)));
  if (!grid.length) return null;
  for (const recipe of RECIPES) {
    if (!(recipe.station === 'hand' || recipe.station === station)) continue;
    for (const pattern of RECIPE_PATTERNS[recipe.id] || []) {
      if (sameShape(grid, normalize(pattern))) return recipe;
    }
  }
  return null;
}

export class CraftingGrid {
  constructor(size = 2) {
    this.size = size === 3 ? 3 : 2;
    this.slots = Array(this.size * this.size).fill(null);
  }

  place(inventory, index, id) {
    if (!Number.isInteger(index) || index < 0 || index >= this.slots.length || this.slots[index] != null) return false;
    if (itemDefinition(id)?.durability) return false;
    if (!inventory.remove(id, 1)) return false;
    this.slots[index] = id;
    return true;
  }

  take(inventory, index) {
    if (!Number.isInteger(index) || this.slots[index] == null) return false;
    inventory.add(this.slots[index], 1);
    this.slots[index] = null;
    return true;
  }

  clear(inventory) {
    for (let index = 0; index < this.slots.length; index += 1) this.take(inventory, index);
  }

  resize(size, inventory) {
    this.clear(inventory);
    this.size = size === 3 ? 3 : 2;
    this.slots = Array(this.size * this.size).fill(null);
  }

  match(station = 'hand') {
    return matchCraftingRecipe(this.slots, this.size, station);
  }

  craft(inventory, station = 'hand') {
    const recipe = this.match(station);
    if (!recipe) return null;
    this.slots.fill(null);
    inventory.add(recipe.output.id, recipe.output.count);
    for (const [id, amount] of Object.entries(recipe.returns || {})) inventory.add(id, amount);
    return recipe;
  }
}
