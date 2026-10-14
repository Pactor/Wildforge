import { BLOCK, BLOCKS, isLiquidBlock, isSnowLayer, snowLayerLevel } from './blocks.js';

export const ITEMS = Object.freeze({
  stick: { name: 'Stick', color: 0x9a673b, category: 'material' },
  wooden_pickaxe: { name: 'Wooden Pickaxe', color: 0xb68750, category: 'tool', miningKind: 'pickaxe', miningSpeed: 2.25, miningTier: 0, durability: 60, repairMaterial: BLOCK.PLANKS, repairAmount: 24 },
  stone_pickaxe: { name: 'Stone Pickaxe', color: 0x858b8b, category: 'tool', miningKind: 'pickaxe', miningSpeed: 4, miningTier: 1, durability: 132, repairMaterial: BLOCK.STONE, repairAmount: 52 },
  iron_pickaxe: { name: 'Iron Pickaxe', color: 0xc9d0cf, category: 'tool', miningKind: 'pickaxe', miningSpeed: 6, miningTier: 2, durability: 251, repairMaterial: 'iron_ingot', repairAmount: 96 },
  wooden_axe: { name: 'Wooden Axe', color: 0xa87847, category: 'tool', miningKind: 'axe', miningSpeed: 2.25, attackDamage: 5, attackRecovery: 0.82, attackKnockback: 3.2, durability: 60, repairMaterial: BLOCK.PLANKS, repairAmount: 24 },
  stone_axe: { name: 'Stone Axe', color: 0x858b8b, category: 'tool', miningKind: 'axe', miningSpeed: 4, attackDamage: 6, attackRecovery: 0.86, attackKnockback: 3.35, durability: 132, repairMaterial: BLOCK.STONE, repairAmount: 52 },
  iron_axe: { name: 'Iron Axe', color: 0xc9d0cf, category: 'tool', miningKind: 'axe', miningSpeed: 6, attackDamage: 8, attackRecovery: 0.9, attackKnockback: 3.55, durability: 251, repairMaterial: 'iron_ingot', repairAmount: 96 },
  wooden_shovel: { name: 'Wooden Shovel', color: 0xad7c49, category: 'tool', miningKind: 'shovel', miningSpeed: 2.25, attackDamage: 3, durability: 60, repairMaterial: BLOCK.PLANKS, repairAmount: 24 },
  stone_shovel: { name: 'Stone Shovel', color: 0x858b8b, category: 'tool', miningKind: 'shovel', miningSpeed: 4, attackDamage: 3.5, durability: 132, repairMaterial: BLOCK.STONE, repairAmount: 52 },
  iron_shovel: { name: 'Iron Shovel', color: 0xc9d0cf, category: 'tool', miningKind: 'shovel', miningSpeed: 6, attackDamage: 4.5, durability: 251, repairMaterial: 'iron_ingot', repairAmount: 96 },
  wooden_sword: { name: 'Wooden Sword', color: 0xb68750, category: 'weapon', durability: 60, repairMaterial: BLOCK.PLANKS, repairAmount: 24 },
  stone_sword: { name: 'Stone Sword', color: 0x858b8b, category: 'weapon', durability: 132, repairMaterial: BLOCK.STONE, repairAmount: 52 },
  iron_sword: { name: 'Iron Sword', color: 0xd8dfde, category: 'weapon', durability: 251, repairMaterial: 'iron_ingot', repairAmount: 96 },
  iron_ingot: { name: 'Iron Ingot', color: 0xcbd0ca, category: 'material' },
  emberite_ingot: { name: 'Emberite Ingot', color: 0xe69b55, category: 'material' },
  voidglass_shard: { name: 'Voidglass Shard', color: 0x9e8ee8, category: 'material' },
  emberite_pickaxe: { name: 'Emberite Pickaxe', color: 0xe69b55, category: 'tool', miningKind: 'pickaxe', miningSpeed: 8, miningTier: 3, attackDamage: 5.5, durability: 176, repairMaterial: 'emberite_ingot', repairAmount: 68 },
  emberite_axe: { name: 'Emberite Axe', color: 0xe69b55, category: 'tool', miningKind: 'axe', miningSpeed: 8, attackDamage: 8.5, attackRecovery: 0.82, attackKnockback: 3.7, durability: 176, repairMaterial: 'emberite_ingot', repairAmount: 68 },
  emberite_shovel: { name: 'Emberite Shovel', color: 0xe69b55, category: 'tool', miningKind: 'shovel', miningSpeed: 8, attackDamage: 5, durability: 176, repairMaterial: 'emberite_ingot', repairAmount: 68 },
  emberite_hoe: { name: 'Emberite Hoe', color: 0xe69b55, category: 'tool', hoe: true, attackDamage: 3.5, durability: 176, repairMaterial: 'emberite_ingot', repairAmount: 68 },
  emberite_sword: { name: 'Emberite Sword', color: 0xe69b55, category: 'weapon', attackDamage: 8, attackRecovery: 0.5, attackKnockback: 3.7, durability: 176, repairMaterial: 'emberite_ingot', repairAmount: 68 },
  voidglass_pickaxe: { name: 'Voidglass Pickaxe', color: 0x9e8ee8, category: 'tool', miningKind: 'pickaxe', miningSpeed: 9.6, miningTier: 4, attackDamage: 6.5, durability: 780, repairMaterial: 'voidglass_shard', repairAmount: 260 },
  voidglass_axe: { name: 'Voidglass Axe', color: 0x9e8ee8, category: 'tool', miningKind: 'axe', miningSpeed: 9.6, attackDamage: 10, attackRecovery: 0.76, attackKnockback: 3.95, durability: 780, repairMaterial: 'voidglass_shard', repairAmount: 260 },
  voidglass_shovel: { name: 'Voidglass Shovel', color: 0x9e8ee8, category: 'tool', miningKind: 'shovel', miningSpeed: 9.6, attackDamage: 6, durability: 780, repairMaterial: 'voidglass_shard', repairAmount: 260 },
  voidglass_hoe: { name: 'Voidglass Hoe', color: 0x9e8ee8, category: 'tool', hoe: true, attackDamage: 4, durability: 780, repairMaterial: 'voidglass_shard', repairAmount: 260 },
  voidglass_sword: { name: 'Voidglass Sword', color: 0x9e8ee8, category: 'weapon', attackDamage: 10, attackRecovery: 0.47, attackKnockback: 4.05, durability: 780, repairMaterial: 'voidglass_shard', repairAmount: 260 },
  wooden_hoe: { name: 'Wooden Hoe', color: 0xa87748, category: 'tool', hoe: true, attackDamage: 2, durability: 60, repairMaterial: BLOCK.PLANKS, repairAmount: 24 },
  stone_hoe: { name: 'Stone Hoe', color: 0x858b8b, category: 'tool', hoe: true, attackDamage: 2.5, durability: 132, repairMaterial: BLOCK.STONE, repairAmount: 52 },
  iron_hoe: { name: 'Iron Hoe', color: 0xc9d0cf, category: 'tool', hoe: true, attackDamage: 3, durability: 251, repairMaterial: 'iron_ingot', repairAmount: 96 },
  wheat_seeds: { name: 'Wheat Seeds', color: 0x718f38, category: 'seed' },
  wheat: { name: 'Wheat', color: 0xd4b64b, category: 'material' },
  bramble_egg: { name: 'Bramblehen Egg', color: 0xd8c79b, category: 'material' },
  bramble_feather: { name: 'Bramble Feather', color: 0x78905b, category: 'material' },
  raw_bramble: { name: 'Raw Bramblehen', color: 0xb96f63, category: 'material' },
  roasted_bramble: { name: 'Roasted Bramblehen', color: 0xb16d3f, category: 'food', food: 6, saturation: 5 },
  baked_bramble_egg: { name: 'Baked Bramble Egg', color: 0xe7c96f, category: 'food', food: 4, saturation: 3 },
  amberroot_seed: { name: 'Amberroot Seed', color: 0x9b713a, category: 'seed' },
  amberroot: { name: 'Amberroot', color: 0xd68a35, category: 'food', food: 4, saturation: 2 },
  rimepod_seed: { name: 'Rimepod Seed', color: 0x79aa98, category: 'seed' },
  rimepod: { name: 'Rimepod', color: 0xb6e3d9, category: 'food', food: 2, saturation: 1 },
  roasted_rimepod: { name: 'Roasted Rimepod', color: 0x8fc5b4, category: 'food', food: 6, saturation: 5 },
  rimepot_stew: { name: 'Rimepot Stew', color: 0xc7d8ba, category: 'food', food: 10, saturation: 9 },
  emberbulb_cutting: { name: 'Emberbulb Cutting', color: 0xb9663c, category: 'seed' },
  emberbulb: { name: 'Emberbulb', color: 0xf07b3d, category: 'food', food: 3, saturation: 2 },
  roasted_emberbulb: { name: 'Roasted Emberbulb', color: 0xffa45b, category: 'food', food: 7, saturation: 6 },
  mossmilk_pail: { name: 'Mossmilk Pail', color: 0xd9e4c5, category: 'food', food: 5, saturation: 4, stackSize: 1, containerReturn: 'forged_pail' },
  hearthcurd: { name: 'Herbed Hearthcurd', color: 0xe5d49a, category: 'food', food: 8, saturation: 9 },
  rich_compost: { name: 'Rich Compost', color: 0x5c4b32, category: 'farming' },
  bread: { name: 'Bread', color: 0xc98a3d, category: 'food', food: 5, saturation: 3 },
  wooden_door: { name: 'Wooden Door', color: 0x9c6638, category: 'building' },
  oak_gate: { name: 'Oak Gate', color: 0xa87543, category: 'building' },
  oak_stairs: { name: 'Oak Stairs', color: 0xb0804c, category: 'building' },
  stone_stairs: { name: 'Stone Stairs', color: 0x858b8b, category: 'building' },
  oak_trapdoor: { name: 'Oak Trapdoor', color: 0xa87543, category: 'building' },
  oak_ladder: { name: 'Oak Ladder', color: 0xb0804c, category: 'building' },
  oak_shield: { name: 'Riveted Oak Shield', color: 0x9a7048, category: 'shield', durability: 240, repairMaterial: BLOCK.PLANKS, repairAmount: 72 },
  trail_saddle: { name: 'Trail Saddle', color: 0x8d5b3d, category: 'equipment' },
  tough_hide: { name: 'Tough Hide', color: 0x8d6547, category: 'material' },
  hide_helmet: { name: 'Tough Hide Hood', color: 0x9a7252, category: 'armor', slot: 'head', armor: 1, durability: 72, repairMaterial: 'tough_hide', repairAmount: 28 },
  hide_chestplate: { name: 'Tough Hide Tunic', color: 0x8c6247, category: 'armor', slot: 'chest', armor: 3, durability: 104, repairMaterial: 'tough_hide', repairAmount: 40 },
  hide_leggings: { name: 'Tough Hide Leggings', color: 0x835b42, category: 'armor', slot: 'legs', armor: 2, durability: 96, repairMaterial: 'tough_hide', repairAmount: 36 },
  hide_boots: { name: 'Tough Hide Boots', color: 0x704a37, category: 'armor', slot: 'feet', armor: 1, durability: 68, repairMaterial: 'tough_hide', repairAmount: 26 },
  iron_helmet: { name: 'Iron Helmet', color: 0xcbd2d1, category: 'armor', slot: 'head', armor: 2, durability: 166, repairMaterial: 'iron_ingot', repairAmount: 62 },
  iron_chestplate: { name: 'Iron Chestplate', color: 0xcbd2d1, category: 'armor', slot: 'chest', armor: 6, durability: 241, repairMaterial: 'iron_ingot', repairAmount: 90 },
  iron_leggings: { name: 'Iron Leggings', color: 0xcbd2d1, category: 'armor', slot: 'legs', armor: 5, durability: 226, repairMaterial: 'iron_ingot', repairAmount: 84 },
  iron_boots: { name: 'Iron Boots', color: 0xcbd2d1, category: 'armor', slot: 'feet', armor: 2, durability: 196, repairMaterial: 'iron_ingot', repairAmount: 72 },
  emberite_helmet: { name: 'Emberite Helm', color: 0xe69b55, category: 'armor', slot: 'head', armor: 2, durability: 142, repairMaterial: 'emberite_ingot', repairAmount: 54 },
  emberite_chestplate: { name: 'Emberite Cuirass', color: 0xe69b55, category: 'armor', slot: 'chest', armor: 5, durability: 206, repairMaterial: 'emberite_ingot', repairAmount: 78 },
  emberite_leggings: { name: 'Emberite Leggings', color: 0xe69b55, category: 'armor', slot: 'legs', armor: 4, durability: 190, repairMaterial: 'emberite_ingot', repairAmount: 72 },
  emberite_boots: { name: 'Emberite Boots', color: 0xe69b55, category: 'armor', slot: 'feet', armor: 2, durability: 134, repairMaterial: 'emberite_ingot', repairAmount: 50 },
  voidglass_helmet: { name: 'Voidglass Crown', color: 0x9e8ee8, category: 'armor', slot: 'head', armor: 3, durability: 418, repairMaterial: 'voidglass_shard', repairAmount: 142 },
  voidglass_chestplate: { name: 'Voidglass Carapace', color: 0x9e8ee8, category: 'armor', slot: 'chest', armor: 7, durability: 592, repairMaterial: 'voidglass_shard', repairAmount: 198 },
  voidglass_leggings: { name: 'Voidglass Leggings', color: 0x9e8ee8, category: 'armor', slot: 'legs', armor: 6, durability: 556, repairMaterial: 'voidglass_shard', repairAmount: 186 },
  voidglass_boots: { name: 'Voidglass Boots', color: 0x9e8ee8, category: 'armor', slot: 'feet', armor: 3, durability: 470, repairMaterial: 'voidglass_shard', repairAmount: 158 },
  frost_fang: { name: 'Frost Fang', color: 0xadd8e6, category: 'material' },
  coal: { name: 'Coal', color: 0x303435, category: 'material' },
  raw_meat: { name: 'Raw Grazer Meat', color: 0xb85f58, category: 'food' },
  cooked_meat: { name: 'Cooked Grazer Meat', color: 0x9d5835, category: 'food', food: 8, saturation: 5 },
  shadow_shard: { name: 'Shadow Shard', color: 0x594c80, category: 'material' },
  hush_resin: { name: 'Hush Resin', color: 0x9ccf62, category: 'material' },
  night_silk: { name: 'Night Silk', color: 0xc6c2ad, category: 'material' },
  silk_cord: { name: 'Silk Cord', color: 0xd8d5c2, category: 'material' },
  trail_tether: { name: 'Trail Tether', color: 0xd8d5c2, category: 'tool' },
  keepsake_frame: { name: 'Keepsake Frame', color: 0x9d7047, category: 'building' },
  tideclay_lump: { name: 'Tideclay Lump', color: 0x78949a, category: 'material' },
  fired_tidebrick: { name: 'Fired Tidebrick', color: 0x9d6455, category: 'material' },
  suncomb: { name: 'Suncomb', color: 0xe9b94d, category: 'food', food: 2, saturation: 2 },
  sunnectar_flask: { name: 'Sunnectar Flask', color: 0xf2c45b, category: 'food', food: 6, saturation: 8, containerReturn: 'empty_flask' },
  glob_resin: { name: 'Glob Resin', color: 0x76906a, category: 'material' },
  binding_compound: { name: 'Mason\'s Binder', color: 0x9a9477, category: 'material' },
  lumen_shard: { name: 'Lumen Shard', color: 0x74eee0, category: 'material' },
  tidefiber: { name: 'Tidefiber', color: 0x3a9c8d, category: 'material' },
  raw_glowkelp: { name: 'Raw Glowkelp', color: 0x55b978, category: 'material' },
  roasted_glowkelp: { name: 'Roasted Glowkelp', color: 0x82a852, category: 'food', food: 4, saturation: 2 },
  tide_rod: { name: 'Tide Rod', color: 0x729f91, category: 'tool', attackDamage: 2, durability: 96, repairMaterial: 'tidefiber', repairAmount: 36 },
  raw_silverfin: { name: 'Raw Silverfin', color: 0x91c7c8, category: 'food', food: 2, saturation: 1 },
  cooked_silverfin: { name: 'Cooked Silverfin', color: 0xc49a66, category: 'food', food: 6, saturation: 4 },
  sunpetal_dye: { name: 'Sunpetal Dye', color: 0xf0c64a, category: 'material' },
  ember_dye: { name: 'Ember Dye', color: 0xd85444, category: 'material' },
  windfiber: { name: 'Windfiber', color: 0x8bb36a, category: 'material' },
  windbow: { name: 'Windbow', color: 0x9f7849, category: 'weapon', durability: 280, repairMaterial: 'windfiber', repairAmount: 105 },
  arrow: { name: 'Stone-tipped Arrow', color: 0xc9b07a, category: 'ammunition' },
  flint: { name: 'Flint', color: 0x55595b, category: 'material' },
  spark_striker: { name: 'Spark Striker', color: 0xaeb6b4, category: 'tool', durability: 64, repairMaterial: 'iron_ingot', repairAmount: 24 },
  mosswool: { name: 'Mosswool', color: 0x839b69, category: 'material' },
  moss_shears: { name: 'Moss Shears', color: 0xbfc9c5, category: 'tool', miningKind: 'shears', miningSpeed: 7, durability: 96, repairMaterial: 'iron_ingot', repairAmount: 48 },
  grazer_jerky: { name: 'Wind-cured Grazer Jerky', color: 0x8f4939, category: 'food', food: 6, saturation: 7 },
  dried_silverfin: { name: 'Wind-dried Silverfin', color: 0x9b8467, category: 'food', food: 5, saturation: 6 },
  glowkelp_crisp: { name: 'Glowkelp Crisp', color: 0x769d50, category: 'food', food: 3, saturation: 4 },
  dried_ashcap: { name: 'Dried Ashcap', color: 0x906d54, category: 'food', food: 3, saturation: 5 },
  moss_bed: { name: 'Moss Bed', color: 0x78965b, category: 'building' },
  oak_sign: { name: 'Oak Sign', color: 0xb0804c, category: 'building' },
  oak_skiff: { name: 'Oak Skiff', color: 0x9b6739, category: 'vehicle' },
  lumen_spore: { name: 'Lumen Spore', color: 0x73e4cf, category: 'material' },
  raw_ashcap: { name: 'Raw Ashcap', color: 0xa77c61, category: 'food', food: 1, saturation: 0 },
  seared_ashcap: { name: 'Seared Ashcap', color: 0xc48c57, category: 'food', food: 5, saturation: 3 },
  thorn_spine: { name: 'Thorn Spine', color: 0xa6b769, category: 'material' },
  warden_sigil: { name: 'Warden Sigil', color: 0x9c75c9, category: 'ritual' },
  warden_core: { name: 'Hollow Warden Core', color: 0xb17be8, category: 'material' },
  warden_maul: { name: 'Hollow Warden Maul', color: 0x8870b5, category: 'weapon', attackDamage: 12, attackRecovery: 1.12, attackKnockback: 5.4, durability: 720, repairMaterial: 'voidglass_shard', repairAmount: 210 },
  echo_core: { name: 'Echo Sentinel Core', color: 0x70e8dd, category: 'material' },
  songstone_trail: { name: 'Songstone · Open Road', color: 0xd8b66b, accent: 0x31373b, category: 'treasure', stackSize: 1 },
  songstone_sun: { name: 'Songstone · Brass Horizon', color: 0xf1c85b, accent: 0x31373b, category: 'treasure', stackSize: 1 },
  songstone_hollow: { name: 'Songstone · Lanterns Below', color: 0x8cded2, accent: 0x31373b, category: 'treasure', stackSize: 1 },
  songstone_cinder: { name: 'Songstone · Emberwake', color: 0xed7d45, accent: 0x31373b, category: 'treasure', stackSize: 1 },
  echo_pickaxe: { name: 'Echo Chisel', color: 0x70e8dd, category: 'tool', miningKind: 'pickaxe', miningSpeed: 10.8, miningTier: 4, attackDamage: 7, attackRecovery: 0.62, attackKnockback: 3.8, durability: 640, repairMaterial: 'echo_core', repairAmount: 220 },
  spark_relay: { name: 'Spark Relay', color: 0xc29b52, category: 'automation' },
  forge_ram: { name: 'Forge Ram', color: 0x8b795e, category: 'automation' },
  pulse_sequencer: { name: 'Pulse Sequencer', color: 0xd5b866, category: 'automation' },
  forge_rail: { name: 'Forge Rail', color: 0x9f805c, category: 'transport' },
  powered_rail: { name: 'Drive Rail', color: 0xd59b43, category: 'transport' },
  forge_cart: { name: 'Forge Cart', color: 0x81746b, category: 'vehicle', stackSize: 1 },
  cargo_cart: { name: 'Cargo Cart', color: 0x9b6d3f, category: 'vehicle', stackSize: 1 },
  freight_loader: { name: 'Freight Loader', color: 0xa87945, category: 'automation' },
  freight_unloader: { name: 'Freight Unloader', color: 0x737b84, category: 'automation' },
  forge_ejector: { name: 'Forge Ejector', color: 0x899396, category: 'automation' },
  rune_dispenser: { name: 'Rune Dispenser', color: 0x73cfc4, category: 'automation' },
  change_sentry: { name: 'Change Sentry', color: 0xd3a353, category: 'automation' },
  binding_ram: { name: 'Binding Ram', color: 0x73cbb0, category: 'automation' },
  spark_inverter: { name: 'Spark Inverter', color: 0xe2aa4e, category: 'automation' },
  spark_comparator: { name: 'Spark Comparator', color: 0x70d9cc, category: 'automation' },
  forge_coupler: { name: 'Forge Coupler', color: 0xa98a62, category: 'transport' },
  hearthmark: { name: 'Hearthmark', color: 0xe4b95f, category: 'currency' },
  empty_flask: { name: 'Empty Expedition Flask', color: 0xb8e1df, category: 'material' },
  windstep_tonic: { name: 'Windstep Tonic', color: 0x8ed07a, category: 'tonic', effect: 'windstep' },
  stoneward_tonic: { name: 'Stoneward Tonic', color: 0x9fa7a2, category: 'tonic', effect: 'stoneward' },
  lumen_sight_tonic: { name: 'Lumen Sight Tonic', color: 0x73e4cf, category: 'tonic', effect: 'lumen_sight' },
  hearthmend_tonic: { name: 'Hearthmend Tonic', color: 0xe47865, category: 'tonic', effect: 'hearthmend' },
  cinderward_tonic: { name: 'Cinderward Tonic', color: 0xf07b3d, category: 'tonic', effect: 'cinderward' },
  ashglide_tonic: { name: 'Ashglide Tonic', color: 0xe89055, category: 'tonic', effect: 'ashglide' },
  forged_pail: { name: 'Empty Forged Pail', color: 0xb9c2c2, category: 'pail', contents: null, stackSize: 1 },
  water_pail: { name: 'Water Pail', color: 0x4f9bd5, category: 'pail', contents: 'water', stackSize: 1 },
  lava_pail: { name: 'Lava Pail', color: 0xf07b2d, category: 'pail', contents: 'lava', stackSize: 1 },
  snow_clump: { name: 'Snow Clump', color: 0xe9f3f5, category: 'material' },
  stormglass: { name: 'Stormglass Forecaster', color: 0x8ac8d2, category: 'tool', stackSize: 1 },
  wayfinder_compass: { name: 'Wayfinder Compass', color: 0xd6b35f, category: 'navigation', stackSize: 1 },
  chart_sheet: { name: 'Pressed Tidefiber Sheet', color: 0xd8c998, category: 'material' },
  lore_folio: { name: 'Bound Lore Folio', color: 0xc5a878, category: 'material' },
  trailchart: { name: 'Explored Trailchart', color: 0xcbb879, category: 'map', stackSize: 1 },
  cinder_shard: { name: 'Cinder Crystal', color: 0xf28a4f, category: 'material' },
  ashscale: { name: 'Ashscale', color: 0x78605a, category: 'material' },
  ember_gland: { name: 'Riftstalker Ember Gland', color: 0xe45b37, category: 'material' },
  ember_membrane: { name: 'Emberwing Membrane', color: 0xa66c5c, category: 'material' },
  suncrest_regalia: { name: 'Suncrest Regalia', color: 0xf0c64a, category: 'cosmetic', stackSize: 1, cosmetic: { primary: 0xf0c64a, secondary: 0xffefad, pattern: 'rays' } },
  emberline_regalia: { name: 'Emberline Regalia', color: 0xd85444, category: 'cosmetic', stackSize: 1, cosmetic: { primary: 0xd85444, secondary: 0xf2a34f, pattern: 'chevrons' } },
  frostveil_regalia: { name: 'Frostveil Regalia', color: 0x9edbea, category: 'cosmetic', stackSize: 1, cosmetic: { primary: 0x9edbea, secondary: 0xe9f3f5, pattern: 'bands' } },
  hollow_regalia: { name: 'Hollow Regalia', color: 0x8e6ac2, category: 'cosmetic', stackSize: 1, cosmetic: { primary: 0x8e6ac2, secondary: 0x73e4cf, pattern: 'runes' } },
});

