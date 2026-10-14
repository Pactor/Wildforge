import * as THREE from 'three';
import './style.css';
import { AmbientSoundscape, AudioManager } from './audio.js';
import { runeforgeResonance } from './archiveShelves.js';
import { soundCaptionText } from './accessibility.js';
import { bedParts, bedPlan, breakBed, isBed, isSleepingTime, placeBed } from './beds.js';
import { BoatManager } from './boats.js';
import { CartManager } from './carts.js';
import { BLOCK, BLOCKS, isLiquidBlock, isWaterBlock } from './blocks.js';
import { CombatState } from './combat.js';
import { ClimateExposureState, nearbyWarmth } from './climateExposure.js';
import { CAMPFIRE_RECIPES, CampfireState } from './campfire.js';
import { DRYING_RECIPES, DryingRackState } from './dryingRack.js';
import { addCompost, breakComposter, compostLevel, extractCompost, isComposter } from './composter.js';
import { CraftingGrid, recipePattern } from './crafting.js';
import { CircuitSystem } from './circuits.js';
import { ChangeSentryState, sentryVariant } from './changeSentries.js';
import { CinderwatchState } from './cinderwatch.js';
import { DroppedItemManager, scatterDeathInventory } from './drops.js';
import { breakDoor, isDoor, placeDoor, toggleDoor } from './doors.js';
import { breakGate, gateIdFor, isGate, placeGate, toggleGate } from './gates.js';
import { companionAttackAllowed, CREATURES, EntityManager } from './entities.js';
import { HostileProjectileManager } from './hostileProjectiles.js';
import { HeldItemView } from './heldItemView.js';
import { awakenHearthguard, MAX_HEARTHGUARDS } from './hearthguard.js';
import { canPlaceKeepsakeFrame, detachUnsupportedKeepsakeFrames, isKeepsakeFrame, KeepsakeFrameRenderer, KeepsakeFrameState, placeKeepsakeFrame } from './keepsakeFrames.js';
import { detachUnsupportedOutfitterStand, outfitterSlotForItem, OUTFITTER_SLOTS, OutfitterStandRenderer, OutfitterStandState } from './outfitterStands.js';
import { detachUnsupportedHearthpot, HearthpotRenderer, HearthpotState, isHearthpotPlant } from './hearthpots.js';
import { detachUnsupportedMossweaveCarpet } from './mossweave.js';
import { detachUnsupportedTrailBanner, isTrailBanner, TRAIL_BANNER_EMBLEMS, TRAIL_BANNER_FACINGS, TrailBannerRenderer, TrailBannerState } from './trailBanners.js';
import { collectRaincatchPail, detachUnsupportedRaincatch, fillRaincatchFromPail, isRaincatchBasin, MAX_RAINCATCH_BASINS, raincatchLevel, RaincatchState, raincatchWashedItem, washRaincatchItem } from './raincatch.js';
import { canPlaceLadder, detachUnsupportedLadders, placeLadder } from './ladders.js';
import { canPlaceScaffold, detachUnsupportedScaffolds } from './scaffolds.js';
import { EquipmentState, EQUIPMENT_SLOTS } from './equipment.js';
import { ExplorationMapState, MAP_CELL_SIZE } from './explorationMap.js';
import { blastDamage, PrimedBlastSystem } from './explosives.js';
import { availableEnchantments, enchantmentLabel, enchantmentLevel, RuneforgeState } from './enchanting.js';
import { blockExperience, ExperienceState, ExperienceWispManager, smeltingExperience } from './experience.js';
import { BlockParticles } from './effects.js';
import { cropBlock, cropPlantingAllowed, cropSeedItem, cropSubstrateAllowed, FarmingState } from './farming.js';
import { FallingBlockSystem } from './fallingBlocks.js';
import { blockDrops, Inventory, itemDefinition, RECIPES } from './inventory.js';
import { FURNACE_MODES, FurnaceState } from './furnace.js';
import { INFUSION_RECIPES, InfusionStillState, infusionIngredient, STILL_CATALYST_CHARGES, STILL_CATALYST_ITEM, STILL_FLASK_CAPACITY } from './infusionStill.js';
import { FishingSystem } from './fishing.js';
import { fireAtActor, FireState, isFlammable } from './fire.js';
import { FluidSystem } from './fluids.js';
import { transferFreight } from './freight.js';
import { activeCombatTool, activeMiningTool, breakDuration, canHarvestBlock } from './mining.js';
import { ProceduralScore } from './music.js';
import { PlacedLightManager } from './lights.js';
import { seedFromString } from './noise.js';
import { compassReading, discoverLandmarks, NavigationState } from './navigation.js';
import { isCharterPost, OutpostState } from './outposts.js';
import { PlayerController } from './player.js';
import { PlacementGhost, placementPlan, rotatedPlacementYaw } from './placementPreview.js';
import { PerformanceMonitor, performanceProfile } from './performance.js';
import { bowShot, ProjectileManager } from './ranged.js';
import { CinderHeatState, realmAt, REALM, RealmTravelState } from './realms.js';
import { cycleRailJunction, isRail, isRailJunction, placeRail, refreshRailsAround } from './rails.js';
import { createWorldBundle, importWorldBundle, loadWorldSave, writeWorldSave } from './saveSystem.js';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings.js';
import { isSign, signIdFor, SignState, SignTextRenderer } from './signs.js';
import { biomeAtmosphere, SkySystem } from './sky.js';
import { SnowAccumulationState } from './snowAccumulation.js';
import { applySmithingUpgrade, availableSmithingUpgrades } from './smithing.js';
import { applyRunegrind, runegrindEligible } from './runegrind.js';
import { applyStonecut, availableStonecuts } from './stonecutting.js';
import { SettlementSocialState } from './social.js';
import { breakStair, isStair, placeStair, stairIdFor } from './stairs.js';
import { breakTrapdoor, isTrapdoor, placeTrapdoor, toggleTrapdoor, trapdoorIdFor } from './trapdoors.js';
import { saplingTypeFor, treeSubstrateAllowed, TreeLifecycle } from './trees.js';
import { SunhiveState } from './sunhives.js';
import { tetherEligible, TetherSystem } from './tethers.js';
import { offersForTrader, TradingState } from './trading.js';
import { SurvivalState } from './survival.js';
import { barrelKey, canPlaceChest, chestInfo, containerKey, dispenserKey, ejectorKey, funnelKey, isBarrelKey, isDispenserKey, isEjectorKey, isFunnelKey, slotsUsed, STORAGE_SORT_MODES, StorageState } from './storage.js';
import { STATUS_EFFECTS, StatusEffectState } from './statusEffects.js';
import { VoxelWorld, WORLD_HEIGHT, WORLD_MIN_Y } from './world.js';
import { weatherFogFactor, weatherGrowthMultiplier, WeatherState, WeatherSystem, windDirectionName } from './weather.js';
import { EchoVaultState } from './vaults.js';
import { isWayvault, isWayvaultStorageKey, WAYVAULT_STORAGE_KEY } from './wayvault.js';
import { detachUnsupportedHearthcake, eatHearthcake, isHearthcake } from './hearthcake.js';
import { canPlaceTorch, detachUnsupportedTorches, placeTorch } from './torches.js';
import { isResonanceBox, ResonanceBoxState } from './resonanceBoxes.js';
import { isWaystar, WaystarRenderer, WaystarState } from './waystars.js';
import { HearthsongRenderer, HearthsongState, isHearthsongPlayer, isSongstone, SONGSTONES } from './hearthsongs.js';
import { ForgeFunnelState, isForgeFunnel } from './funnels.js';
import { ForgeEjectorState, isForgeEjector } from './ejectors.js';
import { isRuneDispenser, RuneDispenserState } from './dispensers.js';
import { ensurePlaytestKit, PLAYTEST_PROFILE, PLAYTEST_START_HOTBAR, playtestModeFromSearch, saveKeysForMode, SURVIVAL_START_HOTBAR } from './playtestMode.js';
import { PlaytestLog } from './playtestLog.js';
import { itemIconMarkup } from './itemIcons.js';
import { blockTargetLabel } from './targetLabels.js';
import { installGameContextMenuGuard } from './gameInput.js';

const params = new URLSearchParams(location.search);
const seedText = params.get('seed') || 'wildforge';
const seed = seedFromString(seedText);
const playtestMode = playtestModeFromSearch(params);
const modeSaveKeys = saveKeysForMode(seed, playtestMode);
const saveKey = modeSaveKeys.player;
const editsKey = modeSaveKeys.edits;
const loadedSave = loadWorldSave(globalThis.localStorage, saveKey, seed);
const saved = loadedSave.data;
let settings = loadSettings();
const performanceMonitor = new PerformanceMonitor(settings);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x75b7e8);
scene.fog = new THREE.Fog(0x91c4e5, 38, 78);

const camera = new THREE.PerspectiveCamera(settings.fov, innerWidth / innerHeight, 0.05, 160);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio * settings.renderScale, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.querySelector('#game').append(renderer.domElement);
installGameContextMenuGuard(renderer.domElement);

const hemisphere = new THREE.HemisphereLight(0xc8e5ff, 0x64704d, 1.65);
scene.add(hemisphere);
const sun = new THREE.DirectionalLight(0xfff1c2, 1.35);
scene.add(sun);
const sky = new SkySystem(scene, seed);

const world = new VoxelWorld(scene, seed, { editsKey });
world.setRenderRadius(settings.viewDistance);
const player = new PlayerController(camera, renderer.domElement, world);
player.setLookSensitivity(settings.sensitivity);
if (saved.crouching) player.setCrouching(true, true);
if (Array.isArray(saved.spawnPoint) && saved.spawnPoint.length === 3 && saved.spawnPoint.every(Number.isFinite)) {
  player.setSpawn(new THREE.Vector3().fromArray(saved.spawnPoint));
}
if (Array.isArray(saved.position) && saved.position.length === 3 && saved.position.every(Number.isFinite)) {
  player.position.fromArray(saved.position);
  if (player.collides(player.position)) player.respawn();
  else player.syncCamera();
}
const inventory = new Inventory(saved.inventory);
for (const id of saved.craftingGrid?.slots || []) {
  if (id != null && !itemDefinition(id)?.durability) inventory.add(id, 1);
}
const survival = new SurvivalState(saved.survival);
if (playtestMode) {
  survival.setModifiers(PLAYTEST_PROFILE);
  survival.health = survival.maxHealth;
  survival.hunger = survival.maxHunger;
  survival.saturation = survival.maxHunger;
}
const experience = new ExperienceState(saved.experience);
const runeforge = new RuneforgeState(seed, saved.runeforge);
const statusEffects = new StatusEffectState(saved.statusEffects);
const trading = new TradingState(saved.trading);
const social = new SettlementSocialState(saved.social);
const equipment = new EquipmentState(saved.equipment);
if (playtestMode) ensurePlaytestKit(inventory, equipment);
const heldItemView = new HeldItemView(scene, camera);
const farming = new FarmingState(saved.farming, seed);
const storage = new StorageState(saved.storage);
const outposts = new OutpostState(world, saved.outposts);
const navigation = new NavigationState(saved.navigation, { x: player.position.x, z: player.position.z });
const explorationMap = new ExplorationMapState(saved.explorationMap);
const realmTravel = new RealmTravelState(saved.realmTravel, { initialRealm: realmAt(player.position.x, player.position.z), legacyEntities: saved.entities });
const cinderHeat = new CinderHeatState(saved.cinderHeat);
const climateExposure = new ClimateExposureState(saved.climateExposure);
const playtestLog = new PlaytestLog({ enabled: playtestMode, seed: seedText });
if (player.collides(player.position)) player.respawn();
const furnaces = new FurnaceState(saved.furnaces);
const infusionStills = new InfusionStillState(saved.infusionStills);
const signs = new SignState(saved.signs);
const keepsakeFrames = new KeepsakeFrameState(saved.keepsakeFrames);
const outfitterStands = new OutfitterStandState(saved.outfitterStands);
const hearthpots = new HearthpotState(saved.hearthpots);
const trailBanners = new TrailBannerState(saved.trailBanners);
const raincatch = new RaincatchState(saved.raincatch);
const resonanceBoxes = new ResonanceBoxState(saved.resonanceBoxes);
resonanceBoxes.restore(world);
const waystars = new WaystarState(saved.waystars);
waystars.restore(world);
const hearthsongs = new HearthsongState(saved.hearthsongs);
const weatherState = new WeatherState(seed, saved.weather);
let worldTime = Number.isFinite(saved.worldTime) ? saved.worldTime : 0.31;
player.onDamage = (amount, cause) => {
  const applied = cause === 'fall' ? statusEffects.fallDamage(amount) : amount;
  if (cause === 'fall' && applied <= 0) {
    showToast('Ashglide cushions the landing');
    return;
  }
  takeDamage(applied, cause === 'fall' ? 'Hard landing' : 'Damage', false);
};
for (const soil of farming.soilEntries()) world.setBlock(soil.x, soil.y, soil.z, soil.block);
for (const crop of farming.entries()) world.setBlock(crop.x, crop.y, crop.z, crop.block);
world.update(player.position);
const fluids = new FluidSystem(world, saved.fluids);
world.onBlockChange((x, y, z) => fluids.blockChanged(x, y, z));
const snowAccumulation = new SnowAccumulationState(world, seed, saved.snowAccumulation);
const signTextRenderer = new SignTextRenderer(scene, world, signs);
const keepsakeFrameRenderer = new KeepsakeFrameRenderer(scene, world, keepsakeFrames);
const outfitterStandRenderer = new OutfitterStandRenderer(scene, world, outfitterStands);
const hearthpotRenderer = new HearthpotRenderer(scene, world, hearthpots);
const trailBannerRenderer = new TrailBannerRenderer(scene, world, trailBanners);

const selector = new THREE.Mesh(
  new THREE.BoxGeometry(1.006, 1.006, 1.006),
  new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.65 }),
);
selector.visible = false;
scene.add(selector);
const placementGhost = new PlacementGhost(scene);

let hotbarSlots = Array.isArray(saved.hotbarSlots)
  ? saved.hotbarSlots.slice(0, 9)
  : [...(playtestMode ? PLAYTEST_START_HOTBAR : SURVIVAL_START_HOTBAR)];
while (hotbarSlots.length < 9) hotbarSlots.push(null);
let selectedIndex = Math.min(saved.selectedIndex || 0, hotbarSlots.length - 1);
let placementTurns = 0;
let currentTarget = null;
let currentCreatureTarget = null;
let currentBoatTarget = null;
let currentCartTarget = null;
let couplingCartKey = null;
let primaryHeld = false;
let mining = null;
let inventoryOpen = false;
let settingsOpen = false;
let signEditorOpen = false;
let mapOpen = false;
let editingSignPosition = null;
let craftingStation = 'hand';
const craftingGrid = new CraftingGrid(2);
let craftingCursor = null;
let activeChestKey = null;
let activeFurnaceKey = null;
let activeInfusionKey = null;
let activeRuneforgePosition = null;
let activeTraderKey = null;
let bowCharging = false;
let bowCharge = 0;
let toastTimeout = 0;
let soundCaptionTimeout = 0;
let campfireSmokeTimer = 0;
let navigationRefreshTimer = 0;
let navigationTargetCache = [];
let mapRevealTimer = 0;
let climateWarmthTimer = 0;
let climateWarmth = null;
const hotbar = document.querySelector('#hotbar');
const menu = document.querySelector('#menu');
const inventoryScreen = document.querySelector('#inventory-screen');
const settingsScreen = document.querySelector('#settings-screen');
const signScreen = document.querySelector('#sign-screen');
const mapScreen = document.querySelector('#map-screen');
const trailchartCanvas = document.querySelector('#trailchart-canvas');
const deathScreen = document.querySelector('#death-screen');
const effects = new BlockParticles(scene);
const waystarRenderer = new WaystarRenderer(scene, world, waystars);
const hearthsongRenderer = new HearthsongRenderer(scene, hearthsongs);
const audio = new AudioManager();
audio.setVolume(settings.volume);
audio.setMusicVolume(settings.musicVolume);
const ambience = new AmbientSoundscape(seed);
const score = new ProceduralScore(seed);
const boats = new BoatManager(scene, world, saved.boats, {
  onPaddle: (position) => {
    audio.play('splash');
    effects.burst(position.clone().add(new THREE.Vector3(0, -0.05, 0)), 0x75bfe5, 5);
  },
});
const carts = new CartManager(scene, world, saved.carts, {
  onRoll: (position, speed) => {
    if (speed > 1.2) audio.play('cart_roll');
    if (speed > 4.5) effects.burst(position.clone().add(new THREE.Vector3(0, -0.04, 0)), 0xc59b5d, 2);
  },
});
const combat = new CombatState();
const lights = new PlacedLightManager(scene, world);

function playResonanceEvent(note) {
  if (!note) return false;
  const dx = note.x + 0.5 - player.position.x;
  const dz = note.z + 0.5 - player.position.z;
  const distance = Math.hypot(dx, note.y + 0.5 - player.position.y, dz);
  if (distance > 32) return false;
  audio.playResonance(note.frequency, {
    waveform: note.waveform,
    duration: note.duration,
    volume: Math.max(0.12, 1 - distance / 32),
    pan: Math.max(-1, Math.min(1, dx / 16)),
  });
  effects.burst(new THREE.Vector3(note.x + 0.5, note.y + 1.02, note.z + 0.5), note.color, 8);
  return true;
}

function playHearthsongEvent(note) {
  const dx = note.x + 0.5 - player.position.x; const distance = note.distance;
  if (!Number.isFinite(distance) || distance > 32) return false;
  audio.playResonance(note.frequency, {
    waveform: note.waveform, duration: note.duration,
    volume: Math.max(0.08, 1 - distance / 32), pan: Math.max(-1, Math.min(1, dx / 14)), music: true,
  });
  if (note.step % 4 === 0) effects.burst(new THREE.Vector3(note.x + 0.5, note.y + 1.04, note.z + 0.5), note.color, 4);
  return true;
}

