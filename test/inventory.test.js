import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { blockDrops, Inventory, itemDefinition, itemStackSize, RECIPES } from '../src/inventory.js';

test('inventory adds, removes, and serializes stacks', () => {
  const inventory = new Inventory();
  inventory.add(BLOCK.WOOD, 3);
  assert.equal(inventory.count(BLOCK.WOOD), 3);
  assert.equal(inventory.remove(BLOCK.WOOD, 2), true);
  assert.equal(inventory.remove(BLOCK.WOOD, 2), false);
  assert.equal(new Inventory(inventory.serialize()).count(BLOCK.WOOD), 1);
});

test('crafting consumes ingredients and produces output atomically', () => {
  const inventory = new Inventory();
  const planks = RECIPES.find((recipe) => recipe.id === 'planks');
  assert.equal(inventory.craft(planks), false);
  inventory.add(BLOCK.WOOD, 1);
  assert.equal(inventory.craft(planks), true);
  assert.equal(inventory.count(BLOCK.WOOD), 0);
  assert.equal(inventory.count(BLOCK.PLANKS), 4);
});

test('recipe chains support block and non-block items', () => {
  const inventory = new Inventory({ counts: [[BLOCK.WOOD, 3]] });
  inventory.craft(RECIPES.find((recipe) => recipe.id === 'planks'));
  inventory.craft(RECIPES.find((recipe) => recipe.id === 'planks'));
  inventory.craft(RECIPES.find((recipe) => recipe.id === 'sticks'));
  assert.equal(inventory.count('stick'), 4);
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'wood_pickaxe'), 'table'), true);
  assert.equal(inventory.count('wooden_pickaxe'), 1);
});

test('advanced recipes require a crafting table context', () => {
  const inventory = new Inventory({ counts: [[BLOCK.PLANKS, 3], ['stick', 2]] });
  const pickaxe = RECIPES.find((recipe) => recipe.id === 'wood_pickaxe');
  assert.equal(inventory.craft(pickaxe, 'hand'), false);
  assert.equal(inventory.count(BLOCK.PLANKS), 3);
  assert.equal(inventory.craft(pickaxe, 'table'), true);
});

test('builder recipes produce half-height slab stacks', () => {
  const inventory = new Inventory({
    counts: [[BLOCK.STONE, 15], [BLOCK.PLANKS, 21], ['stick', 6]],
  });
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'stone_slabs'), 'table'), true);
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'wood_slabs'), 'table'), true);
  assert.equal(inventory.count(BLOCK.STONE_SLAB), 6);
  assert.equal(inventory.count(BLOCK.WOOD_SLAB), 6);
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'oak_fences'), 'table'), true);
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'stone_walls'), 'table'), true);
  assert.equal(inventory.count(BLOCK.OAK_FENCE), 3);
  assert.equal(inventory.count(BLOCK.STONE_WALL), 6);
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'oak_gate'), 'table'), true);
  assert.equal(inventory.count('oak_gate'), 1);
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'oak_stairs'), 'table'), true);
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'stone_stairs'), 'table'), true);
  assert.equal(inventory.count('oak_stairs'), 4);
  assert.equal(inventory.count('stone_stairs'), 4);
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'oak_trapdoors'), 'table'), true);
  assert.equal(inventory.count('oak_trapdoor'), 2);
});

test('harvested flowers craft into original dye resources', () => {
  const inventory = new Inventory({ counts: [[BLOCK.SUNPETAL, 1], [BLOCK.EMBERBELL, 1], [BLOCK.WINDGRASS, 3], [BLOCK.STONE, 1], [BLOCK.PLANKS, 3], ['stick', 4], ['mosswool', 3]] });
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'sunpetal_dye')), true);
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'ember_dye')), true);
  assert.equal(inventory.count('sunpetal_dye'), 2);
  assert.equal(inventory.count('ember_dye'), 2);
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'windfiber')), true);
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'windbow'), 'table'), true);
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'arrows'), 'table'), true);
  assert.equal(inventory.count('windbow'), 1);
  assert.equal(inventory.count('arrow'), 4);
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'moss_bed'), 'table'), true);
  assert.equal(inventory.count('moss_bed'), 1);
});