export const RECIPES = Object.freeze([
  { id: 'planks', name: 'Oak Planks ×4', station: 'hand', ingredients: { [BLOCK.WOOD]: 1 }, output: { id: BLOCK.PLANKS, count: 4 } },
  { id: 'frostpine_planks', name: 'Frostpine Planks ×4', station: 'hand', ingredients: { [BLOCK.FROSTPINE_LOG]: 1 }, output: { id: BLOCK.PLANKS, count: 4 } },
  { id: 'tidegrass_bundle', name: 'Tidegrass Cutting', station: 'hand', ingredients: { tidefiber: 1 }, output: { id: BLOCK.TIDEGRASS, count: 1 } },
  { id: 'glowkelp_cutting', name: 'Glowkelp Cutting', station: 'hand', ingredients: { raw_glowkelp: 1 }, output: { id: BLOCK.GLOWKELP, count: 1 } },
  { id: 'tide_rod', name: 'Tide Rod', station: 'table', ingredients: { stick: 3, tidefiber: 2 }, output: { id: 'tide_rod', count: 1 } },
  { id: 'sticks', name: 'Sticks ×4', station: 'hand', ingredients: { [BLOCK.PLANKS]: 2 }, output: { id: 'stick', count: 4 } },
  { id: 'crafting_table', name: 'Crafting Table', station: 'hand', ingredients: { [BLOCK.PLANKS]: 4 }, output: { id: BLOCK.CRAFTING_TABLE, count: 1 } },
  { id: 'wood_pickaxe', name: 'Wooden Pickaxe', station: 'table', ingredients: { [BLOCK.PLANKS]: 3, stick: 2 }, output: { id: 'wooden_pickaxe', count: 1 } },
  { id: 'stone_pickaxe', name: 'Stone Pickaxe', station: 'table', ingredients: { [BLOCK.STONE]: 3, stick: 2 }, output: { id: 'stone_pickaxe', count: 1 } },
  { id: 'wood_axe', name: 'Wooden Axe', station: 'table', ingredients: { [BLOCK.PLANKS]: 3, stick: 2 }, output: { id: 'wooden_axe', count: 1 } },
  { id: 'stone_axe', name: 'Stone Axe', station: 'table', ingredients: { [BLOCK.STONE]: 3, stick: 2 }, output: { id: 'stone_axe', count: 1 } },
  { id: 'wood_shovel', name: 'Wooden Shovel', station: 'table', ingredients: { [BLOCK.PLANKS]: 1, stick: 2 }, output: { id: 'wooden_shovel', count: 1 } },
  { id: 'stone_shovel', name: 'Stone Shovel', station: 'table', ingredients: { [BLOCK.STONE]: 1, stick: 2 }, output: { id: 'stone_shovel', count: 1 } },
  { id: 'furnace', name: 'Stone Furnace', station: 'table', ingredients: { [BLOCK.STONE]: 8 }, output: { id: BLOCK.FURNACE, count: 1 } },
  { id: 'wood_sword', name: 'Wooden Sword', station: 'table', ingredients: { [BLOCK.PLANKS]: 2, stick: 1 }, output: { id: 'wooden_sword', count: 1 } },
  { id: 'stone_sword', name: 'Stone Sword', station: 'table', ingredients: { [BLOCK.STONE]: 2, stick: 1 }, output: { id: 'stone_sword', count: 1 } },
  { id: 'iron_pickaxe', name: 'Iron Pickaxe', station: 'table', ingredients: { iron_ingot: 3, stick: 2 }, output: { id: 'iron_pickaxe', count: 1 } },
  { id: 'iron_axe', name: 'Iron Axe', station: 'table', ingredients: { iron_ingot: 3, stick: 2 }, output: { id: 'iron_axe', count: 1 } },
  { id: 'iron_shovel', name: 'Iron Shovel', station: 'table', ingredients: { iron_ingot: 1, stick: 2 }, output: { id: 'iron_shovel', count: 1 } },
  { id: 'iron_sword', name: 'Iron Sword', station: 'table', ingredients: { iron_ingot: 2, stick: 1 }, output: { id: 'iron_sword', count: 1 } },
  { id: 'wood_hoe', name: 'Wooden Hoe', station: 'table', ingredients: { [BLOCK.PLANKS]: 2, stick: 2 }, output: { id: 'wooden_hoe', count: 1 } },
  { id: 'stone_hoe', name: 'Stone Hoe', station: 'table', ingredients: { [BLOCK.STONE]: 2, stick: 2 }, output: { id: 'stone_hoe', count: 1 } },
  { id: 'iron_hoe', name: 'Iron Hoe', station: 'table', ingredients: { iron_ingot: 2, stick: 2 }, output: { id: 'iron_hoe', count: 1 } },
  { id: 'bread', name: 'Bread', station: 'table', ingredients: { wheat: 3 }, output: { id: 'bread', count: 1 } },
  { id: 'rimepot_stew', name: 'Rimepot Stew', station: 'table', ingredients: { roasted_rimepod: 2, cooked_meat: 1, dried_ashcap: 1 }, output: { id: 'rimepot_stew', count: 1 } },
  { id: 'hearthcurd', name: 'Herbed Hearthcurd ×2', station: 'table', ingredients: { mossmilk_pail: 1, dried_ashcap: 1, amberroot: 1 }, output: { id: 'hearthcurd', count: 2 }, returns: { forged_pail: 1 } },
  { id: 'chest', name: 'Wooden Chest', station: 'table', ingredients: { [BLOCK.PLANKS]: 8 }, output: { id: BLOCK.CHEST, count: 1 } },
  { id: 'torches', name: 'Torches ×4', station: 'hand', ingredients: { coal: 1, stick: 1 }, output: { id: BLOCK.TORCH, count: 4 } },
  { id: 'lumen_lantern', name: 'Lumen Lantern', station: 'table', ingredients: { lumen_shard: 1, iron_ingot: 4, [BLOCK.GLASS]: 4 }, output: { id: BLOCK.LUMEN_LANTERN, count: 1 } },
  { id: 'doors', name: 'Wooden Doors ×3', station: 'table', ingredients: { [BLOCK.PLANKS]: 6 }, output: { id: 'wooden_door', count: 3 } },
  { id: 'sunpetal_dye', name: 'Sunpetal Dye ×2', station: 'hand', ingredients: { [BLOCK.SUNPETAL]: 1 }, output: { id: 'sunpetal_dye', count: 2 } },
  { id: 'ember_dye', name: 'Ember Dye ×2', station: 'hand', ingredients: { [BLOCK.EMBERBELL]: 1 }, output: { id: 'ember_dye', count: 2 } },
  { id: 'windfiber', name: 'Windfiber ×3', station: 'hand', ingredients: { [BLOCK.WINDGRASS]: 3 }, output: { id: 'windfiber', count: 3 } },
  { id: 'silk_cord', name: 'Silk Cord ×3', station: 'hand', ingredients: { night_silk: 2 }, output: { id: 'silk_cord', count: 3 } },
  { id: 'silkframe_scaffolds', name: 'Silkframe Scaffolds ×6', station: 'table', ingredients: { stick: 6, silk_cord: 3 }, output: { id: BLOCK.SILKFRAME_SCAFFOLD, count: 6 } },
  { id: 'trail_tethers', name: 'Trail Tethers ×2', station: 'table', ingredients: { silk_cord: 4, glob_resin: 1 }, output: { id: 'trail_tether', count: 2 } },
  { id: 'sunhive', name: 'Sunhive', station: 'table', ingredients: { [BLOCK.PLANKS]: 6, silk_cord: 3 }, output: { id: BLOCK.SUNHIVE_0, count: 1 } },
  { id: 'forged_iron_block', name: 'Forged Iron Block', station: 'table', ingredients: { iron_ingot: 9 }, output: { id: BLOCK.FORGED_IRON_BLOCK, count: 1 } },
  { id: 'unpack_forged_iron', name: 'Iron Ingots ×9', station: 'hand', ingredients: { [BLOCK.FORGED_IRON_BLOCK]: 1 }, output: { id: 'iron_ingot', count: 9 } },
  { id: 'hearthguard_core', name: 'Hearthguard Core', station: 'table', ingredients: { iron_ingot: 4, [BLOCK.PLANKS]: 4, lumen_shard: 1 }, output: { id: BLOCK.HEARTHGUARD_CORE, count: 1 } },
  { id: 'keepsake_frames', name: 'Keepsake Frames ×4', station: 'table', ingredients: { stick: 8, tough_hide: 1 }, output: { id: 'keepsake_frame', count: 4 } },
  { id: 'outfitter_stand', name: 'Outfitter Stand', station: 'table', ingredients: { stick: 6, [BLOCK.STONE_SLAB]: 1 }, output: { id: BLOCK.OUTFITTER_STAND, count: 1 } },
  { id: 'tidebrick_block', name: 'Fired Tidebrick Block', station: 'hand', ingredients: { fired_tidebrick: 4 }, output: { id: BLOCK.TIDEBRICK, count: 1 } },
  { id: 'hearthpot', name: 'Hearthpot', station: 'table', ingredients: { fired_tidebrick: 3 }, output: { id: BLOCK.HEARTHPOT, count: 1 } },
  { id: 'natural_mossweave', name: 'Natural Mossweave', station: 'hand', ingredients: { mosswool: 4 }, output: { id: BLOCK.MOSSWEAVE_NATURAL, count: 1 } },
  { id: 'sun_mossweave', name: 'Sun Mossweave', station: 'hand', ingredients: { [BLOCK.MOSSWEAVE_NATURAL]: 1, sunpetal_dye: 1 }, output: { id: BLOCK.MOSSWEAVE_SUN, count: 1 } },
  { id: 'ember_mossweave', name: 'Ember Mossweave', station: 'hand', ingredients: { [BLOCK.MOSSWEAVE_NATURAL]: 1, ember_dye: 1 }, output: { id: BLOCK.MOSSWEAVE_EMBER, count: 1 } },
  { id: 'frost_mossweave', name: 'Frost Mossweave', station: 'hand', ingredients: { [BLOCK.MOSSWEAVE_NATURAL]: 1, snow_clump: 1 }, output: { id: BLOCK.MOSSWEAVE_FROST, count: 1 } },
  { id: 'hollow_mossweave', name: 'Hollow Mossweave', station: 'table', ingredients: { [BLOCK.MOSSWEAVE_NATURAL]: 1, shadow_shard: 1, lumen_spore: 1 }, output: { id: BLOCK.MOSSWEAVE_HOLLOW, count: 1 } },
  { id: 'natural_mossweave_carpet', name: 'Natural Mossweave Carpet ×3', station: 'hand', ingredients: { [BLOCK.MOSSWEAVE_NATURAL]: 2 }, output: { id: BLOCK.MOSSWEAVE_CARPET_NATURAL, count: 3 } },
  { id: 'sun_mossweave_carpet', name: 'Sun Mossweave Carpet ×3', station: 'hand', ingredients: { [BLOCK.MOSSWEAVE_SUN]: 2 }, output: { id: BLOCK.MOSSWEAVE_CARPET_SUN, count: 3 } },
  { id: 'ember_mossweave_carpet', name: 'Ember Mossweave Carpet ×3', station: 'hand', ingredients: { [BLOCK.MOSSWEAVE_EMBER]: 2 }, output: { id: BLOCK.MOSSWEAVE_CARPET_EMBER, count: 3 } },
  { id: 'frost_mossweave_carpet', name: 'Frost Mossweave Carpet ×3', station: 'hand', ingredients: { [BLOCK.MOSSWEAVE_FROST]: 2 }, output: { id: BLOCK.MOSSWEAVE_CARPET_FROST, count: 3 } },
  { id: 'hollow_mossweave_carpet', name: 'Hollow Mossweave Carpet ×3', station: 'hand', ingredients: { [BLOCK.MOSSWEAVE_HOLLOW]: 2 }, output: { id: BLOCK.MOSSWEAVE_CARPET_HOLLOW, count: 3 } },
  { id: 'tidebrick_mosaic', name: 'Tidebrick Mosaic ×4', station: 'table', ingredients: { [BLOCK.TIDEBRICK]: 4, lumen_shard: 1 }, output: { id: BLOCK.TIDEBRICK_MOSAIC, count: 4 } },
  { id: 'natural_trail_banner', name: 'Natural Trail Banner', station: 'table', ingredients: { [BLOCK.MOSSWEAVE_NATURAL]: 6, stick: 1 }, output: { id: BLOCK.TRAIL_BANNER_NATURAL, count: 1 } },
  { id: 'sun_trail_banner', name: 'Sun Trail Banner', station: 'table', ingredients: { [BLOCK.MOSSWEAVE_SUN]: 6, stick: 1 }, output: { id: BLOCK.TRAIL_BANNER_SUN, count: 1 } },
  { id: 'ember_trail_banner', name: 'Ember Trail Banner', station: 'table', ingredients: { [BLOCK.MOSSWEAVE_EMBER]: 6, stick: 1 }, output: { id: BLOCK.TRAIL_BANNER_EMBER, count: 1 } },
  { id: 'frost_trail_banner', name: 'Frost Trail Banner', station: 'table', ingredients: { [BLOCK.MOSSWEAVE_FROST]: 6, stick: 1 }, output: { id: BLOCK.TRAIL_BANNER_FROST, count: 1 } },
  { id: 'hollow_trail_banner', name: 'Hollow Trail Banner', station: 'table', ingredients: { [BLOCK.MOSSWEAVE_HOLLOW]: 6, stick: 1 }, output: { id: BLOCK.TRAIL_BANNER_HOLLOW, count: 1 } },
  { id: 'raincatch_basin', name: 'Raincatch Basin', station: 'table', ingredients: { iron_ingot: 7 }, output: { id: BLOCK.RAINCATCH_BASIN_0, count: 1 } },
  { id: 'lore_folios', name: 'Bound Lore Folios ×3', station: 'table', ingredients: { chart_sheet: 3, tough_hide: 1 }, output: { id: 'lore_folio', count: 3 } },
  { id: 'archive_shelf', name: 'Archive Shelf', station: 'table', ingredients: { [BLOCK.PLANKS]: 6, lore_folio: 3 }, output: { id: BLOCK.ARCHIVE_SHELF, count: 1 } },
  { id: 'infusion_still', name: 'Infusion Still', station: 'table', ingredients: { [BLOCK.TIDEBRICK]: 3, iron_ingot: 2, [BLOCK.GLASS]: 1, lumen_shard: 1 }, output: { id: BLOCK.INFUSION_STILL, count: 1 } },
  { id: 'forgeheart_anvil', name: 'Forgeheart Anvil', station: 'table', ingredients: { iron_ingot: 4, emberite_ingot: 1, lumen_shard: 1, [BLOCK.STONE_SLAB]: 3 }, output: { id: BLOCK.FORGEHEART_ANVIL, count: 1 } },
  { id: 'runegrind_wheel', name: 'Runegrind Wheel', station: 'table', ingredients: { stick: 2, [BLOCK.STONE_SLAB]: 1, [BLOCK.PLANKS]: 2 }, output: { id: BLOCK.RUNEGRIND_WHEEL, count: 1 } },
  { id: 'stonewright_cutter', name: 'Stonewright Cutter', station: 'table', ingredients: { iron_ingot: 2, [BLOCK.STONE_SLAB]: 3, [BLOCK.PLANKS]: 2 }, output: { id: BLOCK.STONEWRIGHT_CUTTER, count: 1 } },
  { id: 'forge_kiln', name: 'Forge Kiln', station: 'table', ingredients: { iron_ingot: 5, [BLOCK.FURNACE]: 1, [BLOCK.POLISHED_STONE]: 3 }, output: { id: BLOCK.FORGE_KILN, count: 1 } },
  { id: 'hearth_smoker', name: 'Hearth Smoker', station: 'table', ingredients: { [BLOCK.WOOD]: 4, [BLOCK.FURNACE]: 1 }, output: { id: BLOCK.HEARTH_SMOKER, count: 1 } },
  { id: 'wayvault_chest', name: 'Wayvault Chest', station: 'table', ingredients: { voidglass_shard: 8, lumen_shard: 1 }, output: { id: BLOCK.WAYVAULT_CHEST, count: 1 } },
  { id: 'glass_panes', name: 'Glass Panes ×16', station: 'table', ingredients: { [BLOCK.GLASS]: 6 }, output: { id: BLOCK.GLASS_PANE, count: 16 } },
  { id: 'forged_lattice', name: 'Forged Lattice ×16', station: 'table', ingredients: { iron_ingot: 6 }, output: { id: BLOCK.FORGED_LATTICE, count: 16 } },
  { id: 'hearthcake', name: 'Hearthcake · 7 servings', station: 'table', ingredients: { mossmilk_pail: 2, bramble_egg: 1, suncomb: 2, wheat: 3 }, output: { id: BLOCK.HEARTHCAKE_FULL, count: 1 }, returns: { forged_pail: 2 } },
  { id: 'trailbarrel', name: 'Trailbarrel', station: 'table', ingredients: { [BLOCK.PLANKS]: 6, [BLOCK.WOOD_SLAB]: 2 }, output: { id: BLOCK.TRAILBARREL, count: 1 } },
  { id: 'resonance_box', name: 'Resonance Box', station: 'table', ingredients: { [BLOCK.PLANKS]: 8, lumen_shard: 1 }, output: { id: BLOCK.RESONANCE_BOX, count: 1 } },
  { id: 'waystar', name: 'Waystar', station: 'table', ingredients: { [BLOCK.GLASS]: 5, voidglass_shard: 3, warden_core: 1 }, output: { id: BLOCK.WAYSTAR, count: 1 } },
  { id: 'hearthsong_player', name: 'Hearthsong Player', station: 'table', ingredients: { [BLOCK.PLANKS]: 8, echo_core: 1 }, output: { id: BLOCK.HEARTHSONG_PLAYER, count: 1 } },
  { id: 'forge_funnel', name: 'Forge Funnel', station: 'table', ingredients: { iron_ingot: 5, [BLOCK.CHEST]: 1 }, output: { id: BLOCK.FORGE_FUNNEL_DOWN, count: 1 } },
  { id: 'binding_compound', name: 'Mason\'s Binder ×2', station: 'hand', ingredients: { glob_resin: 2, [BLOCK.SAND]: 1 }, output: { id: 'binding_compound', count: 2 } },
  { id: 'windbow', name: 'Windbow', station: 'table', ingredients: { stick: 3, windfiber: 3 }, output: { id: 'windbow', count: 1 } },
  { id: 'silk_windbow', name: 'Silkbound Windbow', station: 'table', ingredients: { stick: 3, silk_cord: 3 }, output: { id: 'windbow', count: 1 } },
  { id: 'arrows', name: 'Stone-tipped Arrows ×4', station: 'table', ingredients: { [BLOCK.STONE]: 1, stick: 1 }, output: { id: 'arrow', count: 4 } },
  { id: 'bramble_arrows', name: 'Bramble Arrows ×4', station: 'table', ingredients: { flint: 1, stick: 1, bramble_feather: 1 }, output: { id: 'arrow', count: 4 } },
  { id: 'thorn_arrows', name: 'Thorn Arrows ×4', station: 'hand', ingredients: { thorn_spine: 1, stick: 1 }, output: { id: 'arrow', count: 4 } },
  { id: 'flint_arrows', name: 'Flint Arrows ×6', station: 'table', ingredients: { flint: 1, stick: 1, windfiber: 1 }, output: { id: 'arrow', count: 6 } },
  { id: 'spark_striker', name: 'Spark Striker', station: 'hand', ingredients: { flint: 1, iron_ingot: 1 }, output: { id: 'spark_striker', count: 1 } },
  { id: 'blast_keg', name: 'Blast Keg', station: 'table', ingredients: { [BLOCK.SAND]: 4, shadow_shard: 4, [BLOCK.PLANKS]: 1 }, output: { id: BLOCK.BLAST_KEG, count: 1 } },
  { id: 'hush_blast_keg', name: 'Hush Resin Blast Keg', station: 'table', ingredients: { [BLOCK.SAND]: 4, hush_resin: 4, [BLOCK.PLANKS]: 1 }, output: { id: BLOCK.BLAST_KEG, count: 1 } },
  { id: 'moss_bed', name: 'Moss Bed', station: 'table', ingredients: { [BLOCK.PLANKS]: 3, mosswool: 3 }, output: { id: 'moss_bed', count: 1 } },
  { id: 'moss_shears', name: 'Moss Shears', station: 'table', ingredients: { iron_ingot: 2 }, output: { id: 'moss_shears', count: 1 } },
  { id: 'drying_rack', name: 'Windrack', station: 'table', ingredients: { [BLOCK.PLANKS]: 2, stick: 4, windfiber: 2 }, output: { id: BLOCK.DRYING_RACK, count: 1 } },
  { id: 'silk_drying_rack', name: 'Silkbound Windrack', station: 'table', ingredients: { [BLOCK.PLANKS]: 2, stick: 4, silk_cord: 2 }, output: { id: BLOCK.DRYING_RACK, count: 1 } },
  { id: 'oak_signs', name: 'Oak Signs ×3', station: 'table', ingredients: { [BLOCK.PLANKS]: 6, stick: 1 }, output: { id: 'oak_sign', count: 3 } },
  { id: 'oak_skiff', name: 'Oak Skiff', station: 'table', ingredients: { [BLOCK.PLANKS]: 5 }, output: { id: 'oak_skiff', count: 1 } },
  { id: 'lumen_bloom', name: 'Lumen Bloom', station: 'hand', ingredients: { lumen_spore: 2 }, output: { id: BLOCK.LUMEN_BLOOM, count: 1 } },
  { id: 'ashcap_cutting', name: 'Ashcap', station: 'hand', ingredients: { raw_ashcap: 1 }, output: { id: BLOCK.ASHCAP, count: 1 } },
  { id: 'stone_slabs', name: 'Stone Slabs ×6', station: 'table', ingredients: { [BLOCK.STONE]: 3 }, output: { id: BLOCK.STONE_SLAB, count: 6 } },
  { id: 'wood_slabs', name: 'Oak Slabs ×6', station: 'table', ingredients: { [BLOCK.PLANKS]: 3 }, output: { id: BLOCK.WOOD_SLAB, count: 6 } },
  { id: 'compost_bin', name: 'Compost Bin', station: 'table', ingredients: { [BLOCK.WOOD_SLAB]: 7 }, output: { id: BLOCK.COMPOSTER_0, count: 1 } },
  { id: 'repair_bench', name: 'Repair Bench', station: 'table', ingredients: { iron_ingot: 4, [BLOCK.STONE_SLAB]: 3 }, output: { id: BLOCK.REPAIR_BENCH, count: 1 } },
  { id: 'runeforge', name: 'Runeforge', station: 'table', ingredients: { voidglass_shard: 2, lumen_shard: 3, [BLOCK.STONE]: 4 }, output: { id: BLOCK.RUNEFORGE, count: 1 } },
  { id: 'oak_fences', name: 'Oak Fences ×3', station: 'table', ingredients: { [BLOCK.PLANKS]: 4, stick: 2 }, output: { id: BLOCK.OAK_FENCE, count: 3 } },
  { id: 'oak_gate', name: 'Oak Gate', station: 'table', ingredients: { [BLOCK.PLANKS]: 2, stick: 4 }, output: { id: 'oak_gate', count: 1 } },
  { id: 'stone_walls', name: 'Stone Walls ×6', station: 'table', ingredients: { [BLOCK.STONE]: 6 }, output: { id: BLOCK.STONE_WALL, count: 6 } },
  { id: 'bound_stone_walls', name: 'Bound Stone Walls ×6', station: 'table', ingredients: { [BLOCK.STONE]: 3, binding_compound: 1 }, output: { id: BLOCK.STONE_WALL, count: 6 } },
  { id: 'oak_stairs', name: 'Oak Stairs ×4', station: 'table', ingredients: { [BLOCK.PLANKS]: 6 }, output: { id: 'oak_stairs', count: 4 } },
  { id: 'stone_stairs', name: 'Stone Stairs ×4', station: 'table', ingredients: { [BLOCK.STONE]: 6 }, output: { id: 'stone_stairs', count: 4 } },
  { id: 'oak_trapdoors', name: 'Oak Trapdoors ×2', station: 'table', ingredients: { [BLOCK.PLANKS]: 6 }, output: { id: 'oak_trapdoor', count: 2 } },
  { id: 'oak_ladders', name: 'Oak Ladders ×3', station: 'table', ingredients: { stick: 7 }, output: { id: 'oak_ladder', count: 3 } },
  { id: 'oak_shield', name: 'Riveted Oak Shield', station: 'table', ingredients: { [BLOCK.PLANKS]: 6, iron_ingot: 1 }, output: { id: 'oak_shield', count: 1 } },
  { id: 'trail_saddle', name: 'Trail Saddle', station: 'table', ingredients: { tough_hide: 3, iron_ingot: 2, windfiber: 2 }, output: { id: 'trail_saddle', count: 1 } },
  { id: 'warden_sigil', name: 'Warden Sigil', station: 'table', ingredients: { shadow_shard: 4, lumen_shard: 3, voidglass_shard: 1 }, output: { id: 'warden_sigil', count: 1 } },
  { id: 'warden_maul', name: 'Hollow Warden Maul', station: 'table', ingredients: { warden_core: 1, voidglass_shard: 2, stick: 2 }, output: { id: 'warden_maul', count: 1 } },
  { id: 'echo_pickaxe', name: 'Echo Chisel', station: 'table', ingredients: { echo_core: 1, voidglass_shard: 2, stick: 2 }, output: { id: 'echo_pickaxe', count: 1 } },
  { id: 'spark_switch', name: 'Spark Switch', station: 'table', ingredients: { [BLOCK.STONE]: 2, stick: 1, emberite_ingot: 1 }, output: { id: BLOCK.SPARK_SWITCH_OFF, count: 1 } },
  { id: 'sunwire', name: 'Sunwire Conduit ×8', station: 'table', ingredients: { windfiber: 2, lumen_shard: 1 }, output: { id: BLOCK.SUNWIRE_OFF, count: 8 } },
  { id: 'forge_lamp', name: 'Forge Lamp', station: 'table', ingredients: { [BLOCK.GLASS]: 4, iron_ingot: 4, lumen_shard: 1 }, output: { id: BLOCK.FORGE_LAMP_OFF, count: 1 } },
  { id: 'trail_plate', name: 'Trail Plate', station: 'table', ingredients: { [BLOCK.STONE_SLAB]: 2, iron_ingot: 1, windfiber: 1 }, output: { id: BLOCK.TRAIL_PLATE_OFF, count: 1 } },
  { id: 'sun_eye', name: 'Sun Eye', station: 'table', ingredients: { [BLOCK.GLASS]: 3, lumen_shard: 1, sunpetal_dye: 1 }, output: { id: BLOCK.SUN_EYE_OFF, count: 1 } },
  { id: 'spark_relay', name: 'Spark Relay', station: 'table', ingredients: { [BLOCK.STONE_SLAB]: 2, iron_ingot: 2, lumen_shard: 1 }, output: { id: 'spark_relay', count: 1 } },
  { id: 'forge_ram', name: 'Forge Ram', station: 'table', ingredients: { [BLOCK.STONE]: 3, iron_ingot: 4, emberite_ingot: 1 }, output: { id: 'forge_ram', count: 1 } },
  { id: 'pulse_sequencer', name: 'Pulse Sequencer', station: 'table', ingredients: { [BLOCK.STONE_SLAB]: 2, iron_ingot: 2, lumen_shard: 2, windfiber: 1 }, output: { id: 'pulse_sequencer', count: 1 } },
  { id: 'forge_rails', name: 'Forge Rails ×16', station: 'table', ingredients: { iron_ingot: 6, stick: 1 }, output: { id: 'forge_rail', count: 16 } },
  { id: 'powered_rails', name: 'Drive Rails ×6', station: 'table', ingredients: { iron_ingot: 4, emberite_ingot: 1, lumen_shard: 1 }, output: { id: 'powered_rail', count: 6 } },
  { id: 'forge_cart', name: 'Forge Cart', station: 'table', ingredients: { iron_ingot: 5, [BLOCK.PLANKS]: 2 }, output: { id: 'forge_cart', count: 1 } },
  { id: 'cargo_cart', name: 'Cargo Cart', station: 'table', ingredients: { forge_cart: 1, [BLOCK.CHEST]: 1 }, output: { id: 'cargo_cart', count: 1 } },
  { id: 'freight_loader', name: 'Freight Loader', station: 'table', ingredients: { iron_ingot: 3, [BLOCK.CHEST]: 1, lumen_shard: 1 }, output: { id: 'freight_loader', count: 1 } },
  { id: 'freight_unloader', name: 'Freight Unloader', station: 'table', ingredients: { iron_ingot: 3, [BLOCK.CHEST]: 1, lumen_shard: 1 }, output: { id: 'freight_unloader', count: 1 } },
  { id: 'forge_ejector', name: 'Forge Ejector', station: 'table', ingredients: { [BLOCK.STONE]: 7, lumen_shard: 1 }, output: { id: 'forge_ejector', count: 1 } },
  { id: 'rune_dispenser', name: 'Rune Dispenser', station: 'table', ingredients: { forge_ejector: 1, windbow: 1, lumen_shard: 2 }, output: { id: 'rune_dispenser', count: 1 } },
  { id: 'change_sentry', name: 'Change Sentry', station: 'table', ingredients: { [BLOCK.STONE]: 6, [BLOCK.SUNWIRE_OFF]: 2, lumen_shard: 1 }, output: { id: 'change_sentry', count: 1 } },
  { id: 'binding_ram', name: 'Binding Ram', station: 'table', ingredients: { forge_ram: 1, binding_compound: 1 }, output: { id: 'binding_ram', count: 1 } },
  { id: 'spark_inverter', name: 'Spark Inverter', station: 'table', ingredients: { [BLOCK.TORCH]: 1, [BLOCK.SUNWIRE_OFF]: 1, [BLOCK.STONE_SLAB]: 1, lumen_shard: 2 }, output: { id: 'spark_inverter', count: 1 } },
  { id: 'spark_comparator', name: 'Spark Comparator', station: 'table', ingredients: { [BLOCK.TORCH]: 3, [BLOCK.STONE_SLAB]: 3, lumen_shard: 1 }, output: { id: 'spark_comparator', count: 1 } },
  { id: 'forge_couplers', name: 'Forge Couplers ×2', station: 'table', ingredients: { iron_ingot: 2, windfiber: 1 }, output: { id: 'forge_coupler', count: 2 } },
  { id: 'bound_forge_couplers', name: 'Bound Forge Couplers ×2', station: 'table', ingredients: { iron_ingot: 2, binding_compound: 1 }, output: { id: 'forge_coupler', count: 2 } },
  { id: 'charter_post', name: 'Dormant Charter Post', station: 'table', ingredients: { [BLOCK.WOOD]: 2, [BLOCK.PLANKS]: 2, iron_ingot: 1, hearthmark: 2 }, output: { id: BLOCK.CHARTER_POST_DORMANT, count: 1 } },
  { id: 'hearthfire', name: 'Hearthfire', station: 'table', ingredients: { [BLOCK.WOOD]: 3, stick: 3, coal: 1 }, output: { id: BLOCK.HEARTHFIRE_UNLIT, count: 1 } },
  { id: 'empty_flasks', name: 'Expedition Flasks ×3', station: 'table', ingredients: { [BLOCK.GLASS]: 3 }, output: { id: 'empty_flask', count: 3 } },
  { id: 'forged_pail', name: 'Forged Pail', station: 'table', ingredients: { iron_ingot: 3 }, output: { id: 'forged_pail', count: 1 } },
  { id: 'packed_snow', name: 'Snow Block', station: 'hand', ingredients: { snow_clump: 4 }, output: { id: BLOCK.SNOW, count: 1 } },
  { id: 'stormglass', name: 'Stormglass Forecaster', station: 'table', ingredients: { [BLOCK.GLASS]: 4, iron_ingot: 2, lumen_shard: 1 }, output: { id: 'stormglass', count: 1 } },
  { id: 'wayfinder_compass', name: 'Wayfinder Compass', station: 'table', ingredients: { iron_ingot: 4, lumen_shard: 1 }, output: { id: 'wayfinder_compass', count: 1 } },
  { id: 'chart_sheets', name: 'Pressed Tidefiber Sheets ×3', station: 'table', ingredients: { tidefiber: 3 }, output: { id: 'chart_sheet', count: 3 } },
  { id: 'trailchart', name: 'Explored Trailchart', station: 'table', ingredients: { chart_sheet: 8, wayfinder_compass: 1 }, output: { id: 'trailchart', count: 1 }, returns: { wayfinder_compass: 1 } },
  { id: 'cinder_gate', name: 'Cinder Gate', station: 'table', ingredients: { voidglass_shard: 4, emberite_ingot: 4, warden_core: 1 }, output: { id: BLOCK.CINDER_GATE, count: 1 } },
  { id: 'suncrest_regalia', name: 'Suncrest Regalia', station: 'table', ingredients: { sunpetal_dye: 2, windfiber: 2, lumen_shard: 1 }, output: { id: 'suncrest_regalia', count: 1 } },
  { id: 'emberline_regalia', name: 'Emberline Regalia', station: 'table', ingredients: { ember_dye: 2, tough_hide: 3, emberite_ingot: 1 }, output: { id: 'emberline_regalia', count: 1 } },
  { id: 'frostveil_regalia', name: 'Frostveil Regalia', station: 'table', ingredients: { frost_fang: 2, snow_clump: 3, tidefiber: 2 }, output: { id: 'frostveil_regalia', count: 1 } },
  { id: 'hollow_regalia', name: 'Hollow Regalia', station: 'table', ingredients: { shadow_shard: 4, lumen_spore: 2, lumen_shard: 1, voidglass_shard: 1 }, output: { id: 'hollow_regalia', count: 1 } },
  { id: 'windstep_tonic', name: 'Windstep Tonic', station: 'still', ingredients: { empty_flask: 1, windfiber: 2, sunpetal_dye: 1 }, output: { id: 'windstep_tonic', count: 1 } },
  { id: 'stoneward_tonic', name: 'Stoneward Tonic', station: 'still', ingredients: { empty_flask: 1, [BLOCK.ROOTSTONE]: 2, raw_ashcap: 1 }, output: { id: 'stoneward_tonic', count: 1 } },
  { id: 'lumen_sight_tonic', name: 'Lumen Sight Tonic', station: 'still', ingredients: { empty_flask: 1, lumen_shard: 2, raw_glowkelp: 1 }, output: { id: 'lumen_sight_tonic', count: 1 } },
  { id: 'hearthmend_tonic', name: 'Hearthmend Tonic', station: 'still', ingredients: { empty_flask: 1, amberroot: 2, lumen_spore: 1 }, output: { id: 'hearthmend_tonic', count: 1 } },
  { id: 'cinderward_tonic', name: 'Cinderward Tonic', station: 'still', ingredients: { empty_flask: 1, ashscale: 2, ember_gland: 1, cinder_shard: 1 }, output: { id: 'cinderward_tonic', count: 1 } },
  { id: 'ashglide_tonic', name: 'Ashglide Tonic', station: 'still', ingredients: { empty_flask: 1, ember_membrane: 2, cinder_shard: 1, emberbulb: 1 }, output: { id: 'ashglide_tonic', count: 1 } },
  { id: 'hide_helmet', name: 'Tough Hide Hood', station: 'table', ingredients: { tough_hide: 5 }, output: { id: 'hide_helmet', count: 1 } },
  { id: 'hide_chestplate', name: 'Tough Hide Tunic', station: 'table', ingredients: { tough_hide: 8 }, output: { id: 'hide_chestplate', count: 1 } },
  { id: 'hide_leggings', name: 'Tough Hide Leggings', station: 'table', ingredients: { tough_hide: 7 }, output: { id: 'hide_leggings', count: 1 } },
  { id: 'hide_boots', name: 'Tough Hide Boots', station: 'table', ingredients: { tough_hide: 4 }, output: { id: 'hide_boots', count: 1 } },
  { id: 'iron_helmet', name: 'Iron Helmet', station: 'table', ingredients: { iron_ingot: 5 }, output: { id: 'iron_helmet', count: 1 } },
  { id: 'iron_chestplate', name: 'Iron Chestplate', station: 'table', ingredients: { iron_ingot: 8 }, output: { id: 'iron_chestplate', count: 1 } },
  { id: 'iron_leggings', name: 'Iron Leggings', station: 'table', ingredients: { iron_ingot: 7 }, output: { id: 'iron_leggings', count: 1 } },
  { id: 'iron_boots', name: 'Iron Boots', station: 'table', ingredients: { iron_ingot: 4 }, output: { id: 'iron_boots', count: 1 } },
]);

