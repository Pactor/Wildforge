import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { aquaticSpawnHeight, caveSpawnAllowed, caveSpawnHeight, companionAttackAllowed, CREATURES, creatureModel, deterministicSpawnSample, entityVisualYaw, hostileSpawnAllowed, pounceLandingPlan, realmSpawnProfile } from '../src/entities.js';
import * as THREE from 'three';
import { EntityManager } from '../src/entities.js';
import { offersForTrader } from '../src/trading.js';

test('creature definitions contain valid combat and drop data', () => {
  for (const creature of Object.values(CREATURES)) {
    assert.ok(creature.health > 0);
    assert.ok(creature.speed > 0);
    assert.ok(creature.drop.max >= creature.drop.min);
    for (const extra of creature.extraDrops || []) assert.ok(extra.max >= extra.min && extra.id);
    assert.ok(Array.isArray(creature.biomes) && creature.biomes.length > 0);
    if (creature.hostile) assert.ok(creature.damage > 0);
  }
});

test('creature models use readable face details and smaller articulated voxel parts', () => {
  const grazer = creatureModel('grazer');
  assert.ok(grazer.getObjectByName('ear-left'));
  assert.ok(grazer.getObjectByName('hoof-0'));
  assert.ok(grazer.getObjectByName('tail-tuft'));
  const strider = creatureModel('sandstrider');
  assert.ok(strider.getObjectByName('lower-leg-0'));
  assert.ok(strider.getObjectByName('eye-left'));
  const frostfang = creatureModel('frostfang');
  assert.ok(frostfang.getObjectByName('fang-left'));
  assert.ok(frostfang.getObjectByName('paw-0'));
  const wayfarer = creatureModel('wayfarer');
  assert.ok(wayfarer.getObjectByName('eye-left'));
  assert.ok(wayfarer.getObjectByName('arm-left'));
});

test('visual yaw points authored faces in the simulation travel direction', () => {
  const facing = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), entityVisualYaw(0));
  assert.ok(facing.z > 0.999);
  assert.ok(Math.abs(facing.x) < 0.001);
});

test('creature families cover every surface realm and retain distinct roles', () => {
  const covered = new Set(Object.values(CREATURES).flatMap((creature) => creature.biomes));
  for (const biome of ['plains', 'forest', 'desert', 'snowy_highlands', 'cinderreach']) assert.ok(covered.has(biome));
  assert.equal(CREATURES.sandstrider.hostile, false);
  assert.equal(CREATURES.frostfang.hostile, true);
  assert.ok(CREATURES.grazer.extraDrops.some((drop) => drop.id === 'tough_hide'));
  assert.ok(CREATURES.sandstrider.extraDrops.some((drop) => drop.id === 'tough_hide' && drop.min > 0));
  assert.equal(CREATURES.reefglider.aquatic, true);
  assert.equal(CREATURES.gloomfin.aquatic, true);
  assert.equal(CREATURES.gloomfin.hostile, true);
  assert.equal(CREATURES.ashhopper.hostile, false);
  assert.equal(CREATURES.ashhopper.breedItem, 'emberbulb');
  assert.equal(CREATURES.riftstalker.hostile, true);
  assert.equal(CREATURES.riftstalker.daylightSafe, true);
  assert.equal(CREATURES.emberwing.flying, true);
  assert.equal(CREATURES.emberwing.daylightSafe, true);
  assert.equal(CREATURES.bramblehen.breedItem, 'wheat_seeds');
  assert.equal(CREATURES.bramblehen.eggLayer.item, 'bramble_egg');
  assert.equal(CREATURES.hushpod.volatile.fuse, 1.8);
  assert.ok(realmSpawnProfile('plains').hostile.includes('hushpod'));
  assert.equal(CREATURES.briarweaver.pounce.damage, 4);
  assert.ok(realmSpawnProfile('forest').hostile.includes('briarweaver'));
  assert.equal(CREATURES.mireglob.subterranean, true);
  assert.deepEqual(realmSpawnProfile('rootbound_hollow').hostile, ['mireglob']);
});

function rootboundCaveWorld(overrides = {}) {
  return {
    terrainHeight: () => 50,
    biomeAt: () => ({ id: 'plains' }),
    undergroundBiomeAt: () => ({ id: 'rootbound_hollow' }),
    getBlock: (_x, y) => Math.floor(y) === 14 ? BLOCK.ROOTSTONE : BLOCK.AIR,
    lightLevelAt: () => 0,
    ...overrides,
  };
}

test('Rootbound cave spawn authority requires a solid dry floor and two clear body cells', () => {
  const world = rootboundCaveWorld();
  assert.equal(caveSpawnAllowed(world, 2, 15, 3), true);
  assert.equal(caveSpawnHeight(world, 2, 3, 21), 15);
  assert.equal(caveSpawnAllowed(world, 2, 49, 3), false, 'surface-adjacent air is not a cave spawn');
  const blocked = rootboundCaveWorld({ getBlock: (_x, y) => Math.floor(y) === 14 || Math.floor(y) === 16 ? BLOCK.ROOTSTONE : BLOCK.AIR });
  assert.equal(caveSpawnAllowed(blocked, 2, 15, 3), false);
  const wrongBiome = rootboundCaveWorld({ undergroundBiomeAt: () => ({ id: 'lumen_grotto' }) });
  assert.equal(caveSpawnAllowed(wrongBiome, 2, 15, 3), false);
});

test('Mireglobs spawn only on real Rootbound cave floors and hop to attack', () => {
  const world = rootboundCaveWorld();
  const player = { position: new THREE.Vector3(0, 15, 0), inWater: false };
  const impacts = [];
  const manager = new EntityManager(new THREE.Scene(), world, player, 114, {
    onAttackPlayer: (damage, source) => impacts.push({ damage, source }),
  });
  manager.spawnTimer = 999;
  assert.equal(manager.spawn('mireglob', 2, 0), null, 'subterranean creatures require an authored cave height');
  const glob = manager.spawn('mireglob', 2, 0, { y: 15 });
  assert.ok(glob?.root.getObjectByName('glob-core'));
  assert.equal(glob.globSize, 2);
  assert.equal(glob.maximumHealth, 9);
  manager.update(0.1, 1);
  assert.ok(glob.hopRemaining > 0);
  assert.ok(glob.root.userData.globBody.position.y >= 0);
  assert.equal(glob.persistent, true);
  const saved = manager.serialize()[0];
  assert.equal(saved.globSize, 2);
  assert.equal(saved.hopRemaining, glob.hopRemaining);
  const restored = new EntityManager(new THREE.Scene(), world, player, 115);
  assert.equal(restored.restore([saved]), 1);
  assert.equal(restored.entities[0].hopRemaining, saved.hopRemaining);
  const bounded = restored.spawn('mireglob', 4, 0, { y: 15, globSize: 99, health: 999, hopRemaining: 99, hopCooldown: 99 });
  assert.equal(bounded.globSize, 3);
  assert.equal(bounded.health, 18);
  assert.equal(bounded.hopRemaining, CREATURES.mireglob.hopper.duration);
  assert.equal(bounded.hopCooldown, CREATURES.mireglob.hopper.interval);
  for (let step = 0; step < 8 && impacts.length === 0; step += 1) manager.update(0.1, 1);
  assert.deepEqual(impacts, [{ damage: 3, source: 'Mireglob hop' }]);

  const natural = new EntityManager(new THREE.Scene(), world, player, 116);
  natural.update(0.1, 1);
  assert.ok(natural.entities.some((entity) => entity.type === 'mireglob' && entity.root.position.y === 15), 'cave hostiles spawn in daylight below ground');
});