test('durable tools keep per-copy condition, migrate legacy saves, and break cleanly', () => {
  const legacy = new Inventory({ counts: [['wooden_pickaxe', 2]] });
  assert.deepEqual(legacy.durability('wooden_pickaxe'), { remaining: 60, maximum: 60, ratio: 1 });
  assert.deepEqual(legacy.damage('wooden_pickaxe', 10), { damaged: true, broke: false, remaining: 50, maximum: 60 });
  const restored = new Inventory(legacy.serialize());
  assert.equal(restored.durability('wooden_pickaxe').remaining, 50);
  assert.deepEqual(restored.damage('wooden_pickaxe', 50), { damaged: true, broke: true, remaining: 60, maximum: 60 });
  assert.equal(restored.count('wooden_pickaxe'), 1);
  assert.equal(restored.damage(BLOCK.STONE), null);
  restored.damage('wooden_pickaxe', 60);
  assert.equal(restored.count('wooden_pickaxe'), 0);
  assert.equal(restored.durability('wooden_pickaxe'), null);
});

test('durable item instances preserve condition when transferred out and back', () => {
  const inventory = new Inventory({ counts: [['iron_helmet', 1]] });
  inventory.damage('iron_helmet', 16);
  assert.deepEqual(inventory.takeInstance('iron_helmet'), { id: 'iron_helmet', durability: 150 });
  assert.equal(inventory.count('iron_helmet'), 0);
  assert.equal(inventory.addInstance('iron_helmet', 150), true);
  assert.equal(inventory.durability('iron_helmet').remaining, 150);
});

test('death draining preserves stack counts and every durable item instance', () => {
  const inventory = new Inventory({ counts: [['stick', 17], ['iron_pickaxe', 2]] });
  inventory.damage('iron_pickaxe', 31);
  inventory.applyEnchantment('iron_pickaxe', 'swiftwork', 2);
  const drained = inventory.drainAll();
  assert.deepEqual(drained, [
    { id: 'iron_pickaxe', durability: 220, enchantments: [{ id: 'swiftwork', level: 2 }] },
    { id: 'iron_pickaxe', durability: 251 },
    { id: 'stick', count: 17 },
  ]);
  assert.deepEqual(inventory.entries(), []);
  assert.deepEqual(inventory.serialize(), { counts: [], durability: [], enchantments: [] });
});

test('repairs atomically consume the matching material and cap condition', () => {
  const inventory = new Inventory({ counts: [['iron_pickaxe', 1], ['iron_ingot', 2], ['windbow', 1], ['windfiber', 1]] });
  inventory.damage('iron_pickaxe', 120);
  assert.deepEqual(inventory.repairWithMaterial('iron_pickaxe'), { before: 131, remaining: 227, maximum: 251, restored: 96, material: 'iron_ingot' });
  assert.equal(inventory.count('iron_ingot'), 1);
  assert.deepEqual(inventory.repairWithMaterial('iron_pickaxe'), { before: 227, remaining: 251, maximum: 251, restored: 24, material: 'iron_ingot' });
  assert.equal(inventory.count('iron_ingot'), 0);
  assert.equal(inventory.repairWithMaterial('iron_pickaxe'), null);
  inventory.damage('windbow', 200);
  assert.equal(inventory.repairWithMaterial('windbow').remaining, 185);
  assert.equal(inventory.count('windfiber'), 0);
});