const keyFor = (id) => String(id);
const sanitizedEnchantments = (entries) => Array.isArray(entries) ? entries
  .filter((entry) => typeof entry?.id === 'string' && Number.isFinite(entry.level) && entry.level > 0)
  .map((entry) => ({ id: entry.id, level: Math.max(1, Math.min(3, Math.floor(entry.level))) })) : [];

export function itemDefinition(id) {
  const numeric = Number(id);
  return Number.isInteger(numeric) && BLOCKS[numeric] ? BLOCKS[numeric] : ITEMS[id];
}

export function itemStackSize(id) {
  const definition = itemDefinition(id);
  return definition?.durability ? 1 : definition?.stackSize ?? 64;
}

export class Inventory {
  constructor(serialized = null) {
    this.counts = new Map();
    this.durabilityQueues = new Map();
    this.enchantmentQueues = new Map();
    if (serialized?.counts && Array.isArray(serialized.counts)) {
      for (const [id, count] of serialized.counts) {
        if (Number.isFinite(count) && count > 0) this.counts.set(keyFor(id), Math.floor(count));
      }
    }
    for (const [id, values] of serialized?.durability || []) {
      if (!Array.isArray(values) || !itemDefinition(id)?.durability) continue;
      this.durabilityQueues.set(keyFor(id), values.filter(Number.isFinite).map((value) => Math.floor(value)));
    }
    for (const [id, values] of serialized?.enchantments || []) {
      if (!Array.isArray(values) || !itemDefinition(id)?.durability) continue;
      this.enchantmentQueues.set(keyFor(id), values.map(sanitizedEnchantments));
    }
    for (const id of this.counts.keys()) this.normalizeDurability(id);
  }