let forgeEjectors = null;
let runeDispensers = null;
function readContainerSignal(x, y, z) {
  const id = world.getBlock(x, y, z);
  const definition = BLOCKS[id];
  let key = null;
  if (id === BLOCK.CHEST) key = storage.prepare(chestInfo(world, x, y, z));
  else if (definition?.storageContainer === 'barrel') key = barrelKey(x, y, z);
  else if (definition?.forgeFunnel) key = funnelKey(x, y, z);
  else if (definition?.forgeEjector) key = ejectorKey(x, y, z);
  else if (definition?.runeDispenser) key = dispenserKey(x, y, z);
  else if (definition?.wayvault) key = WAYVAULT_STORAGE_KEY;
  return key ? storage.signalStrength(key) : 0;
}
const circuits = new CircuitSystem(world, {
  saved: saved.circuits,
  readContainerSignal,
  onResonancePower: (position, powered) => {
    const note = resonanceBoxes.setPowered(world, position[0], position[1], position[2], powered);
    if (note) {
      playResonanceEvent(note);
      saveGame();
    }
  },
  onStateChange: (position, oldId, newId) => {
    lights.blockChanged(position.x, position.y, position.z, newId);
    effects.burst(new THREE.Vector3(position.x + 0.5, position.y + 0.35, position.z + 0.5), BLOCKS[newId]?.powered ? 0xf5c34f : 0x796342, 3);
    if (BLOCKS[newId]?.circuitRole === 'freightStation' && BLOCKS[newId].powered && !BLOCKS[oldId]?.powered) {
      const result = transferFreight(world, storage, carts, position.x, position.y, position.z, newId);
      if (result.moved > 0) {
        audio.play('pickup');
        effects.burst(new THREE.Vector3(position.x + 0.5, position.y + 0.65, position.z + 0.5), 0xe0ae4c, 9);
        if (Math.hypot(position.x - player.position.x, position.z - player.position.z) < 10) {
          showToast(`${result.mode === 'load' ? 'Loaded' : 'Unloaded'} ${result.moved} ${itemDefinition(result.itemId).name}`);
        }
        saveGame();
      }
    }
    if (BLOCKS[newId]?.forgeEjector && BLOCKS[newId].powered && !BLOCKS[oldId]?.powered) {
      const result = forgeEjectors?.activate(position.x, position.y, position.z);
      if (result) {
        audio.play(result.type === 'empty' ? 'place' : 'pickup');
        effects.burst(new THREE.Vector3(position.x + 0.5, position.y + 0.5, position.z + 0.5), result.type === 'empty' ? 0x697174 : 0x70dacc, result.type === 'empty' ? 3 : 8);
        if (inventoryOpen && craftingStation === 'chest' && activeChestKey === ejectorKey(position.x, position.y, position.z)) renderInventory();
        saveGame();
      }
    }
    if (BLOCKS[newId]?.runeDispenser && BLOCKS[newId].powered && !BLOCKS[oldId]?.powered) {
      const result = runeDispensers?.activate(position.x, position.y, position.z);
      if (result) {
        audio.play(result.type === 'empty' ? 'place' : result.type === 'fluid' ? 'splash' : result.type === 'ignite' || result.type === 'keg' ? 'ignite' : result.type === 'arrow' ? 'bow' : 'pickup');
        effects.burst(new THREE.Vector3(position.x + 0.5, position.y + 0.5, position.z + 0.5), result.type === 'empty' ? 0x596268 : result.type === 'ignite' || result.type === 'keg' ? 0xf1a34c : 0x78e1d3, result.type === 'empty' ? 3 : 9);
        if (inventoryOpen && craftingStation === 'chest' && activeChestKey === dispenserKey(position.x, position.y, position.z)) renderInventory();
        saveGame();
      }
    }
  },
  canMoveInto: (destination) => {
    if (player.intersectsBlock(destination[0], destination[1], destination[2], player.position, 1)) return false;
    return !entities.entities.some((entity) => Math.floor(entity.root.position.x) === destination[0]
      && Math.floor(entity.root.position.y) === destination[1] && Math.floor(entity.root.position.z) === destination[2]);
  },
  onMove: ({ to, id, detached, count = 1, retracted = false }) => {
    const position = new THREE.Vector3(to[0] + 0.5, to[1] + 0.5, to[2] + 0.5);
    effects.burst(position, BLOCKS[id]?.color || 0xa98b62, 12);
    if (detached) drops.spawn(detached.id, 1, new THREE.Vector3(detached.x + 0.5, detached.y + 0.2, detached.z + 0.5));
    audio.play('place');
    if (count > 1 && Math.hypot(to[0] - player.position.x, to[2] - player.position.z) < 12) showToast(`${retracted ? 'Pulled' : 'Pushed'} ${count} blocks atomically`);
    saveGame();
  },
});
const changeSentries = new ChangeSentryState(world, {
  setPowered: (x, y, z, powered) => {
    const id = world.getBlock(x, y, z);
    const changed = circuits.setState(x, y, z, sentryVariant(id, powered));
    const output = circuits.sentryOutput(x, y, z);
    if (changed && output) circuits.recomputeAround(...output);
    return changed;
  },
  onPulse: ({ x, y, z, powered }) => {
    audio.play(powered ? 'relay' : 'place');
    effects.burst(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), powered ? 0xe2b45a : 0x65d6c7, powered ? 7 : 3);
    saveGame();
  },
}, saved.changeSentries);
changeSentries.restore();
world.onBlockChange((x, y, z, previous, id) => changeSentries.blockChanged(x, y, z, previous, id));
const campfires = new CampfireState(world, saved.campfires, {
  onBlockChanged: (position, id) => {
    lights.blockChanged(position.x, position.y, position.z, id);
    effects.smoke(new THREE.Vector3(position.x + 0.5, position.y + 0.45, position.z + 0.5), 5);
  },
  onComplete: (result) => {
    const position = new THREE.Vector3(result.x + 0.5, result.y + 0.55, result.z + 0.5);
    drops.spawn(result.output, 1, position);
    experienceWisps.spawn(result.experience, position);
    effects.burst(position, 0xe58a3b, 7);
    audio.play('sizzle');
    if (position.distanceTo(player.position) < 12) showToast(`${itemDefinition(result.output).name} finished cooking`);
    saveGame();
  },
  onExtinguish: (position) => {
    audio.play('extinguish');
    effects.smoke(new THREE.Vector3(position.x + 0.5, position.y + 0.5, position.z + 0.5), 8);
    if (Math.hypot(position.x - player.position.x, position.z - player.position.z) < 12) showToast('Rain extinguished an exposed Hearthfire');
    saveGame();
  },
});
const dryingRacks = new DryingRackState(world, saved.dryingRacks, {
  onComplete: (result) => {
    const position = new THREE.Vector3(result.x + 0.5, result.y + 0.9, result.z + 0.5);
    drops.spawn(result.output, 1, position);
    experienceWisps.spawn(result.experience, position);
    effects.burst(position, 0xd2b06b, 6);
    audio.play('craft');
    if (position.distanceTo(player.position) < 12) showToast(`${itemDefinition(result.output).name} finished curing`);
    saveGame();
  },
});
const fishing = new FishingSystem(scene);
const weather = new WeatherSystem(scene, seed);
applyAccessibilityPresentation();
const drops = new DroppedItemManager(scene, world, player, (id, count, durability, enchantments) => {
  if (Number.isFinite(durability) && count === 1) inventory.addInstance(id, durability, enchantments);
  else inventory.add(id, count);
  audio.play('pickup');
  showToast(`Picked up ${count} ${itemDefinition(id).name}`);
  renderHotbar();
  saveGame();
}, saved.drops);
const forgeFunnels = new ForgeFunnelState(world, storage, furnaces, drops, saved.forgeFunnels);
for (const recovered of forgeFunnels.restore()) {
  drops.spawn(recovered.id, recovered.count || 1, new THREE.Vector3(recovered.x + 0.5, recovered.y + 0.7, recovered.z + 0.5), recovered.durability, recovered.enchantments);
}
world.onBlockChange((x, y, z, previous, id) => {
  for (const recovered of forgeFunnels.blockChanged(x, y, z, previous, id)) {
    drops.spawn(recovered.id, recovered.count || 1, new THREE.Vector3(x + 0.5, y + 0.7, z + 0.5), recovered.durability, recovered.enchantments);
  }
});
forgeEjectors = new ForgeEjectorState(world, storage, furnaces, drops, saved.forgeEjectors);
for (const recovered of forgeEjectors.restore()) {
  drops.spawn(recovered.id, recovered.count || 1, new THREE.Vector3(recovered.x + 0.5, recovered.y + 0.7, recovered.z + 0.5), recovered.durability, recovered.enchantments);
}
world.onBlockChange((x, y, z, previous, id) => {
  for (const recovered of forgeEjectors.blockChanged(x, y, z, previous, id)) {
    drops.spawn(recovered.id, recovered.count || 1, new THREE.Vector3(x + 0.5, y + 0.7, z + 0.5), recovered.durability, recovered.enchantments);
  }
});
runeDispensers = new RuneDispenserState(world, storage, drops, {
  shootArrow: ({ origin, direction }) => Boolean(projectiles?.shootFrom(origin, new THREE.Vector3(...direction), { speed: 22, damage: 4, knockback: 2.4, gravity: 3.8 })),
  pourFluid: (kind, { front }) => fluids.pour(front[0], front[1], front[2], kind),
  primeKeg: ({ front }) => world.getBlock(...front) === BLOCK.AIR && Boolean(explosives?.add(new THREE.Vector3(front[0] + 0.5, front[1] + 0.5, front[2] + 0.5))),
  ignite: ({ direction, front }) => {
    const frontId = world.getBlock(...front);
    if (frontId === BLOCK.BLAST_KEG) return Boolean(explosives?.prime(...front));
    const target = isFlammable(frontId) ? [front[0] + direction[0], front[1] + direction[1], front[2] + direction[2]] : front;
    return Boolean(fires?.ignite(target[0], target[1], target[2], isFlammable(frontId) ? { fuel: { x: front[0], y: front[1], z: front[2] } } : {}));
  },
}, saved.runeDispensers);
for (const recovered of runeDispensers.restore()) {
  drops.spawn(recovered.id, recovered.count || 1, new THREE.Vector3(recovered.x + 0.5, recovered.y + 0.7, recovered.z + 0.5), recovered.durability, recovered.enchantments);
}
world.onBlockChange((x, y, z, previous, id) => {
  for (const recovered of runeDispensers.blockChanged(x, y, z, previous, id)) {
    drops.spawn(recovered.id, recovered.count || 1, new THREE.Vector3(x + 0.5, y + 0.7, z + 0.5), recovered.durability, recovered.enchantments);
  }
});
world.onBlockChange((x, y, z, previous, id) => resonanceBoxes.blockChanged(x, y, z, previous, id));
world.onBlockChange((x, y, z, previous, id) => {
  const changed = waystars.blockChanged(x, y, z, previous, id);
  const affectsStructure = changed || previous === BLOCK.FORGED_IRON_BLOCK || id === BLOCK.FORGED_IRON_BLOCK
    || waystars.entries().some((record) => (x === record.x && z === record.z && y > record.y)
      || (y < record.y && y >= record.y - 4 && Math.abs(x - record.x) <= 4 && Math.abs(z - record.z) <= 4));
  if (affectsStructure) waystarRenderer.elapsed = 1;
});
for (const recovered of hearthsongs.restore(world)) drops.spawn(recovered.id, 1, new THREE.Vector3(recovered.x + 0.5, recovered.y + 0.7, recovered.z + 0.5));
hearthsongRenderer.sync();
world.onBlockChange((x, y, z, previous, id) => {
  const recovered = hearthsongs.blockChanged(x, y, z, previous, id);
  if (recovered) drops.spawn(recovered.id, 1, new THREE.Vector3(recovered.x + 0.5, recovered.y + 0.7, recovered.z + 0.5));
  if (recovered || isHearthsongPlayer(previous) || isHearthsongPlayer(id)) hearthsongRenderer.sync();
});
for (const recovered of infusionStills.recoverStale(world)) {
  const [x, y, z] = recovered.position;
  for (const [id, count] of recovered.items) drops.spawn(id, count, new THREE.Vector3(x + 0.5, y + 0.55, z + 0.5));
}
world.onBlockChange((x, y, z, previous, id) => {
  const item = keepsakeFrames.blockChanged(x, y, z, previous, id);
  if (item) drops.spawn(item.id, 1, new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), item.durability, item.enchantments);
  if (item || isKeepsakeFrame(previous) || isKeepsakeFrame(id)) keepsakeFrameRenderer.sync();
});
for (const recovered of keepsakeFrames.recoverStale(world)) {
  drops.spawn(recovered.item.id, 1, new THREE.Vector3(recovered.x + 0.5, recovered.y + 0.5, recovered.z + 0.5), recovered.item.durability, recovered.item.enchantments);
}
keepsakeFrameRenderer.sync();
world.onBlockChange((x, y, z, previous, id) => {
  const items = outfitterStands.blockChanged(x, y, z, previous, id);
  for (const item of items) drops.spawn(item.id, 1, new THREE.Vector3(x + 0.5, y + 0.65, z + 0.5), item.durability, item.enchantments);
  if (items.length || previous === BLOCK.OUTFITTER_STAND || id === BLOCK.OUTFITTER_STAND) outfitterStandRenderer.sync();
});
for (const recovered of outfitterStands.recoverStale(world)) {
  drops.spawn(recovered.item.id, 1, new THREE.Vector3(recovered.x + 0.5, recovered.y + 0.65, recovered.z + 0.5), recovered.item.durability, recovered.item.enchantments);
}
outfitterStandRenderer.sync();
world.onBlockChange((x, y, z, previous, id) => {
  const plant = hearthpots.blockChanged(x, y, z, previous, id);
  if (plant != null) drops.spawn(plant, 1, new THREE.Vector3(x + 0.5, y + 0.65, z + 0.5));
  if (plant != null || previous === BLOCK.HEARTHPOT || id === BLOCK.HEARTHPOT) hearthpotRenderer.sync();
});
for (const recovered of hearthpots.recoverStale(world)) drops.spawn(recovered.plant, 1, new THREE.Vector3(recovered.x + 0.5, recovered.y + 0.65, recovered.z + 0.5));
hearthpotRenderer.sync();
world.onBlockChange((x, y, z, previous, id) => {
  trailBanners.blockChanged(x, y, z, previous, id);
  if (isTrailBanner(previous) || isTrailBanner(id)) trailBannerRenderer.sync();
});
trailBanners.recoverStale(world);
trailBannerRenderer.sync();
world.onBlockChange((x, y, z, previous, id) => raincatch.blockChanged(x, y, z, previous, id));
raincatch.restoreFromEdits(world);
raincatch.recoverStale(world);
const sunhives = new SunhiveState(world, saved.sunhives, {
  onDrop: (id, count, position) => drops.spawn(id, count, position),
  onPollinate: (crop) => {
    const position = new THREE.Vector3(crop.x + 0.5, crop.y + 0.7, crop.z + 0.5);
    effects.burst(position, 0xf0c85a, 7);
    audio.play('plant');
    if (position.distanceTo(player.position) < 10) showToast(`${itemDefinition(cropSeedItem(crop.type)).name} pollinated by a Sunmoth`);
    saveGame();
  },
  onDeposit: (hive, level) => {
    const position = new THREE.Vector3(hive.x + 0.5, hive.y + 0.7, hive.z + 0.5);
    effects.burst(position, 0xf2c45b, 5);
    audio.play('plant');
    if (position.distanceTo(player.position) < 10) showToast(level >= 3 ? 'Sunhive is full of glowing nectar' : `Sunhive nectar ${level}/3`);
    saveGame();
  },
  onBlockChanged: (x, y, z, _previous, id) => lights.blockChanged(x, y, z, id),
});
world.onBlockChange((x, y, z, previous, id) => sunhives.blockChanged(x, y, z, previous, id));
const trees = new TreeLifecycle(world, seed, saved.trees, {
  canOccupy: (part) => !player.intersectsBlock(part.x, part.y, part.z, player.position, 1),
  onGrow: ({ type, x, y, z }) => {
    const position = new THREE.Vector3(x + 0.5, y + 0.6, z + 0.5);
    effects.burst(position, type === 'frostpine' ? 0x6cae91 : 0x6fab52, 18);
    audio.play('plant');
    if (position.distanceTo(player.position) < 14) showToast(`${type === 'frostpine' ? 'Frostpine' : 'Oak'} sapling grew`);
    saveGame();
  },
  onDecay: (id, x, y, z) => {
    const position = new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5);
    for (const item of blockDrops(id)) drops.spawn(item, 1, position);
    effects.burst(position, BLOCKS[id].color, 4);
  },
  onDrop: (id, x, y, z) => drops.spawn(id, 1, new THREE.Vector3(x + 0.5, y + 0.25, z + 0.5)),
});
world.onBlockChange((x, y, z, previous, id) => trees.blockChanged(x, y, z, previous, id));
trees.restore();
let detachingUnsupportedLadders = false;
world.onBlockChange((x, y, z, previous, id) => {
  if (detachingUnsupportedLadders || !BLOCKS[previous]?.solid || BLOCKS[id]?.solid) return;
  detachingUnsupportedLadders = true;
  try {
    for (const detached of detachUnsupportedLadders(world, x, y, z)) {
      drops.spawn('oak_ladder', 1, new THREE.Vector3(detached.x + 0.5, detached.y + 0.5, detached.z + 0.5));
    }
  } finally {
    detachingUnsupportedLadders = false;
  }
});
let detachingUnsupportedTorches = false;
world.onBlockChange((x, y, z, previous, id) => {
  if (detachingUnsupportedTorches || !BLOCKS[previous]?.solid || BLOCKS[id]?.solid) return;
  detachingUnsupportedTorches = true;
  try {
    for (const detached of detachUnsupportedTorches(world, x, y, z)) {
      lights.blockChanged(detached.x, detached.y, detached.z, BLOCK.AIR);
      drops.spawn(BLOCK.TORCH, 1, new THREE.Vector3(detached.x + 0.5, detached.y + 0.45, detached.z + 0.5));
    }
  } finally {
    detachingUnsupportedTorches = false;
  }
});
let detachingUnsupportedKeepsakeFrames = false;
world.onBlockChange((x, y, z, previous, id) => {
  if (detachingUnsupportedKeepsakeFrames || !BLOCKS[previous]?.solid || BLOCKS[id]?.solid) return;
  detachingUnsupportedKeepsakeFrames = true;
  try {
    for (const detached of detachUnsupportedKeepsakeFrames(world, x, y, z)) {
      drops.spawn('keepsake_frame', 1, new THREE.Vector3(detached.x + 0.5, detached.y + 0.5, detached.z + 0.5));
    }
  } finally {
    detachingUnsupportedKeepsakeFrames = false;
  }
});
let detachingUnsupportedOutfitterStand = false;
world.onBlockChange((x, y, z, previous, id) => {
  if (detachingUnsupportedOutfitterStand || !BLOCKS[previous]?.solid || BLOCKS[id]?.solid) return;
  detachingUnsupportedOutfitterStand = true;
  try {
    const detached = detachUnsupportedOutfitterStand(world, x, y, z);
    if (detached) drops.spawn(BLOCK.OUTFITTER_STAND, 1, new THREE.Vector3(detached.x + 0.5, detached.y + 0.25, detached.z + 0.5));
  } finally {
    detachingUnsupportedOutfitterStand = false;
  }
});
let detachingUnsupportedHearthpot = false;
world.onBlockChange((x, y, z, previous, id) => {
  if (detachingUnsupportedHearthpot || !BLOCKS[previous]?.solid || BLOCKS[id]?.solid) return;
  detachingUnsupportedHearthpot = true;
  try {
    const detached = detachUnsupportedHearthpot(world, x, y, z);
    if (detached) drops.spawn(BLOCK.HEARTHPOT, 1, new THREE.Vector3(detached.x + 0.5, detached.y + 0.25, detached.z + 0.5));
  } finally {
    detachingUnsupportedHearthpot = false;
  }
});
let detachingUnsupportedMossweaveCarpet = false;
let detachingUnsupportedHearthcake = false;
world.onBlockChange((x, y, z, previous, id) => {
  if (detachingUnsupportedHearthcake || !BLOCKS[previous]?.solid || BLOCKS[id]?.solid) return;
  detachingUnsupportedHearthcake = true;
  try {
    const detached = detachUnsupportedHearthcake(world, x, y, z);
    if (detached) effects.burst(new THREE.Vector3(detached.x + 0.5, detached.y + 0.3, detached.z + 0.5), 0xd69b4d, 8);
  } finally {
    detachingUnsupportedHearthcake = false;
  }
});
let detachingUnsupportedRaincatch = false;
world.onBlockChange((x, y, z, previous, id) => {
  if (detachingUnsupportedRaincatch || !BLOCKS[previous]?.solid || BLOCKS[id]?.solid) return;
  detachingUnsupportedRaincatch = true;
  try {
    const detached = detachUnsupportedRaincatch(world, x, y, z);
    if (detached) drops.spawn(detached.id, 1, new THREE.Vector3(detached.x + 0.5, detached.y + 0.35, detached.z + 0.5));
  } finally {
    detachingUnsupportedRaincatch = false;
  }
});
let detachingUnsupportedTrailBanner = false;
world.onBlockChange((x, y, z, previous, id) => {
  if (detachingUnsupportedTrailBanner || !BLOCKS[previous]?.solid || BLOCKS[id]?.solid) return;
  detachingUnsupportedTrailBanner = true;
  try {
    const detached = detachUnsupportedTrailBanner(world, x, y, z);
    if (detached) drops.spawn(detached.id, 1, new THREE.Vector3(detached.x + 0.5, detached.y + 0.5, detached.z + 0.5));
  } finally {
    detachingUnsupportedTrailBanner = false;
  }
});
world.onBlockChange((x, y, z, previous, id) => {
  if (detachingUnsupportedMossweaveCarpet || !BLOCKS[previous]?.solid || BLOCKS[id]?.solid) return;
  detachingUnsupportedMossweaveCarpet = true;
  try {
    const detached = detachUnsupportedMossweaveCarpet(world, x, y, z);
    if (detached) drops.spawn(detached.id, 1, new THREE.Vector3(detached.x + 0.5, detached.y + 0.18, detached.z + 0.5));
  } finally {
    detachingUnsupportedMossweaveCarpet = false;
  }
});
let detachingUnsupportedScaffolds = false;
world.onBlockChange((x, y, z, previous, id) => {
  const scaffoldAffected = BLOCKS[previous]?.scaffold || BLOCKS[world.getBlock(x, y + 1, z)]?.scaffold;
  if (detachingUnsupportedScaffolds || !scaffoldAffected || !BLOCKS[previous]?.solid || BLOCKS[id]?.solid) return;
  detachingUnsupportedScaffolds = true;
  try {
    for (const detached of detachUnsupportedScaffolds(world, x, z)) {
      drops.spawn(detached.id, 1, new THREE.Vector3(detached.x + 0.5, detached.y + 0.5, detached.z + 0.5));
    }
  } finally {
    detachingUnsupportedScaffolds = false;
  }
});
const fallingBlocks = new FallingBlockSystem(scene, world, {
  canSettle: (x, y, z) => !player.intersectsBlock(x, y, z, player.position, 1),
  onLand: (id, position) => {
    effects.burst(position, BLOCKS[id].color, 4);
    audio.play('place');
  },
  onDrop: (id, position) => drops.spawn(id, 1, position),
});
world.onBlockChange((x, y, z) => fallingBlocks.blockChanged(x, y, z));
fallingBlocks.scanAround(player.position, 6, 16);
const experienceWisps = new ExperienceWispManager(scene, world, player, (amount) => {
  const result = experience.add(amount);
  audio.play('experience');
  renderExperience();
  if (result.levelsGained > 0) showToast(`Forge level ${result.level}`);
  saveGame();
});
const vaultState = new EchoVaultState(world, saved.vaults, {
  onTrap: ({ trap, damage }) => {
    const position = new THREE.Vector3(trap.x + 0.5, trap.y + 0.35, trap.z + 0.5);
    effects.burst(position, 0x9fc4ca, 18);
    audio.play('hurt');
    takeDamage(damage, 'Echo spikes', true);
    showToast('Ancient spikes snap from the floor!');
    saveGame();
  },
  onClear: (_vault, features) => {
    effects.burst(new THREE.Vector3(features.chest.x + 0.5, features.chest.y + 0.7, features.chest.z + 0.5), 0x70e8dd, 24);
    audio.play('experience');
    showToast('Echo Vault cleared — the treasure seal dissolves');
    saveGame();
  },
});
const cinderwatchState = new CinderwatchState(saved.cinderwatches);
player.onLand = (fallDistance) => {
  const x = Math.floor(player.position.x);
  const y = Math.floor(player.position.y - 0.05);
  const z = Math.floor(player.position.z);
  const ground = world.getBlock(x, y, z);
  audio.playFootstep(ground, { landing: true, intensity: fallDistance, variant: Math.floor(fallDistance * 3) });
  if (fallDistance < 1.1) return;
  if (ground !== BLOCK.FARMLAND && ground !== BLOCK.HYDRATED_FARMLAND) return;
  world.setBlock(x, y, z, BLOCK.DIRT);
  farming.untill(x, y, z);
  const crop = world.getBlock(x, y + 1, z);
  if (BLOCKS[crop]?.crop) {
    world.setBlock(x, y + 1, z, BLOCK.AIR);
    farming.remove(x, y + 1, z);
    drops.spawn(cropSeedItem(BLOCKS[crop].cropType), 1, new THREE.Vector3(x + 0.5, y + 1.2, z + 0.5));
  }
  effects.burst(new THREE.Vector3(x + 0.5, y + 1, z + 0.5), BLOCKS[BLOCK.DIRT].color, 9);
  audio.play('break');
  showToast('Farmland trampled');
  saveGame();
};
const hostileProjectiles = new HostileProjectileManager(scene, world, player,
  (damage, source, position) => {
    effects.burst(position, 0xa6b769, 8);
    audio.play('hurt');
    takeDamage(damage, `${source} thorn`, true);
  },
  (position) => {
    effects.burst(position, 0x81915a, 5);
    audio.play('attack');
  },
);
let explosives = null;
let tethers = null;
const entities = new EntityManager(scene, world, player, seed, {
  onAttackPlayer: (damage, attacker) => {
    takeDamage(damage, `${attacker} hit you`, true);
  },
  onDrop: (id, count, position) => drops.spawn(id, count, position),
  onDefeat: (type, amount, position, entity) => {
    tethers?.releaseEntity(entity, true);
    experienceWisps.spawn(amount, position);
    if (entity?.watchKey) {
      const result = cinderwatchState.recordDefeat(entity.watchKey);
      if (result?.cleared) {
        effects.burst(position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xf07b3d, 24);
        audio.play('experience');
        showToast('Cinderwatch cleared — the ember cache is yours');
      } else if (result?.changed) showToast(`Cinderwatch guardian defeated · ${result.remaining} remains`);
      saveGame();
    }
    if (type !== 'echo_sentinel' || !entity?.vaultKey) return;
    const vault = (world.echoVaultsNear?.(position.x, position.z, 32) || []).find((candidate) => candidate.key === entity.vaultKey);
    if (vault) vaultState.clear(vault);
  },
  onMountStep: (position, speed) => {
    const ground = world.getBlock(Math.floor(position.x), Math.floor(position.y - 0.1), Math.floor(position.z));
    audio.playFootstep(ground, { sprinting: speed > 6, variant: Math.floor(position.x * 3 + position.z * 5) });
    effects.burst(position.clone().add(new THREE.Vector3(0, -0.02, 0)), BLOCKS[ground]?.color || 0xb08a61, speed > 6 ? 4 : 2);
  },
  onRangedAttack: (entity, stats) => hostileProjectiles.shoot(entity, stats),
  onVolatilePrime: (entity) => {
    audio.playCreature(entity.type, 'attack', { distance: entity.root.position.distanceTo(player.position), variant: entity.id });
    effects.burst(entity.root.position.clone().add(new THREE.Vector3(0, 0.9, 0)), 0xb9dd72, 6);
  },
  onVolatileDetonate: ({ definition, position, stats }) => {
    explosives?.explodeAt(position, stats.radius, { source: definition.name, maximumDamage: stats.maximumDamage });
  },
  onPounceWindup: (entity) => {
    effects.burst(entity.root.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 0xc6c2ad, 5);
    if (entity.root.position.distanceTo(player.position) < 10) showToast(`${entity.definition.name} coils to pounce`);
  },
  onSplit: (position, children, parent) => {
    effects.burst(position.clone().add(new THREE.Vector3(0, 0.45, 0)), 0x76906a, 8 + children.length * 3);
    if (position.distanceTo(player.position) < 10) showToast(`${parent.definition.name} divides into ${children.length}`);
    saveGame();
  },
  onMessage: showToast,
  getHeldItem: selectedItemId,
  getOutposts: () => outposts.entries(),
  getResidentSchedule: (entity, time) => entity.outpostKey ? outposts.schedule(entity.outpostKey, time, seed, entity.settlementKey) : null,
  cinderwatchRemaining: (key) => cinderwatchState.remaining(key),
  onBreed: (position) => {
    effects.burst(position.clone().add(new THREE.Vector3(0, 1, 0)), 0xf08aaa, 14);
    audio.play('craft');
  },
  onProduce: (id, count, position, entity) => {
    drops.spawn(id, count, position);
    effects.burst(position.clone().add(new THREE.Vector3(0, 0.18, 0)), 0xd8c79b, 5);
    audio.playCreature(entity.type, 'ambient', { distance: position.distanceTo(player.position), variant: entity.id });
    if (position.distanceTo(player.position) < 12) showToast(`${entity.definition.name} laid a ${itemDefinition(id).name}`);
    saveGame();
  },
  onSound: (type, event, position, variant) => {
    const offset = position.clone().sub(camera.position);
    const distance = offset.length();
    const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const pan = distance > 0 ? offset.dot(cameraRight) / distance : 0;
    audio.playCreature(type, event, { distance, pan, variant });
    showSpatialSoundCaption(CREATURES[type]?.name || type, event, position);
  },
});
entities.restore(realmTravel.entitiesFor());
tethers = new TetherSystem(scene, world, player, () => entities.entities, saved.tethers, {
  onDrop: (id, count, position) => drops.spawn(id, count, position),
});
world.onBlockChange((x, y, z, previous, id) => {
  const released = tethers.blockChanged(x, y, z, previous, id, realmTravel.current);
  if (released && explosives) saveGame();
});
explosives = new PrimedBlastSystem(scene, world, saved.explosives, {
  onBlockDestroyed: (block) => {
    if (BLOCKS[block.id]?.crop) farming.remove(block.x, block.y, block.z);
    if (block.id === BLOCK.FARMLAND || block.id === BLOCK.HYDRATED_FARMLAND) farming.untill(block.x, block.y, block.z);
    lights.blockChanged(block.x, block.y, block.z, BLOCK.AIR);
    circuits.blockChanged(block.x, block.y, block.z, block.id, BLOCK.AIR);
    if (isRail(block.id)) {
      for (const change of refreshRailsAround(world, block.x, block.y, block.z)) {
        circuits.blockChanged(change.x, change.y, change.z, change.previous, change.id);
      }
    }
    if (block.drop) {
      const position = new THREE.Vector3(block.x + 0.5, block.y + 0.5, block.z + 0.5);
      for (const item of blockDrops(block.id)) drops.spawn(item, 1, position);
    }
  },
  onDetonate: (center, radius, destroyed, chained, context = {}) => {
    audio.play('blast');
    effects.burst(center, 0xf0a24d, 48);
    effects.smoke(center, 12);
    const playerCenter = player.position.clone().add(new THREE.Vector3(0, 0.9, 0));
    const playerDistance = playerCenter.distanceTo(center);
    const playerDamage = blastDamage(playerDistance, radius, context.maximumDamage);
    if (playerDamage > 0 && !survival.dead) {
      const impulse = playerCenter.sub(center);
      if (impulse.lengthSq() < 0.01) impulse.set(0, 1, 0);
      const strength = Math.max(0, 1 - playerDistance / (radius * 1.65));
      impulse.normalize();
      player.velocity.addScaledVector(impulse, 5.5 * strength);
      player.velocity.y += 3.8 * strength;
      takeDamage(playerDamage, context.source || 'Blast Keg', true);
    }
    for (const entity of [...entities.entities]) {
      const distance = entity.root.position.clone().add(new THREE.Vector3(0, 0.9, 0)).distanceTo(center);
      const damage = blastDamage(distance, radius, context.maximumDamage);
      if (damage > 0) entities.attack(entity, damage, 5, center);
    }
    showToast(`${context.source || 'Blast Keg'} detonated · ${destroyed} blocks broken${chained ? ` · ${chained} keg${chained === 1 ? '' : 's'} chained` : ''}`);
    saveGame();
  },
});
const fires = new FireState(world, seed, saved.fires, {
  onIgnite: ({ x, y, z, natural }) => {
    lights.blockChanged(x, y, z, BLOCK.EMBERFIRE);
    effects.burst(new THREE.Vector3(x + 0.5, y + 0.42, z + 0.5), 0xf0953d, natural ? 3 : 9);
    if (!natural) audio.play('ignite');
  },
  onExtinguish: ({ x, y, z, reason }) => {
    lights.blockChanged(x, y, z, BLOCK.AIR);
    effects.smoke(new THREE.Vector3(x + 0.5, y + 0.35, z + 0.5), reason === 'water' || reason === 'rain' ? 6 : 2);
    if ((reason === 'water' || reason === 'rain') && Math.hypot(x - player.position.x, z - player.position.z) < 12) audio.play('extinguish');
  },
  onBurn: ({ x, y, z, id }) => {
    if (BLOCKS[id]?.crop) farming.remove(x, y, z);
    lights.blockChanged(x, y, z, BLOCK.AIR);
    circuits.blockChanged(x, y, z, id, BLOCK.AIR);
    effects.smoke(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), 4);
  },
  onExplosive: (x, y, z) => {
    if (explosives.prime(x, y, z, 1.15)) {
      audio.play('ignite');
      saveGame();
    }
  },
  onFlicker: (x, y, z, intensity) => lights.setIntensity(x, y, z, intensity),
});
world.onBlockChange((x, y, z, previous, id) => fires.blockChanged(x, y, z, previous, id));
fires.restore();
const projectiles = new ProjectileManager(scene, world, entities, (entity, position, damaged) => {
  effects.burst(position, entity ? 0xc9b07a : 0x858b8b, entity && damaged ? 8 : 4);
  if (entity && damaged) audio.play('attack');
});

function hexColor(value) {
  return `#${value.toString(16).padStart(6, '0')}`;
}

function roundPosition(position) {
  return position ? {
    x: Number(position.x.toFixed(2)),
    y: Number(position.y.toFixed(2)),
    z: Number(position.z.toFixed(2)),
  } : null;
}

function playtestSnapshot() {
  const px = Math.floor(player.position.x);
  const py = Math.floor(player.position.y);
  const pz = Math.floor(player.position.z);
  const integrity = world.activeChunkIntegrity(player.position);
  const columns = [];
  for (let dz = -2; dz <= 2; dz += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const x = px + dx;
      const z = pz + dz;
      columns.push({ dx, dz, surface: world.terrainHeight(x, z), blocks: [-2, -1, 0, 1, 2].map((dy) => world.getBlock(x, py + dy, z)) });
    }
  }
  return {
    survival: { health: survival.health, hunger: survival.hunger, air: survival.air, dead: survival.dead },
    climate: climateExposure.status(),
    weather: weatherState.kind,
    worldTime: Number(worldTime.toFixed(4)),
    chunks: { loaded: world.meshes.size, valid: integrity.valid, expected: integrity.expected, missing: integrity.missing.slice(0, 12) },
    movement: { moving: player.moving, sprinting: player.sprinting, crouching: player.crouching, inWater: player.inWater, submerged: player.submerged, climbing: player.climbing },
    columns,
  };
}

function renderHotbar() {
  hotbar.replaceChildren();
  hotbarSlots.forEach((id, index) => {
    const slot = document.createElement('div');
    slot.className = `slot${index === selectedIndex ? ' selected' : ''}`;
    const definition = id == null ? null : itemDefinition(id);
    const condition = id == null ? null : inventory.durability(id);
    const enchanted = id == null ? false : inventory.enchantments(id).length > 0;
    if (condition) slot.classList.add('has-durability');
    if (enchanted) slot.classList.add('enchanted');
    const durability = condition ? `<span class="durability"><i style="width:${Math.round(condition.ratio * 100)}%;background:hsl(${Math.round(condition.ratio * 110)},62%,48%)"></i></span>` : '';
    slot.innerHTML = `<span class="key">${index + 1}</span>${definition ? `${itemIconMarkup(id, definition, 'hotbar-icon')}<strong class="count">${inventory.count(id) || ''}</strong>${durability}<span class="label">${definition.name}${enchanted ? ` · ${inventory.enchantments(id).map(enchantmentLabel).join(', ')}` : ''}</span>` : '<span class="empty-slot">+</span>'}`;
    hotbar.append(slot);
  });
}

function selectedItemId() {
  return hotbarSlots[selectedIndex];
}

function wearSelectedItem(amount = 1) {
  const id = selectedItemId();
  const result = inventory.damage(id, amount);
  if (!result) return null;
  if (result.broke) {
    audio.play('break');
    showToast(`${itemDefinition(id).name} broke`);
  }
  renderHotbar();
  saveGame();
  return result;
}

function drinkTonic(id) {
  const definition = itemDefinition(id);
  if (definition?.category !== 'tonic' || inventory.count(id) <= 0) return false;
  const applied = statusEffects.drink(id);
  if (!applied || !inventory.remove(id, 1)) return false;
  inventory.add('empty_flask', 1);
  audio.play('tonic');
  effects.burst(player.position.clone().add(new THREE.Vector3(0, 1, 0)), applied.color, 10);
  showToast(`${applied.name} active for ${Math.ceil(applied.remaining)}s`);
  renderEffectHud();
  renderHotbar();
  if (inventoryOpen) renderInventory();
  saveGame();
  return true;
}

function selectedBlockId() {
  const numeric = Number(selectedItemId());
  const definition = BLOCKS[numeric];
  return Number.isInteger(numeric) && (definition?.solid || definition?.placeable) ? numeric : null;
}

function renderMeter(element, value, kind) {
  element.replaceChildren();
  for (let i = 0; i < 10; i += 1) {
    const pip = document.createElement('span');
    const remaining = value - i * 2;
    pip.className = `pip ${kind}${remaining >= 2 ? ' full' : remaining >= 1 ? ' half' : ''}`;
    element.append(pip);
  }
}

function renderSurvival() {
  renderMeter(document.querySelector('#health'), survival.health, 'health');
  renderMeter(document.querySelector('#hunger'), survival.hunger, 'hunger');
  const air = document.querySelector('#air');
  renderMeter(air, survival.air, 'air');
  air.classList.toggle('hidden', survival.air >= survival.maxAir && !player.submerged);
  const armor = document.querySelector('#armor');
  renderMeter(armor, equipment.armorPoints(), 'armor');
  armor.classList.toggle('hidden', equipment.armorPoints() <= 0);
}

function renderClimateHud() {
  const hud = document.querySelector('#climate-hud');
  const fill = document.querySelector('#climate-fill');
  const label = document.querySelector('#climate-label');
  if (!hud || !fill || !label) return;
  const status = climateExposure.status();
  hud.classList.toggle('hidden', !status.kind || status.value < 1);
  hud.classList.toggle('heat', status.kind === 'heat');
  hud.classList.toggle('cold', status.kind === 'cold');
  hud.classList.toggle('danger', status.dangerous);
  fill.style.width = `${Math.round(status.value)}%`;
  label.textContent = status.kind === 'heat' ? `DESERT HEAT ${Math.round(status.value)}%` : `FROSTVEIL COLD ${Math.round(status.value)}%`;
  hud.setAttribute('aria-label', `${label.textContent}${status.warning ? ' warning' : ''}`);
}

function renderExperience() {
  document.querySelector('#experience-level').textContent = experience.level;
  document.querySelector('#experience-fill').style.width = `${Math.round(experience.ratio() * 100)}%`;
  document.querySelector('#experience-hud').setAttribute('aria-label', `Forge level ${experience.level}, ${experience.progress} experience`);
}