test('large Mireglobs split into bounded smaller tiers while only small globs drop resin', () => {
  const world = rootboundCaveWorld();
  const player = { position: new THREE.Vector3(0, 15, 0), inWater: false };
  const drops = [];
  const splits = [];
  const defeats = [];
  const manager = new EntityManager(new THREE.Scene(), world, player, 117, {
    onDrop: (id, count) => drops.push({ id, count }),
    onSplit: (_position, children, parent) => splits.push({ children: children.length, size: parent.globSize }),
    onDefeat: (_type, amount) => defeats.push(amount),
  });
  manager.spawnTimer = 999;
  const elder = manager.spawn('mireglob', 0, 0, { y: 15, globSize: 3, persistent: true });
  assert.equal(elder.maximumHealth, 18);
  assert.equal(manager.attack(elder, 18), true);
  assert.deepEqual(splits, [{ children: 2, size: 3 }]);
  assert.equal(defeats[0], 7);
  assert.equal(drops.length, 0);
  assert.deepEqual(manager.entities.map((entity) => entity.globSize), [2, 2]);

  const medium = manager.entities[0];
  assert.equal(manager.attack(medium, medium.maximumHealth), true);
  assert.equal(splits[1].size, 2);
  const small = manager.entities.find((entity) => entity.globSize === 1);
  assert.ok(small);
  assert.equal(manager.attack(small, small.maximumHealth), true);
  assert.ok(drops.some(({ id, count }) => id === 'glob_resin' && count >= 1 && count <= 2));
  assert.ok(manager.entities.length <= 12);

  const capped = new EntityManager(new THREE.Scene(), world, player, 118);
  capped.spawnTimer = 999;
  const parent = capped.spawn('mireglob', 0, 0, { y: 15, globSize: 2 });
  for (let index = 0; index < 11; index += 1) capped.spawn('mireglob', index + 1, 0, { y: 15, globSize: 1 });
  assert.equal(capped.splitCreature(parent).length, 1);
  capped.remove(parent, false);
  assert.equal(capped.entities.length, 12, 'splitting never exceeds its hostile safety bound');
});

test('Briarweaver pounce planning crosses open ground but rejects solid interception walls', () => {
  const blocks = new Map();
  const world = {
    terrainHeight: () => 20,
    getBlock: (x, y, z) => blocks.get(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`) ?? BLOCK.AIR,
  };
  const start = new THREE.Vector3(0, 21, 0);
  const target = new THREE.Vector3(5, 21, 0);
  const open = pounceLandingPlan(world, start, target, CREATURES.briarweaver.pounce);
  assert.ok(open);
  assert.deepEqual(open.end.toArray(), [5, 21, 0]);
  assert.equal(open.duration, CREATURES.briarweaver.pounce.duration);
  for (let y = 21; y <= 25; y += 1) blocks.set(`2,${y},0`, BLOCK.STONE);
  assert.equal(pounceLandingPlan(world, start, target, CREATURES.briarweaver.pounce), null);
});

test('Briarweavers telegraph a dodgeable pounce and resume exact saved midair state', () => {
  const world = {
    terrainHeight: () => 20,
    biomeAt: () => ({ id: 'plains' }),
    getBlock: () => BLOCK.AIR,
  };
  const player = { position: new THREE.Vector3(5, 21, 0), inWater: false };
  const warnings = [];
  const first = new EntityManager(new THREE.Scene(), world, player, 110, { onPounceWindup: (entity) => warnings.push(entity.id) });
  first.spawnTimer = 999;
  const weaver = first.spawn('briarweaver', 0, 0);
  assert.ok(weaver?.root.getObjectByName('silk-spinner'));
  assert.equal(weaver.root.userData.legs.length, 8);
  first.update(0.1, 0.1);
  assert.deepEqual(warnings, [weaver.id]);
  assert.equal(weaver.persistent, true);
  assert.equal(weaver.pounceTargetX, 5);
  assert.ok(weaver.pounceWindup > 0);

  const windupSave = first.serialize();
  const impacts = [];
  const resumed = new EntityManager(new THREE.Scene(), world, player, 111, {
    onAttackPlayer: (damage, source) => impacts.push({ damage, source }),
  });
  resumed.spawnTimer = 999;
  assert.equal(resumed.restore(windupSave), 1);
  const resumedWeaver = resumed.entities[0];
  assert.equal(resumedWeaver.pounceWindup, windupSave[0].pounceWindup);
  for (let step = 0; step < 10 && !resumedWeaver.pounceFlight; step += 1) resumed.update(0.1, 0.1);
  assert.ok(resumedWeaver.pounceFlight);
  resumed.update(0.1, 0.1);
  const midairSave = resumed.serialize();
  assert.ok(midairSave[0].pounceFlight.elapsed > 0);

  const landingImpacts = [];
  const landing = new EntityManager(new THREE.Scene(), world, player, 112, {
    onAttackPlayer: (damage, source) => landingImpacts.push({ damage, source }),
  });
  landing.spawnTimer = 999;
  assert.equal(landing.restore(midairSave), 1);
  assert.equal(landing.entities[0].pounceFlight.elapsed, midairSave[0].pounceFlight.elapsed);
  for (let step = 0; step < 10 && landing.entities[0].pounceFlight; step += 1) landing.update(0.1, 0.1);
  assert.deepEqual(landingImpacts, [{ damage: 4, source: 'Briarweaver pounce' }]);
  assert.ok(landing.entities[0].pounceCooldown > 0);
  assert.ok(Math.abs(landing.entities[0].root.position.x - 5) < 1e-9);
  assert.equal(impacts.length, 0, 'saving midair must not apply impact damage early');
});

test('Briarweavers abort blocked pounces and yield Night Silk when defeated', () => {
  const blocks = new Map();
  for (let y = 21; y <= 25; y += 1) blocks.set(`2,${y},0`, BLOCK.STONE);
  const world = {
    terrainHeight: () => 20,
    biomeAt: () => ({ id: 'forest' }),
    getBlock: (x, y, z) => blocks.get(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`) ?? BLOCK.AIR,
  };
  const player = { position: new THREE.Vector3(5, 21, 0), inWater: false };
  const impacts = [];
  const drops = [];
  const manager = new EntityManager(new THREE.Scene(), world, player, 113, {
    onAttackPlayer: (...args) => impacts.push(args),
    onDrop: (id, count) => drops.push({ id, count }),
  });
  manager.spawnTimer = 999;
  const weaver = manager.spawn('briarweaver', 0, 0);
  manager.update(0.1, 0.1);
  for (let step = 0; step < 8; step += 1) manager.update(0.1, 0.1);
  assert.equal(weaver.pounceFlight, null);
  assert.ok(weaver.pounceCooldown > 0);
  assert.equal(impacts.length, 0);
  assert.equal(manager.attack(weaver, CREATURES.briarweaver.health), true);
  assert.ok(drops.some(({ id, count }) => id === 'night_silk' && count >= 1 && count <= 2));
});