  normalizeDurability(id) {
    const key = keyFor(id);
    const maximum = itemDefinition(id)?.durability;
    if (!maximum) return null;
    const queue = this.durabilityQueues.get(key) || [];
    while (queue.length < this.count(id)) queue.push(maximum);
    queue.length = Math.min(queue.length, this.count(id));
    for (let index = 0; index < queue.length; index += 1) queue[index] = Math.max(1, Math.min(maximum, queue[index]));
    if (queue.length) this.durabilityQueues.set(key, queue);
    else this.durabilityQueues.delete(key);
    this.normalizeEnchantments(id);
    return queue;
  }

  normalizeEnchantments(id) {
    const key = keyFor(id);
    if (!itemDefinition(id)?.durability) return null;
    const queue = this.enchantmentQueues.get(key) || [];
    while (queue.length < this.count(id)) queue.push([]);
    queue.length = Math.min(queue.length, this.count(id));
    for (let index = 0; index < queue.length; index += 1) queue[index] = sanitizedEnchantments(queue[index]);
    if (queue.length) this.enchantmentQueues.set(key, queue);
    else this.enchantmentQueues.delete(key);
    return queue;
  }

  count(id) {
    return this.counts.get(keyFor(id)) || 0;
  }

  add(id, amount = 1) {
    if (!Number.isFinite(amount)) return false;
    amount = Math.floor(amount);
    if (amount <= 0) return false;
    const key = keyFor(id);
    this.counts.set(key, this.count(key) + amount);
    this.normalizeDurability(id);
    return true;
  }