test('complete axe, shovel, and hoe tiers craft as durable repairable instances', () => {
  const inventory = new Inventory({ counts: [[BLOCK.PLANKS, 20], [BLOCK.STONE, 20], ['iron_ingot', 20], ['stick', 30]] });
  const recipeIds = ['wood_axe', 'stone_axe', 'iron_axe', 'wood_shovel', 'stone_shovel', 'iron_shovel', 'wood_hoe', 'stone_hoe', 'iron_hoe'];
  for (const recipeId of recipeIds) {
    const recipe = RECIPES.find((candidate) => candidate.id === recipeId);
    assert.ok(recipe, `missing ${recipeId}`);
    assert.equal(inventory.craft(recipe, 'table'), true, `failed ${recipeId}`);
    const toolId = recipe.output.id;
    assert.ok(inventory.durability(toolId)?.maximum > 0, `${toolId} lacks durability`);
  }
  inventory.damage('iron_shovel', 100);
  const ingotsBefore = inventory.count('iron_ingot');
  assert.ok(inventory.repairWithMaterial('iron_shovel').restored > 0);
  assert.equal(inventory.count('iron_ingot'), ingotsBefore - 1);
});

test('creature-sourced Tough Hide crafts and repairs a full early armor set', () => {
  const inventory = new Inventory({ counts: [['tough_hide', 30]] });
  for (const recipeId of ['hide_helmet', 'hide_chestplate', 'hide_leggings', 'hide_boots']) {
    assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === recipeId), 'table'), true);
  }
  assert.equal(inventory.count('tough_hide'), 6);
  inventory.damage('hide_chestplate', 50);
  assert.deepEqual(inventory.repairWithMaterial('hide_chestplate'), {
    before: 54, remaining: 94, maximum: 104, restored: 40, material: 'tough_hide',
  });
  assert.equal(inventory.count('tough_hide'), 5);
});

test('Riveted Oak Shields craft as durable repairable offhand gear', () => {
  const inventory = new Inventory({ counts: [[BLOCK.PLANKS, 7], ['iron_ingot', 1]] });
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'oak_shield'), 'table'), true);
  assert.equal(inventory.durability('oak_shield').maximum, 240);
  inventory.damage('oak_shield', 100);
  assert.deepEqual(inventory.repairWithMaterial('oak_shield'), {
    before: 140, remaining: 212, maximum: 240, restored: 72, material: BLOCK.PLANKS,
  });
  assert.equal(inventory.count(BLOCK.PLANKS), 0);
});

test('Lumen Ore drops crystals that craft into a placeable lantern', () => {
  assert.deepEqual(blockDrops(BLOCK.LUMEN_ORE), ['lumen_shard']);
  const inventory = new Inventory({ counts: [['lumen_shard', 1], ['iron_ingot', 4], [BLOCK.GLASS, 4]] });
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'lumen_lantern'), 'table'), true);
  assert.equal(inventory.count(BLOCK.LUMEN_LANTERN), 1);
});

test('Frostpine logs convert into standard building planks', () => {
  const inventory = new Inventory({ counts: [[BLOCK.FROSTPINE_LOG, 1]] });
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'frostpine_planks')), true);
  assert.equal(inventory.count(BLOCK.FROSTPINE_LOG), 0);
  assert.equal(inventory.count(BLOCK.PLANKS), 4);
  const needleDrops = blockDrops(BLOCK.FROSTPINE_NEEDLES);
  assert.ok(needleDrops.length === 0 || [BLOCK.FROSTPINE_NEEDLES, BLOCK.FROSTPINE_SAPLING, 'rimepod_seed'].includes(needleDrops[0]));
});

test('underwater plants harvest into reusable cuttings', () => {
  assert.deepEqual(blockDrops(BLOCK.TIDEGRASS), ['tidefiber']);
  assert.deepEqual(blockDrops(BLOCK.GLOWKELP), ['raw_glowkelp']);
  const inventory = new Inventory({ counts: [['tidefiber', 1], ['raw_glowkelp', 1]] });
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'tidegrass_bundle')), true);
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'glowkelp_cutting')), true);
  assert.equal(inventory.count(BLOCK.TIDEGRASS), 1);
  assert.equal(inventory.count(BLOCK.GLOWKELP), 1);
});

test('Tide Rods craft with fiber and retain repairable per-copy condition', () => {
  const inventory = new Inventory({ counts: [['stick', 3], ['tidefiber', 3]] });
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'tide_rod'), 'table'), true);
  assert.equal(inventory.durability('tide_rod').maximum, 96);
  inventory.damage('tide_rod', 60);
  assert.deepEqual(inventory.repairWithMaterial('tide_rod'), {
    before: 36, remaining: 72, maximum: 96, restored: 36, material: 'tidefiber',
  });
  assert.equal(inventory.count('tidefiber'), 0);
});