function renderEffectHud() {
  const hud = document.querySelector('#effects-hud');
  hud.replaceChildren();
  for (const effect of statusEffects.entries()) {
    const chip = document.createElement('div');
    chip.className = 'effect-chip';
    chip.style.setProperty('--effect-color', hexColor(effect.color));
    const minutes = Math.floor(effect.remaining / 60);
    const seconds = Math.ceil(effect.remaining % 60).toString().padStart(2, '0');
    chip.innerHTML = `${effect.name.toUpperCase()} <span>${minutes}:${seconds}</span>`;
    hud.append(chip);
  }
}

function refreshNavigationTargets(force = false) {
  if (!force && navigationRefreshTimer > 0 && navigationTargetCache.length) return navigationTargetCache;
  navigationRefreshTimer = 2;
  const clues = discoverLandmarks(world, player.position.x, player.position.z, 176);
  const discovered = navigation.discover(clues);
  const extra = outposts.entries().map((record) => ({
    id: `outpost:${record.key}`,
    label: `Founded Outpost T${record.tier + 1}`,
    kind: 'outpost',
    x: record.x,
    z: record.z,
  }));
  if (player.spawnPoint) extra.push({ id: 'resting-point', label: 'Resting Point', kind: 'spawn', x: player.spawnPoint.x, z: player.spawnPoint.z });
  navigationTargetCache = navigation.targets(extra);
  if (discovered > 0 && selectedItemId() === 'wayfinder_compass') {
    const newest = navigation.discoveries.at(-1);
    showToast(`Wayfinder recorded ${newest.label}`);
    saveGame();
  }
  return navigationTargetCache;
}

function renderNavigationHud(force = false) {
  const hud = document.querySelector('#navigation-hud');
  const visible = selectedItemId() === 'wayfinder_compass' && inventory.count('wayfinder_compass') > 0 && !survival.dead;
  hud.classList.toggle('hidden', !visible);
  if (!visible) return;
  const targets = refreshNavigationTargets(force);
  const target = navigation.active(targets);
  if (!target) return;
  navigation.activeId = target.id;
  const reading = compassReading(player.position, target, player.yaw);
  document.querySelector('#navigation-kind').textContent = target.kind === 'landmark' ? 'DISCOVERED LANDMARK' : target.kind === 'trailmark' ? 'TRAILMARK' : target.kind === 'outpost' ? 'FOUNDED OUTPOST' : 'WAYFINDER';
  document.querySelector('#navigation-target').textContent = target.label.toUpperCase();
  document.querySelector('#navigation-direction').textContent = reading.direction;
  document.querySelector('#navigation-distance').textContent = `${reading.distance}m`;
  document.querySelector('#navigation-needle').style.transform = `rotate(${-reading.relative}rad)`;
}

function trailchartTargets() {
  const extra = outposts.entries().map((record) => ({ id: `outpost:${record.key}`, label: `Outpost T${record.tier + 1}`, kind: 'outpost', x: record.x, z: record.z }));
  if (player.spawnPoint) extra.push({ id: 'resting-point', label: 'Resting Point', kind: 'spawn', x: player.spawnPoint.x, z: player.spawnPoint.z });
  return navigation.targets(extra);
}

function drawTrailchart() {
  const context = trailchartCanvas.getContext('2d');
  const width = trailchartCanvas.width;
  const height = trailchartCanvas.height;
  const tile = 16;
  const centerX = Math.floor(player.position.x / MAP_CELL_SIZE);
  const centerZ = Math.floor(player.position.z / MAP_CELL_SIZE);
  context.fillStyle = '#151815';
  context.fillRect(0, 0, width, height);
  const colors = { plains: '#779552', forest: '#3f7047', desert: '#c2a15c', snowy_highlands: '#d4e0dd', cinderreach: '#7e4538' };
  for (const cell of explorationMap.entries()) {
    const drawX = width / 2 + (cell.x - centerX) * tile - tile / 2;
    const drawY = height / 2 + (cell.z - centerZ) * tile - tile / 2;
    if (drawX < -tile || drawY < -tile || drawX > width || drawY > height) continue;
    context.fillStyle = cell.water ? '#4c839d' : colors[cell.biome] || colors.plains;
    context.fillRect(Math.floor(drawX), Math.floor(drawY), tile, tile);
    const elevationShade = Math.max(-0.16, Math.min(0.16, (cell.elevation - 22) / 90));
    context.globalAlpha = Math.abs(elevationShade);
    context.fillStyle = elevationShade >= 0 ? '#ffffff' : '#000000';
    context.fillRect(Math.floor(drawX), Math.floor(drawY), tile, tile);
    context.globalAlpha = 1;
    context.strokeStyle = 'rgba(20,26,21,.12)';
    context.strokeRect(Math.floor(drawX) + 0.5, Math.floor(drawY) + 0.5, tile - 1, tile - 1);
  }
  const toCanvas = (x, z) => ({
    x: width / 2 + (x / MAP_CELL_SIZE - centerX) * tile,
    y: height / 2 + (z / MAP_CELL_SIZE - centerZ) * tile,
  });
  context.font = '700 9px monospace';
  context.textBaseline = 'middle';
  for (const target of trailchartTargets()) {
    if (!['trailmark', 'landmark', 'outpost', 'spawn'].includes(target.kind)) continue;
    if (!explorationMap.get(Math.floor(target.x / MAP_CELL_SIZE), Math.floor(target.z / MAP_CELL_SIZE))) continue;
    const point = toCanvas(target.x, target.z);
    if (point.x < 8 || point.y < 8 || point.x > width - 8 || point.y > height - 8) continue;
    context.save();
    context.translate(point.x, point.y);
    context.fillStyle = target.kind === 'trailmark' ? '#70e8dd' : target.kind === 'landmark' ? '#e2b95f' : '#d99b5f';
    if (target.kind === 'trailmark') {
      context.beginPath(); context.arc(0, 0, 4, 0, Math.PI * 2); context.fill();
    } else { context.rotate(Math.PI / 4); context.fillRect(-4, -4, 8, 8); }
    context.restore();
    context.fillStyle = '#f4ecd4';
    context.fillText(target.label.slice(0, 18), point.x + 7, point.y - 7);
  }
  const playerPoint = toCanvas(player.position.x, player.position.z);
  context.save();
  context.translate(playerPoint.x, playerPoint.y);
  context.rotate(-player.yaw);
  context.fillStyle = '#fff4d7';
  context.strokeStyle = '#25241e';
  context.lineWidth = 2;
  context.beginPath(); context.moveTo(0, -9); context.lineTo(6, 7); context.lineTo(0, 4); context.lineTo(-6, 7); context.closePath(); context.fill(); context.stroke();
  context.restore();
  context.strokeStyle = '#b8a169';
  context.lineWidth = 3;
  context.strokeRect(1.5, 1.5, width - 3, height - 3);
}

function setMapOpen(open) {
  if (survival.dead || (open && inventory.count('trailchart') <= 0)) return false;
  mapOpen = Boolean(open);
  mapScreen.classList.toggle('hidden', !mapOpen);
  if (mapOpen) {
    drawTrailchart();
    menu.classList.add('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
  } else {
    saveGame();
    renderer.domElement.requestPointerLock();
  }
  return true;
}

function travelToRealm(entering) {
  const departing = realmTravel.current;
  if (entering !== (departing === REALM.OVERWORLD)) return false;
  tethers.releasePlayerAnchors(departing, true);
  realmTravel.storeEntities(departing, entities.serialize());
  boats.unmount(player, false);
  carts.unmount(player, false);
  entities.unmount(player, false);
  fishing.cancel();
  hostileProjectiles.clear();
  entities.clear();
  const target = entering
    ? realmTravel.enter(currentTarget?.break || player.position)
    : realmTravel.leave(player.spawnPoint || { x: 0.5, y: null, z: 0.5 });
  if (!target) {
    entities.restore(realmTravel.entitiesFor(departing));
    return false;
  }
  const rift = entering ? world.cinderRiftPosition() : null;
  const y = Number.isFinite(target.y) ? target.y : entering ? rift.y : world.terrainHeight(target.x, target.z) + 1.01;
  player.position.set(target.x, y, target.z);
  player.velocity.set(0, 0, 0);
  player.grounded = false;
  world.update(player.position);
  if (player.collides(player.position)) player.position.y = world.terrainHeight(Math.floor(target.x), Math.floor(target.z)) + 1.01;
  player.syncCamera();
  entities.restore(realmTravel.entitiesFor());
  navigationTargetCache = [];
  audio.play('tonic');
  effects.burst(player.position.clone().add(new THREE.Vector3(0, 0.8, 0)), entering ? 0xff7f43 : 0x70e8dd, 28);
  showToast(entering ? 'Entered Cinderreach · exposed heat burns every 4 seconds' : 'Returned to the Overworld');
  saveGame();
  return true;
}

function renderBossHud() {
  const hud = document.querySelector('#boss-hud');
  const boss = entities.activeBoss();
  hud.classList.toggle('hidden', !boss || survival.dead);
  if (!boss || survival.dead) return;
  document.querySelector('#boss-name').textContent = boss.name.toUpperCase();
  document.querySelector('#boss-health').style.width = `${Math.max(0, Math.round(boss.health / boss.maximum * 100))}%`;
  document.querySelector('#boss-phase').textContent = boss.enraged ? 'THE HOLLOW AWAKENS' : 'WARDEN OF THE SHADOW DEN';
  hud.classList.toggle('enraged', boss.enraged);
}

function renderEquipment() {
  const list = document.querySelector('#equipment-list');
  list.replaceChildren();
  const cosmeticDefinition = equipment.cosmetic ? itemDefinition(equipment.cosmetic) : null;
  const cosmetic = cosmeticDefinition?.cosmetic || null;
  const preview = document.createElement('div');
  preview.className = `equipment-preview${cosmetic ? ` regalia-${cosmetic.pattern}` : ''}`;
  if (cosmetic) {
    preview.style.setProperty('--regalia-primary', hexColor(cosmetic.primary));
    preview.style.setProperty('--regalia-secondary', hexColor(cosmetic.secondary));
  }
  const part = (className, slot) => {
    const armor = itemDefinition(equipment.slots[slot]);
    return `<i class="paper-part ${className}${armor ? ' armored' : ''}" style="--armor-color:${hexColor(armor?.color || 0x39423d)}"></i>`;
  };
  preview.innerHTML = `<strong>REGALIA PREVIEW</strong><span>${cosmeticDefinition?.name || 'No cosmetic layer'}</span><div class="paper-doll">${part('paper-head', 'head')}${part('paper-body', 'chest')}${part('paper-arm paper-arm-left', 'chest')}${part('paper-arm paper-arm-right', 'chest')}${part('paper-leg paper-leg-left', 'legs')}${part('paper-leg paper-leg-right', 'legs')}${part('paper-boot paper-boot-left', 'feet')}${part('paper-boot paper-boot-right', 'feet')}</div>`;
  list.append(preview);
  for (const slot of EQUIPMENT_SLOTS) {
    const id = equipment.slots[slot];
    const definition = id ? itemDefinition(id) : null;
    const condition = equipment.condition(slot);
    const runes = equipment.enchantments[slot] || [];
    const element = document.createElement('div');
    element.className = `equipment-slot${definition ? ' equipped' : ''}`;
    element.innerHTML = `<strong>${slot.toUpperCase()}</strong><br>${definition?.name || 'Empty'}${runes.length ? `<div class="enchantment-list">${runes.map(enchantmentLabel).join(' · ')}</div>` : ''}${condition ? `<div class="equipment-condition">${condition.remaining}/${condition.maximum}<span><i style="width:${Math.round(condition.ratio * 100)}%;background:hsl(${Math.round(condition.ratio * 110)},62%,48%)"></i></span></div>` : ''}`;
    if (definition) {
      const remove = document.createElement('button');
      remove.textContent = 'UNEQUIP';
      remove.addEventListener('click', () => {
        equipment.unequip(inventory, slot);
        renderInventory();
        renderSurvival();
        saveGame();
      });
      element.append(remove);
    }
    list.append(element);
  }
  const shieldDefinition = equipment.offhand ? itemDefinition(equipment.offhand) : null;
  const shieldCondition = equipment.shieldCondition();
  const shield = document.createElement('div');
  shield.className = `equipment-slot${shieldDefinition ? ' equipped' : ''}`;
  shield.innerHTML = `<strong>OFFHAND</strong><br>${shieldDefinition?.name || 'Empty'}${equipment.offhandEnchantments.length ? `<div class="enchantment-list">${equipment.offhandEnchantments.map(enchantmentLabel).join(' · ')}</div>` : ''}${shieldCondition ? `<div class="equipment-condition">${shieldCondition.remaining}/${shieldCondition.maximum}<span><i style="width:${Math.round(shieldCondition.ratio * 100)}%;background:hsl(${Math.round(shieldCondition.ratio * 110)},62%,48%)"></i></span></div>` : ''}`;
  if (shieldDefinition) {
    const remove = document.createElement('button');
    remove.textContent = 'UNEQUIP';
    remove.addEventListener('click', () => {
      equipment.unequipShield(inventory);
      renderInventory();
      renderHotbar();
      saveGame();
    });
    shield.append(remove);
  }
  list.append(shield);
  const regalia = document.createElement('div');
  regalia.className = `equipment-slot${cosmeticDefinition ? ' equipped cosmetic-equipped' : ''}`;
  regalia.innerHTML = `<strong>STYLE</strong><br>${cosmeticDefinition?.name || 'Empty'}${cosmetic ? `<span class="cosmetic-chip" style="--cosmetic-a:${hexColor(cosmetic.primary)};--cosmetic-b:${hexColor(cosmetic.secondary)}"></span>` : ''}`;
  if (cosmeticDefinition) {
    const remove = document.createElement('button');
    remove.textContent = 'REMOVE STYLE';
    remove.addEventListener('click', () => {
      equipment.unequipCosmetic(inventory);
      audio.play('open');
      renderInventory();
      renderHotbar();
      saveGame();
    });
    regalia.append(remove);
  }
  list.append(regalia);
  player.canBlock = equipment.hasShield();
}

function renderInventory() {
  renderEquipment();
  const list = document.querySelector('#inventory-list');
  list.replaceChildren();
  const entries = inventory.entries();
  if (!entries.length) list.innerHTML = '<div class="empty-inventory">Mine blocks to collect your first materials.</div>';
  for (const [id, count] of entries) {
    const definition = itemDefinition(id);
    const condition = inventory.durability(id);
    const itemEnchantments = inventory.enchantments(id);
    const item = document.createElement('div');
    item.className = `inventory-item${craftingCursor != null && String(craftingCursor) === String(id) ? ' craft-selected' : ''}`;
    item.innerHTML = `${itemIconMarkup(id, definition, 'inventory-icon')}<strong>${count}</strong>${definition.name}${itemEnchantments.length ? `<div class="enchantment-list">${itemEnchantments.map(enchantmentLabel).join(' · ')}</div>` : ''}${condition ? `<div class="item-condition">${condition.remaining} / ${condition.maximum}<span><i style="width:${Math.round(condition.ratio * 100)}%;background:hsl(${Math.round(condition.ratio * 110)},62%,48%)"></i></span></div>` : ''}`;
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const assign = document.createElement('button');
    assign.className = 'item-action';
    assign.textContent = `TO SLOT ${selectedIndex + 1}`;
    assign.addEventListener('click', () => {
      const numeric = Number(id);
      hotbarSlots[selectedIndex] = Number.isInteger(numeric) && BLOCKS[numeric] ? numeric : id;
      showToast(`${definition.name} assigned to slot ${selectedIndex + 1}`);
      renderHotbar();
      saveGame();
    });
    actions.append(assign);
    if ((craftingStation === 'hand' || craftingStation === 'table') && !definition.durability) {
      const selectForGrid = document.createElement('button');
      selectForGrid.className = 'item-action';
      selectForGrid.textContent = craftingCursor != null && String(craftingCursor) === String(id) ? 'GRID ITEM ✓' : 'USE IN GRID';
      selectForGrid.addEventListener('click', () => {
        craftingCursor = id;
        renderInventory();
      });
      actions.append(selectForGrid);
    }
    if (definition.category === 'armor') {
      const equip = document.createElement('button');
      equip.className = 'item-action';
      equip.textContent = 'EQUIP';
      equip.addEventListener('click', () => {
        if (!equipment.equip(inventory, id)) return;
        audio.play('place');
        renderInventory();
        renderHotbar();
        renderSurvival();
        saveGame();
      });
      actions.append(equip);
    }
    if (definition.category === 'shield') {
      const equip = document.createElement('button');
      equip.className = 'item-action';
      equip.textContent = 'EQUIP OFFHAND';
      equip.addEventListener('click', () => {
        if (!equipment.equipShield(inventory, id)) return;
        audio.play('open');
        renderInventory();
        renderHotbar();
        saveGame();
      });
      actions.append(equip);
    }
    if (definition.category === 'cosmetic') {
      const wear = document.createElement('button');
      wear.className = 'item-action';
      wear.textContent = equipment.cosmetic === id ? 'STYLE EQUIPPED' : 'WEAR STYLE';
      wear.disabled = equipment.cosmetic === id;
      wear.addEventListener('click', () => {
        if (!equipment.equipCosmetic(inventory, id)) return;
        audio.play('craft');
        renderInventory();
        renderHotbar();
        saveGame();
      });
      actions.append(wear);
    }
    if (craftingStation === 'chest' && activeChestKey) {
      const store = document.createElement('button');
      store.className = 'item-action';
      store.textContent = 'STORE 1 · SHIFT ALL';
      store.addEventListener('click', (event) => {
        const amount = event.shiftKey ? inventory.count(id) : 1;
        if (!storage.deposit(activeChestKey, inventory, id, amount)) {
          showToast('Chest is full');
          return;
        }
        renderInventory();
        renderHotbar();
        saveGame();
      });
      actions.append(store);
    }
    if (craftingStation === 'furnace' && activeFurnaceKey) {
      if (furnaces.acceptsInput(id, activeFurnaceKey)) {
        const loadInput = document.createElement('button');
        loadInput.className = 'item-action';
        loadInput.textContent = 'LOAD INPUT';
        loadInput.addEventListener('click', () => {
          if (!furnaces.deposit(activeFurnaceKey, inventory, 'input', id, 1)) {
            showToast('Furnace input contains a different material');
            return;
          }
          audio.play('place');
          renderInventory();
          renderHotbar();
          saveGame();
        });
        actions.append(loadInput);
      }
      if (furnaces.acceptsFuel(id)) {
        const loadFuel = document.createElement('button');
        loadFuel.className = 'item-action';
        loadFuel.textContent = 'LOAD FUEL';
        loadFuel.addEventListener('click', () => {
          if (!furnaces.deposit(activeFurnaceKey, inventory, 'fuel', id, 1)) return;
          audio.play('place');
          renderInventory();
          renderHotbar();
          saveGame();
        });
        actions.append(loadFuel);
      }
    }
    if (craftingStation === 'still' && activeInfusionKey) {
      const addStillAction = (label, slot) => {
        const button = document.createElement('button');
        button.className = 'item-action'; button.textContent = label;
        button.addEventListener('click', (event) => {
          const maximum = event.shiftKey ? inventory.count(id) : 1;
          if (!infusionStills.deposit(activeInfusionKey, inventory, slot, id, maximum)) {
            showToast(slot === 'flask' ? `Still holds at most ${STILL_FLASK_CAPACITY} flasks` : 'That Still slot is full');
            return;
          }
          audio.play('place'); renderInventory(); renderHotbar(); saveGame();
        });
        actions.append(button);
      };
      if (id === 'empty_flask') addStillAction('LOAD FLASK · SHIFT ALL', 'flask');
      if (id === STILL_CATALYST_ITEM) addStillAction('LOAD CATALYST · SHIFT ALL', 'catalyst');
      if (infusionIngredient(id)) addStillAction('LOAD REAGENT · SHIFT ALL', 'ingredient');
    }
    if (definition.category === 'food') {
      const eat = document.createElement('button');
      eat.className = 'item-action';
      eat.textContent = 'EAT';
      eat.disabled = survival.hunger >= survival.maxHunger;
      eat.addEventListener('click', () => {
        if (!survival.eat(definition.food || 3, definition.saturation || 1) || !inventory.remove(id, 1)) return;
        if (definition.containerReturn) inventory.add(definition.containerReturn, 1);
        showToast(`Ate ${definition.name}${definition.containerReturn ? ` · recovered ${itemDefinition(definition.containerReturn).name}` : ''}`);
        audio.play('eat');
        renderInventory();
        renderSurvival();
        saveGame();
      });
      actions.append(eat);
    }
    if (definition.category === 'map') {
      const openMap = document.createElement('button');
      openMap.className = 'item-action';
      openMap.textContent = 'OPEN MAP';
      openMap.addEventListener('click', () => {
        setInventoryOpen(false);
        requestAnimationFrame(() => setMapOpen(true));
      });
      actions.append(openMap);
    }
    if (definition.category === 'tonic') {
      const drink = document.createElement('button');
      drink.className = 'item-action';
      drink.textContent = 'DRINK';
      drink.addEventListener('click', () => drinkTonic(id));
      actions.append(drink);
    }
    item.append(actions);
    list.append(item);
  }
  const trader = activeTraderKey ? offersForTrader(seed, activeTraderKey) : null;
  document.querySelector('#crafting-mode-label').textContent = craftingStation === 'table' ? 'Crafting Table' : craftingStation === 'furnace' ? FURNACE_MODES[furnaces.modeFor(activeFurnaceKey)]?.label || 'Stone Furnace' : craftingStation === 'still' ? 'Infusion Still' : craftingStation === 'anvil' ? 'Forgeheart Anvil' : craftingStation === 'grind' ? 'Runegrind Wheel' : craftingStation === 'cutter' ? 'Stonewright Cutter' : craftingStation === 'chest' ? (storage.label(activeChestKey) || (isWayvaultStorageKey(activeChestKey) ? 'Wayvault Chest' : isBarrelKey(activeChestKey) ? 'Trailbarrel' : isFunnelKey(activeChestKey) ? 'Forge Funnel' : isEjectorKey(activeChestKey) ? 'Forge Ejector' : isDispenserKey(activeChestKey) ? 'Rune Dispenser' : storage.capacityFor(activeChestKey) > 27 ? 'Double Chest' : 'Chest Storage')) : craftingStation === 'repair' ? 'Repair Bench' : craftingStation === 'runeforge' ? 'Runeforge' : craftingStation === 'trade' && trader ? trader.title : 'Hand Crafting';
  const recipes = document.querySelector('#recipe-list');
  recipes.replaceChildren();
  if (craftingStation === 'chest' && activeChestKey) {
    const used = slotsUsed(storage.get(activeChestKey));
    const capacitySlots = storage.capacityFor(activeChestKey);
    const chestEntries = storage.entries(activeChestKey);
    const tools = document.createElement('div');
    tools.className = 'chest-tools';
    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.maxLength = 24;
    labelInput.placeholder = 'Container label (24 characters)';
    labelInput.value = storage.label(activeChestKey);
    labelInput.setAttribute('aria-label', 'Container label');
    const saveLabel = document.createElement('button');
    saveLabel.textContent = 'SAVE LABEL';
    const sort = document.createElement('button');
    sort.textContent = `SORT: ${storage.sortMode(activeChestKey).toUpperCase()}`;
    const commitLabel = () => {
      labelInput.value = storage.setLabel(activeChestKey, labelInput.value);
      audio.play('craft');
      renderInventory();
      saveGame();
    };
    saveLabel.addEventListener('click', commitLabel);
    labelInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') commitLabel();
    });
    sort.addEventListener('click', () => {
      const current = STORAGE_SORT_MODES.indexOf(storage.sortMode(activeChestKey));
      storage.setSortMode(activeChestKey, STORAGE_SORT_MODES[(current + 1) % STORAGE_SORT_MODES.length]);
      renderInventory();
      saveGame();
    });
    tools.append(labelInput, saveLabel, sort);
    recipes.append(tools);
    const capacity = document.createElement('div');
    capacity.className = 'recipe chest-capacity';
      capacity.innerHTML = `<div><div class="recipe-name">${isWayvaultStorageKey(activeChestKey) ? 'SHARED WAYVAULT' : isBarrelKey(activeChestKey) ? 'TRAILBARREL CAPACITY' : isFunnelKey(activeChestKey) ? 'FORGE FUNNEL CAPACITY' : isEjectorKey(activeChestKey) ? 'FORGE EJECTOR CAPACITY' : isDispenserKey(activeChestKey) ? 'RUNE DISPENSER CAPACITY' : `${capacitySlots > 27 ? 'DOUBLE ' : ''}CHEST CAPACITY`}</div><div class="recipe-cost">${used} / ${capacitySlots} slots · 64 items per standard stack${isWayvaultStorageKey(activeChestKey) ? ' · shared by every Wayvault' : isBarrelKey(activeChestKey) ? ' · compact single-block storage' : isFunnelKey(activeChestKey) ? ' · transfers one item every 0.8 seconds' : isEjectorKey(activeChestKey) ? ' · emits one item on each Spark rising edge' : isDispenserKey(activeChestKey) ? ' · activates arrows, pails, kegs, and Spark Strikers' : ''}</div></div>`;
    recipes.append(capacity);
    if (!chestEntries.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-inventory';
      empty.textContent = `${isWayvaultStorageKey(activeChestKey) ? 'Your shared Wayvault' : isBarrelKey(activeChestKey) ? 'This Trailbarrel' : isFunnelKey(activeChestKey) ? 'This Forge Funnel' : isEjectorKey(activeChestKey) ? 'This Forge Ejector' : isDispenserKey(activeChestKey) ? 'This Rune Dispenser' : 'This chest'} is empty. Shift-click a transfer button to move a full stack.`;
      recipes.append(empty);
    }
    for (const [id, count] of chestEntries) {
      const definition = itemDefinition(id);
      const row = document.createElement('div');
      row.className = 'recipe';
      row.innerHTML = `<div class="recipe-identity">${itemIconMarkup(id, definition, 'recipe-row-icon')}<div><div class="recipe-name">${definition.name}</div><div class="recipe-cost">Stored: ${count}</div></div></div><button>TAKE 1 · SHIFT ALL</button>`;
      row.querySelector('button').addEventListener('click', (event) => {
        storage.withdraw(activeChestKey, inventory, id, event.shiftKey ? count : 1);
        renderInventory();
        renderHotbar();
        saveGame();
      });
      recipes.append(row);
    }
    return;
  }
  if (craftingStation === 'furnace' && activeFurnaceKey) {
    const furnace = furnaces.get(activeFurnaceKey);
    const furnaceMode = FURNACE_MODES[furnaces.modeFor(activeFurnaceKey)];
    const slotLabels = { input: 'Input', fuel: 'Coal Fuel', output: 'Finished Output' };
    for (const slotName of ['input', 'fuel', 'output']) {
      const slot = furnace[slotName];
      const row = document.createElement('div');
      row.className = 'recipe furnace-slot';
      const slotDefinition = slot ? itemDefinition(slot.id) : null;
      row.innerHTML = `<div class="recipe-identity">${slot ? itemIconMarkup(slot.id, slotDefinition, 'recipe-row-icon') : ''}<div><div class="recipe-name">${slotLabels[slotName]}</div><div class="recipe-cost">${slot ? `${slot.count} ${slotDefinition.name}` : 'Empty'}</div></div></div><button ${slot ? '' : 'disabled'}>TAKE 1</button>`;
      row.querySelector('button').addEventListener('click', () => {
        if (!furnaces.withdraw(activeFurnaceKey, inventory, slotName, 1)) return;
        audio.play('pickup');
        renderInventory();
        renderHotbar();
        saveGame();
      });
      recipes.append(row);
    }
    const meters = document.createElement('div');
    meters.className = 'furnace-meters';
    meters.innerHTML = `<div class="furnace-meter-label"><span>HEAT</span><span id="furnace-heat-text">0%</span></div><div class="furnace-meter"><span id="furnace-heat-fill"></span></div><div class="furnace-meter-label"><span>${furnaceMode.id === 'smoker' ? 'COOKING' : 'SMELTING'}</span><span id="furnace-progress-text">0%</span></div><div class="furnace-meter"><span id="furnace-progress-fill"></span></div><p>${furnaceMode.description} Load compatible input plus coal; progress continues while you explore.</p>`;
    recipes.append(meters);
    updateFurnaceMeters();
    return;
  }
  if (craftingStation === 'still' && activeInfusionKey) {
    renderInfusionStill(recipes);
    return;
  }
  if (craftingStation === 'repair') {
    renderRepairBench(recipes);
    return;
  }
  if (craftingStation === 'anvil') {
    renderForgeheartAnvil(recipes);
    return;
  }
  if (craftingStation === 'grind') {
    renderRunegrindWheel(recipes);
    return;
  }
  if (craftingStation === 'cutter') {
    renderStonewrightCutter(recipes);
    return;
  }
  if (craftingStation === 'runeforge') {
    renderRuneforge(recipes);
    return;
  }
  if (craftingStation === 'trade' && activeTraderKey) {
    renderTrading(recipes, activeTraderKey);
    return;
  }
  renderSpatialCrafting(recipes);
}