  has(requirements) {
    return Object.entries(requirements).every(([id, amount]) => this.count(id) >= amount);
  }

  remove(id, amount = 1) {
    const key = keyFor(id);
    if (!Number.isFinite(amount)) return false;
    amount = Math.floor(amount);
    if (amount <= 0) return false;
    const next = this.count(key) - amount;
    if (next < 0) return false;
    const queue = this.normalizeDurability(id);
    if (queue) queue.splice(0, amount);
    const enchantments = this.normalizeEnchantments(id);
    if (enchantments) enchantments.splice(0, amount);
    if (next === 0) this.counts.delete(key);
    else this.counts.set(key, next);
    this.normalizeDurability(id);
    this.normalizeEnchantments(id);
    return true;
  }

  durability(id) {
    const maximum = itemDefinition(id)?.durability;
    if (!maximum || this.count(id) <= 0) return null;
    const queue = this.normalizeDurability(id);
    const remaining = queue[0];
    return { remaining, maximum, ratio: remaining / maximum };
  }

  damage(id, amount = 1) {
    const condition = this.durability(id);
    if (!condition || !Number.isFinite(amount) || amount <= 0) return null;
    const key = keyFor(id);
    const queue = this.durabilityQueues.get(key);
    const enduring = this.enchantments(id).find((entry) => entry.id === 'enduring')?.level || 0;
    if (enduring > 0 && Math.random() < enduring / (enduring + 2)) {
      return { damaged: false, prevented: true, broke: false, remaining: queue[0], maximum: condition.maximum };
    }
    queue[0] -= Math.max(1, Math.floor(amount));
    if (queue[0] > 0) {
      return { damaged: true, broke: false, remaining: queue[0], maximum: condition.maximum };
    }
    queue.shift();
    this.normalizeEnchantments(id).shift();
    const nextCount = this.count(id) - 1;
    if (nextCount <= 0) {
      this.counts.delete(key);
      this.durabilityQueues.delete(key);
      this.enchantmentQueues.delete(key);
    } else {
      this.counts.set(key, nextCount);
      this.normalizeDurability(id);
    }
    return { damaged: true, broke: true, remaining: this.durability(id)?.remaining || 0, maximum: condition.maximum };
  }