test('Hushpods visibly charge, persist their fuse, cancel after retreat, and detonate without loot', () => {
  const world = {
    terrainHeight: () => 20,
    biomeAt: () => ({ id: 'plains' }),
    getBlock: () => BLOCK.AIR,
  };
  const player = { position: new THREE.Vector3(0, 21, 0), inWater: false };
  const primed = [];
  const detonations = [];
  const drops = [];
  const manager = new EntityManager(new THREE.Scene(), world, player, 107, {
    onVolatilePrime: (entity) => primed.push(entity.id),
    onVolatileDetonate: (event) => detonations.push(event),
    onDrop: (id, count) => drops.push({ id, count }),
  });
  manager.spawnTimer = 999;
  const hushpod = manager.spawn('hushpod', 2.5, 0);
  assert.ok(hushpod?.root.getObjectByName('hush-core'));
  manager.update(0.5, 0.1);
  assert.deepEqual(primed, [hushpod.id]);
  assert.equal(hushpod.persistent, true);
  assert.ok(hushpod.volatileCharge >= 0.49 && hushpod.volatileCharge <= 0.51);
  assert.ok(hushpod.root.userData.volatileCore.scale.x > 1);

  const savedCharge = manager.serialize()[0].volatileCharge;
  const restored = new EntityManager(new THREE.Scene(), world, player, 108);
  assert.equal(restored.restore(manager.serialize()), 1);
  assert.equal(restored.entities[0].volatileCharge, savedCharge);

  player.position.x = 10;
  manager.update(0.4, 0.1);
  assert.equal(hushpod.volatileCharge, 0);
  assert.equal(hushpod.volatilePrimed, false);
  player.position.x = 0;
  manager.update(1, 0.1);
  manager.update(1, 0.1);
  manager.update(0.9, 0.1);
  assert.equal(detonations.length, 1);
  assert.equal(detonations[0].definition.name, 'Hushpod');
  assert.equal(manager.byId.has(hushpod.id), false);
  assert.equal(drops.length, 0, 'self-detonation must not award disarm loot');
});

test('defeating a Hushpod before its fuse completes yields renewable Hush Resin', () => {
  const world = { terrainHeight: () => 20, biomeAt: () => ({ id: 'forest' }) };
  const player = { position: new THREE.Vector3(0, 21, 0), inWater: false };
  const drops = [];
  const manager = new EntityManager(new THREE.Scene(), world, player, 109, { onDrop: (id, count) => drops.push({ id, count }) });
  const hushpod = manager.spawn('hushpod', 2, 0);
  assert.equal(manager.attack(hushpod, CREATURES.hushpod.health), true);
  assert.ok(drops.some(({ id, count }) => id === 'hush_resin' && count >= 1 && count <= 2));
});

test('adult Bramblehens lay persistent renewable eggs and breed young from seeds', () => {
  const world = { terrainHeight: () => 20, biomeAt: () => ({ id: 'plains' }) };
  const player = { position: new THREE.Vector3(0, 21, 0), inWater: false };
  const produced = [];
  const drops = [];
  const manager = new EntityManager(new THREE.Scene(), world, player, 106, {
    onProduce: (id, count, position, entity) => produced.push({ id, count, position: position.toArray(), type: entity.type }),
    onDrop: (id, count) => drops.push({ id, count }),
  });
  manager.spawnTimer = 999;
  const first = manager.spawn('bramblehen', 2, 0, { layTimer: 0.05 });
  const second = manager.spawn('bramblehen', 2.8, 0, { layTimer: 75 });
  assert.ok(first?.root.getObjectByName('leaf-crest'));
  assert.ok(first.root.getObjectByName('wing-left'));
  manager.update(0.1, 1);
  assert.deepEqual(produced.map(({ id, count, type }) => ({ id, count, type })), [{ id: 'bramble_egg', count: 1, type: 'bramblehen' }]);
  assert.ok(first.layTimer >= 240 && first.layTimer <= 480);
  assert.equal(first.persistent, true);
  assert.notEqual(first.root.userData.birdWings[0].mesh.rotation.z, 0);

  assert.equal(manager.feed(first, 'wheat_seeds'), true);
  assert.equal(manager.feed(second, 'wheat_seeds'), true);
  const child = manager.breedPair(first, second);
  assert.ok(child?.isBaby);
  assert.equal(child.type, 'bramblehen');
  const babyTimer = child.layTimer;
  manager.update(0.1, 1);
  assert.equal(child.layTimer, babyTimer, 'young Bramblehens must not lay or consume their laying timer');

  const saved = manager.serialize();
  const savedFirst = saved.find((entry) => entry.type === 'bramblehen' && !entry.isBaby && Math.abs(entry.x - first.root.position.x) < 0.1);
  assert.equal(savedFirst.layTimer, first.layTimer);
  const restored = new EntityManager(new THREE.Scene(), world, player, 107);
  assert.equal(restored.restore(saved), 3);
  assert.equal(restored.entities.find((entity) => !entity.isBaby && Math.abs(entity.root.position.x - first.root.position.x) < 0.1).layTimer, savedFirst.layTimer);

  first.hurtTimer = 0;
  assert.equal(manager.attack(first, CREATURES.bramblehen.health), true);
  assert.ok(drops.some((drop) => drop.id === 'raw_bramble' && drop.count === 1));
});