test('cave flora harvests into food and renewable light resources', () => {
  assert.deepEqual(blockDrops(BLOCK.LUMEN_BLOOM), ['lumen_spore']);
  assert.deepEqual(blockDrops(BLOCK.ASHCAP), ['raw_ashcap']);
  const inventory = new Inventory({ counts: [['lumen_spore', 2], ['raw_ashcap', 1]] });
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'lumen_bloom')), true);
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'ashcap_cutting')), true);
  assert.equal(inventory.count(BLOCK.LUMEN_BLOOM), 1);
  assert.equal(inventory.count(BLOCK.ASHCAP), 1);
  assert.deepEqual(blockDrops(BLOCK.ROOTSTONE), [BLOCK.ROOTSTONE]);
});

test('Emberite and Voidglass provide complete durable repairable equipment tiers', () => {
  const inventory = new Inventory({ counts: [['voidglass_shard', 2]] });
  for (const prefix of ['emberite', 'voidglass']) {
    for (const suffix of ['pickaxe', 'axe', 'shovel', 'sword', 'hoe', 'helmet', 'chestplate', 'leggings', 'boots']) {
      const id = `${prefix}_${suffix}`;
      assert.equal(RECIPES.some((candidate) => candidate.id === id), false, `${id} must not bypass smithing through table crafting`);
      assert.equal(inventory.addInstance(id), true);
      assert.ok(inventory.durability(id)?.maximum > 0, `${id} must be durable`);
    }
  }
  inventory.damage('voidglass_pickaxe', 300);
  const shardsBefore = inventory.count('voidglass_shard');
  assert.ok(inventory.repairWithMaterial('voidglass_pickaxe').restored > 0);
  assert.equal(inventory.count('voidglass_shard'), shardsBefore - 1);
  assert.deepEqual(blockDrops(BLOCK.VOIDGLASS_ORE), ['voidglass_shard']);
});

test('Thorncaster spines provide a renewable hand-crafted arrow supply', () => {
  const inventory = new Inventory({ counts: [['thorn_spine', 1], ['stick', 1]] });
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'thorn_arrows'), 'hand'), true);
  assert.equal(inventory.count('thorn_spine'), 0);
  assert.equal(inventory.count('stick'), 0);
  assert.equal(inventory.count('arrow'), 4);
});

test('Briarweaver Night Silk becomes cord for renewable Windbows and Windracks', () => {
  const cord = RECIPES.find((recipe) => recipe.id === 'silk_cord');
  const bow = RECIPES.find((recipe) => recipe.id === 'silk_windbow');
  const rack = RECIPES.find((recipe) => recipe.id === 'silk_drying_rack');
  const inventory = new Inventory({ counts: [['night_silk', 4], ['stick', 7], [BLOCK.PLANKS, 2]] });
  assert.equal(inventory.craft(cord, 'hand'), true);
  assert.equal(inventory.craft(cord, 'hand'), true);
  assert.equal(inventory.count('silk_cord'), 6);
  assert.equal(inventory.craft(bow, 'table'), true);
  assert.equal(inventory.craft(rack, 'table'), true);
  assert.equal(inventory.count('windbow'), 1);
  assert.equal(inventory.count(BLOCK.DRYING_RACK), 1);
  assert.equal(inventory.count('silk_cord'), 1);
  assert.equal(itemDefinition('night_silk').category, 'material');
});