function renderTrading(container, traderKey) {
  const trader = offersForTrader(seed, traderKey);
  const tier = trading.tier();
  const nextTier = trading.nextTier();
  const favor = social.favor(traderKey);
  const heading = document.createElement('div');
  heading.className = 'trader-heading';
  heading.innerHTML = `<strong>${trader.title.toUpperCase()}</strong><span>${tier.name} · Reputation ${trading.reputation}${nextTier ? `/${nextTier.minimum} to ${nextTier.name}` : ' · maximum standing'} · Favor ${favor}/5 · Shift-use the requested gift to build favor</span>`;
  container.append(heading);
  for (const offer of trader.offers) {
    const priced = trading.effectiveOffer(offer, favor);
    const input = itemDefinition(priced.id);
    const output = itemDefinition(priced.output.id);
    const remaining = trading.remaining(traderKey, offer);
    const unlocked = trading.unlocked(offer);
    const affordable = trading.canTrade(traderKey, offer, inventory, favor);
    const row = document.createElement('div');
    row.className = 'recipe trade-offer';
    row.innerHTML = `<div class="recipe-identity"><div class="recipe-icon-pair">${itemIconMarkup(priced.id, input, 'recipe-row-icon')}${itemIconMarkup(priced.output.id, output, 'recipe-row-icon')}</div><div><div class="recipe-name">${priced.count} ${input.name} → ${priced.output.count} ${output.name}</div><div class="recipe-cost">${unlocked ? `You carry ${inventory.count(priced.id)} · ${remaining}/${offer.maximumUses} exchanges remaining` : `Requires ${offer.requiredReputation} reputation`}</div></div></div><button ${affordable ? '' : 'disabled'}>${!unlocked ? 'LOCKED' : remaining ? 'TRADE' : 'SOLD OUT'}</button>`;
    row.querySelector('button').addEventListener('click', () => {
      if (!trading.trade(traderKey, offer, inventory, favor)) return;
      audio.play('craft');
      showToast(`Traded for ${priced.output.count} ${output.name} · ${trading.tier().name} standing`);
      renderInventory();
      renderHotbar();
      saveGame();
    });
    container.append(row);
  }
}

function renderRuneforge(container) {
  const gear = inventory.entries().filter(([id]) => itemDefinition(id)?.durability && availableEnchantments(id).length);
  const resonance = activeRuneforgePosition
    ? runeforgeResonance(world, activeRuneforgePosition.x, activeRuneforgePosition.y, activeRuneforgePosition.z)
    : { shelves: 0, tier: 0, blocked: 0, maximum: 15 };
  const heading = document.createElement('div');
  heading.className = 'runeforge-heading';
  heading.innerHTML = `<strong>FORGE LEVEL ${experience.level} · ARCHIVE ${resonance.shelves}/${resonance.maximum}</strong><span>${inventory.count('lumen_shard')} Lumen Shards · resonance tier ${resonance.tier}/3${resonance.blocked ? ` · ${resonance.blocked} shelf${resonance.blocked === 1 ? '' : 's'} blocked by the air gap` : ''}</span>`;
  container.append(heading);
  if (!gear.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-inventory';
    empty.textContent = 'Carry an unequipped tool, weapon, armor piece, bow, shield, or rod to reveal runes.';
    container.append(empty);
    return;
  }
  for (const [id] of gear) {
    const definition = itemDefinition(id);
    const enchantments = inventory.enchantments(id);
    const section = document.createElement('section');
    section.className = 'runeforge-item';
    section.innerHTML = `<div class="recipe-identity">${itemIconMarkup(id, definition, 'recipe-row-icon')}<div><h4>${definition.name}</h4><p>${enchantments.length ? enchantments.map(enchantmentLabel).join(' · ') : 'Unenchanted'}</p></div></div>`;
    const offers = runeforge.offers(id, enchantments, resonance.shelves);
    if (!offers.length) section.insertAdjacentHTML('beforeend', '<div class="max-enchantment">All compatible runes are fully awakened.</div>');
    for (const offer of offers) {
      const row = document.createElement('div');
      row.className = 'recipe rune-offer';
      const affordable = experience.level >= offer.cost && inventory.count('lumen_shard') >= offer.reagent;
      row.innerHTML = `<div><div class="recipe-name">${enchantmentLabel(offer)}</div><div class="recipe-cost">${offer.cost} Forge levels · ${offer.reagent} Lumen Shard${offer.reagent === 1 ? '' : 's'}</div></div><button ${affordable ? '' : 'disabled'}>INSCRIBE</button>`;
      row.querySelector('button').addEventListener('click', () => {
        if (!runeforge.apply(inventory, experience, id, offer, resonance.shelves)) return;
        audio.play('experience');
        showToast(`${definition.name}: ${enchantmentLabel(offer)}`);
        renderExperience();
        renderInventory();
        renderHotbar();
        saveGame();
      });
      section.append(row);
    }
    container.append(section);
  }
}

function renderRepairBench(container) {
  const repairable = inventory.entries().filter(([id]) => itemDefinition(id)?.repairMaterial);
  if (!repairable.length) {
    container.innerHTML = '<div class="empty-inventory">Unequip or carry a damaged tool, weapon, bow, or armor piece to repair it.</div>';
    return;
  }
  for (const [id] of repairable) {
    const definition = itemDefinition(id);
    const condition = inventory.durability(id);
    const material = itemDefinition(definition.repairMaterial);
    const available = inventory.count(definition.repairMaterial);
    const full = condition.remaining >= condition.maximum;
    const row = document.createElement('div');
    row.className = 'recipe repair-row';
    row.innerHTML = `<div class="recipe-identity">${itemIconMarkup(id, definition, 'recipe-row-icon')}<div><div class="recipe-name">${definition.name}</div><div class="recipe-cost">${condition.remaining}/${condition.maximum} condition · 1 ${material.name} restores up to ${definition.repairAmount}</div><div class="repair-condition"><i style="width:${Math.round(condition.ratio * 100)}%;background:hsl(${Math.round(condition.ratio * 110)},62%,48%)"></i></div></div></div><button ${full || available <= 0 ? 'disabled' : ''}>${full ? 'FULL' : `REPAIR (${available})`}</button>`;
    row.querySelector('button').addEventListener('click', () => {
      const result = inventory.repairWithMaterial(id);
      if (!result) return;
      audio.play('craft');
      showToast(`${definition.name} restored +${result.restored}`);
      renderInventory();
      renderHotbar();
      saveGame();
    });
    container.append(row);
  }
}

function renderForgeheartAnvil(container) {
  const upgrades = availableSmithingUpgrades(inventory);
  const heading = document.createElement('div'); heading.className = 'runeforge-heading';
  heading.innerHTML = `<strong>GEAR ASCENSION</strong><span>${inventory.count('emberite_ingot')} Emberite Ingots · ${inventory.count('voidglass_shard')} Voidglass Shards</span>`;
  container.append(heading);
  if (!upgrades.length) {
    const empty = document.createElement('div'); empty.className = 'empty-inventory';
    empty.textContent = 'Carry Iron or Emberite tools, weapons, or armor. Upgrades preserve wear percentage and every inscribed rune.';
    container.append(empty); return;
  }
  for (const upgrade of upgrades) {
    const input = itemDefinition(upgrade.input); const output = itemDefinition(upgrade.output); const material = itemDefinition(upgrade.material);
    const condition = inventory.durability(upgrade.input); const runes = inventory.enchantments(upgrade.input);
    const row = document.createElement('div'); row.className = 'recipe rune-offer';
    row.innerHTML = `<div class="recipe-identity"><div class="recipe-icon-pair">${itemIconMarkup(upgrade.input, input, 'recipe-row-icon')}${itemIconMarkup(upgrade.output, output, 'recipe-row-icon')}</div><div><div class="recipe-name">${input.name} → ${output.name}</div><div class="recipe-cost">1 ${material.name} · ${condition.remaining}/${condition.maximum} condition${runes.length ? ` · ${runes.map(enchantmentLabel).join(' · ')}` : ' · unruned'}</div></div></div><button ${upgrade.affordable ? '' : 'disabled'}>${upgrade.affordable ? 'UPGRADE' : 'NEED MATERIAL'}</button>`;
    row.querySelector('button').addEventListener('click', () => {
      const result = applySmithingUpgrade(inventory, upgrade.input); if (!result) return;
      audio.play('craft'); effects.burst(player.position.clone().add(new THREE.Vector3(0, 1, 0)), output.color, 12);
      showToast(`${input.name} ascended to ${output.name} · runes preserved`);
      renderInventory(); renderHotbar(); saveGame();
    });
    container.append(row);
  }
}

function renderRunegrindWheel(container) {
  const eligible = runegrindEligible(inventory);
  const heading = document.createElement('div'); heading.className = 'runeforge-heading';
  heading.innerHTML = `<strong>RUNE CLEANSING</strong><span>Forge level ${experience.level} · removes every inscription from one carried item</span>`;
  container.append(heading);
  if (!eligible.length) {
    const empty = document.createElement('div'); empty.className = 'empty-inventory';
    empty.textContent = 'Carry an inscribed tool, weapon, armor piece, bow, shield, or rod to grind its runes away.';
    container.append(empty); return;
  }
  for (const candidate of eligible) {
    const definition = itemDefinition(candidate.id); const row = document.createElement('div'); row.className = 'recipe rune-offer';
    row.innerHTML = `<div class="recipe-identity">${itemIconMarkup(candidate.id, definition, 'recipe-row-icon')}<div><div class="recipe-name">${definition.name}</div><div class="recipe-cost">${candidate.enchantments.map(enchantmentLabel).join(' · ')} · condition ${candidate.durability.remaining}/${candidate.durability.maximum}</div></div></div><button>REMOVE · +${candidate.experience} XP</button>`;
    row.querySelector('button').addEventListener('click', () => {
      const result = applyRunegrind(inventory, experience, candidate.id); if (!result) return;
      audio.play('experience'); effects.burst(player.position.clone().add(new THREE.Vector3(0, 1, 0)), 0x70dac8, 12);
      showToast(`${definition.name} cleansed · recovered ${result.experience} Forge experience`);
      renderExperience(); renderInventory(); renderHotbar(); saveGame();
    });
    container.append(row);
  }
  const warning = document.createElement('p'); warning.className = 'settings-note';
  warning.textContent = 'Rune removal is permanent. Item condition is preserved exactly; recovered experience is intentionally less than inscription cost.';
  container.append(warning);
}

function renderStonewrightCutter(container) {
  const cuts = availableStonecuts(inventory);
  const heading = document.createElement('div'); heading.className = 'runeforge-heading';
  heading.innerHTML = `<strong>PRECISION MASONRY</strong><span>${inventory.count(BLOCK.STONE)} Stone · ${inventory.count(BLOCK.ROOTSTONE)} Rootstone · ${inventory.count(BLOCK.TIDEBRICK)} Tidebrick</span>`;
  container.append(heading);
  for (const cut of cuts) {
    const input = itemDefinition(cut.input); const output = itemDefinition(cut.output);
    const supplements = Object.entries(cut.supplements || {}).map(([id, count]) => ` + ${count} ${itemDefinition(id).name}`).join('');
    const row = document.createElement('div'); row.className = 'recipe';
    row.innerHTML = `<div class="recipe-identity"><div class="recipe-icon-pair">${itemIconMarkup(cut.input, input, 'recipe-row-icon')}${itemIconMarkup(cut.output, output, 'recipe-row-icon')}</div><div><div class="recipe-name">${cut.inputCount} ${input.name}${supplements} → ${cut.count} ${output.name}</div><div class="recipe-cost">You carry ${cut.available} ${input.name}${cut.supplements ? ` · ${Object.entries(cut.supplements).map(([id, count]) => `${inventory.count(id)}/${count} ${itemDefinition(id).name}`).join(' · ')}` : ''}</div></div></div><button ${cut.affordable ? '' : 'disabled'}>CUT</button>`;
    row.querySelector('button').addEventListener('click', () => {
      const result = applyStonecut(inventory, cut.id); if (!result) return;
      audio.play('craft'); effects.burst(player.position.clone().add(new THREE.Vector3(0, 0.8, 0)), output.color, 9);
      showToast(`Cut ${result.count} ${output.name}`); renderInventory(); renderHotbar(); saveGame();
    });
    container.append(row);
  }
}

function renderSpatialCrafting(container) {
  const workspace = document.createElement('div');
  workspace.className = 'crafting-workspace';
  const hint = document.createElement('div');
  hint.className = 'crafting-selection';
  hint.textContent = craftingCursor == null ? 'Choose USE IN GRID on an inventory item, then click a slot.' : `Placing: ${itemDefinition(craftingCursor).name} · Click a filled slot to return it.`;
  workspace.append(hint);

  const row = document.createElement('div');
  row.className = 'crafting-grid-row';
  const grid = document.createElement('div');
  grid.className = 'crafting-grid';
  grid.style.setProperty('--grid-size', craftingGrid.size);
  craftingGrid.slots.forEach((id, index) => {
    const cell = document.createElement('button');
    cell.className = `crafting-cell${id != null ? ' filled' : ''}`;
    if (id != null) {
      const definition = itemDefinition(id);
      cell.innerHTML = `${itemIconMarkup(id, definition, 'crafting-icon')}<small>${definition.name}</small>`;
      cell.title = `Return ${definition.name}`;
    } else cell.innerHTML = '<span>+</span>';
    cell.addEventListener('click', () => {
      if (id != null) craftingGrid.take(inventory, index);
      else if (craftingCursor != null) craftingGrid.place(inventory, index, craftingCursor);
      renderInventory();
      renderHotbar();
    });
    grid.append(cell);
  });
  row.append(grid);

  const matched = craftingGrid.match(craftingStation);
  const output = document.createElement('div');
  output.className = `crafting-output${matched ? ' ready' : ''}`;
  if (matched) {
    const definition = itemDefinition(matched.output.id);
    output.innerHTML = `<div class="crafting-arrow">→</div>${itemIconMarkup(matched.output.id, definition, 'crafting-output-icon')}<strong>${matched.name}</strong><button>CRAFT</button>`;
    output.querySelector('button').addEventListener('click', () => {
      const crafted = craftingGrid.craft(inventory, craftingStation);
      if (!crafted) return;
      audio.play('craft');
      showToast(`Crafted ${crafted.name}`);
      saveGame();
      renderInventory();
      renderHotbar();
    });
  } else output.innerHTML = '<div class="crafting-arrow">→</div><div class="empty-output">No matching recipe</div>';
  row.append(output);
  workspace.append(row);

  const guide = document.createElement('details');
  guide.className = 'recipe-guide';
  guide.innerHTML = '<summary>SHAPED RECIPE GUIDE</summary>';
  for (const recipe of RECIPES) {
    const available = recipe.station === 'hand' || craftingStation === 'table';
    const entry = document.createElement('div');
    entry.className = `guide-recipe${available ? '' : ' locked'}`;
    const pattern = recipePattern(recipe.id);
    const miniature = document.createElement('div');
    miniature.className = 'mini-pattern';
    miniature.style.setProperty('--pattern-size', Math.max(...pattern.map((patternRow) => patternRow.length)));
    for (const patternRow of pattern) {
      const width = Math.max(...pattern.map((candidate) => candidate.length));
      for (let x = 0; x < width; x += 1) {
        const id = patternRow[x];
        const cell = document.createElement('span');
        if (id != null) {
          const definition = itemDefinition(id);
          cell.innerHTML = itemIconMarkup(id, definition, 'recipe-mini-icon');
          cell.title = definition.name;
        }
        miniature.append(cell);
      }
    }
    entry.append(miniature);
    const label = document.createElement('div');
    label.innerHTML = `<strong>${recipe.name}</strong><small>${available ? (recipe.station === 'table' ? 'Crafting Table' : 'Hand or Table') : 'Requires Crafting Table'}</small>`;
    entry.append(label);
    guide.append(entry);
  }
  workspace.append(guide);
  container.append(workspace);
}

function updateFurnaceMeters() {
  if (!activeFurnaceKey) return;
  const heat = Math.round(furnaces.burnProgress(activeFurnaceKey) * 100);
  const progress = Math.round(furnaces.progress(activeFurnaceKey) * 100);
  const heatFill = document.querySelector('#furnace-heat-fill');
  const progressFill = document.querySelector('#furnace-progress-fill');
  if (heatFill) heatFill.style.width = `${heat}%`;
  if (progressFill) progressFill.style.width = `${progress}%`;
  const heatText = document.querySelector('#furnace-heat-text');
  const progressText = document.querySelector('#furnace-progress-text');
  if (heatText) heatText.textContent = `${heat}%`;
  if (progressText) progressText.textContent = `${progress}%`;
}

function renderInfusionStill(container) {
  const status = infusionStills.status(activeInfusionKey);
  if (!status) {
    container.innerHTML = '<div class="empty-inventory">This Still cannot accept more saved state. Recover another Still before loading it.</div>';
    return;
  }
  const slotRow = (name, detail, slot, id = null, count = 0) => {
    const row = document.createElement('div'); row.className = 'recipe furnace-slot';
    const definition = id != null ? itemDefinition(id) : null;
    row.innerHTML = `<div class="recipe-identity">${definition ? itemIconMarkup(id, definition, 'recipe-row-icon') : ''}<div><div class="recipe-name">${name}</div><div class="recipe-cost">${detail}</div></div></div><button ${count ? '' : 'disabled'}>TAKE 1 · SHIFT ALL</button>`;
    row.querySelector('button').addEventListener('click', (event) => {
      if (!infusionStills.withdraw(activeInfusionKey, inventory, slot, id, event.shiftKey ? count : 1)) return;
      audio.play('pickup'); renderInventory(); renderHotbar(); saveGame();
    });
    container.append(row);
  };
  slotRow('Empty Flasks', `${status.flasks} / ${STILL_FLASK_CAPACITY}`, 'flask', 'empty_flask', status.flasks);
  slotRow('Lumen-Spore Catalyst', `${status.catalyst} queued · ${status.charges}/${STILL_CATALYST_CHARGES} active charges`, 'catalyst', STILL_CATALYST_ITEM, status.catalyst);
  for (const [id, count] of status.ingredients) slotRow(itemDefinition(id).name, `${count} reagent${count === 1 ? '' : 's'}`, 'ingredient', id, count);
  slotRow('Finished Infusion', status.output ? `${status.output.count} ${itemDefinition(status.output.id).name}` : 'Empty', 'output', status.output?.id, status.output?.count || 0);
  const meters = document.createElement('div'); meters.className = 'furnace-meters';
  meters.innerHTML = `<div class="furnace-meter-label"><span>${status.recipe ? itemDefinition(status.recipe.output).name.toUpperCase() : 'AWAITING RECIPE'}</span><span id="still-progress-text">0%</span></div><div class="furnace-meter"><span id="still-progress-fill"></span></div><p>Load up to three empty flasks, exact reagents, and Lumen Spores. One catalyst powers three timed infusions; progress and every slot save while you explore.</p>`;
  container.append(meters);
  const guide = document.createElement('details'); guide.className = 'recipe-guide'; guide.innerHTML = '<summary>INFUSION FORMULAS</summary>';
  for (const recipe of INFUSION_RECIPES) {
    const row = document.createElement('div'); row.className = 'guide-recipe';
    const costs = Object.entries(recipe.ingredients).map(([id, count]) => `${count} ${itemDefinition(id).name}`).join(' · ');
    const outputDefinition = itemDefinition(recipe.output);
    row.innerHTML = `${itemIconMarkup(recipe.output, outputDefinition, 'recipe-row-icon')}<div><strong>${outputDefinition.name}</strong><small>${costs} · ${recipe.brewTime}s</small></div>`;
    guide.append(row);
  }
  container.append(guide); updateInfusionStillMeter();
}

function updateInfusionStillMeter() {
  if (!activeInfusionKey) return;
  const progress = Math.round(infusionStills.progress(activeInfusionKey) * 100);
  const fill = document.querySelector('#still-progress-fill'); const text = document.querySelector('#still-progress-text');
  if (fill) fill.style.width = `${progress}%`; if (text) text.textContent = `${progress}%`;
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 1500);
}

function showSpatialSoundCaption(label, event, position) {
  if (!settings.soundCaptions || !position) return false;
  const forward = camera.getWorldDirection(new THREE.Vector3());
  const caption = document.querySelector('#sound-caption');
  caption.textContent = soundCaptionText(label, event, player.position, position, forward);
  caption.classList.add('show');
  clearTimeout(soundCaptionTimeout);
  soundCaptionTimeout = setTimeout(() => caption.classList.remove('show'), 1900);
  return true;
}

const settingControls = {
  performanceMode: document.querySelector('#performance-mode-setting'),
  sensitivity: document.querySelector('#sensitivity-setting'),
  fov: document.querySelector('#fov-setting'),
  viewDistance: document.querySelector('#view-distance-setting'),
  renderScale: document.querySelector('#render-scale-setting'),
  volume: document.querySelector('#volume-setting'),
  musicVolume: document.querySelector('#music-volume-setting'),
  brightness: document.querySelector('#brightness-setting'),
  crosshairSize: document.querySelector('#crosshair-size-setting'),
  textScale: document.querySelector('#text-scale-setting'),
  reducedMotion: document.querySelector('#reduced-motion-setting'),
  reduceFlashes: document.querySelector('#reduce-flashes-setting'),
  highContrast: document.querySelector('#high-contrast-setting'),
  soundCaptions: document.querySelector('#sound-captions-setting'),
};

function settingLabel(key, value) {
  if (key === 'performanceMode') return String(value).toUpperCase();
  if (key === 'sensitivity') return `${value.toFixed(2)}×`;
  if (key === 'fov') return `${Math.round(value)}°`;
  if (key === 'viewDistance') return `${Math.round(value)} chunks`;
  if (typeof value === 'boolean') return value ? 'ON' : 'OFF';
  return `${Math.round(value * 100)}%`;
}

function renderSettings() {
  for (const [key, input] of Object.entries(settingControls)) {
    if (input.type === 'checkbox') input.checked = settings[key];
    else input.value = settings[key];
    document.querySelector(`#${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}-value`).textContent = settingLabel(key, settings[key]);
  }
}

function applyAccessibilityPresentation() {
  document.body.classList.toggle('reduced-motion', settings.reducedMotion);
  document.body.classList.toggle('high-contrast', settings.highContrast);
  document.documentElement.style.setProperty('--crosshair-scale', String(settings.crosshairSize));
  document.documentElement.style.setProperty('--text-scale', String(settings.textScale));
  renderer.domElement.style.filter = `brightness(${settings.brightness})`;
  effects.setReducedMotion(settings.reducedMotion);
  weather.setAccessibility({ reducedMotion: settings.reducedMotion, reduceFlashes: settings.reduceFlashes });
  if (!settings.soundCaptions) document.querySelector('#sound-caption').classList.remove('show');
}

function applySettings(next, persist = true) {
  settings = persist ? saveSettings(next) : next;
  player.setLookSensitivity(settings.sensitivity);
  world.setRenderRadius(settings.viewDistance);
  audio.setVolume(settings.volume);
  audio.setMusicVolume(settings.musicVolume);
  camera.fov = settings.fov;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio * settings.renderScale, 2));
  renderer.setSize(innerWidth, innerHeight);
  applyAccessibilityPresentation();
  if (settings.performanceMode !== 'adaptive') performanceMonitor.reset(settings);
  renderSettings();
}

function applyPerformanceMode(mode) {
  if (mode === 'adaptive' || mode === 'custom') {
    performanceMonitor.reset(settings);
    applySettings({ ...settings, performanceMode: mode });
    return;
  }
  const profile = performanceProfile(mode);
  if (!profile) return;
  applySettings({ ...settings, ...profile, performanceMode: mode });
}

function setSettingsOpen(open) {
  settingsOpen = open;
  settingsScreen.classList.toggle('hidden', !open);
  menu.classList.toggle('hidden', open);
  if (open && document.pointerLockElement) document.exitPointerLock();
}