test('Cinderreach spawns only native land fauna that survive its daylight and low shelves', () => {
  assert.deepEqual(realmSpawnProfile('cinderreach'), { passive: ['ashhopper'], hostile: ['riftstalker', 'emberwing'], aquatic: [] });
  const world = {
    terrainHeight() { return 12; },
    biomeAt() { return { id: 'cinderreach' }; },
  };
  const player = { position: new THREE.Vector3(524288, 13, 524288), inWater: false };
  const drops = [];
  const manager = new EntityManager(new THREE.Scene(), world, player, 912, {
    onDrop: (id, count) => drops.push({ id, count }),
  });
  manager.spawnTimer = 999;
  const hopper = manager.spawn('ashhopper', 524290, 524288, { persistent: true });
  const stalker = manager.spawn('riftstalker', 524292, 524288, { persistent: true });
  assert.ok(hopper?.root.getObjectByName('cinder-crest'));
  assert.ok(stalker?.root.getObjectByName('rift-core'));
  manager.update(0.1, 1);
  assert.equal(manager.byId.has(stalker.id), true, 'realm hostiles must not burn or despawn in daylight');
  assert.equal(manager.attack(stalker, CREATURES.riftstalker.health), true);
  assert.ok(drops.some((drop) => drop.id === 'ember_gland' && drop.count === 1));
  hopper.hurtTimer = 0;
  assert.equal(manager.attack(hopper, CREATURES.ashhopper.health), true);
  assert.ok(drops.some((drop) => drop.id === 'ashscale' && drop.count >= 1));

  const plains = { terrainHeight: () => 20, biomeAt: () => ({ id: 'plains' }) };
  assert.equal(new EntityManager(new THREE.Scene(), plains, player, 913).spawn('ashhopper', 2, 2), null);
});

test('Emberwings spawn aloft, pursue in three dimensions, persist altitude, and drop membranes', () => {
  const world = {
    terrainHeight() { return 12; },
    biomeAt() { return { id: 'cinderreach' }; },
    getBlock() { return BLOCK.AIR; },
  };
  const player = { position: new THREE.Vector3(524292, 22, 524288), inWater: false };
  const drops = [];
  const manager = new EntityManager(new THREE.Scene(), world, player, 915, {
    onDrop: (id, count) => drops.push({ id, count }),
  });
  manager.spawnTimer = 999;
  const wing = manager.spawn('emberwing', 524288, 524288, { persistent: true, y: 17 });
  assert.ok(wing?.root.getObjectByName('wing-left'));
  assert.ok(wing.root.getObjectByName('flight-core'));
  assert.equal(wing.root.userData.legs.length, 0);
  const beforeY = wing.root.position.y;
  manager.update(0.1, 1);
  assert.ok(wing.root.position.y > beforeY, 'a pursuing Emberwing must climb toward an elevated player');
  assert.ok(Math.abs(wing.root.userData.wings[0].mesh.rotation.z) > 0.01);
  assert.equal(manager.byId.has(wing.id), true, 'Emberwings remain active in Cinderreach daylight');

  const saved = manager.serialize();
  assert.equal(saved[0].y, wing.root.position.y);
  const restored = new EntityManager(new THREE.Scene(), world, player, 916);
  assert.equal(restored.restore(saved), 1);
  assert.equal(restored.entities[0].root.position.y, saved[0].y);

  assert.equal(manager.attack(wing, CREATURES.emberwing.health), true);
  assert.ok(drops.some((drop) => drop.id === 'ember_membrane' && drop.count >= 1));
});

test('Emberbulb-fed adult Ashhoppers breed persistent young in Cinderreach', () => {
  const world = { terrainHeight: () => 12, biomeAt: () => ({ id: 'cinderreach' }) };
  const player = { position: new THREE.Vector3(524288, 13, 524288), inWater: false };
  const manager = new EntityManager(new THREE.Scene(), world, player, 914);
  const first = manager.spawn('ashhopper', 524290, 524288);
  const second = manager.spawn('ashhopper', 524291, 524288);
  assert.equal(manager.feed(first, 'emberbulb'), true);
  assert.equal(manager.feed(second, 'emberbulb'), true);
  const child = manager.breedPair(first, second);
  assert.ok(child?.isBaby);
  assert.equal(child.type, 'ashhopper');
  assert.equal(child.persistent, true);
  assert.equal(first.breedCooldown, 300);
});

test('natural hostile spawning respects the effective local voxel light level', () => {
  const dark = { lightLevelAt: () => 7 };
  const bright = { lightLevelAt: () => 8 };
  assert.equal(hostileSpawnAllowed(dark, 2, 3, 4, 0.2), true);
  assert.equal(hostileSpawnAllowed(bright, 2, 3, 4, 0.2), false);
  assert.equal(hostileSpawnAllowed({}, 2, 3, 4, 0.2), true);
  const litWorld = {
    terrainHeight: () => 20,
    biomeAt: () => ({ id: 'plains' }),
    lightLevelAt: () => 8,
  };
  const manager = new EntityManager(new THREE.Scene(), litWorld, { position: new THREE.Vector3() }, 77);
  assert.equal(manager.spawn('duskling', 2, 2, { daylight: 0.2, maximumLight: 7 }), null);
  assert.ok(manager.spawn('grazer', 2, 2, { daylight: 1, maximumLight: 0 }));
});

test('spawn samples are deterministic per world seed', () => {
  assert.deepEqual(deterministicSpawnSample(123), deterministicSpawnSample(123));
  assert.notDeepEqual(deterministicSpawnSample(123), deterministicSpawnSample(124));
});

test('creature hits apply damage, brief immunity, and directional knockback', () => {
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'plains' }; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  const manager = new EntityManager(new THREE.Scene(), world, player, 99);
  const creature = manager.spawn('grazer', 2, 0);
  assert.equal(manager.entityAtPoint(new THREE.Vector3(2, 21.9, 0)), creature);
  assert.equal(manager.attack(creature, 3, 4), true);
  assert.equal(creature.health, CREATURES.grazer.health - 3);
  assert.ok(Math.abs(creature.knockback.length() - 4) < 1e-9);
  assert.ok(creature.knockback.x > 0);
  assert.equal(manager.attack(creature, 3, 4), false);
  assert.equal(creature.health, CREATURES.grazer.health - 3);
});

test('wheat-fed adult Grazers breed persistent young that grow up', () => {
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'plains' }; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  let births = 0;
  const manager = new EntityManager(new THREE.Scene(), world, player, 101, { onBreed: () => { births += 1; } });
  manager.spawnTimer = 999;
  const first = manager.spawn('grazer', 2, 0);
  const second = manager.spawn('grazer', 2.8, 0);
  assert.equal(manager.feed(first, 'wheat'), true);
  assert.equal(manager.feed(second, 'wheat'), true);
  assert.equal(manager.feed(first, 'wheat'), false);
  manager.update(0.1, 1);
  const child = manager.entities.find((entity) => entity.isBaby);
  assert.ok(child);
  assert.equal(births, 1);
  assert.ok(first.breedCooldown > 299 && second.breedCooldown > 299);
  assert.equal(child.root.scale.x, 0.55);

  const saved = manager.serialize();
  assert.equal(saved.length, 3);
  const restored = new EntityManager(new THREE.Scene(), world, player, 202);
  assert.equal(restored.restore(saved), 3);
  assert.equal(restored.entities.filter((entity) => entity.isBaby).length, 1);
  const restoredChild = restored.entities.find((entity) => entity.isBaby);
  restoredChild.growthRemaining = 0.05;
  restored.spawnTimer = 999;
  restored.update(0.1, 1);
  assert.equal(restoredChild.isBaby, false);
  assert.equal(restoredChild.root.scale.x, 1);
});