test('Mireglob Resin becomes a renewable binder for building and automation', () => {
  const binder = RECIPES.find((recipe) => recipe.id === 'binding_compound');
  const walls = RECIPES.find((recipe) => recipe.id === 'bound_stone_walls');
  const couplers = RECIPES.find((recipe) => recipe.id === 'bound_forge_couplers');
  const inventory = new Inventory({ counts: [['glob_resin', 2], [BLOCK.SAND, 1], [BLOCK.STONE, 3], ['iron_ingot', 2]] });
  assert.equal(inventory.craft(binder, 'hand'), true);
  assert.equal(inventory.count('binding_compound'), 2);
  assert.equal(inventory.craft(walls, 'table'), true);
  assert.equal(inventory.count(BLOCK.STONE_WALL), 6);
  assert.equal(inventory.craft(couplers, 'table'), true);
  assert.equal(inventory.count('forge_coupler'), 2);
  assert.equal(inventory.count('binding_compound'), 0);
  assert.equal(itemDefinition('glob_resin').category, 'material');
});

test('Bramblehen eggs, meat, and feathers form a renewable farm-food and arrow loop', () => {
  const inventory = new Inventory({ counts: [['flint', 1], ['stick', 1], ['bramble_feather', 1]] });
  const recipe = RECIPES.find((candidate) => candidate.id === 'bramble_arrows');
  assert.ok(recipe);
  assert.equal(inventory.craft(recipe, 'hand'), false);
  assert.equal(inventory.craft(recipe, 'table'), true);
  assert.equal(inventory.count('arrow'), 4);
  assert.equal(itemDefinition('bramble_egg').category, 'material');
  assert.deepEqual({ food: itemDefinition('roasted_bramble').food, saturation: itemDefinition('roasted_bramble').saturation }, { food: 6, saturation: 5 });
  assert.deepEqual({ food: itemDefinition('baked_bramble_egg').food, saturation: itemDefinition('baked_bramble_egg').saturation }, { food: 4, saturation: 3 });
});

test('late-game cave resources craft a placeable Runeforge workstation', () => {
  const inventory = new Inventory({ counts: [['voidglass_shard', 2], ['lumen_shard', 3], [BLOCK.STONE, 4]] });
  const recipe = RECIPES.find((candidate) => candidate.id === 'runeforge');
  assert.equal(inventory.craft(recipe, 'hand'), false);
  assert.equal(inventory.craft(recipe, 'table'), true);
  assert.equal(inventory.count(BLOCK.RUNEFORGE), 1);
  assert.equal(inventory.count('voidglass_shard'), 0);
  assert.equal(inventory.count('lumen_shard'), 0);
});

test('Tough Hide, iron, and Windfiber craft a Trail Saddle', () => {
  const inventory = new Inventory({ counts: [['tough_hide', 3], ['iron_ingot', 2], ['windfiber', 2]] });
  const recipe = RECIPES.find((candidate) => candidate.id === 'trail_saddle');
  assert.equal(inventory.craft(recipe, 'hand'), false);
  assert.equal(inventory.craft(recipe, 'table'), true);
  assert.equal(inventory.count('trail_saddle'), 1);
});

test('destroyed Shadow Dens yield useful hostile and cave resources', () => {
  assert.deepEqual(blockDrops(BLOCK.SHADOW_DEN), ['shadow_shard', 'shadow_shard', 'lumen_spore']);
});

test('original automation blocks craft in useful quantities and powered states drop base items', () => {
  const inventory = new Inventory({ counts: [
    [BLOCK.STONE, 2], ['stick', 1], ['emberite_ingot', 1],
    ['windfiber', 2], ['lumen_shard', 2], [BLOCK.GLASS, 4], ['iron_ingot', 4],
  ] });
  for (const recipeId of ['spark_switch', 'sunwire', 'forge_lamp']) {
    assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === recipeId), 'table'), true);
  }
  assert.equal(inventory.count(BLOCK.SPARK_SWITCH_OFF), 1);
  assert.equal(inventory.count(BLOCK.SUNWIRE_OFF), 8);
  assert.equal(inventory.count(BLOCK.FORGE_LAMP_OFF), 1);
  assert.deepEqual(blockDrops(BLOCK.SPARK_SWITCH_ON), [BLOCK.SPARK_SWITCH_OFF]);
  assert.deepEqual(blockDrops(BLOCK.SUNWIRE_ON), [BLOCK.SUNWIRE_OFF]);
  assert.deepEqual(blockDrops(BLOCK.FORGE_LAMP_ON), [BLOCK.FORGE_LAMP_OFF]);
});