  repair(id, amount) {
    const condition = this.durability(id);
    if (!condition || condition.remaining >= condition.maximum || !Number.isFinite(amount) || amount <= 0) return null;
    const queue = this.durabilityQueues.get(keyFor(id));
    const before = queue[0];
    queue[0] = Math.min(condition.maximum, before + Math.floor(amount));
    return { before, remaining: queue[0], maximum: condition.maximum, restored: queue[0] - before };
  }

  repairWithMaterial(id) {
    const definition = itemDefinition(id);
    const condition = this.durability(id);
    if (!definition?.repairMaterial || !condition || condition.remaining >= condition.maximum || this.count(definition.repairMaterial) <= 0) return null;
    if (!this.remove(definition.repairMaterial, 1)) return null;
    const result = this.repair(id, definition.repairAmount);
    if (!result) {
      this.add(definition.repairMaterial, 1);
      return null;
    }
    return { ...result, material: definition.repairMaterial };
  }

  takeInstance(id) {
    if (this.count(id) <= 0) return null;
    const condition = this.durability(id);
    const enchantments = this.enchantments(id);
    const instance = { id, durability: condition?.remaining ?? null };
    if (enchantments.length) instance.enchantments = enchantments;
    return this.remove(id, 1) ? instance : null;
  }

  addInstance(id, durability = null, enchantments = []) {
    if (!this.add(id, 1)) return false;
    const definition = itemDefinition(id);
    if (definition?.durability && Number.isFinite(durability)) {
      const queue = this.normalizeDurability(id);
      queue[queue.length - 1] = Math.max(1, Math.min(definition.durability, Math.floor(durability)));
    }
    if (definition?.durability) {
      const queue = this.normalizeEnchantments(id);
      queue[queue.length - 1] = sanitizedEnchantments(enchantments);
    }
    return true;
  }