function openSignEditor(position) {
  if (survival.dead) return;
  editingSignPosition = { x: Math.floor(position.x), y: Math.floor(position.y), z: Math.floor(position.z) };
  const record = signs.get(editingSignPosition.x, editingSignPosition.y, editingSignPosition.z);
  document.querySelector('#sign-text').value = record?.text || '';
  signEditorOpen = true;
  signScreen.classList.remove('hidden');
  menu.classList.add('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
  requestAnimationFrame(() => document.querySelector('#sign-text').focus());
}

function closeSignEditor(commit) {
  if (!signEditorOpen) return;
  if (commit && editingSignPosition) {
    signs.set(editingSignPosition.x, editingSignPosition.y, editingSignPosition.z, document.querySelector('#sign-text').value);
    signTextRenderer.sync();
    audio.play('craft');
    showToast('Sign saved');
  }
  signEditorOpen = false;
  editingSignPosition = null;
  signScreen.classList.add('hidden');
  saveGame();
  renderer.domElement.requestPointerLock();
}

function takeDamage(amount, source, armorApplies = true) {
  const shielded = armorApplies ? equipment.blockDamage(amount, player.blocking) : { damage: amount, blocked: 0, broke: null };
  if (shielded.blocked > 0) audio.play('shield');
  const absorbed = armorApplies ? equipment.absorbDamage(shielded.damage) : { damage: shielded.damage, broken: [] };
  const warded = armorApplies ? statusEffects.damageMultiplier() : 1;
  const actual = absorbed.damage > 0 ? Math.max(1, Math.round(absorbed.damage * warded)) : 0;
  if (!survival.damage(actual)) return false;
  audio.play('hurt');
  const broken = absorbed.broken.map((id) => itemDefinition(id).name);
  if (shielded.broke) broken.unshift(itemDefinition(shielded.broke).name);
  showToast(`${source}: −${actual} health${shielded.blocked ? ` · shield blocked ${shielded.blocked}` : armorApplies && actual < amount ? statusEffects.has('stoneward') ? ' (armor + Stoneward)' : ' (armor)' : ''}${broken.length ? ` · ${broken.join(', ')} broke` : ''}`);
  renderSurvival();
  if (inventoryOpen) renderEquipment();
  saveGame();
  if (survival.dead) showDeathScreen();
  return true;
}

function prepareChestStorage(info) {
  for (const member of info?.members || []) {
    const loot = world.generatedContainerLoot(member.x, member.y, member.z);
    if (loot) storage.seedGenerated(containerKey(member.x, member.y, member.z), loot.items, loot.key);
  }
  return storage.prepare(info);
}

function openTargetedStorage() {
  if (!currentTarget) return false;
  const position = currentTarget.break;
  const targetedId = world.getBlock(position.x, position.y, position.z);
  let storageTarget = null;
  if (targetedId === BLOCK.CHEST) storageTarget = position;
  else if (targetedId === BLOCK.TRAILBARREL) storageTarget = barrelKey(position.x, position.y, position.z);
  else if (isForgeFunnel(targetedId)) storageTarget = funnelKey(position.x, position.y, position.z);
  else if (isForgeEjector(targetedId)) storageTarget = ejectorKey(position.x, position.y, position.z);
  else if (isRuneDispenser(targetedId)) storageTarget = dispenserKey(position.x, position.y, position.z);
  else if (isWayvault(targetedId)) storageTarget = WAYVAULT_STORAGE_KEY;
  if (!storageTarget) return false;
  audio.play('open');
  setInventoryOpen(true, 'chest', storageTarget);
  return true;
}

function setInventoryOpen(open, station = 'hand', stationPosition = null) {
  if (survival.dead) return;
  if (open) {
    craftingGrid.resize(station === 'table' ? 3 : 2, inventory);
    craftingCursor = null;
  } else {
    craftingGrid.clear(inventory);
    craftingCursor = null;
  }
  inventoryOpen = open;
  if (open) {
    craftingStation = station;
    if (station === 'chest' && stationPosition) {
      if (typeof stationPosition === 'string') activeChestKey = stationPosition;
      else {
        const info = chestInfo(world, stationPosition.x, stationPosition.y, stationPosition.z);
        activeChestKey = prepareChestStorage(info);
      }
    } else activeChestKey = null;
    activeFurnaceKey = station === 'furnace' && stationPosition
      ? containerKey(stationPosition.x, stationPosition.y, stationPosition.z)
      : null;
    if (activeFurnaceKey && typeof stationPosition !== 'string') {
      const stationBlock = world.getBlock(Math.floor(stationPosition.x), Math.floor(stationPosition.y), Math.floor(stationPosition.z));
      furnaces.configure(activeFurnaceKey, BLOCKS[stationBlock]?.furnaceMode || 'furnace');
    }
    activeInfusionKey = station === 'still' && stationPosition
      ? containerKey(stationPosition.x, stationPosition.y, stationPosition.z)
      : null;
    activeRuneforgePosition = station === 'runeforge' && stationPosition
      ? { x: Math.floor(stationPosition.x), y: Math.floor(stationPosition.y), z: Math.floor(stationPosition.z) }
      : null;
    if (station !== 'trade') activeTraderKey = null;
  } else {
    activeTraderKey = null;
    activeInfusionKey = null;
  }
  inventoryScreen.classList.toggle('hidden', !open);
  if (open) {
    renderInventory();
    menu.classList.add('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
  } else {
    renderHotbar();
    saveGame();
    renderer.domElement.requestPointerLock();
  }
}

function showDeathScreen() {
  if (!deathScreen.classList.contains('hidden')) return;
  document.querySelector('#boss-hud').classList.add('hidden');
  boats.unmount(player, false);
  carts.unmount(player, false);
  entities.unmount(player, false);
  tethers.releasePlayerAnchors(realmTravel.current, true);
  hostileProjectiles.clear();
  statusEffects.clear();
  climateExposure.reset();
  renderEffectHud();
  renderClimateHud();
  const lostExperience = experience.dropOnDeath();
  if (lostExperience > 0) experienceWisps.spawn(lostExperience, player.position.clone());
  renderExperience();
  craftingGrid.clear(inventory);
  craftingCursor = null;
  const deathDrop = scatterDeathInventory(
    inventory,
    equipment,
    drops,
    player.position.clone().add(new THREE.Vector3(0, 0.45, 0)),
  );
  const deathLoss = document.querySelector('#death-loss');
  if (deathLoss) deathLoss.textContent = deathDrop.dropped > 0
    ? `${deathDrop.dropped} carried item${deathDrop.dropped === 1 ? '' : 's'} remain at the place you fell for five minutes.`
    : 'You carried no recoverable items.';
  renderHotbar();
  saveGame();
  inventoryOpen = false;
  signEditorOpen = false;
  mapOpen = false;
  editingSignPosition = null;
  inventoryScreen.classList.add('hidden');
  signScreen.classList.add('hidden');
  mapScreen.classList.add('hidden');
  deathScreen.classList.remove('hidden');
  menu.classList.add('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
}

function canPlaceAt(position, id) {
  const existingId = world.getBlock(position.x, position.y, position.z);
  const blockHeight = BLOCKS[id]?.collisionHeight ?? 1;
  if (BLOCKS[id]?.scaffold) return canPlaceScaffold(world, position.x, position.y, position.z)
    && !player.intersectsBlock(position.x, position.y, position.z, player.position, blockHeight);
  if (BLOCKS[id]?.requiresSoil) {
    const ground = world.getBlock(position.x, position.y - 1, position.z);
    if (![BLOCK.GRASS, BLOCK.DIRT, BLOCK.SNOWY_GRASS, BLOCK.FARMLAND, BLOCK.HYDRATED_FARMLAND].includes(ground)) return false;
  }
  const saplingType = saplingTypeFor(id);
  if (saplingType && !treeSubstrateAllowed(
    saplingType,
    world.getBlock(position.x, position.y - 1, position.z),
    world.biomeAt(position.x, position.z).id,
  )) return false;
  if (BLOCKS[id]?.requiresStone) {
    const ground = world.getBlock(position.x, position.y - 1, position.z);
    if (![BLOCK.STONE, BLOCK.MOSSY_STONE, BLOCK.ROOTSTONE, BLOCK.LUMEN_ORE].includes(ground)) return false;
  }
  if (BLOCKS[id]?.requiresSupport && !BLOCKS[world.getBlock(position.x, position.y - 1, position.z)]?.solid) return false;
  return (existingId === BLOCK.AIR || isLiquidBlock(existingId)) && !player.intersectsBlock(position.x, position.y, position.z, player.position, blockHeight);
}

function buildYaw() {
  return rotatedPlacementYaw(player.yaw, placementTurns);
}

function placementPlanIsValid(plan) {
  if (!plan?.parts?.length || inventory.count(plan.itemId) <= 0) return false;
  if (plan.itemId === BLOCK.CINDER_GATE && realmTravel.current !== REALM.OVERWORLD) return false;
  if (plan.kind === 'ladder') {
    const part = plan.parts[0];
    return canPlaceLadder(world, part.x, part.y, part.z, part.id)
      && !player.intersectsBlock(part.x, part.y, part.z, player.position, 1);
  }
  if (plan.kind === 'keepsakeFrame') {
    const part = plan.parts[0];
    return canPlaceKeepsakeFrame(world, part.x, part.y, part.z, part.id)
      && !player.intersectsBlock(part.x, part.y, part.z, player.position, 1);
  }
  if (plan.kind === 'torch') {
    const part = plan.parts[0];
    return canPlaceTorch(world, part.x, part.y, part.z, part.id)
      && !player.intersectsBlock(part.x, part.y, part.z, player.position, 0.85);
  }
  const clear = (part) => world.getBlock(part.x, part.y, part.z) === BLOCK.AIR;
  const freeOfPlayer = (part) => !player.intersectsBlock(
    part.x,
    part.y,
    part.z,
    player.position,
    BLOCKS[part.id]?.collisionHeight ?? 1,
  );
  if (plan.kind === 'door') return plan.parts.every(clear) && plan.parts.every(freeOfPlayer)
    && world.isSolid(plan.parts[0].x, plan.parts[0].y - 1, plan.parts[0].z);
  if (plan.kind === 'bed') return plan.parts.every((part) => clear(part) && freeOfPlayer(part) && world.isSolid(part.x, part.y - 1, part.z));
  if (plan.kind === 'gate') return clear(plan.parts[0]) && freeOfPlayer(plan.parts[0])
    && world.isSolid(plan.parts[0].x, plan.parts[0].y - 1, plan.parts[0].z);
  if (plan.kind === 'sign') return clear(plan.parts[0]) && freeOfPlayer(plan.parts[0])
    && world.isSolid(plan.parts[0].x, plan.parts[0].y - 1, plan.parts[0].z);
  if (plan.kind === 'stair' || plan.kind === 'trapdoor') return clear(plan.parts[0]) && freeOfPlayer(plan.parts[0]);
  const part = plan.parts[0];
  if (part.id === BLOCK.CHEST && !canPlaceChest(world, part.x, part.y, part.z)) return false;
  return canPlaceAt(part, part.id);
}

function targetConsumesUse(id) {
  const definition = BLOCKS[id];
  return Boolean(definition?.campfire || definition?.dryingRack || definition?.sunhive || definition?.keepsakeFrame || definition?.outfitterStand || definition?.hearthpot || definition?.hearthcake || definition?.trailBanner || definition?.raincatchBasin || definition?.resonanceBox || definition?.waystar || definition?.hearthsongPlayer || definition?.forgeFunnel || definition?.forgeEjector || definition?.runeDispenser || definition?.furnaceMode || definition?.wayvault || definition?.storageContainer || definition?.explosive || definition?.door || definition?.gate || definition?.trapdoor
    || definition?.bed || definition?.sign || definition?.composter || isRailJunction(id) || isCharterPost(id) || ['switch', 'relay', 'sequencer', 'comparator'].includes(definition?.circuitRole)
    || [BLOCK.CRAFTING_TABLE, BLOCK.FURNACE, BLOCK.INFUSION_STILL, BLOCK.FORGEHEART_ANVIL, BLOCK.RUNEGRIND_WHEEL, BLOCK.STONEWRIGHT_CUTTER, BLOCK.CHEST, BLOCK.REPAIR_BENCH, BLOCK.RUNEFORGE].includes(id));
}

function updatePlacementGhost() {
  const hint = document.querySelector('#build-hint');
  const closerEntity = currentCreatureTarget && (!currentTarget || currentCreatureTarget.distance < currentTarget.distance);
  const closerBoat = currentBoatTarget && (!currentTarget || currentBoatTarget.distance < currentTarget.distance);
  const closerCart = currentCartTarget && (!currentTarget || currentCartTarget.distance < currentTarget.distance);
  const selected = selectedItemId();
  if (player.enabled && closerEntity && selected === 'trail_tether') {
    placementGhost.hide();
    const entity = currentCreatureTarget.entity;
    const tethered = tethers.has(entity);
    const valid = tethered || (inventory.count('trail_tether') > 0 && tetherEligible(entity));
    hint.classList.remove('hidden');
    hint.classList.toggle('invalid', !valid);
    hint.textContent = `${valid ? 'RIGHT-CLICK' : 'BLOCKED'} · ${entity.definition.name.toUpperCase()} · ${tethered ? 'RELEASE TETHER' : 'ATTACH TETHER'}`;
    return;
  }
  if (!player.enabled || !currentTarget || closerEntity || closerBoat || closerCart) {
    placementGhost.hide();
    hint.classList.add('hidden');
    return;
  }
  if (selected === 'trail_tether' && BLOCKS[world.getBlock(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z)]?.model === 'fence') {
    placementGhost.hide();
    hint.classList.remove('hidden');
    hint.classList.remove('invalid');
    hint.textContent = 'RIGHT-CLICK · FENCE POST · SECURE OR RELEASE TETHERS';
    return;
  }
  const plan = placementPlan(selected, currentTarget.place, buildYaw(), currentTarget.break);
  if (!plan || inventory.count(selected) <= 0) {
    placementGhost.hide();
    hint.classList.add('hidden');
    return;
  }
  const valid = placementPlanIsValid(plan) && !targetConsumesUse(world.getBlock(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z));
  placementGhost.update(plan, valid);
  hint.classList.remove('hidden');
  hint.classList.toggle('invalid', !valid);
  const facing = plan.kind === 'block' ? '' : ` · ${plan.orientation}`;
  hint.textContent = `${valid ? 'PLACE' : 'BLOCKED'} · ${itemDefinition(selected).name}${facing} · R ROTATE`;
}

function renderTargetLabel() {
  const label = document.querySelector('#target-label');
  const creatureIsCloser = currentCreatureTarget && (!currentTarget || currentCreatureTarget.distance < currentTarget.distance);
  if (!player.enabled || (!currentTarget && !creatureIsCloser)) {
    label.classList.add('hidden');
    return;
  }
  const target = creatureIsCloser
    ? { name: currentCreatureTarget.entity.definition.name, detail: currentCreatureTarget.entity.definition.hostile ? 'CREATURE · HOSTILE' : 'CREATURE' }
    : blockTargetLabel(world.getBlock(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z));
  if (!target) {
    label.classList.add('hidden');
    return;
  }
  document.querySelector('#target-name').textContent = target.name.toUpperCase();
  const detail = document.querySelector('#target-detail');
  detail.textContent = target.detail;
  detail.classList.toggle('hidden', !target.detail);
  label.classList.remove('hidden');
}

function gameSnapshot() {
  return {
    inventory: inventory.serialize(),
    survival: survival.serialize(),
    experience: experience.serialize(),
    position: player.position.toArray(),
    selectedIndex,
    hotbarSlots,
    farming: farming.serialize(),
    trees: trees.serialize(),
    explosives: explosives.serialize(),
    fires: fires.serialize(),
    storage: storage.serialize(),
    furnaces: furnaces.serialize(),
    infusionStills: infusionStills.serialize(),
    equipment: equipment.serialize(),
    runeforge: runeforge.serialize(),
    trading: trading.serialize(),
    social: social.serialize(),
    outposts: outposts.serialize(),
    campfires: campfires.serialize(),
    dryingRacks: dryingRacks.serialize(),
    statusEffects: statusEffects.serialize(),
    fluids: fluids.serialize(),
    snowAccumulation: snowAccumulation.serialize(),
    weather: weatherState.serialize(),
    vaults: vaultState.serialize(),
    cinderwatches: cinderwatchState.serialize(),
    circuits: circuits.serialize(),
    entities: entities.serialize(),
    realmTravel: realmTravel.serialize(entities.serialize()),
    cinderHeat: cinderHeat.serialize(),
    climateExposure: climateExposure.serialize(),
    signs: signs.serialize(),
    keepsakeFrames: keepsakeFrames.serialize(),
    outfitterStands: outfitterStands.serialize(),
    hearthpots: hearthpots.serialize(),
    trailBanners: trailBanners.serialize(),
    raincatch: raincatch.serialize(),
    resonanceBoxes: resonanceBoxes.serialize(),
    waystars: waystars.serialize(),
    hearthsongs: hearthsongs.serialize(),
    forgeFunnels: forgeFunnels.serialize(),
    forgeEjectors: forgeEjectors.serialize(),
    runeDispensers: runeDispensers.serialize(),
    changeSentries: changeSentries.serialize(),
    navigation: navigation.serialize(),
    explorationMap: explorationMap.serialize(),
    drops: drops.serialize(),
    tethers: tethers.serialize(),
    sunhives: sunhives.serialize(),
    spawnPoint: player.spawnPoint?.toArray() || null,
    worldTime,
    crouching: player.crouching,
    boats: boats.serialize(),
    carts: carts.serialize(),
    craftingGrid: { slots: [...craftingGrid.slots] },
  };
}

function saveGame() {
  const result = writeWorldSave(globalThis.localStorage, saveKey, gameSnapshot(), seed);
  if (!result.ok) console.warn(`Wildforge save failed: ${result.reason}`);
  return result.ok;
}

renderHotbar();
renderSurvival();
renderExperience();
renderEffectHud();
renderClimateHud();
renderSettings();
document.querySelector('#playtest-badge').classList.toggle('hidden', !playtestMode);
document.querySelector('#playtest-menu-note').classList.toggle('hidden', !playtestMode);
document.querySelector('#quick-help').classList.toggle('playtest', playtestMode);
playtestLog.start(() => ({
  position: roundPosition(player.position),
  biome: world.biomeAt(Math.floor(player.position.x), Math.floor(player.position.z)).id,
  realm: realmTravel.current,
  selected: selectedItemId(),
  target: currentTarget ? {
    break: roundPosition(currentTarget.break),
    place: roundPosition(currentTarget.place),
    block: world.getBlock(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z),
    distance: Number(currentTarget.distance.toFixed(2)),
  } : null,
}));
if (loadedSave.status === 'recovered' || world.editsStatus === 'recovered') showToast('Recovered this world from its last-known-good backup');
else if (loadedSave.status === 'migrated' || world.editsStatus === 'migrated') showToast('World save upgraded to the latest format');
else if (loadedSave.status === 'reset' || world.editsStatus === 'reset') showToast('Damaged save data was isolated · start state restored safely');

window.addEventListener('keydown', (event) => {
  if (event.code === 'F8' && playtestMode && !event.repeat) {
    event.preventDefault();
    showToast('Playtest problem marked in log');
    return;
  }
  if (event.code === 'Escape' && mapOpen) {
    event.preventDefault();
    setMapOpen(false);
    return;
  }
  if (event.code === 'Escape' && signEditorOpen) {
    event.preventDefault();
    closeSignEditor(false);
    return;
  }
  if (event.code === 'Escape' && settingsOpen) {
    event.preventDefault();
    setSettingsOpen(false);
    return;
  }
  if ((event.code === 'ShiftLeft' || event.code === 'ShiftRight') && !event.repeat && (boats.mounted || carts.mounted || entities.mounted)) {
    event.preventDefault();
    player.keys.delete(event.code);
    if (boats.mounted) {
      boats.unmount(player);
      audio.play('splash');
      showToast('Left the Oak Skiff');
    } else if (carts.mounted) {
      carts.unmount(player);
      audio.play('open');
      showToast('Left the Forge Cart');
    } else {
      entities.unmount(player);
      audio.play('open');
      showToast('Dismounted Sandstrider');
    }
    saveGame();
    return;
  }
  if (event.code === 'KeyE' && !event.repeat && (player.enabled || inventoryOpen)) {
    event.preventDefault();
    if (player.enabled && !inventoryOpen && openTargetedStorage()) return;
    setInventoryOpen(!inventoryOpen, 'hand');
    return;
  }
  if (event.code === 'KeyM' && !event.repeat && (player.enabled || mapOpen) && inventory.count('trailchart') > 0) {
    event.preventDefault();
    setMapOpen(!mapOpen);
    return;
  }
  if (event.code === 'KeyR' && !event.repeat && player.enabled && !inventoryOpen) {
    const plan = placementPlan(selectedItemId(), currentTarget?.place, rotatedPlacementYaw(player.yaw, placementTurns));
    if (plan) {
      event.preventDefault();
      placementTurns = (placementTurns + 1) % 4;
      audio.play('open');
      showToast(`Build rotated ${placementTurns * 90}° from view`);
    }
    return;
  }
  const index = Number(event.key) - 1;
  if (index >= 0 && index < hotbarSlots.length) {
    selectedIndex = index;
    renderHotbar();
  }
});
window.addEventListener('wheel', (event) => {
  if (!player.enabled) return;
  selectedIndex = (selectedIndex + Math.sign(event.deltaY) + hotbarSlots.length) % hotbarSlots.length;
  renderHotbar();
}, { passive: true });

renderer.domElement.addEventListener('mousedown', (event) => {
  if (!player.enabled || survival.dead) return;
  if (event.button === 2 && selectedItemId() === 'trailchart' && inventory.count('trailchart') > 0) {
    setMapOpen(true);
    audio.play('open');
    return;
  }
  if (event.button === 2 && selectedItemId() === 'wayfinder_compass' && inventory.count('wayfinder_compass') > 0) {
    if (event.shiftKey) {
      const removed = navigation.removeNearest(player.position.x, player.position.z, 6);
      if (removed) {
        audio.play('break');
        showToast(`Removed ${removed.label}`);
      } else {
        const marker = navigation.addTrailmark(player.position.x, player.position.z);
        if (!marker) showToast('Wayfinder trailmark limit reached');
        else {
          audio.play('place');
          effects.burst(player.position.clone().add(new THREE.Vector3(0, 0.25, 0)), 0x70e8dd, 7);
          showToast(`${marker.label} recorded · Shift-use nearby to remove`);
        }
      }
    } else {
      const target = navigation.cycle(refreshNavigationTargets(true), 1);
      audio.play('open');
      if (target) showToast(`Wayfinder: ${target.label}`);
    }
    navigationTargetCache = [];
    renderNavigationHud(true);
    saveGame();
    return;
  }
  if (event.button === 2 && itemDefinition(selectedItemId())?.category === 'tonic') {
    drinkTonic(selectedItemId());
    return;
  }
  const boatIsClosest = currentBoatTarget
    && (!currentTarget || currentBoatTarget.distance < currentTarget.distance)
    && (!currentCreatureTarget || currentBoatTarget.distance < currentCreatureTarget.distance);
  const cartIsClosest = currentCartTarget
    && (!currentTarget || currentCartTarget.distance < currentTarget.distance)
    && (!currentCreatureTarget || currentCartTarget.distance < currentCreatureTarget.distance)
    && (!currentBoatTarget || currentCartTarget.distance < currentBoatTarget.distance);
  if (event.button === 2 && cartIsClosest) {
    const targetedCart = currentCartTarget.cart;
    if (event.shiftKey) {
      const recoveredCouplers = carts.disconnect(targetedCart);
      if (recoveredCouplers > 0) {
        inventory.add('forge_coupler', recoveredCouplers);
        couplingCartKey = null;
        audio.play('break');
        showToast(`Disconnected ${recoveredCouplers} Forge Coupler${recoveredCouplers === 1 ? '' : 's'}`);
        renderHotbar();
        saveGame();
      } else showToast('This cart is not coupled');
    } else if (selectedItemId() === 'forge_coupler' && inventory.count('forge_coupler') > 0) {
      const first = couplingCartKey ? carts.byKey.get(couplingCartKey) : null;
      if (!first) {
        couplingCartKey = targetedCart.key;
        audio.play('place');
        showToast('Coupler armed · right-click a nearby second cart');
      } else if (first === targetedCart) {
        couplingCartKey = null;
        showToast('Coupling cancelled');
      } else if (carts.link(first, targetedCart)) {
        inventory.remove('forge_coupler', 1);
        couplingCartKey = null;
        audio.play('place');
        showToast('Carts linked into a consist · Shift-right-click to disconnect');
        renderHotbar();
        saveGame();
      } else {
        couplingCartKey = null;
        showToast('Coupling failed · carts must be nearby and have a free end');
      }
    } else if (targetedCart.type === 'cargo') {
      audio.play('open');
      setInventoryOpen(true, 'chest', targetedCart.storageKey);
      showToast('Cargo Cart · 27 storage slots');
    } else if (!boats.mounted && !entities.mounted && carts.mount(targetedCart, player)) {
      audio.play('open');
      showToast('Boarded Forge Cart · W accelerate · S brake/reverse · Shift dismount');
      saveGame();
    }
    return;
  }
  if (event.button === 0 && cartIsClosest && !carts.mounted) {
    const recovered = currentCartTarget.cart;
    const recoveredCouplers = carts.disconnect(recovered);
    const position = carts.remove(recovered);
    if (position) {
      if (recovered.type === 'cargo') {
        for (const item of storage.drainItems(recovered.storageKey)) {
          drops.spawn(item.id, item.count, position, item.durability, item.enchantments);
        }
      }
      drops.spawn(recovered.type === 'cargo' ? 'cargo_cart' : 'forge_cart', 1, position);
      if (recoveredCouplers > 0) drops.spawn('forge_coupler', recoveredCouplers, position);
      audio.play('break');
      showToast(`${recovered.type === 'cargo' ? 'Cargo Cart and contents' : 'Forge Cart'} recovered`);
      saveGame();
    }
    return;
  }
  if (event.button === 2 && boatIsClosest) {
    if (!carts.mounted && !entities.mounted && boats.mount(currentBoatTarget.boat, player)) {
      audio.play('open');
      showToast('Boarded Oak Skiff · WASD steer · Shift dismount');
      saveGame();
    }
    return;
  }
  if (event.button === 0 && boatIsClosest && !boats.mounted) {
    const position = boats.remove(currentBoatTarget.boat);
    if (position) {
      drops.spawn('oak_skiff', 1, position);
      audio.play('break');
      showToast('Oak Skiff recovered');
      saveGame();
    }
    return;
  }
  if (event.button === 0 && selectedItemId() === 'windbow') {
    if (inventory.count('windbow') <= 0) {
      showToast('No Windbow in this slot');
      return;
    }
    if (inventory.count('arrow') <= 0) {
      showToast('No arrows');
      return;
    }
    bowCharging = true;
    bowCharge = 0;
    primaryHeld = false;
    mining = null;
    return;
  }
  if (event.button === 0 && currentCreatureTarget && (!currentTarget || currentCreatureTarget.distance < currentTarget.distance)) {
    if (!companionAttackAllowed(currentCreatureTarget.entity, event.shiftKey)) {
      showToast(`Hold Shift while striking to deliberately attack your ${currentCreatureTarget.entity.definition.name}`);
      return;
    }
    const tool = activeCombatTool(inventory, selectedItemId());
    const swing = combat.tryAttack(tool);
    if (swing && entities.attack(currentCreatureTarget.entity, swing.damage, swing.knockback)) {
      audio.play('attack');
      effects.burst(currentCreatureTarget.point, 0x8a72b8, 7);
      survival.addExhaustion(0.1);
      wearSelectedItem();
    }
    return;
  }
  if (event.button === 2 && currentCreatureTarget && (!currentTarget || currentCreatureTarget.distance < currentTarget.distance)) {
    const entity = currentCreatureTarget.entity;
    const breedingItem = entity.definition.breedItem;
    if (selectedItemId() === 'trail_tether') {
      if (tethers.has(entity)) {
        tethers.releaseEntity(entity, true);
        audio.play('pickup');
        showToast(`${entity.definition.name} released · Trail Tether recovered nearby`);
        saveGame();
      } else if (inventory.count('trail_tether') <= 0) showToast('No Trail Tether in this slot');
      else if (!tetherEligible(entity)) showToast(`${entity.definition.name} cannot be tethered`);
      else if (tethers.attach(entity, realmTravel.current) && inventory.remove('trail_tether', 1)) {
        audio.play('place');
        effects.burst(currentCreatureTarget.point, 0xd8d5c2, 7);
        showToast(`${entity.definition.name} tethered · lead it to an Oak Fence`);
        renderHotbar();
        saveGame();
      } else showToast('No more Trail Tethers can be active');
    } else if (entity.definition.guardian && selectedItemId() === 'iron_ingot' && inventory.count('iron_ingot') > 0) {
      const result = entities.repairGuardian(entity, 'iron_ingot');
      if (result && inventory.remove('iron_ingot', 1)) {
        effects.burst(currentCreatureTarget.point, 0xd1d9d7, 12);
        audio.play('place');
        showToast(`Hearthguard repaired ${result.repaired} health · ${result.health}/${result.maximum}`);
        renderHotbar();
        saveGame();
      } else showToast(`Hearthguard is already fully repaired · ${entity.health}/${entity.maximumHealth}`);
    } else if (entity.definition.guardian) {
      showToast(`Hearthguard patrol · ${Math.ceil(entity.health)}/${entity.maximumHealth} health · Iron Ingots repair it`);
    } else if (entity.definition.resident && entity.settlementKey) {
      if (event.shiftKey) {
        const result = social.give(entity.settlementKey, entity.profession, inventory);
        const giftName = itemDefinition(result.itemId)?.name || result.itemId;
        if (result.success) {
          effects.burst(currentCreatureTarget.point, 0xf0b86b, 10);
          audio.play('craft');
          showToast(`${offersForTrader(seed, entity.settlementKey).title} favor ${result.favor}/5 · ${result.discount} Hearthmark discount`);
          renderHotbar();
          saveGame();
        } else showToast(result.reason === 'maximum' ? 'This Wayfarer already trusts you completely' : `This ${entity.profession} appreciates ${giftName}`);
        return;
      }
      if (!entity.scheduleTradingOpen) {
        showToast(`${entity.scheduleLabel} · return during working hours`);
        return;
      }
      activeTraderKey = entity.settlementKey;
      audio.play('open');
      setInventoryOpen(true, 'trade');
      showToast(`${offersForTrader(seed, activeTraderKey).title} · ${entity.scheduleLabel}`);
    } else if (entity.type === 'grazer' && selectedItemId() === 'moss_shears') {
      const result = entities.harvestMoss(entity, 'moss_shears');
      if (result) {
        inventory.add(result.item, result.count);
        wearSelectedItem();
        audio.play('plant');
        effects.burst(currentCreatureTarget.point, 0x75955c, 12);
        showToast(`Harvested ${result.count} Mosswool · regrows in 3 minutes`);
        renderHotbar();
        saveGame();
      } else showToast(entity.isBaby ? 'Young Mossbacks have no harvestable moss' : 'This Mossback is regrowing its moss');
    } else if (entity.type === 'grazer' && selectedItemId() === 'forged_pail' && inventory.count('forged_pail') > 0) {
      const result = entities.milkGrazer(entity, 'forged_pail');
      if (result && inventory.remove('forged_pail', 1)) {
        inventory.add(result.item, 1);
        audio.play('plant');
        effects.burst(currentCreatureTarget.point, 0xd9e4c5, 9);
        showToast('Collected Mossmilk · this Mossback rests for 4 minutes');
        renderHotbar();
        saveGame();
      } else showToast(entity.isBaby ? 'Young Mossbacks cannot be milked' : 'This Mossback is not ready to be milked again');
    } else if (entity.definition.companion && entity.tamed && selectedItemId() === 'roasted_rimepod' && inventory.count('roasted_rimepod') > 0) {
      const result = entities.healCompanion(entity, 'roasted_rimepod');
      if (result) {
        inventory.remove('roasted_rimepod', 1);
        effects.burst(currentCreatureTarget.point, result.revived ? 0xb7f3df : 0x91d59a, result.revived ? 18 : 10);
        audio.play('eat');
        showToast(result.revived ? `${entity.definition.name} is back on its feet · ${result.health}/${result.maximum} health` : `${entity.definition.name} recovered ${result.healed} health · ${result.health}/${result.maximum}`);
        renderHotbar();
        saveGame();
      } else showToast(`${entity.definition.name} is already at full health`);
    } else if (entity.definition.tameItem && !entity.tamed && selectedItemId() === entity.definition.tameItem && inventory.count(entity.definition.tameItem) > 0) {
      const result = entities.bond(entity, entity.definition.tameItem);
      if (result) {
        inventory.remove(entity.definition.tameItem, 1);
        effects.burst(currentCreatureTarget.point, result.tamed ? 0x8fe1ca : 0xf0b86b, result.tamed ? 16 : 9);
        audio.play(result.tamed ? 'craft' : 'plant');
        showToast(result.tamed ? `${entity.definition.name} is tamed` : `Bond ${result.bond}/${result.required} · offer more ${itemDefinition(entity.definition.tameItem).name}`);
        renderHotbar();
        saveGame();
      } else showToast('This creature cannot bond right now');
    } else if (breedingItem && selectedItemId() === breedingItem && inventory.count(breedingItem) > 0) {
      if (entities.feed(entity, breedingItem)) {
        inventory.remove(breedingItem, 1);
        effects.burst(currentCreatureTarget.point, 0xf08aaa, 8);
        audio.play('plant');
        showToast(`${entity.definition.name} is ready to breed`);
        renderHotbar();
        saveGame();
      } else showToast(entity.downed ? `${entity.definition.name} must recover before breeding` : entity.isBaby ? `Young ${entity.definition.name}s cannot breed yet` : `${entity.definition.name} needs time before breeding again`);
    } else if (entity.definition.companion && entity.tamed) {
      const result = entities.toggleCompanion(entity);
      if (!result) showToast(`${entity.definition.name} is downed · offer Roasted Rimepod to help`);
      else {
        audio.play('open');
        effects.burst(currentCreatureTarget.point, result.sitting ? 0xf0b86b : 0x8fe1ca, 7);
        showToast(result.sitting ? `${entity.definition.name} will stay here` : `${entity.definition.name} will follow and guard you`);
        saveGame();
      }
    } else if (entity.definition.mountable && entity.tamed && !entity.saddled && selectedItemId() === 'trail_saddle' && inventory.count('trail_saddle') > 0) {
      if (entities.equipSaddle(entity, 'trail_saddle')) {
        inventory.remove('trail_saddle', 1);
        audio.play('place');
        showToast('Trail Saddle equipped · right-click to ride');
        renderHotbar();
        saveGame();
      }
    } else if (entity.definition.mountable && entity.tamed && entity.saddled && !boats.mounted && !carts.mounted) {
      if (entities.mount(entity, player)) {
        audio.play('open');
        showToast('Riding Sandstrider · WASD steer · Space leap · Shift dismount');
      }
    } else if (entity.definition.mountable && !entity.tamed) {
      showToast(`Offer ${itemDefinition(entity.definition.tameItem).name} to earn its trust`);
    } else if (entity.definition.mountable && !entity.saddled) showToast('A tamed Sandstrider needs a Trail Saddle');
    else if (breedingItem) showToast(`${entity.definition.name}s are bred with ${itemDefinition(breedingItem).name}`);
    return;
  }
  if (event.button === 2 && selectedItemId() === 'stormglass') {
    const forecast = weatherState.forecast();
    const currentName = weatherState.kind[0].toUpperCase() + weatherState.kind.slice(1);
    const nextName = forecast.kind[0].toUpperCase() + forecast.kind.slice(1);
    showToast(`${currentName} ${Math.ceil(weatherState.remaining)}s · wind ${windDirectionName(weatherState.windAngle)} ${Math.round(weatherState.windStrength * 100)}% · next ${nextName}`);
    audio.play('open');
    return;
  }
  if (event.button === 2 && currentTarget) {
    const basinPosition = currentTarget.break;
    const basinId = world.getBlock(basinPosition.x, basinPosition.y, basinPosition.z);
    if (isRaincatchBasin(basinId)) {
      const selected = selectedItemId();
      const level = raincatchLevel(basinId);
      if (selected === 'water_pail' && inventory.count(selected) > 0) {
        if (!fillRaincatchFromPail(world, basinPosition.x, basinPosition.y, basinPosition.z)) showToast('Raincatch Basin is already full');
        else {
          inventory.remove('water_pail', 1); inventory.add('forged_pail', 1);
          if (hotbarSlots[selectedIndex] === 'water_pail' && inventory.count('water_pail') <= 0) hotbarSlots[selectedIndex] = 'forged_pail';
          audio.play('splash'); effects.burst(currentTarget.point, 0x4f9bd5, 9);
          showToast('Water Pail emptied into Raincatch Basin · 3/3'); renderHotbar(); saveGame();
        }
      } else if (selected === 'forged_pail' && inventory.count(selected) > 0) {
        if (!collectRaincatchPail(world, basinPosition.x, basinPosition.y, basinPosition.z)) showToast(`Raincatch Basin ${level}/3 · a pail needs all three levels`);
        else {
          inventory.remove('forged_pail', 1); inventory.add('water_pail', 1);
          if (hotbarSlots[selectedIndex] === 'forged_pail' && inventory.count('forged_pail') <= 0) hotbarSlots[selectedIndex] = 'water_pail';
          audio.play('splash'); effects.burst(currentTarget.point, 0x4f9bd5, 9);
          showToast('Full Water Pail collected · basin emptied'); renderHotbar(); saveGame();
        }
      } else if (raincatchWashedItem(selected) != null && inventory.count(selected) > 0) {
        const washed = washRaincatchItem(world, basinPosition.x, basinPosition.y, basinPosition.z, selected);
        if (!washed) showToast('Raincatch Basin needs water to wash dyed Mossweave');
        else {
          inventory.remove(selected, 1); inventory.add(washed.output, 1);
          if (hotbarSlots[selectedIndex] === selected && inventory.count(selected) <= 0) hotbarSlots[selectedIndex] = washed.output;
          audio.play('splash'); effects.burst(currentTarget.point, BLOCKS[washed.output].color, 8);
          showToast(`${BLOCKS[selected].name} washed into ${BLOCKS[washed.output].name} · water ${washed.level}/3`); renderHotbar(); saveGame();
        }
      } else showToast(`Raincatch Basin · water ${level}/3 · rain fills it · Water Pails fill · full basin refills an Empty Forged Pail`);
      return;
    }
  }
  if (event.button === 2 && selectedItemId() === 'forged_pail') {
    const water = world.raycastLiquid(camera, 6, BLOCK.WATER, true);
    const lava = world.raycastLiquid(camera, 6, BLOCK.LAVA, true);
    const source = !water ? lava : !lava ? water : water.distance <= lava.distance ? water : lava;
    if (!source) {
      showToast('Aim at a water or lava source block');
      return;
    }
    const kind = source.id === BLOCK.LAVA ? 'lava' : 'water';
    if (fluids.collect(source.x, source.y, source.z, kind)) {
      inventory.remove('forged_pail', 1);
      const filled = kind === 'lava' ? 'lava_pail' : 'water_pail';
      inventory.add(filled, 1);
      if (hotbarSlots[selectedIndex] === 'forged_pail' && inventory.count('forged_pail') <= 0) hotbarSlots[selectedIndex] = filled;
      audio.play(kind === 'lava' ? 'sizzle' : 'splash');
      effects.burst(new THREE.Vector3(source.x + 0.5, source.surface, source.z + 0.5), kind === 'lava' ? 0xf06a21 : 0x4f9bd5, 9);
      showToast(`${kind === 'lava' ? 'Lava' : 'Water'} source collected`);
      renderHotbar();
      saveGame();
    }
    return;
  }
  if (event.button === 2 && ['water_pail', 'lava_pail'].includes(selectedItemId())) {
    const selectedPail = selectedItemId();
    const kind = selectedPail === 'lava_pail' ? 'lava' : 'water';
    if (!currentTarget || !fluids.pour(currentTarget.place.x, currentTarget.place.y, currentTarget.place.z, kind)) {
      showToast(`Aim beside a block to pour ${kind}`);
      return;
    }
    inventory.remove(selectedPail, 1);
    inventory.add('forged_pail', 1);
    if (hotbarSlots[selectedIndex] === selectedPail && inventory.count(selectedPail) <= 0) hotbarSlots[selectedIndex] = 'forged_pail';
    audio.play(kind === 'lava' ? 'sizzle' : 'splash');
    effects.burst(currentTarget.place.clone().addScalar(0.5), kind === 'lava' ? 0xf06a21 : 0x4f9bd5, 11);
    showToast(`${kind === 'lava' ? 'Lava' : 'Water'} source poured · flow is spreading`);
    renderHotbar();
    saveGame();
    return;
  }
  if (event.button === 0) {
    primaryHeld = Boolean(currentTarget && currentTarget.break.y > 0);
    mining = null;
    return;
  }
  if (event.button === 2 && selectedItemId() === 'tide_rod') {
    if (inventory.count('tide_rod') <= 0) {
      showToast('No Tide Rod in this slot');
      return;
    }
    if (fishing.active) {
      const result = fishing.reel();
      if (result.status === 'caught') {
        inventory.add(result.loot.id, result.loot.count);
        experienceWisps.spawn(result.loot.id === 'lumen_shard' ? 4 : 2, fishing.basePosition.clone());
        wearSelectedItem();
        audio.play('pickup');
        effects.burst(fishing.basePosition, 0x74cfc5, 9);
        showToast(`Caught ${result.loot.count} ${itemDefinition(result.loot.id).name}`);
        renderHotbar();
        saveGame();
      } else showToast('Reeled in too early');
      return;
    }
    const water = world.raycastLiquid(camera, 10, BLOCK.WATER);
    if (!water) {
      showToast('Aim at open water to cast');
      return;
    }
    fishing.cast(new THREE.Vector3(water.x + 0.5, water.surface, water.z + 0.5));
    audio.play('splash');
    showToast('Tide line cast');
    return;
  }
  if (event.button === 2 && selectedItemId() === 'oak_skiff') {
    if (inventory.count('oak_skiff') <= 0) {
      showToast('No Oak Skiff in this slot');
      return;
    }
    const water = world.raycastLiquid(camera, 8, BLOCK.WATER);
    const boat = water ? boats.place(water.x, water.y, water.z, player.yaw) : null;
    if (!boat) {
      showToast('Aim at a clear, open patch of water');
      return;
    }
    inventory.remove('oak_skiff', 1);
    audio.play('splash');
    showToast('Oak Skiff launched');
    renderHotbar();
    saveGame();
    return;
  }
  if (event.button === 2 && ['forge_cart', 'cargo_cart'].includes(selectedItemId())) {
    const cartItem = selectedItemId();
    if (inventory.count(cartItem) <= 0 || !currentTarget) {
      showToast('Aim at a clear Forge Rail');
      return;
    }
    const cart = carts.place(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z, player.yaw, cartItem === 'cargo_cart' ? 'cargo' : 'ride');
    if (!cart) {
      showToast('Forge Carts require a clear rail with room above');
      return;
    }
    inventory.remove(cartItem, 1);
    audio.play('place');
    showToast(`${cart.type === 'cargo' ? 'Cargo Cart' : 'Forge Cart'} set on the rails`);
    renderHotbar();
    saveGame();
    return;
  }
  if (!currentTarget) return;
  if (event.button === 2) {
    const targetedId = world.getBlock(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z);
    const selected = selectedItemId();
    if (isHearthsongPlayer(targetedId)) {
      const position = currentTarget.break; const record = hearthsongs.ensure(position.x, position.y, position.z);
      if (!record) showToast('Hearthsong Player registry is full');
      else if (record.songstone && event.shiftKey) {
        const toggled = hearthsongs.toggle(position.x, position.y, position.z); hearthsongRenderer.sync();
        audio.play('open'); showToast(`${SONGSTONES[toggled.songstone].name} · ${toggled.playing ? 'playing' : 'paused'}`); saveGame();
      } else if (record.songstone) {
        const songstone = hearthsongs.eject(position.x, position.y, position.z); inventory.add(songstone, 1); hearthsongRenderer.sync();
        audio.play('pickup'); showToast(`${itemDefinition(songstone).name} ejected`); renderHotbar(); saveGame();
      } else if (isSongstone(selected) && inventory.count(selected) > 0) {
        const inserted = hearthsongs.insert(world, position.x, position.y, position.z, selected);
        if (inserted) {
          inventory.remove(selected, 1); hearthsongRenderer.sync(); audio.play('open');
          showToast(`${inserted.definition.name} · now playing`); renderHotbar(); saveGame();
        }
      } else showToast('Hold a recovered Songstone to play it');
      return;
    }
    if (isWaystar(targetedId)) {
      const position = currentTarget.break;
      const status = event.shiftKey
        ? waystars.inspect(world, position.x, position.y, position.z)
        : waystars.cycle(world, position.x, position.y, position.z);
      if (!status) showToast('Waystar registry is full');
      else if (!status.clear) showToast(`Waystar dormant · clear the sky above it · pyramid tier ${status.pyramidLevel}/4`);
      else if (status.level <= 0) showToast('Waystar dormant · build a complete 3×3 Forged Iron foundation below it');
      else {
        audio.play('craft');
        effects.burst(currentTarget.point, STATUS_EFFECTS[status.effect].color, 10);
        waystarRenderer.sync(player.position, realmTravel.current === REALM.OVERWORLD);
        showToast(`Waystar tier ${status.level}/4 · ${status.effectName} · ${status.range}-block aura${event.shiftKey ? '' : ' selected'}`);
        saveGame();
      }
      return;
    }
    if (isResonanceBox(targetedId)) {
      const position = currentTarget.break;
      const note = event.shiftKey
        ? resonanceBoxes.play(world, position.x, position.y, position.z)
        : resonanceBoxes.cycle(world, position.x, position.y, position.z);
      if (note) {
        playResonanceEvent(note);
        showToast(`Resonance ${note.note} · ${note.name}${event.shiftKey ? '' : ' · tuned'}`);
        saveGame();
      }
      return;
    }
    if (isHearthcake(targetedId)) {
      const position = currentTarget.break;
      const serving = eatHearthcake(world, position.x, position.y, position.z, survival);
      if (!serving) showToast('You are too full for Hearthcake');
      else {
        audio.play('eat');
        effects.burst(currentTarget.point, 0xe0aa3c, 7);
        renderSurvival();
        showToast(serving.finished ? 'The last Hearthcake serving is gone' : `Hearthcake · ${serving.remaining}/7 servings remain`);
        saveGame();
      }
      return;
    }
    if (isTrailBanner(targetedId)) {
      const position = currentTarget.break;
      const record = event.shiftKey
        ? trailBanners.cycleEmblem(position.x, position.y, position.z)
        : trailBanners.rotate(position.x, position.y, position.z);
      if (record) {
        trailBannerRenderer.sync();
        audio.play('open');
        showToast(event.shiftKey
          ? `Banner emblem: ${TRAIL_BANNER_EMBLEMS[record.emblem]} · Shift-use to cycle`
          : `Banner facing ${TRAIL_BANNER_FACINGS[record.facing]} · use to rotate`);
        saveGame();
      }
      return;
    }
    if (BLOCKS[targetedId]?.model === 'fence' && selected === 'trail_tether') {
      const anchored = tethers.anchorPlayerTethers(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z, realmTravel.current);
      if (anchored) {
        audio.play('place');
        effects.burst(currentTarget.point, 0xd8d5c2, 6 + anchored * 2);
        showToast(`${anchored} Trail Tether${anchored === 1 ? '' : 's'} secured to the fence`);
        saveGame();
      } else {
        const released = tethers.releaseFence(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z, realmTravel.current, true);
        if (released) {
          audio.play('pickup');
          showToast(`${released} Trail Tether${released === 1 ? '' : 's'} released and recovered nearby`);
          saveGame();
        } else showToast('Tether an animal first, then use this fence as its anchor');
      }
      return;
    }
    if (isKeepsakeFrame(targetedId)) {
      const position = currentTarget.break;
      const record = keepsakeFrames.get(position.x, position.y, position.z);
      if (record && event.shiftKey) {
        const rotation = keepsakeFrames.rotate(position.x, position.y, position.z);
        keepsakeFrameRenderer.sync();
        audio.play('open');
        showToast(`${itemDefinition(record.item.id).name} rotated · ${rotation + 1}/8`);
        saveGame();
      } else if (record) {
        const item = keepsakeFrames.take(position.x, position.y, position.z);
        inventory.addInstance(item.id, item.durability, item.enchantments);
        keepsakeFrameRenderer.sync();
        audio.play('pickup');
        effects.burst(currentTarget.point, itemDefinition(item.id).color, 5);
        showToast(`${itemDefinition(item.id).name} removed from Keepsake Frame`);
        renderHotbar();
        saveGame();
      } else if (selected == null || inventory.count(selected) <= 0 || selected === 'keepsake_frame') {
        showToast('Select an item to display in this empty Keepsake Frame');
      } else {
        const item = inventory.takeInstance(selected);
        const inserted = item && keepsakeFrames.insert(position.x, position.y, position.z, item);
        if (!inserted) {
          if (item) inventory.addInstance(item.id, item.durability, item.enchantments);
          showToast('This Keepsake Frame cannot accept another item');
        } else {
          keepsakeFrameRenderer.sync();
          audio.play('place');
          effects.burst(currentTarget.point, itemDefinition(item.id).color, 6);
          showToast(`${itemDefinition(item.id).name} displayed · use to remove · Shift-use to rotate`);
          renderHotbar();
          saveGame();
        }
      }
      return;
    }
    if (targetedId === BLOCK.OUTFITTER_STAND) {
      const position = currentTarget.break;
      if (event.shiftKey) {
        const slot = outfitterStands.cycle(position.x, position.y, position.z);
        const item = outfitterStands.get(position.x, position.y, position.z)?.slots[slot];
        audio.play('open');
        showToast(`Outfitter focus: ${slot.toUpperCase()}${item ? ` · ${itemDefinition(item.id).name}` : ' · Empty'}`);
        saveGame();
      } else {
        const slot = outfitterSlotForItem(selected);
        if (slot && inventory.count(selected) > 0) {
          const item = inventory.takeInstance(selected);
          const result = item && outfitterStands.equip(position.x, position.y, position.z, item);
          if (!result) {
            if (item) inventory.addInstance(item.id, item.durability, item.enchantments);
            showToast('This Outfitter Stand cannot accept more equipment');
          } else {
            if (result.previous) inventory.addInstance(result.previous.id, result.previous.durability, result.previous.enchantments);
            outfitterStandRenderer.sync();
            audio.play('place');
            effects.burst(currentTarget.point, itemDefinition(item.id).color, 7);
            showToast(`${itemDefinition(item.id).name} fitted to ${result.slot}${result.previous ? ` · ${itemDefinition(result.previous.id).name} returned` : ''}`);
            renderHotbar();
            saveGame();
          }
        } else if (selected == null || inventory.count(selected) <= 0) {
          const record = outfitterStands.get(position.x, position.y, position.z);
          const focused = record ? OUTFITTER_SLOTS[record.selectedSlot] : 'head';
          const removed = outfitterStands.take(position.x, position.y, position.z, focused);
          if (!removed) showToast(`Outfitter ${focused.toUpperCase()} is empty · Shift-use to change focus`);
          else {
            inventory.addInstance(removed.item.id, removed.item.durability, removed.item.enchantments);
            outfitterStandRenderer.sync();
            audio.play('pickup');
            effects.burst(currentTarget.point, itemDefinition(removed.item.id).color, 6);
            showToast(`${itemDefinition(removed.item.id).name} removed from ${removed.slot}`);
            renderHotbar();
            saveGame();
          }
        } else showToast('Outfitter Stands accept armor, shields, and regalia · empty hand removes focused slot');
      }
      return;
    }
    if (targetedId === BLOCK.HEARTHPOT) {
      const position = currentTarget.break;
      const record = hearthpots.get(position.x, position.y, position.z);
      if (record) {
        const plant = hearthpots.take(position.x, position.y, position.z);
        inventory.add(plant, 1);
        hearthpotRenderer.sync();
        audio.play('pickup');
        effects.burst(currentTarget.point, BLOCKS[plant].color, 5);
        showToast(`${BLOCKS[plant].name} removed from Hearthpot`);
        renderHotbar(); saveGame();
      } else if (isHearthpotPlant(selected) && inventory.count(selected) > 0) {
        if (hearthpots.plant(position.x, position.y, position.z, selected) && inventory.remove(selected, 1)) {
          hearthpotRenderer.sync();
          audio.play('plant');
          effects.burst(currentTarget.point, BLOCKS[selected].color, 7);
          showToast(`${BLOCKS[selected].name} planted decoratively · it will not grow`);
          renderHotbar(); saveGame();
        }
      } else showToast('Hearthpots accept flowers, mushrooms, blooms, and tree saplings');
      return;
    }
    if (BLOCKS[targetedId]?.sunhive) {
      const status = sunhives.status(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z);
      if (selected === 'empty_flask' && inventory.count('empty_flask') > 0 && status?.full) {
        const harvest = sunhives.harvest(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z);
        if (harvest && inventory.remove('empty_flask', 1)) {
          inventory.add(harvest.id, harvest.count);
          audio.play('pickup');
          effects.burst(currentTarget.point, 0xf2c45b, 12);
          showToast('Sunnectar bottled · eating it returns the Expedition Flask');
          renderHotbar();
          saveGame();
        }
      } else if (selected === 'empty_flask') showToast(`Sunhive nectar ${status?.level || 0}/3 · Sunmoths fill it after visiting flowers`);
      else showToast(`${status?.full ? 'Full' : 'Gathering'} Sunhive · nectar ${status?.level || 0}/3${status?.full ? ' · use an Empty Expedition Flask' : ''}`);
      return;
    }
    if (targetedId === BLOCK.BLAST_KEG) {
      if (selected !== 'spark_striker' || inventory.count(selected) <= 0) {
        showToast('Blast Keg requires a Spark Striker to ignite');
      } else if (explosives.prime(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z)) {
        wearSelectedItem();
        audio.play('ignite');
        effects.burst(currentTarget.point, 0xffb04a, 8);
        showToast('Blast Keg primed · fuse 3.2s');
        saveGame();
      } else showToast('Too many Blast Kegs are already primed');
      return;
    }
    if (selected === 'spark_striker') {
      if (!isFlammable(targetedId)) showToast(`${BLOCKS[targetedId]?.name || 'This block'} will not catch Emberfire`);
      else if (fires.ignite(currentTarget.place.x, currentTarget.place.y, currentTarget.place.z, { fuel: currentTarget.break })) {
        wearSelectedItem();
        showToast('Emberfire lit · rain or water will extinguish it');
        saveGame();
      } else showToast('Emberfire needs an empty face beside dry fuel');
      return;
    }
    if (BLOCKS[targetedId]?.realmGate === 'enter') {
      if (realmTravel.current !== REALM.OVERWORLD) showToast('This gate only opens from the Overworld');
      else travelToRealm(true);
      return;
    }
    if (BLOCKS[targetedId]?.realmGate === 'return') {
      if (realmTravel.current !== REALM.CINDERREACH) showToast('The return rift is dormant here');
      else travelToRealm(false);
      return;
    }
    if (isRailJunction(targetedId)) {
      const result = cycleRailJunction(world, currentTarget.break.x, currentTarget.break.y, currentTarget.break.z);
      if (result) {
        audio.play('place');
        showToast(`Rail junction now routes ${result.direction}`);
        saveGame();
      }
      return;
    }
    if (isCharterPost(targetedId)) {
      const result = outposts.advance(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z, trading.reputation);
      if (result?.advanced) {
        lights.blockChanged(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z, world.getBlock(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z));
        entities.ensureOutpostResidents();
        audio.play('craft');
        effects.burst(currentTarget.point, BLOCKS[world.getBlock(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z)].color, 18);
        showToast(`${result.tierName} established${result.tier === 1 ? ' · a Wayfarer is arriving' : ''}`);
        saveGame();
      } else if (result?.maximum) showToast(`${result.tierName} · maximum outpost tier`);
      else if (result) showToast(`${result.nextName} needs: ${result.missing.join(' · ')}`);
      return;
    }
    if (BLOCKS[targetedId]?.campfire) {
      const position = currentTarget.break;
      if (!BLOCKS[targetedId].lit && selected === 'coal' && inventory.count('coal') > 0) {
        if (campfires.setLit(position.x, position.y, position.z, true)) {
          inventory.remove('coal', 1);
          audio.play('ignite');
          effects.burst(currentTarget.point, 0xf3953f, 12);
          showToast('Hearthfire ignited');
          renderHotbar();
          saveGame();
        }
      } else if (BLOCKS[targetedId].lit && CAMPFIRE_RECIPES[selected] && inventory.count(selected) > 0) {
        const loaded = campfires.addFood(position.x, position.y, position.z, selected);
        if (!loaded) showToast('All four Hearthfire cooking spots are occupied');
        else {
          inventory.remove(selected, 1);
          audio.play('sizzle');
          showToast(`${itemDefinition(selected).name} cooking · spot ${loaded.slot}/4`);
          renderHotbar();
          saveGame();
        }
      } else if (BLOCKS[targetedId].lit && itemDefinition(selected)?.miningKind === 'shovel') {
        campfires.setLit(position.x, position.y, position.z, false);
        wearSelectedItem();
        audio.play('extinguish');
        effects.smoke(currentTarget.point, 8);
        showToast('Hearthfire smothered · cooking paused');
        saveGame();
      } else {
        const status = campfires.status(position.x, position.y, position.z);
        const progress = status.progress.length ? ` · ${status.progress.map((value) => `${Math.round(value * 100)}%`).join(', ')}` : '';
        showToast(`${status.lit ? 'Burning' : 'Unlit'} Hearthfire · ${status.slots}/4 cooking${progress}${status.lit ? '' : ' · use Coal to ignite'}`);
      }
      return;
    }
    if (BLOCKS[targetedId]?.dryingRack) {
      const position = currentTarget.break;
      if (DRYING_RECIPES[selected] && inventory.count(selected) > 0) {
        const loaded = dryingRacks.addFood(position.x, position.y, position.z, selected);
        if (!loaded) showToast('All four Windrack hooks are occupied');
        else {
          inventory.remove(selected, 1);
          audio.play('plant');
          effects.burst(currentTarget.point, 0xc6a66a, 7);
          showToast(`${itemDefinition(selected).name} curing · hook ${loaded.slot}/4`);
          renderHotbar();
          saveGame();
        }
      } else {
        const status = dryingRacks.status(position.x, position.y, position.z);
        const progress = status.progress.length ? ` · ${status.progress.map((value) => `${Math.round(value * 100)}%`).join(', ')}` : '';
        showToast(`Windrack · ${status.slots}/4 curing${progress}${status.paused ? ' · exposed rain has paused drying' : ` · ${Math.round(status.rate * 100)}% airflow`}`);
      }
      return;
    }
    if (BLOCKS[targetedId]?.circuitRole === 'switch') {
      const result = circuits.toggleSwitch(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z);
      if (result) {
        audio.play(result.powered ? 'place' : 'open');
        effects.burst(currentTarget.point, result.powered ? 0xf5c34f : 0x796342, 10);
        showToast(`Spark circuit ${result.powered ? 'powered' : 'quiet'} · ${result.affected} linked blocks updated`);
        saveGame();
      }
      return;
    }
    if (BLOCKS[targetedId]?.circuitRole === 'relay') {
      const result = circuits.cycleRelay(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z);
      if (result) {
        audio.play('open');
        effects.burst(currentTarget.point, 0xd7b35d, 7);
        showToast(`Spark Relay delay ${result.delay.toFixed(1)}s · step ${result.step}/4`);
        saveGame();
      }
      return;
    }
    if (BLOCKS[targetedId]?.circuitRole === 'sequencer') {
      const result = circuits.cycleSequencer(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z);
      if (result) {
        audio.play('open');
        effects.burst(currentTarget.point, 0xe8c96d, 9);
        showToast(`Pulse Sequencer · ${result.pulses} pulse${result.pulses === 1 ? '' : 's'} · ${result.interval.toFixed(2)}s beat`);
        saveGame();
      }
      return;
    }
    if (BLOCKS[targetedId]?.circuitRole === 'comparator') {
      const result = circuits.toggleComparator(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z);
      if (result) {
        audio.play('open');
        effects.burst(currentTarget.point, result.mode === 'subtract' ? 0xb58bd0 : 0x70ddcf, 9);
        showToast(`Spark Comparator · ${result.mode} · rear ${result.inputLevel}/15 · side ${result.sideLevel}/15 · output ${result.outputLevel}/15`);
        saveGame();
      }
      return;
    }
    if (targetedId === BLOCK.SHADOW_DEN && selected === 'warden_sigil') {
      if (daylight >= 0.3) showToast('The Warden ritual only answers at night');
      else if (inventory.count('warden_sigil') <= 0) showToast('No Warden Sigil in this slot');
      else {
        const boss = entities.summonBossAt(currentTarget.break);
        if (!boss) showToast('A Hollow Warden already walks this world');
        else {
          inventory.remove('warden_sigil', 1);
          effects.burst(currentTarget.point, 0xb17be8, 24);
          audio.play('thunder');
          renderHotbar();
          renderBossHud();
          saveGame();
        }
      }
      return;
    }
    if (BLOCKS[targetedId]?.crop && selected === 'rich_compost' && inventory.count(selected) > 0) {
      const result = farming.fertilize(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z);
      if (result) {
        world.setBlock(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z, result.block);
        lights.blockChanged(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z, result.block);
        inventory.remove(selected, 1);
        effects.burst(currentTarget.point, 0x78a552, 12);
        audio.play('plant');
        showToast(`${BLOCKS[result.block].name} fertilized`);
        renderHotbar();
        saveGame();
      } else showToast('This crop is already mature');
      return;
    }
    if (isDoor(targetedId)) {
      toggleDoor(world, currentTarget.break.x, currentTarget.break.y, currentTarget.break.z);
      audio.play('open');
      saveGame();
      return;
    }
    if (isGate(targetedId)) {
      toggleGate(world, currentTarget.break.x, currentTarget.break.y, currentTarget.break.z);
      audio.play('open');
      saveGame();
      return;
    }
    if (isTrapdoor(targetedId)) {
      toggleTrapdoor(world, currentTarget.break.x, currentTarget.break.y, currentTarget.break.z);
      audio.play('open');
      saveGame();
      return;
    }
    if (isBed(targetedId)) {
      const parts = bedParts(world, currentTarget.break.x, currentTarget.break.y, currentTarget.break.z);
      if (parts) {
        player.setSpawn(new THREE.Vector3(parts.foot.x + 0.5, parts.foot.y + 0.51, parts.foot.z + 0.5));
        if (isSleepingTime(worldTime)) {
          worldTime = 0.27;
          trading.restockAll();
          showToast('You sleep until morning · Wayfarers restocked · Spawn point set');
        } else showToast('Spawn point set · You can sleep at night');
        audio.play('open');
        saveGame();
      }
      return;
    }
    if (isSign(targetedId)) {
      audio.play('open');
      openSignEditor(currentTarget.break);
      return;
    }
    if (isComposter(targetedId)) {
      const position = currentTarget.break;
      if (compostLevel(targetedId) === 7) {
        const output = extractCompost(world, position.x, position.y, position.z);
        if (output) inventory.add(output.id, output.count);
        effects.burst(currentTarget.point, 0x6e8b4f, 12);
        audio.play('pickup');
        showToast('Collected Rich Compost');
        renderHotbar();
        saveGame();
        return;
      }
      const result = inventory.count(selected) > 0
        ? addCompost(world, position.x, position.y, position.z, selected)
        : { accepted: false, level: compostLevel(targetedId), ready: false };
      if (result.accepted && inventory.remove(selected, 1)) {
        effects.burst(currentTarget.point, 0x6f5a3a, 7);
        audio.play('plant');
        showToast(result.ready ? 'Compost ready to collect' : `Compost Bin ${result.level}/7`);
        renderHotbar();
        saveGame();
      } else showToast('Add leaves, crops, seeds, flowers, or roots');
      return;
    }
    if (targetedId === BLOCK.CRAFTING_TABLE) {
      audio.play('open');
      setInventoryOpen(true, 'table');
      return;
    }
    if (targetedId === BLOCK.FURNACE || BLOCKS[targetedId]?.furnaceMode) {
      audio.play('open');
      setInventoryOpen(true, 'furnace', currentTarget.break);
      return;
    }
    if (targetedId === BLOCK.INFUSION_STILL) {
      audio.play('open');
      setInventoryOpen(true, 'still', currentTarget.break);
      return;
    }
    if (targetedId === BLOCK.FORGEHEART_ANVIL) {
      audio.play('open');
      setInventoryOpen(true, 'anvil', currentTarget.break);
      return;
    }
    if (targetedId === BLOCK.RUNEGRIND_WHEEL) {
      audio.play('open');
      setInventoryOpen(true, 'grind', currentTarget.break);
      return;
    }
    if (targetedId === BLOCK.STONEWRIGHT_CUTTER) {
      audio.play('open');
      setInventoryOpen(true, 'cutter', currentTarget.break);
      return;
    }
    if (targetedId === BLOCK.CHEST) {
      audio.play('open');
      setInventoryOpen(true, 'chest', currentTarget.break);
      return;
    }
    if (targetedId === BLOCK.TRAILBARREL) {
      audio.play('open');
      setInventoryOpen(true, 'chest', barrelKey(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z));
      return;
    }
    if (isForgeFunnel(targetedId)) {
      audio.play('open');
      setInventoryOpen(true, 'chest', funnelKey(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z));
      return;
    }
    if (isForgeEjector(targetedId)) {
      audio.play('open');
      setInventoryOpen(true, 'chest', ejectorKey(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z));
      return;
    }
    if (isRuneDispenser(targetedId)) {
      audio.play('open');
      setInventoryOpen(true, 'chest', dispenserKey(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z));
      return;
    }
    if (isWayvault(targetedId)) {
      audio.play('open');
      setInventoryOpen(true, 'chest', WAYVAULT_STORAGE_KEY);
      return;
    }
    if (targetedId === BLOCK.REPAIR_BENCH) {
      audio.play('open');
      setInventoryOpen(true, 'repair');
      return;
    }
    if (targetedId === BLOCK.RUNEFORGE) {
      audio.play('open');
      setInventoryOpen(true, 'runeforge', currentTarget.break);
      return;
    }
    if (selected === 'wooden_door' && inventory.count(selected) > 0) {
      const yaw = buildYaw();
      const plan = placementPlan(selected, currentTarget.place, yaw);
      if (placementPlanIsValid(plan) && placeDoor(world, currentTarget.place.x, currentTarget.place.y, currentTarget.place.z, yaw)) {
        inventory.remove(selected, 1);
        renderHotbar();
        audio.play('place');
        showToast('Wooden Door placed');
        saveGame();
      } else showToast('Door needs solid ground and two clear blocks');
      return;
    }
    if (selected === 'oak_gate' && inventory.count(selected) > 0) {
      const yaw = buildYaw();
      const gateId = gateIdFor(yaw);
      if (placementPlanIsValid(placementPlan(selected, currentTarget.place, yaw)) && canPlaceAt(currentTarget.place, gateId)
        && placeGate(world, currentTarget.place.x, currentTarget.place.y, currentTarget.place.z, yaw)) {
        inventory.remove(selected, 1);
        renderHotbar();
        audio.play('place');
        showToast('Oak Gate placed');
        saveGame();
      } else showToast('Gate needs solid ground and a clear space');
      return;
    }
    if ((selected === 'oak_stairs' || selected === 'stone_stairs') && inventory.count(selected) > 0) {
      const yaw = buildYaw();
      const stairId = stairIdFor(selected, yaw);
      if (placementPlanIsValid(placementPlan(selected, currentTarget.place, yaw)) && canPlaceAt(currentTarget.place, stairId)
        && placeStair(world, currentTarget.place.x, currentTarget.place.y, currentTarget.place.z, selected, yaw)) {
        inventory.remove(selected, 1);
        renderHotbar();
        audio.play('place');
        showToast(`${itemDefinition(selected).name} placed`);
        saveGame();
      } else showToast('Stairs need a clear block space');
      return;
    }
    if (selected === 'oak_trapdoor' && inventory.count(selected) > 0) {
      const yaw = buildYaw();
      const trapdoorId = trapdoorIdFor(yaw);
      if (placementPlanIsValid(placementPlan(selected, currentTarget.place, yaw)) && canPlaceAt(currentTarget.place, trapdoorId)
        && placeTrapdoor(world, currentTarget.place.x, currentTarget.place.y, currentTarget.place.z, yaw)) {
        inventory.remove(selected, 1);
        renderHotbar();
        audio.play('place');
        showToast('Oak Trapdoor placed');
        saveGame();
      } else showToast('Trapdoor needs a clear block space');
      return;
    }
    if (selected === 'oak_ladder' && inventory.count(selected) > 0) {
      const plan = placementPlan(selected, currentTarget.place, buildYaw(), currentTarget.break);
      const part = plan?.parts?.[0];
      if (part && placementPlanIsValid(plan) && placeLadder(world, part.x, part.y, part.z, part.id)) {
        inventory.remove(selected, 1);
        renderHotbar();
        audio.play('place');
        showToast(`Oak Ladder placed · attached ${plan.orientation}`);
        saveGame();
      } else showToast('Ladder needs a clear space against a solid block face');
      return;
    }
    if (selected === 'keepsake_frame' && inventory.count(selected) > 0) {
      const plan = placementPlan(selected, currentTarget.place, buildYaw(), currentTarget.break);
      const part = plan?.parts?.[0];
      if (part && placementPlanIsValid(plan) && placeKeepsakeFrame(world, part.x, part.y, part.z, part.id)) {
        inventory.remove(selected, 1);
        renderHotbar();
        audio.play('place');
        showToast(`Keepsake Frame mounted · facing ${plan.orientation}`);
        saveGame();
      } else showToast('Keepsake Frame needs a clear space on a solid wall face');
      return;
    }
    if (Number(selected) === BLOCK.TORCH && inventory.count(selected) > 0) {
      const plan = placementPlan(selected, currentTarget.place, buildYaw(), currentTarget.break);
      const part = plan?.parts?.[0];
      if (part && placementPlanIsValid(plan) && placeTorch(world, part.x, part.y, part.z, part.id)) {
        lights.blockChanged(part.x, part.y, part.z, part.id);
        inventory.remove(selected, 1);
        renderHotbar(); audio.play('place');
        showToast(`Forgebrand mounted · ${plan.orientation === 'FLOOR' ? 'floor' : `${plan.orientation} wall`}`);
        saveGame();
      } else showToast('Forgebrand needs a clear space on a full floor or wall face');
      return;
    }
    if (Number(selected) === BLOCK.FORGE_FUNNEL_DOWN && inventory.count(selected) > 0) {
      const plan = placementPlan(selected, currentTarget.place, buildYaw(), currentTarget.break);
      const part = plan?.parts?.[0];
      if (part && placementPlanIsValid(plan) && canPlaceAt(part, part.id)) {
        world.setBlock(part.x, part.y, part.z, part.id);
        inventory.remove(selected, 1);
        renderHotbar(); audio.play('place');
        showToast(`Forge Funnel placed · output ${plan.orientation}`);
        saveGame();
      } else showToast('Forge Funnel needs a clear block space');
      return;
    }
    if (selected === 'forge_ejector' && inventory.count(selected) > 0) {
      const plan = placementPlan(selected, currentTarget.place, buildYaw(), currentTarget.break);
      const part = plan?.parts?.[0];
      if (part && placementPlanIsValid(plan) && canPlaceAt(part, part.id)) {
        const previousId = world.getBlock(part.x, part.y, part.z);
        world.setBlock(part.x, part.y, part.z, part.id);
        circuits.blockChanged(part.x, part.y, part.z, previousId, part.id);
        inventory.remove(selected, 1);
        renderHotbar(); audio.play('place');
        showToast(`Forge Ejector placed · output ${plan.orientation}`);
        saveGame();
      } else showToast('Forge Ejector needs a clear block space');
      return;
    }
    if (selected === 'rune_dispenser' && inventory.count(selected) > 0) {
      const plan = placementPlan(selected, currentTarget.place, buildYaw(), currentTarget.break); const part = plan?.parts?.[0];
      if (part && placementPlanIsValid(plan) && canPlaceAt(part, part.id)) {
        const previousId = world.getBlock(part.x, part.y, part.z); world.setBlock(part.x, part.y, part.z, part.id); circuits.blockChanged(part.x, part.y, part.z, previousId, part.id);
        inventory.remove(selected, 1); renderHotbar(); audio.play('place'); showToast(`Rune Dispenser placed · output ${plan.orientation}`); saveGame();
      } else showToast('Rune Dispenser needs a clear block space');
      return;
    }
    if (selected === 'change_sentry' && inventory.count(selected) > 0) {
      const plan = placementPlan(selected, currentTarget.place, buildYaw(), currentTarget.break); const part = plan?.parts?.[0];
      if (part && placementPlanIsValid(plan) && canPlaceAt(part, part.id)) {
        const previousId = world.getBlock(part.x, part.y, part.z); world.setBlock(part.x, part.y, part.z, part.id); circuits.blockChanged(part.x, part.y, part.z, previousId, part.id);
        inventory.remove(selected, 1); renderHotbar(); audio.play('place'); showToast(`Change Sentry placed · watching ${plan.orientation}`); saveGame();
      } else showToast('Change Sentry needs a clear block space');
      return;
    }
    if (selected === 'moss_bed' && inventory.count(selected) > 0) {
      const yaw = buildYaw();
      const plan = bedPlan(currentTarget.place.x, currentTarget.place.y, currentTarget.place.z, yaw);
      const clear = [plan.foot, plan.head].every((part) => canPlaceAt(part, part.id));
      if (clear && placementPlanIsValid(placementPlan(selected, currentTarget.place, yaw))
        && placeBed(world, currentTarget.place.x, currentTarget.place.y, currentTarget.place.z, yaw)) {
        inventory.remove(selected, 1);
        renderHotbar();
        audio.play('place');
        showToast('Moss Bed placed');
        saveGame();
      } else showToast('Bed needs two clear blocks on solid ground');
      return;
    }
    if (selected === 'oak_sign' && inventory.count(selected) > 0) {
      const yaw = buildYaw();
      const signId = signIdFor(yaw);
      const position = currentTarget.place;
      if (placementPlanIsValid(placementPlan(selected, position, yaw))
        && world.isSolid(position.x, position.y - 1, position.z) && canPlaceAt(position, signId)) {
        world.setBlock(position.x, position.y, position.z, signId);
        signs.set(position.x, position.y, position.z, '');
        signTextRenderer.sync();
        inventory.remove(selected, 1);
        renderHotbar();
        audio.play('place');
        saveGame();
        openSignEditor(position);
      } else showToast('Sign needs clear space on solid ground');
      return;
    }
    if (['spark_relay', 'spark_inverter', 'spark_comparator', 'forge_ram', 'binding_ram', 'pulse_sequencer', 'freight_loader', 'freight_unloader'].includes(selected) && inventory.count(selected) > 0) {
      const plan = placementPlan(selected, currentTarget.place, buildYaw());
      const part = plan?.parts?.[0];
      if (part && placementPlanIsValid(plan) && canPlaceAt(part, part.id)) {
        const previousId = world.getBlock(part.x, part.y, part.z);
        world.setBlock(part.x, part.y, part.z, part.id);
        circuits.blockChanged(part.x, part.y, part.z, previousId, part.id);
        inventory.remove(selected, 1);
        renderHotbar();
        audio.play('place');
        showToast(`${itemDefinition(selected).name} placed · facing ${plan.orientation}`);
        saveGame();
      } else showToast(`${itemDefinition(selected).name} needs a clear${!['forge_ram', 'binding_ram'].includes(selected) ? ', supported' : ''} block space`);
      return;
    }
    if ((selected === 'forge_rail' || selected === 'powered_rail') && inventory.count(selected) > 0) {
      const plan = placementPlan(selected, currentTarget.place, buildYaw());
      if (placementPlanIsValid(plan)) {
        const result = placeRail(world, currentTarget.place.x, currentTarget.place.y, currentTarget.place.z, selected, buildYaw());
        if (result) {
          for (const change of result.changes) circuits.blockChanged(change.x, change.y, change.z, change.previous, change.id);
          inventory.remove(selected, 1);
          renderHotbar();
          audio.play('place');
          showToast(`${itemDefinition(selected).name} placed · auto-shaped ${BLOCKS[result.id].railShape}`);
          saveGame();
        }
      } else showToast(`${itemDefinition(selected).name} needs clear space on solid ground`);
      return;
    }
    if (itemDefinition(selected)?.hoe && inventory.count(selected) > 0 && (targetedId === BLOCK.GRASS || targetedId === BLOCK.DIRT)) {
      world.setBlock(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z, BLOCK.FARMLAND);
      farming.till(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z);
      effects.burst(currentTarget.point, BLOCKS[BLOCK.DIRT].color, 7);
      showToast('Soil tilled');
      audio.play('plant');
      wearSelectedItem();
      saveGame();
      return;
    }
    const selectedCropType = selected === 'wheat_seeds' ? 'wheat' : selected === 'amberroot_seed' ? 'amberroot'
      : selected === 'rimepod_seed' ? 'rimepod' : selected === 'emberbulb_cutting' ? 'emberbulb' : null;
    if (selectedCropType && inventory.count(selected) > 0) {
      const cropPosition = currentTarget.break.clone().add(new THREE.Vector3(0, 1, 0));
      const biomeId = world.biomeAt(cropPosition.x, cropPosition.z).id;
      if (!cropPlantingAllowed(selectedCropType, biomeId)) {
        showToast(`${itemDefinition(selected).name} only takes root in ${selectedCropType === 'emberbulb' ? 'Cinderreach' : 'Frostveil highlands'}`);
      } else if (!cropSubstrateAllowed(selectedCropType, targetedId)) {
        showToast(`${itemDefinition(selected).name} needs ${selectedCropType === 'emberbulb' ? 'Ember Soil' : 'tilled farmland'}`);
      } else if (world.getBlock(cropPosition.x, cropPosition.y, cropPosition.z) === BLOCK.AIR && farming.plant(cropPosition.x, cropPosition.y, cropPosition.z, selectedCropType, { biomeId, substrateId: targetedId })) {
        world.setBlock(cropPosition.x, cropPosition.y, cropPosition.z, cropBlock(selectedCropType));
        inventory.remove(selected, 1);
        renderHotbar();
        showToast(`${itemDefinition(selected).name} planted`);
        audio.play('plant');
        saveGame();
      }
      return;
    }
    const id = selectedBlockId();
    if (id == null) {
      const selected = selectedItemId();
      showToast(`${selected == null ? 'Empty hand' : itemDefinition(selected)?.name || 'Selected item'} cannot be placed`);
    }
    else if (inventory.count(id) <= 0) showToast(`No ${BLOCKS[id].name} to place`);
    else if (isRaincatchBasin(id) && !raincatch.get(currentTarget.place.x, currentTarget.place.y, currentTarget.place.z) && raincatch.entries().length >= MAX_RAINCATCH_BASINS) showToast(`Raincatch Basin limit reached · ${MAX_RAINCATCH_BASINS} active basins`);
    else if (id === BLOCK.CHEST && !canPlaceChest(world, currentTarget.place.x, currentTarget.place.y, currentTarget.place.z)) showToast('Chests can pair once, but cannot form triples');
    else if (BLOCKS[id].requiresWater && !isWaterBlock(world.getBlock(currentTarget.place.x, currentTarget.place.y, currentTarget.place.z))) showToast(`${BLOCKS[id].name} must be planted underwater`);
    else if (canPlaceAt(currentTarget.place, id)) {
      const previousId = world.getBlock(currentTarget.place.x, currentTarget.place.y, currentTarget.place.z);
      world.setBlock(currentTarget.place.x, currentTarget.place.y, currentTarget.place.z, id);
      if (isTrailBanner(id)) {
        trailBanners.configure(currentTarget.place.x, currentTarget.place.y, currentTarget.place.z, buildYaw());
        trailBannerRenderer.sync();
      }
      if (id === BLOCK.LEAVES || id === BLOCK.FROSTPINE_NEEDLES) {
        trees.markPersistentLeaf(currentTarget.place.x, currentTarget.place.y, currentTarget.place.z);
      }
      lights.blockChanged(currentTarget.place.x, currentTarget.place.y, currentTarget.place.z, id);
      circuits.blockChanged(currentTarget.place.x, currentTarget.place.y, currentTarget.place.z, previousId, id);
      inventory.remove(id);
      audio.play('place');
      survival.addExhaustion(0.03);
      if (id === BLOCK.HEARTHGUARD_CORE) {
        if (entities.entities.filter((entity) => entity.type === 'hearthguard').length >= MAX_HEARTHGUARDS) {
          showToast(`Hearthguard limit reached · the core remains safely placed`);
        } else {
          const awakened = awakenHearthguard(world, currentTarget.place, ({ x, y, z }) => entities.spawn('hearthguard', x, z, {
            y,
            homeX: x,
            homeY: y,
            homeZ: z,
            persistent: true,
          }));
          if (awakened) {
            for (const part of awakened.parts) {
              lights.blockChanged(part.x, part.y, part.z, BLOCK.AIR);
              circuits.blockChanged(part.x, part.y, part.z, part === awakened.core ? BLOCK.HEARTHGUARD_CORE : BLOCK.FORGED_IRON_BLOCK, BLOCK.AIR);
            }
            effects.burst(new THREE.Vector3(awakened.spawn.x, awakened.spawn.y + 1.2, awakened.spawn.z), 0xe6a150, 28);
            audio.playCreature('hearthguard', 'ambient', { distance: awakened.entity.root.position.distanceTo(player.position), variant: awakened.entity.id });
            showToast('Hearthguard awakened · it will defend this area from hostiles');
          }
        }
      }
      renderHotbar();
      saveGame();
    }
  }
});
window.addEventListener('mouseup', (event) => {
  if (event.button !== 0) return;
  if (bowCharging) {
    const shot = bowShot(bowCharge);
    bowCharging = false;
    bowCharge = 0;
    if (shot && inventory.remove('arrow', 1)) {
      shot.damage += enchantmentLevel(inventory.enchantments('windbow'), 'keen') * 1.25;
      projectiles.shoot(camera, shot);
      audio.play('bow');
      survival.addExhaustion(0.08);
      wearSelectedItem();
      renderHotbar();
      saveGame();
    }
    return;
  }
  primaryHeld = false;
  mining = null;
  selector.scale.setScalar(1);
  selector.material.color.setHex(0xffffff);
});
document.querySelector('#play').addEventListener('click', () => {
  audio.unlock();
  setSettingsOpen(false);
  renderer.domElement.requestPointerLock();
});
document.querySelector('#new-world').addEventListener('click', () => {
  const nextSeed = `${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`;
  const nextParams = new URLSearchParams({ seed: nextSeed });
  if (playtestMode) nextParams.set('playtest', '1');
  location.search = `?${nextParams}`;
});
document.querySelector('#open-settings').addEventListener('click', () => setSettingsOpen(true));
document.querySelector('#close-settings').addEventListener('click', () => setSettingsOpen(false));
document.querySelector('#reset-settings').addEventListener('click', () => applySettings({ ...DEFAULT_SETTINGS }));
document.querySelector('#export-world').addEventListener('click', () => {
  const bundle = createWorldBundle({ seed, seedText, payload: gameSnapshot(), edits: [...world.edits] });
  if (!bundle) {
    showToast('World export failed');
    return;
  }
  const url = URL.createObjectURL(new Blob([bundle], { type: 'application/json' }));
  const link = document.createElement('a');
  const safeSeed = seedText.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 48) || 'world';
  link.href = url;
  link.download = `wildforge-${safeSeed}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Complete world backup exported');
});
document.querySelector('#import-world').addEventListener('click', () => document.querySelector('#import-world-file').click());
document.querySelector('#import-world-file').addEventListener('change', async (event) => {
  const input = event.currentTarget;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (!confirm(`Replace the current “${seedText}” world with this backup? A recovery copy of the current world will be kept.`)) return;
  let text;
  try {
    text = await file.text();
  } catch {
    showToast('Could not read that backup file');
    return;
  }
  const imported = importWorldBundle(text, { storage: globalThis.localStorage, playerKey: saveKey, editsKey, seed });
  if (!imported.ok) {
    const reason = imported.reason === 'wrong-seed' ? 'Backup belongs to a different seed' : `Invalid backup · ${imported.reason || 'unknown format'}`;
    showToast(reason);
    return;
  }
  location.reload();
});
for (const [key, input] of Object.entries(settingControls)) {
  input.addEventListener('input', () => {
    if (key === 'performanceMode') {
      applyPerformanceMode(input.value);
      return;
    }
    const value = input.type === 'checkbox' ? input.checked : Number(input.value);
    const manualQuality = key === 'viewDistance' || key === 'renderScale';
    applySettings({ ...settings, [key]: value, ...(manualQuality ? { performanceMode: 'custom' } : {}) });
  });
}
document.querySelector('#save-sign').addEventListener('click', () => closeSignEditor(true));
document.querySelector('#cancel-sign').addEventListener('click', () => closeSignEditor(false));
document.querySelector('#close-inventory').addEventListener('click', () => setInventoryOpen(false));
document.querySelector('#close-map').addEventListener('click', () => setMapOpen(false));
document.querySelector('#respawn').addEventListener('click', () => {
  survival.respawn();
  if (realmTravel.current === REALM.CINDERREACH) travelToRealm(false);
  player.respawn();
  deathScreen.classList.add('hidden');
  renderSurvival();
  saveGame();
  renderer.domElement.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
  const playing = document.pointerLockElement === renderer.domElement;
  if (!playing) {
    primaryHeld = false;
    mining = null;
    bowCharging = false;
    bowCharge = 0;
  }
  menu.classList.toggle('hidden', playing || inventoryOpen || settingsOpen || signEditorOpen || mapOpen || survival.dead);
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio * settings.renderScale, 2));
  renderer.setSize(innerWidth, innerHeight);
});
window.addEventListener('beforeunload', () => {
  craftingGrid.clear(inventory);
  saveGame();
});

const daySky = new THREE.Color(0x75b7e8);
const sunsetSky = new THREE.Color(0xdb9470);
const nightSky = new THREE.Color(0x09152d);
const lumenNightColor = new THREE.Color(0x254f58);
const skyColor = new THREE.Color();
const atmosphereSkyColor = new THREE.Color();
const atmosphereFogColor = new THREE.Color();
const clock = new THREE.Clock();
let debugTimer = 0;
let saveTimer = 0;
let lightSyncTimer = 1;
let daylight = 1;
let footstepTimer = 0;
let footstepVariant = 0;
let firePlayerDamageTimer = 0;
const fireCreatureDamageTimers = new Map();

function updateDayNight(dt) {
  worldTime = (worldTime + dt / 600) % 1;
  const angle = worldTime * Math.PI * 2 - Math.PI / 2;
  const sunHeight = Math.sin(angle);
  sun.position.set(Math.cos(angle) * 55, sunHeight * 65, 24);
  daylight = THREE.MathUtils.clamp(sunHeight * 1.25 + 0.2, 0.04, 1);
  const twilight = THREE.MathUtils.clamp(1 - Math.abs(sunHeight) * 5, 0, 1);
  skyColor.copy(nightSky).lerp(daySky, daylight).lerp(sunsetSky, twilight * 0.55);
  scene.background.copy(skyColor);
  scene.fog.color.copy(skyColor).lerp(daySky, 0.12);
  sun.intensity = daylight * 1.45;
  hemisphere.intensity = 0.18 + daylight * 1.45;
  sun.color.setHex(0xfff1c2);
  hemisphere.color.setHex(0xc8e5ff);
  hemisphere.groundColor.setHex(0x64704d);
  if (player.submergedLava) {
    scene.background.setHex(0x9b2f0d);
    scene.fog.color.setHex(0xc44812);
    scene.fog.near = 0.35;
    scene.fog.far = 5;
  } else if (player.submerged) {
    scene.background.setHex(0x174d75);
    scene.fog.color.setHex(0x1b5b82);
    scene.fog.near = 2;
    scene.fog.far = 18;
  } else {
    const fogFar = Math.max(64, (settings.viewDistance + 3) * 16);
    const sight = statusEffects.has('lumen_sight') && daylight < 0.52;
    scene.fog.near = fogFar * (sight ? 0.34 : 0.48);
    scene.fog.far = fogFar * (sight ? 1.35 : 1);
    if (sight) {
      const strength = (0.52 - daylight) / 0.52 * 0.42;
      scene.background.lerp(lumenNightColor, strength);
      scene.fog.color.lerp(lumenNightColor, strength * 0.85);
      hemisphere.intensity += strength * 1.1;
    }
  }
}

function sameBlock(a, b) {
  return a && b && a.x === b.x && a.y === b.y && a.z === b.z;
}

function updateMining(dt) {
  const creatureIsCloser = currentCreatureTarget && (!currentTarget || currentCreatureTarget.distance < currentTarget.distance);
  if (!primaryHeld || !currentTarget || creatureIsCloser || currentTarget.break.y <= WORLD_MIN_Y) {
    mining = null;
    selector.scale.setScalar(1);
    selector.material.color.setHex(0xffffff);
    return;
  }
  const id = world.getBlock(currentTarget.break.x, currentTarget.break.y, currentTarget.break.z);
  if (id === BLOCK.AIR || !sameBlock(mining?.position, currentTarget.break) || mining.id !== id) {
    mining = { position: currentTarget.break.clone(), id, progress: 0 };
    if (BLOCKS[id]?.breakable === false) showToast(`${BLOCKS[id].name} is bound by the vault`);
  }
  if (BLOCKS[id]?.breakable === false) {
    selector.scale.setScalar(1.02);
    selector.material.color.setHex(0xb38aff);
    return;
  }
  const duration = breakDuration(id, inventory, selectedItemId());
  mining.progress += dt;
  const ratio = Math.min(1, mining.progress / duration);
  selector.scale.setScalar(1 + ratio * 0.055);
  selector.material.color.setRGB(1, 1 - ratio * 0.55, 1 - ratio * 0.55);
  if (mining.progress < duration) return;
  wearSelectedItem();

  if (isDoor(id)) {
    const base = breakDoor(world, mining.position.x, mining.position.y, mining.position.z);
    if (base) drops.spawn('wooden_door', 1, new THREE.Vector3(base.x + 0.5, base.y + 0.7, base.z + 0.5));
    effects.burst(mining.position.clone().addScalar(0.5), BLOCKS[id].color, 10);
    audio.play('break');
    saveGame();
    mining = null;
    return;
  }
  if (isGate(id)) {
    const position = breakGate(world, mining.position.x, mining.position.y, mining.position.z);
    if (position) drops.spawn('oak_gate', 1, new THREE.Vector3(position.x + 0.5, position.y + 0.7, position.z + 0.5));
    effects.burst(mining.position.clone().addScalar(0.5), BLOCKS[id].color, 10);
    audio.play('break');
    saveGame();
    mining = null;
    return;
  }
  if (isStair(id)) {
    const result = breakStair(world, mining.position.x, mining.position.y, mining.position.z);
    if (result) drops.spawn(result.item, 1, new THREE.Vector3(result.x + 0.5, result.y + 0.6, result.z + 0.5));
    effects.burst(mining.position.clone().addScalar(0.5), BLOCKS[id].color, 10);
    audio.play('break');
    saveGame();
    mining = null;
    return;
  }
  if (isTrapdoor(id)) {
    const position = breakTrapdoor(world, mining.position.x, mining.position.y, mining.position.z);
    if (position) drops.spawn('oak_trapdoor', 1, new THREE.Vector3(position.x + 0.5, position.y + 0.45, position.z + 0.5));
    effects.burst(mining.position.clone().addScalar(0.5), BLOCKS[id].color, 8);
    audio.play('break');
    saveGame();
    mining = null;
    return;
  }
  if (isBed(id)) {
    const position = breakBed(world, mining.position.x, mining.position.y, mining.position.z);
    if (position) drops.spawn('moss_bed', 1, new THREE.Vector3(position.x + 0.5, position.y + 0.5, position.z + 0.5));
    effects.burst(mining.position.clone().addScalar(0.5), BLOCKS[id].color, 9);
    audio.play('break');
    saveGame();
    mining = null;
    return;
  }
  if (isSign(id)) {
    world.setBlock(mining.position.x, mining.position.y, mining.position.z, BLOCK.AIR);
    signs.remove(mining.position.x, mining.position.y, mining.position.z);
    signTextRenderer.sync();
    drops.spawn('oak_sign', 1, mining.position.clone().add(new THREE.Vector3(0.5, 0.65, 0.5)));
    effects.burst(mining.position.clone().addScalar(0.5), BLOCKS[id].color, 8);
    audio.play('break');
    saveGame();
    mining = null;
    return;
  }
  if (isKeepsakeFrame(id)) {
    world.setBlock(mining.position.x, mining.position.y, mining.position.z, BLOCK.AIR);
    drops.spawn('keepsake_frame', 1, mining.position.clone().add(new THREE.Vector3(0.5, 0.5, 0.5)));
    effects.burst(mining.position.clone().addScalar(0.5), BLOCKS[id].color, 7);
    audio.play('break');
    saveGame();
    mining = null;
    return;
  }
  if (isComposter(id)) {
    const result = breakComposter(world, mining.position.x, mining.position.y, mining.position.z);
    if (result) drops.spawn(result.item, 1, new THREE.Vector3(result.x + 0.5, result.y + 0.65, result.z + 0.5));
    effects.burst(mining.position.clone().addScalar(0.5), BLOCKS[id].color, 10);
    audio.play('break');
    saveGame();
    mining = null;
    return;
  }

  const harvested = Boolean(BLOCKS[id]?.crop);
  const harvestable = canHarvestBlock(id, inventory, selectedItemId());
  const dropsForBlock = harvestable ? blockDrops(id) : [];
  if (id === BLOCK.CHEST) {
    const info = chestInfo(world, mining.position.x, mining.position.y, mining.position.z);
    prepareChestStorage(info);
    let released;
    if (info.members.length === 2) {
      const remaining = info.members.find((position) => position.x !== mining.position.x || position.y !== mining.position.y || position.z !== mining.position.z);
      released = storage.unpair(info.key, containerKey(remaining.x, remaining.y, remaining.z));
    } else released = storage.drainItems(info.key);
    for (const item of released) {
      drops.spawn(item.id, item.count, mining.position.clone().addScalar(0.5), item.durability, item.enchantments);
    }
  }
  if (id === BLOCK.TRAILBARREL) {
    const key = barrelKey(mining.position.x, mining.position.y, mining.position.z);
    for (const item of storage.drainItems(key)) drops.spawn(item.id, item.count, mining.position.clone().addScalar(0.5), item.durability, item.enchantments);
  }
  if (id === BLOCK.FURNACE || BLOCKS[id]?.furnaceMode) {
    const key = containerKey(mining.position.x, mining.position.y, mining.position.z);
    for (const [storedId, count] of furnaces.drain(key)) {
      drops.spawn(storedId, count, mining.position.clone().addScalar(0.5));
    }
  }
  if (id === BLOCK.INFUSION_STILL) {
    const key = containerKey(mining.position.x, mining.position.y, mining.position.z);
    for (const [storedId, count] of infusionStills.drain(key)) drops.spawn(storedId, count, mining.position.clone().addScalar(0.5));
  }
  if (BLOCKS[id]?.campfire) {
    for (const input of campfires.drain(mining.position.x, mining.position.y, mining.position.z)) {
      drops.spawn(input, 1, mining.position.clone().add(new THREE.Vector3(0.5, 0.45, 0.5)));
    }
  }
  if (BLOCKS[id]?.dryingRack) {
    for (const input of dryingRacks.drain(mining.position.x, mining.position.y, mining.position.z)) {
      drops.spawn(input, 1, mining.position.clone().add(new THREE.Vector3(0.5, 0.9, 0.5)));
    }
  }
  if (isCharterPost(id)) {
    const removedOutpost = outposts.removeAt(mining.position.x, mining.position.y, mining.position.z);
    if (removedOutpost) entities.removeOutpostResidents(removedOutpost.key);
  }
  if (id === BLOCK.FARMLAND || id === BLOCK.HYDRATED_FARMLAND) farming.untill(mining.position.x, mining.position.y, mining.position.z);
  const supportedCrop = world.getBlock(mining.position.x, mining.position.y + 1, mining.position.z);
  if (BLOCKS[supportedCrop]?.crop && cropSubstrateAllowed(BLOCKS[supportedCrop].cropType, id)) {
    world.setBlock(mining.position.x, mining.position.y + 1, mining.position.z, BLOCK.AIR);
    lights.blockChanged(mining.position.x, mining.position.y + 1, mining.position.z, BLOCK.AIR);
    farming.remove(mining.position.x, mining.position.y + 1, mining.position.z);
    drops.spawn(cropSeedItem(BLOCKS[supportedCrop].cropType), 1, mining.position.clone().add(new THREE.Vector3(0.5, 1.2, 0.5)));
  }
  world.setBlock(mining.position.x, mining.position.y, mining.position.z, BLOCK.AIR);
  lights.blockChanged(mining.position.x, mining.position.y, mining.position.z, BLOCK.AIR);
  circuits.blockChanged(mining.position.x, mining.position.y, mining.position.z, id, BLOCK.AIR);
  if (isRail(id)) {
    for (const change of refreshRailsAround(world, mining.position.x, mining.position.y, mining.position.z)) {
      circuits.blockChanged(change.x, change.y, change.z, change.previous, change.id);
    }
  }
  const detachedCircuit = circuits.detachUnsupportedAbove(mining.position.x, mining.position.y, mining.position.z);
  if (detachedCircuit) drops.spawn(detachedCircuit.id, 1, new THREE.Vector3(detachedCircuit.x + 0.5, detachedCircuit.y + 0.2, detachedCircuit.z + 0.5));
  if (harvested) farming.remove(mining.position.x, mining.position.y, mining.position.z);
  for (const drop of dropsForBlock) drops.spawn(drop, 1, mining.position.clone().addScalar(0.5));
  const miningExperience = harvestable ? blockExperience(id) : 0;
  if (miningExperience > 0) experienceWisps.spawn(miningExperience, mining.position.clone().addScalar(0.5));
  if (!harvestable) showToast(`${BLOCKS[id].name} needs a stronger pickaxe to harvest`);
  effects.burst(mining.position.clone().addScalar(0.5), BLOCKS[id].color, 12);
  audio.play('break');
  survival.addExhaustion(0.08);
  saveGame();
  mining = null;
}

function farmlandHasWater(x, y, z) {
  for (let dz = -4; dz <= 4; dz += 1) {
    for (let dx = -4; dx <= 4; dx += 1) {
      if (isWaterBlock(world.getBlock(x + dx, y, z + dz)) || isWaterBlock(world.getBlock(x + dx, y + 1, z + dz))) return true;
    }
  }
  return false;
}

function cropHasLight(x, y, z) {
  const above = BLOCKS[world.getBlock(x, y + 1, z)];
  return !above?.solid || above.transparent || above.lightPasses;
}

function campfireIsExposed(x, y, z) {
  for (let aboveY = y + 1; aboveY < WORLD_HEIGHT; aboveY += 1) {
    const definition = BLOCKS[world.getBlock(x, aboveY, z)];
    if (definition?.solid && !definition.transparent && !definition.lightPasses) return false;
  }
  return true;
}

function updateFootsteps(dt) {
  const horizontalSpeed = Math.hypot(player.velocity.x, player.velocity.z);
  const canStep = player.enabled && !survival.dead && player.moving && horizontalSpeed > 0.35 && (player.grounded || player.inWater);
  if (!canStep) {
    footstepTimer = 0;
    return;
  }
  footstepTimer -= dt;
  if (footstepTimer > 0) return;
  const block = world.getBlock(Math.floor(player.position.x), Math.floor(player.position.y - 0.05), Math.floor(player.position.z));
  audio.playFootstep(block, {
    inWater: player.inWater,
    sprinting: player.sprinting,
    crouching: player.crouching,
    variant: footstepVariant++,
  });
  footstepTimer = player.inWater ? 0.52 : player.crouching ? 0.68 : player.sprinting ? 0.28 : 0.43;
}

function animate() {
  requestAnimationFrame(animate);
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  performanceMonitor.sample(rawDt);
  if (settings.performanceMode === 'adaptive') {
    const adjustment = performanceMonitor.update(rawDt, settings);
    if (adjustment) {
      applySettings({ ...settings, viewDistance: adjustment.viewDistance, renderScale: adjustment.renderScale, performanceMode: 'adaptive' });
      showToast(`Adaptive quality ${adjustment.step + 1}/5 · ${adjustment.fps} FPS`);
    }
  }
  navigationRefreshTimer = Math.max(0, navigationRefreshTimer - dt);
  mapRevealTimer = Math.max(0, mapRevealTimer - dt);
  if (mapRevealTimer <= 0 && inventory.count('trailchart') > 0) {
    mapRevealTimer = 0.75;
    explorationMap.reveal(world, player.position.x, player.position.z, 1);
  }
  fallingBlocks.update(dt, player.position);
  fires.update(dt, {
    raining: weatherState.kind === 'rain' || weatherState.kind === 'storm',
    isExposed: campfireIsExposed,
    spreadMultiplier: weatherState.kind === 'clear' ? 0.8 + weatherState.windStrength * 0.55 : 0.3,
  });
  explosives.update(dt);
  fluids.update(dt);
  firePlayerDamageTimer = Math.max(0, firePlayerDamageTimer - dt);
  const playerFire = fireAtActor(world, player.position, player.height);
  if (playerFire && firePlayerDamageTimer <= 0 && !survival.dead) {
    firePlayerDamageTimer = 1;
    effects.burst(new THREE.Vector3(playerFire.x + 0.5, playerFire.y + 0.5, playerFire.z + 0.5), 0xf08b35, 5);
    takeDamage(1, 'Emberfire', true);
  }
  const activeCreatureIds = new Set();
  for (const entity of [...entities.entities]) {
    activeCreatureIds.add(entity.id);
    const remaining = Math.max(0, (fireCreatureDamageTimers.get(entity.id) || 0) - dt);
    const contact = fireAtActor(world, entity.root.position, 1.8);
    if (contact && remaining <= 0) {
      fireCreatureDamageTimers.set(entity.id, 1);
      entities.attack(entity, 1, 0.35, new THREE.Vector3(contact.x + 0.5, contact.y + 0.5, contact.z + 0.5));
    } else if (remaining > 0) fireCreatureDamageTimers.set(entity.id, remaining);
  }
  for (const id of [...fireCreatureDamageTimers.keys()]) if (!activeCreatureIds.has(id)) fireCreatureDamageTimers.delete(id);
  combat.update(dt);
  if (bowCharging && player.enabled) bowCharge = Math.min(1, bowCharge + dt / 1.1);
  const attackMeter = document.querySelector('#attack-meter');
  const readiness = bowCharging ? bowCharge : combat.readiness();
  attackMeter.querySelector('span').style.transform = `scaleX(${readiness})`;
  attackMeter.classList.toggle('ready', readiness >= 1);
  attackMeter.classList.toggle('charging', bowCharging);
  if (!survival.dead) {
    player.canBlock = equipment.hasShield();
    player.speedMultiplier = statusEffects.speedMultiplier();
    if (boats.mounted) {
      boats.update(dt, player.keys, player);
      carts.update(dt);
    }
    else if (carts.mounted) {
      carts.update(dt, player.keys, player);
      boats.update(dt);
    }
    else if (entities.mounted) {
      entities.updateMount(dt, player.keys, player);
      boats.update(dt);
      carts.update(dt);
    }
    else {
      player.update(dt);
      boats.update(dt);
      carts.update(dt);
    }
    updateFootsteps(dt);
    survival.update(dt, player.moving && !boats.mounted && !carts.mounted && !entities.mounted, player.sprinting && !boats.mounted && !carts.mounted && !entities.mounted);
    if (realmTravel.current === REALM.OVERWORLD) waystars.update(dt, world, player.position, (id, duration) => statusEffects.apply(id, duration));
    waystarRenderer.update(dt, player.position, realmTravel.current === REALM.OVERWORLD);
    const expiredEffects = statusEffects.update(dt, (effect) => {
      const before = survival.health;
      survival.heal(effect.heal || 0);
      if (survival.health > before) {
        effects.burst(player.position.clone().add(new THREE.Vector3(0, 1, 0)), effect.color, 5);
        renderSurvival();
      }
    });
    if (expiredEffects.length) showToast(`${STATUS_EFFECTS[expiredEffects[0]].name} faded`);
    renderEffectHud();
    if (player.inWater && player.moving) survival.addExhaustion(dt * 0.025);
    if (survival.updateBreathing(dt, player.submerged)) showToast('You are drowning');
    if (survival.updateLava(dt, player.inLava || player.submergedLava)) {
      audio.play('hurt');
      showToast('Lava burns!');
    }
    const playerBiome = world.biomeAt(Math.floor(player.position.x), Math.floor(player.position.z)).id;
    const climateExposed = campfireIsExposed(Math.floor(player.position.x), Math.floor(player.position.y), Math.floor(player.position.z));
    climateWarmthTimer -= dt;
    if (climateWarmthTimer <= 0) {
      climateWarmthTimer = 0.5;
      climateWarmth = playerBiome === 'snowy_highlands' ? nearbyWarmth(world, player.position, 4) : null;
    }
    const climateEvents = climateExposure.update(dt, {
      biome: playerBiome,
      daylight,
      weatherKind: weatherState.kind,
      exposed: climateExposed,
      inWater: player.inWater || player.submerged,
      nearHeat: climateWarmth,
      heatWard: statusEffects.has('cinderward'),
      insulation: equipment.climateInsulation(),
    });
    for (const event of climateEvents) {
      if (event.type === 'warning') {
        showToast(event.kind === 'heat'
          ? 'Desert heat rising · find shade, water, or drink Cinderward'
          : 'Frostveil cold rising · seek shelter, fire, or wear Tough Hide');
      } else if (event.type === 'damage') {
        effects.burst(player.position.clone().add(new THREE.Vector3(0, 1, 0)), event.kind === 'heat' ? 0xed8a42 : 0x83d8ee, 8);
        takeDamage(event.amount, event.kind === 'heat' ? 'Heat exhaustion' : 'Frostbite', false);
      }
    }
    renderClimateHud();
    const inCinderreach = realmTravel.current === REALM.CINDERREACH;
    const shelteredFromCinder = statusEffects.has('cinderward')
      || !campfireIsExposed(Math.floor(player.position.x), Math.floor(player.position.y), Math.floor(player.position.z));
    if (cinderHeat.update(dt, inCinderreach, shelteredFromCinder)) {
      effects.burst(player.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xf07b3d, 10);
      takeDamage(2, 'Cinder heat', true);
    }
    sunhives.update(dt, entities.entities, farming);
    entities.update(dt, daylight, worldTime);
    const socialEvents = social.update(dt, entities.entities);
    for (const event of socialEvents) {
      if (event.bond !== 1 && event.bond % 5 !== 0) continue;
      const midpoint = event.first.root.position.clone().add(event.second.root.position).multiplyScalar(0.5).add(new THREE.Vector3(0, 1.4, 0));
      effects.burst(midpoint, 0xe5b66f, 5);
      if (midpoint.distanceTo(player.position) < 10 && event.bond % 5 === 0) showToast(`Wayfarer friendship ${event.bond}/20`);
    }
    vaultState.update(dt, player.position);
    renderBossHud();
    if (survival.dead) showDeathScreen();
  } else {
    boats.update(dt);
    carts.update(dt);
  }
  tethers.update(dt, realmTravel.current);
  hearthsongs.update(dt, player.position, (event) => { if (!survival.dead) playHearthsongEvent(event); });
  hearthsongRenderer.update(dt);
  heldItemView.update(dt, {
    id: selectedItemId(),
    visible: player.enabled && !survival.dead && !inventoryOpen,
    moving: player.moving,
    sprinting: player.sprinting,
    mining: primaryHeld,
    attack: 1 - combat.readiness(),
    bowCharge: bowCharging ? bowCharge : 0,
    blocking: player.blocking,
    hasShield: equipment.hasShield(),
    cosmetic: itemDefinition(equipment.cosmetic)?.cosmetic,
    reducedMotion: settings.reducedMotion,
  });
  document.querySelector('#block-status').classList.toggle('hidden', survival.dead || !player.blocking);
  if (survival.dead && fishing.active) fishing.cancel();
  world.update(player.position);
  changeSentries.update(dt);
  circuits.update(dt, {
    daylight,
    actors: [survival.dead ? null : player.position, ...entities.entities.map((entity) => entity.root.position)],
  });
  lightSyncTimer += dt;
  if (lightSyncTimer >= 1) {
    lightSyncTimer = 0;
    circuits.discover(world.generatedCircuitNodesNear(player.position.x, player.position.z, (world.renderRadius + 1) * 16));
    lights.syncGenerated(world.generatedLightsNear(player.position.x, player.position.z, (world.renderRadius + 1) * 16));
  }
  farming.update(dt, (x, y, z, block) => {
    world.setBlock(x, y, z, block);
    lights.blockChanged(x, y, z, block);
  }, {
    isHydrated: farmlandHasWater,
    hasLight: cropHasLight,
    growthMultiplier: weatherGrowthMultiplier(weatherState.kind, weatherState.windStrength),
    biomeAt: (x, z) => world.biomeAt(x, z),
    blockAt: (x, y, z) => world.getBlock(x, y, z),
    onSoilChange: (x, y, z, hydrated) => world.setBlock(x, y, z, hydrated ? BLOCK.HYDRATED_FARMLAND : BLOCK.FARMLAND),
    onDry: (x, y, z) => world.setBlock(x, y, z, BLOCK.DIRT),
  });
  trees.update(dt, {
    hasLight: cropHasLight,
    growthMultiplier: weatherGrowthMultiplier(weatherState.kind, weatherState.windStrength),
  });
  const furnaceRevision = furnaces.revision;
  const completedSmelts = furnaces.update(dt);
  if (completedSmelts.length) {
    audio.play('craft');
    for (const smelt of completedSmelts) {
      const [x, y, z] = smelt.key.split(',').map(Number);
      const amount = smeltingExperience(smelt.recipeId);
      if ([x, y, z].every(Number.isFinite) && amount > 0) experienceWisps.spawn(amount, new THREE.Vector3(x + 0.5, y + 0.8, z + 0.5));
    }
  }
  if (inventoryOpen && craftingStation === 'furnace') {
    if (furnaces.revision !== furnaceRevision) renderInventory();
    else updateFurnaceMeters();
  }
  const funnelEvents = forgeFunnels.update(dt, player.position);
  if (funnelEvents.length && inventoryOpen && craftingStation === 'chest' && isFunnelKey(activeChestKey)) renderInventory();
  const stillRevision = infusionStills.revision;
  const completedInfusions = infusionStills.update(dt);
  if (completedInfusions.length) {
    audio.play('craft');
    for (const infusion of completedInfusions) {
      const [x, y, z] = infusion.key.split(',').map(Number);
      if ([x, y, z].every(Number.isFinite)) {
        experienceWisps.spawn(1, new THREE.Vector3(x + 0.5, y + 0.75, z + 0.5));
        if (Math.hypot(x + 0.5 - player.position.x, z + 0.5 - player.position.z) < 12) showToast(`${itemDefinition(infusion.output).name} infusion complete`);
      }
    }
    saveGame();
  }
  if (inventoryOpen && craftingStation === 'still') {
    if (infusionStills.revision !== stillRevision) renderInventory();
    else updateInfusionStillMeter();
  }
  updateDayNight(dt);
  weatherState.update(dt);
  const raincatchChanges = raincatch.update(dt, world, {
    weatherKind: weatherState.kind,
    isActive: (x, z) => Math.hypot(x + 0.5 - player.position.x, z + 0.5 - player.position.z) <= (world.renderRadius + 1) * 16,
    isRaining: (x, z) => !['desert', 'snowy_highlands', 'cinderreach'].includes(world.biomeAt(x, z).id),
    isExposed: campfireIsExposed,
    onFill: (change) => {
      const position = new THREE.Vector3(change.x + 0.5, change.y + 0.72, change.z + 0.5);
      if (position.distanceTo(player.position) < 12) {
        audio.play('splash'); effects.burst(position, 0x5ea7d7, 5);
        showToast(`Raincatch Basin collected water · ${change.level}/3`);
      }
    },
  });
  if (raincatchChanges.length) saveGame();
  const currentBiome = world.biomeAt(Math.floor(player.position.x), Math.floor(player.position.z)).id;
  const currentSurfaceHeight = world.terrainHeight(Math.floor(player.position.x), Math.floor(player.position.z));
  const surfaceAtmosphere = !player.submerged && !player.submergedLava && player.position.y >= currentSurfaceHeight - 2;
  if (surfaceAtmosphere) {
    const atmosphere = biomeAtmosphere(currentBiome, daylight);
    atmosphereSkyColor.setHex(atmosphere.sky);
    atmosphereFogColor.setHex(atmosphere.fog);
    scene.background.lerp(atmosphereSkyColor, atmosphere.blend);
    scene.fog.color.lerp(atmosphereFogColor, atmosphere.fogBlend);
    scene.fog.near *= Math.max(0.72, atmosphere.visibility);
    scene.fog.far *= atmosphere.visibility;
    sun.color.setHex(atmosphere.sun);
    hemisphere.color.setHex(atmosphere.hemisphere);
    hemisphere.groundColor.setHex(atmosphere.ground);
  }
  const wind = weatherState.windVector();
  const skyState = sky.update(dt, worldTime, daylight, player.position, weatherState.kind, currentBiome, wind);
  const snowChanges = snowAccumulation.update(dt, {
    playerPosition: player.position,
    weatherKind: weatherState.kind,
    daylight,
    biomeAt: (x, z) => world.biomeAt(Math.floor(x), Math.floor(z)).id,
  });
  for (const change of snowChanges) {
    if (Math.hypot(change.x - player.position.x, change.z - player.position.z) <= 18) {
      effects.burst(new THREE.Vector3(change.x + 0.5, change.y + 0.2, change.z + 0.5), 0xe4f0f3, 2);
    }
  }
  if (!player.submerged && !player.submergedLava) {
    const fogFactor = currentBiome === 'desert' ? 1 : weatherFogFactor(weatherState.kind);
    scene.fog.near *= Math.max(0.72, fogFactor);
    scene.fog.far *= fogFactor;
  }
  campfires.update(dt, {
    isRaining: (x, z) => weatherState.kind !== 'clear' && world.biomeAt(x, z).id !== 'desert',
    isExposed: campfireIsExposed,
  });
  dryingRacks.update(dt, {
    windStrength: weatherState.windStrength,
    isRaining: (x, z) => weatherState.kind !== 'clear' && world.biomeAt(x, z).id !== 'desert',
    isExposed: campfireIsExposed,
  });
  campfireSmokeTimer -= dt;
  if (campfireSmokeTimer <= 0) {
    campfireSmokeTimer = 0.42;
    for (const site of campfires.litSites()) {
      if (Math.hypot(site.x - player.position.x, site.z - player.position.z) > 36) continue;
      effects.smoke(new THREE.Vector3(site.x + 0.5, site.y + 0.65, site.z + 0.5), 2);
    }
  }
  const undergroundBiome = player.position.y < currentSurfaceHeight - 2
    ? world.undergroundBiomeAt(Math.floor(player.position.x), Math.floor(player.position.y), Math.floor(player.position.z))
    : null;
  const ambientEvent = ambience.update(dt, {
    biome: currentBiome,
    weather: weatherState.kind,
    daylight,
    submerged: player.submerged || player.submergedLava,
    underground: Boolean(undergroundBiome),
    undergroundBiome: undergroundBiome?.id,
  });
  if (ambientEvent) audio.playAmbience(ambientEvent);
  const activeBoss = entities.activeBoss();
  const nearbyDanger = !activeBoss && entities.entities.some((entity) => entity.definition.hostile
    && entity.health > 0
    && (entity.alertTimer > 0 || entity.attackCooldown > 0)
    && entity.root.position.distanceToSquared(player.position) <= 18 ** 2);
  const musicEvent = score.update(dt, {
    biome: currentBiome,
    weather: weatherState.kind,
    daylight,
    submerged: player.submerged || player.submergedLava,
    underground: Boolean(undergroundBiome),
    undergroundBiome: undergroundBiome?.id,
    danger: nearbyDanger,
    boss: Boolean(activeBoss),
    dead: survival.dead || hearthsongs.playingNear(player.position),
  });
  if (musicEvent) audio.playMusic(musicEvent);
  const lightningStrike = weather.update(dt, weatherState, player.position, currentBiome, player.submerged || player.submergedLava);
  if (lightningStrike) {
    audio.play('thunder');
    const strikePosition = new THREE.Vector3(
      player.position.x + Math.cos(lightningStrike.angle) * lightningStrike.distance,
      player.position.y,
      player.position.z + Math.sin(lightningStrike.angle) * lightningStrike.distance,
    );
    showSpatialSoundCaption('Storm', 'thunder', strikePosition);
  }
  sun.intensity *= weatherState.daylightFactor() * (1 - skyState.cloudShadow) * (1 - skyState.eclipseShadow);
  sun.intensity += weather.flash * 2.4;
  hemisphere.intensity = hemisphere.intensity
    * (0.78 + weatherState.daylightFactor() * 0.22)
    * (1 - skyState.cloudShadow * 0.32)
    * (1 - skyState.eclipseShadow * 0.58)
    + weather.flash * 2.8;
  const localSky = world.skyLightAt(player.position.x, player.position.y + 1, player.position.z) / 15;
  sun.intensity *= localSky;
  hemisphere.intensity *= 0.24 + localSky * 0.76;
  effects.update(dt);
  drops.update(dt, !survival.dead);
  if (!survival.dead) experienceWisps.update(dt);
  projectiles.update(dt);
  if (!survival.dead) hostileProjectiles.update(dt);
  const fishingEvent = fishing.update(dt, camera.position);
  if (fishingEvent?.type === 'bite') {
    audio.play('splash');
    showToast('Bite! Right-click to reel in');
  } else if (fishingEvent?.type === 'escaped') showToast('The catch escaped');
  currentTarget = player.enabled ? world.raycast(camera) : null;
  currentCreatureTarget = player.enabled ? entities.raycast(camera) : null;
  currentBoatTarget = player.enabled ? boats.raycast(camera) : null;
  currentCartTarget = player.enabled ? carts.raycast(camera) : null;
  selector.visible = Boolean(currentTarget)
    && (!currentCreatureTarget || currentTarget.distance <= currentCreatureTarget.distance)
    && (!currentBoatTarget || currentTarget.distance <= currentBoatTarget.distance)
    && (!currentCartTarget || currentTarget.distance <= currentCartTarget.distance);
  if (currentTarget) selector.position.copy(currentTarget.break).addScalar(0.5);
  renderTargetLabel();
  updatePlacementGhost();
  playtestLog.maybeSnapshot(() => playtestSnapshot());
  renderNavigationHud();
  updateMining(dt);
  debugTimer += dt;
  saveTimer += dt;
  if (debugTimer > 0.15) {
    debugTimer = 0;
    const hours = Math.floor(worldTime * 24).toString().padStart(2, '0');
    const minutes = Math.floor((worldTime * 24 * 60) % 60).toString().padStart(2, '0');
    const tool = activeMiningTool(inventory, selectedItemId()).name;
    const biome = undergroundBiome?.name || world.biomeAt(Math.floor(player.position.x), Math.floor(player.position.z)).name;
    const weatherName = skyState.eclipseIntensity > 0.35 ? 'Solar Eclipse' : currentBiome === 'desert' && weatherState.kind !== 'clear' ? 'Dry Clouds' : currentBiome === 'snowy_highlands' && weatherState.kind !== 'clear' ? 'Snow' : weatherState.kind[0].toUpperCase() + weatherState.kind.slice(1);
    const stance = boats.mounted ? 'Rowing' : carts.mounted ? 'Rail Riding' : entities.mounted ? 'Riding' : player.climbing ? 'Climbing' : player.blocking ? 'Shielding' : player.crouching ? 'Sneaking' : player.sprinting ? 'Sprinting' : 'Walking';
    const performance = performanceMonitor.metrics();
    document.querySelector('#debug').textContent = `Seed: ${seedText}  ·  XYZ: ${player.position.x.toFixed(1)} / ${player.position.y.toFixed(1)} / ${player.position.z.toFixed(1)}  ·  ${biome}  ·  ${weatherName}  ·  ${hours}:${minutes}  ·  ${stance}  ·  ${tool}  ·  ${performance.fps} FPS ${settings.performanceMode.toUpperCase()}  ·  Chunks: ${world.meshes.size}`;
    renderSurvival();
    if (mapOpen) drawTrailchart();
  }
  if (saveTimer > 5) {
    saveTimer = 0;
    saveGame();
  }
  renderer.render(scene, camera);
}
animate();