test('Moss Shears harvest renewable visible Mosswool with a persistent regrowth cooldown', () => {
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'plains' }; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  const manager = new EntityManager(new THREE.Scene(), world, player, 250);
  manager.spawnTimer = 999;
  const grazer = manager.spawn('grazer', 2, 0);
  assert.equal(grazer.root.userData.harvestLayer.visible, true);
  const result = manager.harvestMoss(grazer, 'moss_shears');
  assert.equal(result.item, 'mosswool');
  assert.ok(result.count >= 1 && result.count <= 2);
  assert.equal(grazer.root.userData.harvestLayer.visible, false);
  assert.equal(manager.harvestMoss(grazer, 'moss_shears'), null);

  const restored = new EntityManager(new THREE.Scene(), world, player, 251);
  assert.equal(restored.restore(manager.serialize()), 1);
  const savedGrazer = restored.entities[0];
  assert.ok(savedGrazer.harvestCooldown > 179);
  assert.equal(savedGrazer.root.userData.harvestLayer.visible, false);
  restored.spawnTimer = 999;
  restored.update(181, 1);
  assert.equal(savedGrazer.harvestCooldown, 0);
  assert.equal(savedGrazer.root.userData.harvestLayer.visible, true);
});

test('adult Mossbacks fill Forged Pails with renewable Mossmilk on a persistent cooldown', () => {
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'plains' }; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  const manager = new EntityManager(new THREE.Scene(), world, player, 252);
  manager.spawnTimer = 999;
  const grazer = manager.spawn('grazer', 2, 0);
  assert.deepEqual(manager.milkGrazer(grazer, 'forged_pail'), { item: 'mossmilk_pail', remaining: 240 });
  assert.equal(manager.milkGrazer(grazer, 'forged_pail'), null);
  assert.equal(manager.milkGrazer(grazer, 'water_pail'), null);

  const restored = new EntityManager(new THREE.Scene(), world, player, 253);
  assert.equal(restored.restore(manager.serialize()), 1);
  const savedGrazer = restored.entities[0];
  assert.ok(savedGrazer.milkCooldown > 239);
  restored.spawnTimer = 999;
  restored.update(241, 1);
  assert.equal(savedGrazer.milkCooldown, 0);
  assert.equal(restored.milkGrazer(savedGrazer, 'forged_pail').item, 'mossmilk_pail');

  const young = restored.spawn('grazer', 3, 0, { isBaby: true, growthRemaining: 300 });
  assert.equal(restored.milkGrazer(young, 'forged_pail'), null);
});

test('adult Grazers are lured toward a player holding wheat', () => {
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'plains' }; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  const manager = new EntityManager(new THREE.Scene(), world, player, 303, { getHeldItem: () => 'wheat' });
  manager.spawnTimer = 999;
  const grazer = manager.spawn('grazer', 0, 5);
  const before = grazer.root.position.distanceTo(player.position);
  manager.update(0.1, 1);
  assert.ok(grazer.root.position.distanceTo(player.position) < before);
});

test('creatures emit ambient and combat sound events from their simulation state', () => {
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'plains' }; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  const sounds = [];
  const manager = new EntityManager(new THREE.Scene(), world, player, 404, {
    onSound: (type, event) => sounds.push(`${type}:${event}`),
    onAttackPlayer: () => {},
  });
  manager.spawnTimer = 999;
  const grazer = manager.spawn('grazer', 2, 0);
  grazer.soundTimer = 0;
  manager.update(0.05, 1);
  assert.ok(sounds.includes('grazer:ambient'));
  assert.equal(manager.attack(grazer, 1), true);
  assert.ok(sounds.includes('grazer:hurt'));
  grazer.hurtTimer = 0;
  assert.equal(manager.attack(grazer, 99), true);
  assert.ok(sounds.includes('grazer:death'));

  const duskling = manager.spawn('duskling', 0, 1);
  duskling.soundTimer = 999;
  duskling.attackCooldown = 0;
  manager.update(0.05, 0);
  assert.ok(sounds.includes('duskling:attack'));
});

test('aquatic creatures spawn only in deep water, swim in three dimensions, and persist depth', () => {
  const dryWorld = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'plains' }; },
  };
  const wetWorld = {
    terrainHeight() { return 11; },
    biomeAt() { return { id: 'plains' }; },
  };
  assert.equal(aquaticSpawnHeight(dryWorld, 0, 0), null);
  assert.ok(aquaticSpawnHeight(wetWorld, 0, 0, 0) > 12);
  assert.ok(aquaticSpawnHeight(wetWorld, 0, 0, 1) < 16);

  const player = { position: new THREE.Vector3(8, 13, 8), inWater: true };
  const manager = new EntityManager(new THREE.Scene(), wetWorld, player, 505);
  manager.spawnTimer = 999;
  assert.equal(manager.spawn('reefglider', 1, 1, { persistent: true })?.type, 'reefglider');
  assert.equal(manager.spawn('gloomfin', 2, 2, { persistent: true })?.type, 'gloomfin');
  assert.equal(new EntityManager(new THREE.Scene(), dryWorld, player, 506).spawn('reefglider', 1, 1), null);
  const glider = manager.entities.find((entity) => entity.type === 'reefglider');
  const before = glider.root.position.clone();
  glider.thinkTimer = 0;
  manager.update(0.2, 1);
  assert.ok(glider.root.position.distanceTo(before) > 0);
  assert.ok(glider.root.position.y > 12 && glider.root.position.y < 16);
  const saved = manager.serialize();
  assert.ok(saved.every((record) => Number.isFinite(record.y)));
  const restored = new EntityManager(new THREE.Scene(), wetWorld, player, 507);
  assert.equal(restored.restore(saved), 2);
  assert.ok(restored.entities.every((entity) => entity.definition.aquatic && entity.root.position.y > 12));
});

test('Gloomfins pursue swimmers and remain active during daylight', () => {
  const world = {
    terrainHeight() { return 11; },
    biomeAt() { return { id: 'plains' }; },
  };
  const player = { position: new THREE.Vector3(0, 13, 0), inWater: true };
  let hits = 0;
  const manager = new EntityManager(new THREE.Scene(), world, player, 606, { onAttackPlayer: () => { hits += 1; } });
  manager.spawnTimer = 999;
  const gloomfin = manager.spawn('gloomfin', 0, 0.5);
  gloomfin.root.position.y = player.position.y + 0.8;
  gloomfin.attackCooldown = 0;
  manager.update(0.05, 1);
  assert.equal(hits, 1);
  assert.ok(manager.byId.has(gloomfin.id), 'aquatic hostiles should not burn or despawn in daylight');
});