test('Hearthfires craft from expedition basics and always recover as an unlit base block', () => {
  const inventory = new Inventory({ counts: [[BLOCK.WOOD, 3], ['stick', 3], ['coal', 1]] });
  const recipe = RECIPES.find((candidate) => candidate.id === 'hearthfire');
  assert.equal(inventory.craft(recipe, 'hand'), false);
  assert.equal(inventory.craft(recipe, 'table'), true);
  assert.equal(inventory.count(BLOCK.HEARTHFIRE_UNLIT), 1);
  assert.deepEqual(blockDrops(BLOCK.HEARTHFIRE_LIT), [BLOCK.HEARTHFIRE_UNLIT]);
});

test('Moss Shears and Windracks form a durable renewable husbandry and preservation toolchain', () => {
  const inventory = new Inventory({ counts: [[BLOCK.PLANKS, 2], ['stick', 4], ['windfiber', 2], ['iron_ingot', 2]] });
  const shears = RECIPES.find((candidate) => candidate.id === 'moss_shears');
  const rack = RECIPES.find((candidate) => candidate.id === 'drying_rack');
  assert.equal(inventory.craft(shears, 'table'), true);
  assert.equal(inventory.craft(rack, 'table'), true);
  assert.equal(inventory.count('moss_shears'), 1);
  assert.equal(inventory.durability('moss_shears').remaining, 96);
  assert.equal(inventory.count(BLOCK.DRYING_RACK), 1);
  assert.deepEqual(blockDrops(BLOCK.DRYING_RACK), [BLOCK.DRYING_RACK]);
  for (const id of ['grazer_jerky', 'dried_silverfin', 'glowkelp_crisp', 'dried_ashcap']) {
    assert.equal(itemDefinition(id).category, 'food');
    assert.ok(itemDefinition(id).food > 0 && itemDefinition(id).saturation > 0);
  }
});

test('mature Rimepods renew seeds and combine preserved regional foods into Rimepot Stew', () => {
  assert.deepEqual(blockDrops(BLOCK.RIMEPOD_0), ['rimepod_seed']);
  assert.deepEqual(blockDrops(BLOCK.RIMEPOD_3), ['rimepod', 'rimepod', 'rimepod_seed']);
  const inventory = new Inventory({ counts: [['roasted_rimepod', 2], ['cooked_meat', 1], ['dried_ashcap', 1]] });
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'rimepot_stew'), 'table'), true);
  assert.equal(inventory.count('rimepot_stew'), 1);
  assert.equal(itemDefinition('rimepot_stew').food, 10);
  assert.equal(itemDefinition('rimepot_stew').saturation, 9);
});

test('mature Emberbulbs renew their cutting and roast into dense realm provisions', () => {
  assert.deepEqual(blockDrops(BLOCK.EMBERBULB_0), ['emberbulb_cutting']);
  assert.deepEqual(blockDrops(BLOCK.EMBERBULB_3), ['emberbulb', 'emberbulb', 'emberbulb_cutting']);
  assert.equal(itemDefinition('emberbulb_cutting').category, 'seed');
  assert.equal(itemDefinition('emberbulb').food, 3);
  assert.equal(itemDefinition('roasted_emberbulb').food, 7);
  assert.equal(itemDefinition('roasted_emberbulb').saturation, 6);
});

test('renewable Mossmilk crafts into filling Hearthcurd and safely returns its Forged Pail', () => {
  const inventory = new Inventory({ counts: [['mossmilk_pail', 1], ['dried_ashcap', 1], ['amberroot', 1]] });
  const recipe = RECIPES.find((candidate) => candidate.id === 'hearthcurd');
  assert.equal(inventory.craft(recipe, 'table'), true);
  assert.equal(inventory.count('mossmilk_pail'), 0);
  assert.equal(inventory.count('forged_pail'), 1);
  assert.equal(inventory.count('hearthcurd'), 2);
  assert.equal(itemDefinition('mossmilk_pail').containerReturn, 'forged_pail');
  assert.equal(itemDefinition('hearthcurd').food, 8);
  assert.equal(itemDefinition('hearthcurd').saturation, 9);
});