  enchantments(id) {
    if (!itemDefinition(id)?.durability || this.count(id) <= 0) return [];
    return this.normalizeEnchantments(id)[0].map((entry) => ({ ...entry }));
  }

  applyEnchantment(id, enchantmentId, level) {
    if (this.count(id) <= 0 || typeof enchantmentId !== 'string' || !Number.isFinite(level)) return false;
    const queue = this.normalizeEnchantments(id);
    const entries = queue[0];
    const existing = entries.find((entry) => entry.id === enchantmentId);
    if (existing) existing.level = Math.max(existing.level, Math.min(3, Math.floor(level)));
    else entries.push({ id: enchantmentId, level: Math.max(1, Math.min(3, Math.floor(level))) });
    return true;
  }

  craft(recipe, station = 'hand') {
    const stationAvailable = recipe?.station === 'hand' || recipe?.station === station;
    if (!recipe || !stationAvailable || !this.has(recipe.ingredients)) return false;
    for (const [id, amount] of Object.entries(recipe.ingredients)) this.remove(id, amount);
    this.add(recipe.output.id, recipe.output.count);
    for (const [id, amount] of Object.entries(recipe.returns || {})) this.add(id, amount);
    return true;
  }

  entries() {
    return [...this.counts.entries()]
      .filter(([id]) => itemDefinition(id))
      .sort((a, b) => itemDefinition(a[0]).name.localeCompare(itemDefinition(b[0]).name));
  }