test('Thorncasters fire at range, hold their ground, and retreat when crowded', () => {
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'plains' }; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  const shots = [];
  let meleeHits = 0;
  const manager = new EntityManager(new THREE.Scene(), world, player, 707, {
    onRangedAttack: (entity, stats) => shots.push({ entity, stats }),
    onAttackPlayer: () => { meleeHits += 1; },
  });
  manager.spawnTimer = 999;
  const thorncaster = manager.spawn('thorncaster', 0, 10);
  thorncaster.attackCooldown = 0;
  const heldPosition = thorncaster.root.position.clone();
  manager.update(0.05, 0);
  assert.equal(shots.length, 1);
  assert.equal(shots[0].entity, thorncaster);
  assert.equal(shots[0].stats.damage, 3);
  assert.ok(thorncaster.root.position.distanceTo(heldPosition) < 1e-9);
  assert.equal(meleeHits, 0);

  thorncaster.root.position.set(0, 21, 3);
  const crowdedDistance = thorncaster.root.position.distanceTo(player.position);
  manager.update(0.1, 0);
  assert.ok(thorncaster.root.position.distanceTo(player.position) > crowdedDistance);
  assert.equal(shots.length, 1);
  assert.equal(meleeHits, 0);
});

test('defeated creatures emit their species experience at the death position', () => {
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'forest' }; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  const defeats = [];
  const manager = new EntityManager(new THREE.Scene(), world, player, 808, {
    onDefeat: (type, amount, position) => defeats.push({ type, amount, position }),
  });
  const creature = manager.spawn('thorncaster', 2, 3);
  assert.equal(manager.attack(creature, CREATURES.thorncaster.health), true);
  assert.equal(manager.byId.has(creature.id), false);
  assert.equal(defeats.length, 1);
  assert.equal(defeats[0].type, 'thorncaster');
  assert.equal(defeats[0].amount, CREATURES.thorncaster.experience);
  assert.deepEqual(defeats[0].position.toArray(), [2, 21, 3]);
});

test('Sandstriders bond through Amberroot, equip visible saddles, and persist tame state', () => {
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'desert' }; },
    getBlock() { return 0; },
  };
  const player = {
    position: new THREE.Vector3(0, 21, 0),
    velocity: new THREE.Vector3(),
    collides: () => false,
    syncCamera() {},
  };
  const manager = new EntityManager(new THREE.Scene(), world, player, 909);
  const strider = manager.spawn('sandstrider', 2, 2);
  assert.deepEqual(manager.bond(strider, 'amberroot'), { bond: 1, required: 3, tamed: false });
  assert.deepEqual(manager.bond(strider, 'amberroot'), { bond: 2, required: 3, tamed: false });
  assert.deepEqual(manager.bond(strider, 'amberroot'), { bond: 3, required: 3, tamed: true });
  assert.equal(manager.bond(strider, 'amberroot'), null);
  assert.equal(manager.equipSaddle(strider, 'trail_saddle'), true);
  assert.equal(strider.root.userData.saddle.visible, true);
  assert.equal(manager.equipSaddle(strider, 'trail_saddle'), false);

  const saved = manager.serialize();
  assert.equal(saved[0].bond, 3);
  assert.equal(saved[0].tamed, true);
  assert.equal(saved[0].saddled, true);
  const restored = new EntityManager(new THREE.Scene(), world, player, 910);
  assert.equal(restored.restore(saved), 1);
  assert.equal(restored.entities[0].tamed, true);
  assert.equal(restored.entities[0].saddled, true);
  assert.equal(restored.entities[0].root.userData.saddle.visible, true);
});

test('Emberfoxes bond, display their collar, and persist stay or follow commands', () => {
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'forest' }; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  const manager = new EntityManager(new THREE.Scene(), world, player, 911);
  manager.spawnTimer = 999;
  const fox = manager.spawn('emberfox', 2, 2);
  assert.equal(fox.root.userData.collar.visible, false);
  assert.deepEqual(manager.bond(fox, 'seared_ashcap'), { bond: 1, required: 3, tamed: false });
  assert.deepEqual(manager.bond(fox, 'seared_ashcap'), { bond: 2, required: 3, tamed: false });
  assert.deepEqual(manager.bond(fox, 'seared_ashcap'), { bond: 3, required: 3, tamed: true });
  assert.equal(fox.root.userData.collar.visible, true);
  assert.deepEqual(manager.toggleCompanion(fox), { sitting: true });

  const before = fox.root.position.clone();
  manager.update(0.5, 1);
  assert.deepEqual(fox.root.position.toArray(), before.toArray());
  const saved = manager.serialize();
  assert.equal(saved[0].sitting, true);
  const restored = new EntityManager(new THREE.Scene(), world, player, 912);
  assert.equal(restored.restore(saved), 1);
  assert.equal(restored.entities[0].tamed, true);
  assert.equal(restored.entities[0].sitting, true);
  assert.equal(restored.entities[0].root.userData.collar.visible, true);
  assert.deepEqual(restored.toggleCompanion(restored.entities[0]), { sitting: false });
});

test('following Emberfoxes safely catch up to a distant owner on solid ground', () => {
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'forest' }; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  const manager = new EntityManager(new THREE.Scene(), world, player, 913);
  manager.spawnTimer = 999;
  const fox = manager.spawn('emberfox', 32, 0, { tamed: true, persistent: true });
  assert.ok(fox.root.position.distanceTo(player.position) > 24);
  manager.update(0.1, 1);
  assert.ok(fox.root.position.distanceTo(player.position) < 5);
});

test('following Emberfoxes guard against nearby hostiles while sitting Emberfoxes do not', () => {
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'forest' }; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  const manager = new EntityManager(new THREE.Scene(), world, player, 914, { onAttackPlayer() {} });
  manager.spawnTimer = 999;
  const fox = manager.spawn('emberfox', 4, 0, { tamed: true, persistent: true });
  const duskling = manager.spawn('duskling', 4.8, 0);
  manager.update(0.1, 0);
  assert.equal(duskling.health, CREATURES.duskling.health - CREATURES.emberfox.damage);

  duskling.hurtTimer = 0;
  fox.attackCooldown = 0;
  manager.toggleCompanion(fox);
  const healthWhileSitting = duskling.health;
  manager.update(0.1, 0);
  assert.equal(duskling.health, healthWhileSitting);
});

test('trusted Emberfoxes require deliberate friendly fire and enter a persistent recoverable downed state', () => {
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'forest' }; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  let defeats = 0;
  const manager = new EntityManager(new THREE.Scene(), world, player, 915, { onDefeat: () => { defeats += 1; } });
  manager.spawnTimer = 999;
  const fox = manager.spawn('emberfox', 2, 0, { tamed: true, persistent: true });
  assert.equal(companionAttackAllowed(fox, false), false);
  assert.equal(companionAttackAllowed(fox, true), true);
  assert.equal(manager.attack(fox, 99), true);
  assert.equal(defeats, 0);
  assert.equal(manager.byId.has(fox.id), true);
  assert.equal(fox.health, 1);
  assert.equal(fox.downed, true);
  assert.equal(fox.sitting, true);
  assert.equal(fox.root.userData.collar.material.color.getHex(), 0x436e69);
  assert.equal(manager.toggleCompanion(fox), null);

  const restored = new EntityManager(new THREE.Scene(), world, player, 916);
  assert.equal(restored.restore(manager.serialize()), 1);
  const savedFox = restored.entities[0];
  assert.equal(savedFox.downed, true);
  assert.equal(savedFox.health, 1);
  const healed = restored.healCompanion(savedFox, 'roasted_rimepod');
  assert.equal(healed.revived, true);
  assert.equal(healed.health, 10);
  assert.equal(savedFox.downed, false);
  assert.equal(savedFox.sitting, false);
  assert.equal(savedFox.root.userData.collar.material.color.getHex(), 0x70e8dd);
  assert.equal(restored.healCompanion(savedFox, 'coal'), null);
});