test('expedition flasks craft at a table while Overworld tonic formulas belong to the Still', () => {
  const inventory = new Inventory({ counts: [
    [BLOCK.GLASS, 6], ['windfiber', 2], ['sunpetal_dye', 1],
    [BLOCK.ROOTSTONE, 2], ['raw_ashcap', 1], ['lumen_shard', 2],
    ['raw_glowkelp', 1], ['amberroot', 2], ['lumen_spore', 1],
  ] });
  const recipe = (id) => RECIPES.find((candidate) => candidate.id === id);
  assert.equal(inventory.craft(recipe('empty_flasks'), 'table'), true);
  assert.equal(inventory.craft(recipe('empty_flasks'), 'table'), true);
  for (const id of ['windstep_tonic', 'stoneward_tonic', 'lumen_sight_tonic', 'hearthmend_tonic']) {
    assert.equal(inventory.craft(recipe(id), 'table'), false);
    assert.equal(inventory.craft(recipe(id), 'still'), true);
    assert.equal(inventory.count(id), 1);
  }
  assert.equal(inventory.count('empty_flask'), 2);
});

test('native Cinderreach drops craft renewable Cinderward protection', () => {
  const inventory = new Inventory({ counts: [
    ['empty_flask', 1], ['ashscale', 2], ['ember_gland', 1], ['cinder_shard', 1],
  ] });
  const recipe = RECIPES.find((candidate) => candidate.id === 'cinderward_tonic');
  assert.equal(inventory.craft(recipe, 'table'), false);
  assert.equal(inventory.craft(recipe, 'still'), true);
  assert.equal(inventory.count('cinderward_tonic'), 1);
  assert.equal(itemDefinition('cinderward_tonic').effect, 'cinderward');
  assert.equal(inventory.count('ashscale'), 0);
  assert.equal(inventory.count('ember_gland'), 0);
});

test('Emberwing membranes and Emberbulbs craft renewable Ashglide protection', () => {
  const inventory = new Inventory({ counts: [
    ['empty_flask', 1], ['ember_membrane', 2], ['cinder_shard', 1], ['emberbulb', 1],
  ] });
  const recipe = RECIPES.find((candidate) => candidate.id === 'ashglide_tonic');
  assert.equal(inventory.craft(recipe, 'table'), false);
  assert.equal(inventory.craft(recipe, 'still'), true);
  assert.equal(inventory.count('ashglide_tonic'), 1);
  assert.equal(itemDefinition('ashglide_tonic').effect, 'ashglide');
  assert.equal(itemDefinition('ember_membrane').category, 'material');
  assert.equal(inventory.count('ember_membrane'), 0);
  assert.equal(inventory.count('emberbulb'), 0);
});

test('three iron ingots craft one non-stackable Forged Pail', () => {
  const inventory = new Inventory({ counts: [['iron_ingot', 3]] });
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'forged_pail'), 'table'), true);
  assert.equal(inventory.count('forged_pail'), 1);
  assert.equal(itemStackSize('forged_pail'), 1);
  assert.equal(itemStackSize('water_pail'), 1);
  assert.equal(itemStackSize('lava_pail'), 1);
});

test('weather resources craft packed snow and a non-stackable Stormglass', () => {
  const snow = new Inventory({ counts: [['snow_clump', 4]] });
  assert.equal(snow.craft(RECIPES.find((recipe) => recipe.id === 'packed_snow'), 'hand'), true);
  assert.equal(snow.count(BLOCK.SNOW), 1);
  assert.deepEqual(blockDrops(BLOCK.SNOW_LAYER_3), ['snow_clump', 'snow_clump', 'snow_clump']);

  const glass = new Inventory({ counts: [[BLOCK.GLASS, 4], ['iron_ingot', 2], ['lumen_shard', 1]] });
  assert.equal(glass.craft(RECIPES.find((recipe) => recipe.id === 'stormglass'), 'table'), true);
  assert.equal(glass.count('stormglass'), 1);
  assert.equal(itemStackSize('stormglass'), 1);
});