  drainAll() {
    const drained = [];
    for (const [id, count] of this.entries()) {
      if (itemDefinition(id)?.durability) {
        for (let index = 0; index < count; index += 1) {
          const instance = this.takeInstance(id);
          if (instance) drained.push(instance);
        }
      } else if (this.remove(id, count)) drained.push({ id, count });
    }
    return drained;
  }

  serialize() {
    return {
      counts: [...this.counts.entries()],
      durability: [...this.durabilityQueues.entries()].map(([id, values]) => [id, [...values]]),
      enchantments: [...this.enchantmentQueues.entries()].map(([id, values]) => [id, values.map((entries) => entries.map((entry) => ({ ...entry })))]),
    };
  }
}

export function blockDrops(id) {
  if (id === BLOCK.EMBERFIRE) return [];
  if (BLOCKS[id]?.forgeFunnel) return [BLOCK.FORGE_FUNNEL_DOWN];
  if (BLOCKS[id]?.hearthcake) return id === BLOCK.HEARTHCAKE_FULL ? [BLOCK.HEARTHCAKE_FULL] : [];
  if (id === BLOCK.GRASS) {
    const roll = Math.random();
    if (roll < 0.16) return [BLOCK.DIRT, 'wheat_seeds'];
    if (roll < 0.22) return [BLOCK.DIRT, 'amberroot_seed'];
    return [BLOCK.DIRT];
  }
  if (id === BLOCK.COAL) return ['coal'];
  if (id === BLOCK.LUMEN_ORE) return ['lumen_shard'];
  if (id === BLOCK.VOIDGLASS_ORE) return ['voidglass_shard'];
  if (id === BLOCK.CINDER_CRYSTAL_ORE) return ['cinder_shard'];
  if (id === BLOCK.GRAVEL) return Math.random() < 0.12 ? ['flint'] : [BLOCK.GRAVEL];
  if (id === BLOCK.TIDECLAY) return ['tideclay_lump', 'tideclay_lump', 'tideclay_lump', 'tideclay_lump'];
  if (id === BLOCK.SHADOW_DEN) return ['shadow_shard', 'shadow_shard', 'lumen_spore'];
  if (isSnowLayer(id)) return Array.from({ length: snowLayerLevel(id) }, () => 'snow_clump');
  if (BLOCKS[id]?.circuitItem) return [BLOCKS[id].circuitItem];
  if (BLOCKS[id]?.campfireItem) return [BLOCKS[id].campfireItem];
  if (BLOCKS[id]?.dropItem != null) return [BLOCKS[id].dropItem];
  if (id === BLOCK.TIDEGRASS) return ['tidefiber'];
  if (id === BLOCK.GLOWKELP) return ['raw_glowkelp'];
  if (id === BLOCK.LUMEN_BLOOM) return ['lumen_spore'];
  if (id === BLOCK.ASHCAP) return ['raw_ashcap'];
  if (id === BLOCK.FROSTPINE_NEEDLES) {
    const roll = Math.random();
    if (roll < 0.12) return ['rimepod_seed'];
    if (roll < 0.22) return [BLOCK.FROSTPINE_SAPLING];
    return roll < 0.42 ? [id] : [];
  }
  if (id === BLOCK.LEAVES) {
    const roll = Math.random();
    if (roll < 0.12) return [BLOCK.OAK_SAPLING];
    return roll < 0.35 ? [id] : [];
  }
  if (id >= BLOCK.WHEAT_0 && id < BLOCK.WHEAT_3) return ['wheat_seeds'];
  if (id === BLOCK.WHEAT_3) return ['wheat', 'wheat_seeds'];
  if (id >= BLOCK.AMBERROOT_0 && id < BLOCK.AMBERROOT_3) return ['amberroot_seed'];
  if (id === BLOCK.AMBERROOT_3) return ['amberroot', 'amberroot', 'amberroot_seed'];
  if (id >= BLOCK.RIMEPOD_0 && id < BLOCK.RIMEPOD_3) return ['rimepod_seed'];
  if (id === BLOCK.RIMEPOD_3) return ['rimepod', 'rimepod', 'rimepod_seed'];
  if (id >= BLOCK.EMBERBULB_0 && id < BLOCK.EMBERBULB_3) return ['emberbulb_cutting'];
  if (id === BLOCK.EMBERBULB_3) return ['emberbulb', 'emberbulb', 'emberbulb_cutting'];
  if (id === BLOCK.FARMLAND || id === BLOCK.HYDRATED_FARMLAND) return [BLOCK.DIRT];
  if (id === BLOCK.AIR || isLiquidBlock(id)) return [];
  return [id];
}