test('two trusted Emberfox parents produce persistent bonded offspring', () => {
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'forest' }; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  const manager = new EntityManager(new THREE.Scene(), world, player, 917);
  manager.spawnTimer = 999;
  const first = manager.spawn('emberfox', 3, 0, { tamed: true, persistent: true });
  const second = manager.spawn('emberfox', 3.8, 0, { tamed: true, persistent: true });
  assert.equal(manager.feed(first, 'seared_ashcap'), true);
  assert.equal(manager.feed(second, 'seared_ashcap'), true);
  manager.update(0.1, 1);
  const child = manager.entities.find((entity) => entity.isBaby);
  assert.ok(child);
  assert.equal(child.tamed, true);
  assert.equal(child.bond, CREATURES.emberfox.bondRequired);
  assert.equal(child.persistent, true);
  assert.equal(child.root.userData.collar.visible, true);
});

test('mounted Sandstriders steer, traverse terrain, leap, sync riders, and dismount safely', () => {
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'desert' }; },
    getBlock() { return 0; },
  };
  let synced = 0;
  const player = {
    position: new THREE.Vector3(0, 21, 0),
    velocity: new THREE.Vector3(),
    collides: () => false,
    syncCamera() { synced += 1; },
  };
  const steps = [];
  const manager = new EntityManager(new THREE.Scene(), world, player, 1001, { onMountStep: (position, speed) => steps.push({ position, speed }) });
  const strider = manager.spawn('sandstrider', 0, 4, { tamed: true, saddled: true, persistent: true });
  strider.heading = 0;
  strider.root.rotation.y = 0;
  assert.equal(manager.mount(strider, player), true);
  const startZ = strider.root.position.z;
  for (let index = 0; index < 20; index += 1) manager.updateMount(0.05, new Set(['KeyW']), player);
  assert.ok(strider.root.position.z > startZ);
  assert.ok(strider.rideVelocity > 0);
  assert.equal(player.position.x, strider.root.position.x);
  assert.equal(player.position.y, strider.root.position.y + 1.18);
  assert.ok(steps.length > 0);

  const groundY = strider.root.position.y;
  manager.updateMount(0.05, new Set(['Space', 'KeyW']), player);
  assert.ok(strider.root.position.y > groundY);
  assert.equal(strider.mountGrounded, false);
  assert.equal(manager.unmount(player), true);
  assert.equal(manager.mounted, null);
  assert.ok(synced > 2);
  assert.ok(player.position.distanceTo(strider.root.position) > 1);
});

test('a defeated saddled Sandstrider returns its Trail Saddle', () => {
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'desert' }; },
    getBlock() { return 0; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  const drops = [];
  const manager = new EntityManager(new THREE.Scene(), world, player, 1102, {
    onDrop: (id, count) => drops.push({ id, count }),
  });
  const strider = manager.spawn('sandstrider', 2, 2, { tamed: true, saddled: true, persistent: true });
  assert.equal(manager.attack(strider, CREATURES.sandstrider.health), true);
  assert.ok(drops.some((drop) => drop.id === 'trail_saddle' && drop.count === 1));
});

test('mounted Sandstriders cannot jump through tall terrain faces', () => {
  const world = {
    terrainHeight(_x, z) { return z > 4.5 ? 24 : 20; },
    biomeAt() { return { id: 'desert' }; },
    getBlock() { return 0; },
  };
  const player = {
    position: new THREE.Vector3(0, 21, 4), velocity: new THREE.Vector3(),
    collides: () => false, syncCamera() {},
  };
  const manager = new EntityManager(new THREE.Scene(), world, player, 1203);
  const strider = manager.spawn('sandstrider', 0, 4, { tamed: true, saddled: true, persistent: true });
  strider.heading = 0;
  manager.mount(strider, player);
  strider.rideVelocity = 7;
  manager.updateMount(0.05, new Set(['KeyW', 'Space']), player);
  const beforeWall = strider.root.position.z;
  for (let index = 0; index < 10; index += 1) manager.updateMount(0.05, new Set(['KeyW']), player);
  assert.ok(strider.root.position.z <= 5);
  assert.ok(strider.root.position.z >= beforeWall - 0.05);
  assert.ok(strider.root.position.y < 25);
});

test('living Shadow Dens spawn bounded Duskling packs with shared alert pursuit', () => {
  const den = { key: 'shadow-den:test', x: 20, y: 21, z: 0 };
  let denAlive = true;
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'plains' }; },
    getBlock(x, y, z) { return denAlive && Math.floor(x) === den.x && Math.floor(y) === den.y && Math.floor(z) === den.z ? BLOCK.SHADOW_DEN : BLOCK.AIR; },
    shadowDensNear() { return [den]; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  const messages = [];
  const manager = new EntityManager(new THREE.Scene(), world, player, 1304, { onMessage: (message) => messages.push(message) });
  const pack = manager.spawnPackAtDen(den);
  assert.ok(pack.length >= 2 && pack.length <= 4);
  assert.ok(pack.every((entity) => entity.type === 'duskling' && entity.packId === den.key && entity.denKey === den.key));
  assert.equal(manager.spawnPackAtDen(den).length, 0);
  assert.ok(messages.some((message) => message.includes('Duskling pack')));

  assert.equal(manager.attack(pack[0], 1), true);
  assert.ok(pack.every((entity) => entity.alertTimer === 12));
  const follower = pack[1];
  const before = follower.root.position.distanceTo(player.position);
  manager.spawnTimer = 999;
  manager.update(0.1, 0);
  assert.ok(follower.root.position.distanceTo(player.position) < before);
  assert.ok(pack.every((entity) => entity.alertTimer > 6));

  manager.update(0.1, 1);
  assert.ok(pack.every((entity) => !manager.byId.has(entity.id)));
  denAlive = false;
  manager.time = 100;
  assert.equal(manager.spawnPackAtDen(den).length, 0);
});