test('iron and Lumen craft one non-stackable Wayfinder Compass', () => {
  const inventory = new Inventory({ counts: [['iron_ingot', 4], ['lumen_shard', 1]] });
  const recipe = RECIPES.find((candidate) => candidate.id === 'wayfinder_compass');
  assert.equal(inventory.craft(recipe, 'table'), true);
  assert.equal(inventory.count('wayfinder_compass'), 1);
  assert.equal(itemStackSize('wayfinder_compass'), 1);
  assert.equal(itemDefinition('wayfinder_compass').category, 'navigation');
});

test('Tidefiber sheets calibrate a non-stackable Trailchart without consuming its compass', () => {
  const inventory = new Inventory({ counts: [['tidefiber', 6], ['wayfinder_compass', 1]] });
  assert.equal(inventory.craft(RECIPES.find((candidate) => candidate.id === 'chart_sheets'), 'table'), true);
  assert.equal(inventory.craft(RECIPES.find((candidate) => candidate.id === 'chart_sheets'), 'table'), true);
  inventory.add('chart_sheet', 2);
  assert.equal(inventory.craft(RECIPES.find((candidate) => candidate.id === 'trailchart'), 'table'), true);
  assert.equal(inventory.count('trailchart'), 1);
  assert.equal(inventory.count('wayfinder_compass'), 1);
  assert.equal(inventory.count('chart_sheet'), 0);
  assert.equal(itemStackSize('trailchart'), 1);
});

test('late-game boss and forge resources craft a recoverable Cinder Gate', () => {
  const inventory = new Inventory({ counts: [['voidglass_shard', 4], ['emberite_ingot', 4], ['warden_core', 1]] });
  assert.equal(inventory.craft(RECIPES.find((candidate) => candidate.id === 'cinder_gate'), 'table'), true);
  assert.equal(inventory.count(BLOCK.CINDER_GATE), 1);
  assert.deepEqual(blockDrops(BLOCK.CINDER_GATE), [BLOCK.CINDER_GATE]);
  assert.deepEqual(blockDrops(BLOCK.CINDER_CRYSTAL_ORE), ['cinder_shard']);
  assert.equal(BLOCKS[BLOCK.CINDER_RIFT].breakable, false);
});

test('four regional regalia layers have complete non-stackable resource recipes', () => {
  const cases = [
    ['suncrest_regalia', [['sunpetal_dye', 2], ['windfiber', 2], ['lumen_shard', 1]]],
    ['emberline_regalia', [['ember_dye', 2], ['tough_hide', 3], ['emberite_ingot', 1]]],
    ['frostveil_regalia', [['frost_fang', 2], ['snow_clump', 3], ['tidefiber', 2]]],
    ['hollow_regalia', [['shadow_shard', 4], ['lumen_spore', 2], ['lumen_shard', 1], ['voidglass_shard', 1]]],
  ];
  for (const [id, counts] of cases) {
    const inventory = new Inventory({ counts });
    assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === id), 'table'), true, id);
    assert.equal(inventory.count(id), 1);
    assert.equal(itemStackSize(id), 1);
  }
});

test('Shadow Den rituals and Hollow Warden victories have complete shaped reward recipes', () => {
  const ritual = new Inventory({ counts: [['shadow_shard', 4], ['lumen_shard', 3], ['voidglass_shard', 1]] });
  assert.equal(ritual.craft(RECIPES.find((recipe) => recipe.id === 'warden_sigil'), 'table'), true);
  assert.equal(ritual.count('warden_sigil'), 1);

  const reward = new Inventory({ counts: [['warden_core', 1], ['voidglass_shard', 2], ['stick', 2]] });
  assert.equal(reward.craft(RECIPES.find((recipe) => recipe.id === 'warden_maul'), 'table'), true);
  assert.equal(reward.count('warden_maul'), 1);
  assert.equal(reward.durability('warden_maul').maximum, 720);
});
