import { BLOCK } from './blocks.js';

export const PLAYTEST_PROFILE = Object.freeze({
  damageScale: 0.25,
  exhaustionScale: 0.1,
});

export const SURVIVAL_START_HOTBAR = Object.freeze(Array(9).fill(null));
export const PLAYTEST_START_HOTBAR = Object.freeze([
  'voidglass_pickaxe',
  'voidglass_sword',
  BLOCK.PLANKS,
  BLOCK.STONE,
  BLOCK.TORCH,
  BLOCK.CRAFTING_TABLE,
  BLOCK.HEARTHFIRE_UNLIT,
  'hearthmend_tonic',
  'cinderward_tonic',
]);

// A deliberately curated kit: broad enough for rapid smoke testing, small enough
// that the inventory remains usable. Reloading playtest mode refills these minima.
export const PLAYTEST_KIT = Object.freeze([
  [BLOCK.DIRT, 128], [BLOCK.GRASS, 128], [BLOCK.STONE, 256], [BLOCK.WOOD, 128],
  [BLOCK.PLANKS, 256], [BLOCK.GLASS, 128], [BLOCK.SAND, 128], [BLOCK.TORCH, 128],
  [BLOCK.CRAFTING_TABLE, 16], [BLOCK.FURNACE, 16], [BLOCK.CHEST, 16],
  [BLOCK.HEARTHFIRE_UNLIT, 16], [BLOCK.RUNEFORGE, 8], [BLOCK.INFUSION_STILL, 8],
  [BLOCK.FORGEHEART_ANVIL, 8], [BLOCK.SPARK_SWITCH_OFF, 64], [BLOCK.SUNWIRE_OFF, 128],
  [BLOCK.BLAST_KEG, 16],
  ['voidglass_pickaxe', 1], ['voidglass_axe', 1], ['voidglass_shovel', 1],
  ['voidglass_hoe', 1], ['voidglass_sword', 1], ['windbow', 1], ['arrow', 256],
  ['spark_striker', 1], ['forged_pail', 3],
  ['cooked_meat', 64], ['bread', 64], ['hearthmend_tonic', 12],
  ['cinderward_tonic', 12], ['ashglide_tonic', 12], ['lumen_sight_tonic', 12],
  ['windstep_tonic', 12], ['stoneward_tonic', 12],
  ['iron_ingot', 128], ['emberite_ingot', 64], ['voidglass_shard', 64],
  ['lumen_shard', 64], ['lumen_spore', 32], ['coal', 128], ['stick', 256],
  ['wheat', 64], ['wheat_seeds', 64], ['amberroot_seed', 32], ['rimepod_seed', 32],
  ['emberbulb_cutting', 32], ['rich_compost', 64], ['hearthmark', 128],
  ['wayfinder_compass', 1], ['trailchart', 1],
]);

const ARMOR_LOADOUT = Object.freeze([
  ['head', 'voidglass_helmet'], ['chest', 'voidglass_chestplate'],
  ['legs', 'voidglass_leggings'], ['feet', 'voidglass_boots'],
]);

export function playtestModeFromSearch(search = '') {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  return ['1', 'true', 'on'].includes(String(params.get('playtest')).toLowerCase());
}

export function saveKeysForMode(seed, playtest = false) {
  const namespace = playtest ? ':playtest' : '';
  return {
    player: `wildforge:${seed}${namespace}:player`,
    edits: `wildforge:${seed}${namespace}:edits`,
  };
}

export function ensurePlaytestKit(inventory, equipment = null) {
  if (equipment) {
    for (const [slot, id] of ARMOR_LOADOUT) {
      if (equipment.slots[slot]) continue;
      inventory.add(id, 1);
      equipment.equip(inventory, id);
    }
    if (!equipment.hasShield()) {
      inventory.add('oak_shield', 1);
      equipment.equipShield(inventory, 'oak_shield');
    }
  }
  for (const [id, minimum] of PLAYTEST_KIT) {
    const missing = minimum - inventory.count(id);
    if (missing > 0) inventory.add(id, missing);
  }
  return inventory;
}