test('den and roaming night spawns share one authoritative hostile population cap', () => {
  const den = { key: 'shadow-den:cap', x: 20, y: 21, z: 0 };
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'plains' }; },
    getBlock(x, y, z) { return Math.floor(x) === den.x && Math.floor(y) === den.y && Math.floor(z) === den.z ? BLOCK.SHADOW_DEN : BLOCK.AIR; },
    shadowDensNear() { return [den]; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  const manager = new EntityManager(new THREE.Scene(), world, player, 1405);
  for (let index = 0; index < 7; index += 1) manager.spawn('duskling', 12 + index, 4);
  assert.equal(manager.spawnPackAtDen(den).length, 0, 'one remaining slot cannot create a partial pack');
  assert.equal(manager.entities.length, 7);
  manager.spawnTimer = 0;
  manager.update(0.1, 0);
  assert.ok(manager.entities.filter((entity) => entity.definition.hostile && !entity.definition.aquatic).length <= 8);
});

test('Shadow Den rituals summon one persistent daylight-safe Hollow Warden', () => {
  const den = { x: 15, y: 21, z: 0 };
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'plains' }; },
    getBlock(x, y, z) { return Math.floor(x) === den.x && Math.floor(y) === den.y && Math.floor(z) === den.z ? BLOCK.SHADOW_DEN : BLOCK.AIR; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  const messages = [];
  const manager = new EntityManager(new THREE.Scene(), world, player, 1506, { onMessage: (message) => messages.push(message) });
  const boss = manager.summonBossAt(den);
  assert.ok(boss);
  assert.equal(boss.type, 'hollow_warden');
  assert.equal(boss.persistent, true);
  assert.equal(manager.summonBossAt(den), null);
  assert.equal(manager.activeBoss().entity, boss);
  assert.ok(messages.some((message) => message.includes('Hollow Warden')));
  const saved = manager.serialize();
  assert.ok(saved.some((record) => record.type === 'hollow_warden'));
  manager.spawnTimer = 999;
  manager.update(0.1, 1);
  assert.ok(manager.byId.has(boss.id), 'bosses must survive daylight');
});

test('the Hollow Warden enrages at half health, calls guards, and upgrades its attacks', () => {
  const den = { x: 12, y: 21, z: 0 };
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'plains' }; },
    getBlock(x, y, z) { return Math.floor(x) === den.x && Math.floor(y) === den.y && Math.floor(z) === den.z ? BLOCK.SHADOW_DEN : BLOCK.AIR; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  const shots = [];
  const drops = [];
  const defeats = [];
  const manager = new EntityManager(new THREE.Scene(), world, player, 1607, {
    onRangedAttack: (entity, stats) => shots.push({ entity, stats }),
    onDrop: (id, count) => drops.push({ id, count }),
    onDefeat: (type, amount) => defeats.push({ type, amount }),
  });
  manager.spawnTimer = 999;
  const boss = manager.summonBossAt(den);
  boss.root.position.set(0, 21, 10);
  boss.attackCooldown = 0;
  manager.update(0.05, 0);
  assert.equal(shots.at(-1).stats.damage, 5);
  boss.hurtTimer = 0;
  assert.equal(manager.attack(boss, CREATURES.hollow_warden.health / 2), true);
  assert.equal(boss.phaseTriggered, true);
  const guards = manager.entities.filter((entity) => entity.packId === `warden:${boss.id}`);
  assert.equal(guards.length, 2);
  assert.ok(guards.every((guard) => guard.alertTimer === 18));
  boss.attackCooldown = 0;
  boss.hurtTimer = 0;
  manager.update(0.05, 0);
  assert.equal(shots.at(-1).stats.damage, 7);
  assert.ok(shots.at(-1).stats.cooldown < CREATURES.hollow_warden.ranged.cooldown);
  assert.equal(manager.activeBoss().enraged, true);

  boss.hurtTimer = 0;
  assert.equal(manager.attack(boss, 999), true);
  assert.equal(manager.activeBoss(), null);
  assert.deepEqual(defeats, [{ type: 'hollow_warden', amount: 35 }]);
  assert.ok(drops.some((drop) => drop.id === 'warden_core' && drop.count === 1));
  assert.ok(drops.some((drop) => drop.id === 'voidglass_shard' && drop.count >= 2));
});

test('Hearthsteads receive three stable persistent scheduled Wayfarer residents', () => {
  const stead = { key: 'hearthstead:1,0', originX: 12, originZ: 4, ground: 20 };
  const world = {
    terrainHeight() { return 20; },
    biomeAt() { return { id: 'plains' }; },
    hearthsteadsNear() { return [stead]; },
    hearthsteadFeatures() { return { trader: { x: 14.5, y: 21, z: 2.5 } }; },
  };
  const player = { position: new THREE.Vector3(0, 21, 0) };
  const manager = new EntityManager(new THREE.Scene(), world, player, 1708);
  assert.equal(manager.ensureHearthsteadResidents(), 3);
  assert.equal(manager.ensureHearthsteadResidents(), 0);
  const resident = manager.entities[0];
  assert.equal(resident.type, 'wayfarer');
  assert.equal(resident.settlementKey, `${stead.key}:resident:0`);
  assert.equal(resident.residenceKey, stead.key);
  assert.equal(resident.persistent, true);
  assert.equal(resident.homeX, stead.originX);
  assert.deepEqual(manager.entities.map((entity) => entity.residentSlot), [0, 1, 2]);
  assert.equal(new Set(manager.entities.map((entity) => entity.settlementKey)).size, 3);
  const restored = new EntityManager(new THREE.Scene(), world, player, 1708);
  assert.equal(restored.restore(manager.serialize()), 3);
  assert.equal(restored.entities[0].settlementKey, `${stead.key}:resident:0`);
  assert.equal(restored.entities[0].profession, resident.profession);
});

test('Wayfarers follow deterministic daily schedule targets and close trade while resting', () => {
  const stead = { key: 'hearthstead:4,2', originX: 12, originZ: 4, ground: 20 };
  const features = {
    trader: { x: 14, y: 21, z: 4 }, home: { x: 7, y: 21, z: 2 }, workshop: { x: 17, y: 21, z: 6 },
    railYard: { x: 20, y: 21, z: 3 }, garden: { x: 4, y: 21, z: 5 }, lantern: { x: 12, y: 23, z: 4 },
  };
  const world = {
    terrainHeight() { return 20; }, biomeAt() { return { id: 'plains' }; }, hearthsteadsNear() { return [stead]; },
    hearthsteadFeatures() { return features; },
  };
  const player = { position: new THREE.Vector3(12, 21, 4), inWater: false };
  const manager = new EntityManager(new THREE.Scene(), world, player, 2109);
  manager.ensureHearthsteadResidents();
  manager.spawnTimer = 99;
  const resident = manager.entities[0];
  manager.update(0.05, 0.8, 0.1);
  assert.equal(resident.schedulePhase, 'rest');
  assert.equal(resident.scheduleTradingOpen, false);
  manager.update(0.05, 0.8, 0.72);
  assert.equal(resident.schedulePhase, 'market');
  assert.equal(resident.scheduleTradingOpen, true);
  assert.equal(resident.profession, offersForTrader(2109, `${stead.key}:resident:0`).profession);
});
