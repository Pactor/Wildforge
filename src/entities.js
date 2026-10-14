import * as THREE from 'three';
import { BLOCK, BLOCKS, isLiquidBlock, isWaterBlock } from './blocks.js';
import { coordinateRandom } from './noise.js';
import { SEA_LEVEL, WORLD_HEIGHT, WORLD_MIN_Y } from './world.js';
import { offersForTrader, wayfarerSchedule } from './trading.js';

const validCreaturePersistentKey = (value) => typeof value === 'string' && value.length > 0 && value.length <= 80 && /^[a-z0-9:_-]+$/i.test(value);

export const CREATURES = Object.freeze({
  grazer: {
    name: 'Mossback Grazer',
    health: 8,
    experience: 2,
    speed: 1.15,
    hostile: false,
    biomes: ['plains', 'forest'],
    drop: { id: 'raw_meat', min: 1, max: 2 },
    extraDrops: [{ id: 'mosswool', min: 0, max: 2 }, { id: 'tough_hide', min: 0, max: 2 }],
    breedItem: 'wheat',
  },
  bramblehen: {
    name: 'Bramblehen',
    health: 5,
    experience: 1,
    speed: 1.05,
    hostile: false,
    biomes: ['plains', 'forest'],
    drop: { id: 'raw_bramble', min: 1, max: 1 },
    extraDrops: [{ id: 'bramble_feather', min: 0, max: 2 }],
    breedItem: 'wheat_seeds',
    eggLayer: { item: 'bramble_egg', minimum: 240, maximum: 480 },
  },
  duskling: {
    name: 'Duskling',
    health: 12,
    experience: 5,
    speed: 1.75,
    hostile: true,
    biomes: ['plains', 'forest', 'desert', 'snowy_highlands'],
    damage: 3,
    drop: { id: 'shadow_shard', min: 0, max: 2 },
  },
  hushpod: {
    name: 'Hushpod',
    health: 12,
    experience: 7,
    speed: 1.35,
    hostile: true,
    biomes: ['plains', 'forest'],
    damage: 3,
    volatile: { triggerRange: 3, cancelRange: 5.25, fuse: 1.8, radius: 3.2, maximumDamage: 10 },
    drop: { id: 'hush_resin', min: 1, max: 2 },
  },
  briarweaver: {
    name: 'Briarweaver',
    health: 16,
    experience: 8,
    speed: 1.72,
    hostile: true,
    biomes: ['plains', 'forest'],
    damage: 3,
    pounce: { minimumRange: 2.2, maximumRange: 6.5, windup: 0.45, duration: 0.42, apex: 2.15, cooldown: 3.2, damage: 4 },
    drop: { id: 'night_silk', min: 1, max: 2 },
  },
  mireglob: {
    name: 'Mireglob',
    health: 18,
    experience: 7,
    speed: 1.4,
    hostile: true,
    subterranean: true,
    daylightSafe: true,
    biomes: ['rootbound_hollow'],
    damage: 2,
    hopper: { duration: 0.48, interval: 1.05, height: 0.5, speedMultiplier: 1.65, damage: 3 },
    splitter: {
      defaultSize: 2,
      maximumSize: 3,
      children: 2,
      dropsAtSize: 1,
      healthBySize: [4, 9, 18],
      experienceBySize: [1, 3, 7],
      scaleBySize: [0.52, 0.78, 1.08],
    },
    drop: { id: 'glob_resin', min: 1, max: 2 },
  },
  sandstrider: {
    name: 'Sandstrider',
    health: 10,
    experience: 3,
    speed: 1.3,
    hostile: false,
    biomes: ['desert'],
    drop: { id: 'raw_meat', min: 1, max: 2 },
    extraDrops: [{ id: 'tough_hide', min: 1, max: 2 }],
    tameItem: 'amberroot',
    bondRequired: 3,
    mountable: true,
    rideSpeed: 7.4,
  },
  frostfang: {
    name: 'Frostfang',
    health: 16,
    experience: 7,
    speed: 2.05,
    hostile: true,
    biomes: ['snowy_highlands'],
    damage: 4,
    drop: { id: 'frost_fang', min: 0, max: 2 },
  },
  reefglider: {
    name: 'Reefglider',
    health: 6,
    experience: 2,
    speed: 1.55,
    hostile: false,
    aquatic: true,
    biomes: ['plains', 'forest', 'desert', 'snowy_highlands'],
    drop: { id: 'raw_silverfin', min: 1, max: 2 },
    extraDrops: [{ id: 'tidefiber', min: 0, max: 1 }],
  },
  gloomfin: {
    name: 'Gloomfin',
    health: 11,
    experience: 6,
    speed: 2.15,
    hostile: true,
    aquatic: true,
    biomes: ['plains', 'forest', 'desert', 'snowy_highlands'],
    damage: 3,
    drop: { id: 'raw_silverfin', min: 0, max: 1 },
    extraDrops: [{ id: 'shadow_shard', min: 0, max: 1 }],
  },
  thorncaster: {
    name: 'Thorncaster',
    health: 14,
    experience: 8,
    speed: 1.4,
    hostile: true,
    biomes: ['plains', 'forest'],
    damage: 2,
    ranged: { damage: 3, speed: 11.5, gravity: 1.1, range: 15, minimumRange: 5, cooldown: 2.4 },
    drop: { id: 'thorn_spine', min: 1, max: 2 },
    extraDrops: [{ id: 'windfiber', min: 0, max: 1 }],
  },
  hollow_warden: {
    name: 'Hollow Warden',
    health: 96,
    experience: 35,
    speed: 1.28,
    hostile: true,
    boss: true,
    biomes: ['plains', 'forest'],
    damage: 6,
    ranged: { damage: 5, speed: 10, gravity: 0.65, range: 21, minimumRange: 6, cooldown: 3.2, color: 0xb17be8, projectileScale: 1.65 },
    drop: { id: 'warden_core', min: 1, max: 1 },
    extraDrops: [{ id: 'voidglass_shard', min: 2, max: 3 }, { id: 'shadow_shard', min: 4, max: 6 }],
  },
  wayfarer: {
    name: 'Hearthstead Wayfarer',
    health: 20,
    experience: 0,
    speed: 1.05,
    hostile: false,
    resident: true,
    biomes: ['plains', 'forest'],
    drop: { id: 'hearthmark', min: 0, max: 0 },
  },
  emberfox: {
    name: 'Emberfox',
    health: 12,
    experience: 3,
    speed: 2.25,
    hostile: false,
    companion: true,
    biomes: ['forest'],
    damage: 3,
    tameItem: 'seared_ashcap',
    bondRequired: 3,
    breedItem: 'seared_ashcap',
    drop: { id: 'tough_hide', min: 0, max: 1 },
  },
  echo_sentinel: {
    name: 'Echo Sentinel',
    health: 38,
    experience: 18,
    speed: 0.1,
    hostile: true,
    dungeon: true,
    stationary: true,
    biomes: ['plains', 'forest', 'desert', 'snowy_highlands'],
    damage: 2,
    ranged: { damage: 4, speed: 9.5, gravity: 0.25, range: 18, minimumRange: 2, cooldown: 1.85, color: 0x70e8dd, projectileScale: 1.2 },
    drop: { id: 'echo_core', min: 1, max: 1 },
    extraDrops: [{ id: 'lumen_shard', min: 2, max: 4 }, { id: 'voidglass_shard', min: 0, max: 1 }],
  },
  ashhopper: {
    name: 'Ashhopper',
    health: 14,
    experience: 4,
    speed: 1.55,
    hostile: false,
    biomes: ['cinderreach'],
    lowTerrain: true,
    daylightSafe: true,
    drop: { id: 'ashscale', min: 1, max: 2 },
    extraDrops: [{ id: 'cinder_shard', min: 0, max: 1 }],
    breedItem: 'emberbulb',
  },
  riftstalker: {
    name: 'Riftstalker',
    health: 26,
    experience: 12,
    speed: 1.95,
    hostile: true,
    biomes: ['cinderreach'],
    lowTerrain: true,
    daylightSafe: true,
    damage: 5,
    drop: { id: 'ember_gland', min: 1, max: 1 },
    extraDrops: [{ id: 'ashscale', min: 0, max: 2 }],
  },
  emberwing: {
    name: 'Emberwing',
    health: 18,
    experience: 9,
    speed: 2.65,
    hostile: true,
    flying: true,
    biomes: ['cinderreach'],
    lowTerrain: true,
    daylightSafe: true,
    damage: 4,
    drop: { id: 'ember_membrane', min: 1, max: 2 },
    extraDrops: [{ id: 'cinder_shard', min: 0, max: 1 }],
  },
  sunmoth: {
    name: 'Sunmoth',
    health: 5,
    experience: 1,
    speed: 2.05,
    hostile: false,
    flying: true,
    pollinator: true,
    biomes: ['plains', 'forest'],
    drop: { id: 'sunpetal_dye', min: 0, max: 1 },
    breedItem: BLOCK.SUNPETAL,
  },
  hearthguard: {
    name: 'Hearthguard',
    health: 60,
    experience: 0,
    speed: 0.95,
    hostile: false,
    guardian: true,
    constructed: true,
    biomes: ['plains', 'forest', 'desert', 'snowy_highlands', 'cinderreach'],
    damage: 9,
    attackInterval: 1.15,
    attackReach: 1.9,
    attackKnockback: 3.8,
    drop: { id: 'iron_ingot', min: 2, max: 4 },
    extraDrops: [{ id: BLOCK.HEARTHGUARD_CORE, min: 1, max: 1 }],
  },
});

const BODY_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);

// Creature meshes are authored looking down local -Z, while simulation
// headings use +Z as zero. Keeping that conversion explicit prevents every
// model from appearing to travel backwards.
export function entityVisualYaw(heading) {
  return (Number(heading) || 0) + Math.PI;
}

function material(color) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

function part(parent, name, scale, position, color) {
  const mesh = new THREE.Mesh(BODY_GEOMETRY, material(color));
  mesh.name = name;
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function createGrazerModel() {
  const root = new THREE.Group();
  root.name = 'Mossback Grazer';
  part(root, 'body-front', [0.66, 0.68, 0.72], [0, 0.98, -0.28], 0x968f6b);
  part(root, 'body-rear', [0.72, 0.64, 0.72], [0, 0.96, 0.38], 0x878362);
  const moss = part(root, 'moss', [0.64, 0.18, 1.06], [0, 1.38, 0.05], 0x557c43);
  part(root, 'head', [0.58, 0.58, 0.58], [0, 1.06, -0.58], 0xa29a72);
  part(root, 'snout', [0.42, 0.26, 0.28], [0, 0.94, -0.92], 0x766f58);
  for (const side of [-1, 1]) {
    part(root, side < 0 ? 'ear-left' : 'ear-right', [0.2, 0.18, 0.12], [side * 0.31, 1.28, -0.58], 0x766f58);
    part(root, side < 0 ? 'horn-left' : 'horn-right', [0.09, 0.24, 0.09], [side * 0.2, 1.48, -0.55], 0xc9c09a);
  }
  const legs = [
    [-0.26, 0.42, -0.32], [0.26, 0.42, -0.32],
    [-0.26, 0.42, 0.38], [0.26, 0.42, 0.38],
  ].map((position, index) => {
    const leg = part(root, `leg-${index}`, [0.16, 0.66, 0.16], position, 0x625d49);
    part(leg, `hoof-${index}`, [1.18, 0.22, 1.42], [0, -0.43, -0.04], 0x393830);
    return leg;
  });
  part(root, 'tail-stem', [0.1, 0.1, 0.42], [0, 1.13, 0.82], 0x625d49).rotation.x = -0.35;
  part(root, 'tail-tuft', [0.2, 0.2, 0.2], [0, 1.0, 1.04], 0x557c43);
  root.userData.legs = legs;
  root.userData.harvestLayer = moss;
  return root;
}

function createDusklingModel() {
  const root = new THREE.Group();
  root.name = 'Duskling';
  part(root, 'body', [0.62, 1.0, 0.34], [0, 1.1, 0], 0x303044);
  part(root, 'head', [0.56, 0.56, 0.52], [0, 1.88, -0.03], 0x45415c);
  part(root, 'eye-left', [0.1, 0.1, 0.04], [-0.14, 1.92, -0.3], 0xa98bdf);
  part(root, 'eye-right', [0.1, 0.1, 0.04], [0.14, 1.92, -0.3], 0xa98bdf);
  const legs = [
    [-0.18, 0.4, 0], [0.18, 0.4, 0],
  ].map((position, index) => part(root, `leg-${index}`, [0.2, 0.8, 0.24], position, 0x242435));
  part(root, 'arm-left', [0.18, 0.85, 0.2], [-0.42, 1.08, 0], 0x38364d);
  part(root, 'arm-right', [0.18, 0.85, 0.2], [0.42, 1.08, 0], 0x38364d);
  root.userData.legs = legs;
  return root;
}

function createHushpodModel() {
  const root = new THREE.Group();
  root.name = 'Hushpod';
  const shell = part(root, 'moss-shell', [0.86, 1.08, 0.72], [0, 0.98, 0], 0x344b38);
  part(root, 'bark-mask', [0.62, 0.58, 0.5], [0, 1.22, -0.3], 0x4d4938);
  const core = part(root, 'hush-core', [0.3, 0.5, 0.12], [0, 0.94, -0.43], 0x9ccf62);
  part(root, 'eye-left', [0.08, 0.08, 0.04], [-0.14, 1.35, -0.57], 0xd4ed8a);
  part(root, 'eye-right', [0.08, 0.08, 0.04], [0.14, 1.35, -0.57], 0xd4ed8a);
  for (const [x, rotation] of [[-0.26, -0.36], [0, 0.08], [0.26, 0.36]]) {
    const frond = part(root, 'crown-frond', [0.15, 0.58, 0.16], [x, 1.77, 0], 0x647b43);
    frond.rotation.z = rotation;
  }
  const legs = [
    [-0.28, 0.3, -0.18], [0.28, 0.3, -0.18], [-0.28, 0.3, 0.2], [0.28, 0.3, 0.2],
  ].map((position, index) => part(root, `root-leg-${index}`, [0.18, 0.52, 0.2], position, 0x29372b));
  root.userData.legs = legs;
  root.userData.volatileCore = core;
  root.userData.volatileShell = shell;
  root.userData.volatileShellBase = shell.scale.clone();
  return root;
}

function createBriarweaverModel() {
  const root = new THREE.Group();
  root.name = 'Briarweaver';
  const body = part(root, 'woven-body', [1.02, 0.5, 0.84], [0, 0.66, 0.18], 0x3d353d);
  part(root, 'briar-back', [0.72, 0.22, 0.72], [0, 1.02, 0.24], 0x554251);
  part(root, 'mask', [0.58, 0.48, 0.52], [0, 0.72, -0.52], 0x4b4245);
  for (const [x, y] of [[-0.16, 0.8], [0.16, 0.8], [-0.24, 0.66], [0.24, 0.66]]) {
    part(root, 'silk-eye', [0.075, 0.075, 0.04], [x, y, -0.8], 0xb8e5a1);
  }
  const spinner = part(root, 'silk-spinner', [0.3, 0.22, 0.18], [0, 0.65, 0.72], 0xc6c2ad);
  const legs = [];
  for (let index = 0; index < 8; index += 1) {
    const side = index % 2 ? 1 : -1;
    const row = Math.floor(index / 2);
    const z = -0.36 + row * 0.28;
    const leg = part(root, `briar-leg-${index}`, [0.72, 0.13, 0.15], [side * 0.72, 0.48, z], 0x2e2930);
    leg.rotation.z = side * (0.18 + (row === 0 || row === 3 ? 0.12 : 0));
    leg.rotation.y = side * ((row - 1.5) * 0.13);
    legs.push(leg);
  }
  root.userData.legs = legs;
  root.userData.pounceBody = body;
  root.userData.pounceBodyBase = body.scale.clone();
  root.userData.silkSpinner = spinner;
  root.userData.silkSpinnerBase = spinner.scale.clone();
  return root;
}

function createMireglobModel() {
  const root = new THREE.Group();
  root.name = 'Mireglob';
  const body = new THREE.Group();
  body.name = 'mire-body';
  root.add(body);
  part(body, 'glob-core', [1.12, 0.84, 1.02], [0, 0.5, 0], 0x567652);
  part(body, 'root-mantle', [0.82, 0.26, 0.88], [0, 0.93, 0.05], 0x405a40);
  part(body, 'belly', [0.72, 0.38, 0.22], [0, 0.45, -0.5], 0x76906a);
  part(body, 'eye-left', [0.13, 0.13, 0.06], [-0.24, 0.66, -0.58], 0xd8e8a8);
  part(body, 'eye-right', [0.13, 0.13, 0.06], [0.24, 0.66, -0.58], 0xd8e8a8);
  part(body, 'pupil-left', [0.055, 0.075, 0.03], [-0.24, 0.65, -0.63], 0x28352b);
  part(body, 'pupil-right', [0.055, 0.075, 0.03], [0.24, 0.65, -0.63], 0x28352b);
  for (const [x, z, rotation] of [[-0.33, 0.05, -0.28], [0.33, 0.12, 0.24], [-0.12, 0.31, -0.08]]) {
    const sprout = part(body, 'root-sprout', [0.12, 0.38, 0.12], [x, 1.18, z], 0x78905b);
    sprout.rotation.z = rotation;
  }
  root.userData.legs = [];
  root.userData.globBody = body;
  return root;
}

function createSandstriderModel() {
  const root = new THREE.Group();
  root.name = 'Sandstrider';
  part(root, 'body', [0.66, 0.5, 1.18], [0, 0.9, 0], 0xb9793f);
  part(root, 'shell-front', [0.72, 0.3, 0.56], [0, 1.22, -0.22], 0x965f38);
  part(root, 'shell-rear', [0.72, 0.32, 0.58], [0, 1.2, 0.36], 0x805031);
  part(root, 'head', [0.46, 0.42, 0.48], [0, 0.96, -0.58], 0xd09250);
  part(root, 'eye-left', [0.08, 0.08, 0.04], [-0.12, 1.02, -0.83], 0x2b211b);
  part(root, 'eye-right', [0.08, 0.08, 0.04], [0.12, 1.02, -0.83], 0x2b211b);
  const legs = [];
  for (let index = 0; index < 6; index += 1) {
    const side = index % 2 ? 1 : -1;
    const z = -0.34 + Math.floor(index / 2) * 0.34;
    const leg = part(root, `leg-${index}`, [0.44, 0.12, 0.12], [side * 0.5, 0.68, z], 0x70452d);
    part(root, `lower-leg-${index}`, [0.12, 0.46, 0.12], [side * 0.76, 0.38, z], 0x503324);
    legs.push(leg);
  }
  root.userData.legs = legs;
  const saddle = new THREE.Group();
  saddle.name = 'Trail Saddle';
  part(saddle, 'seat', [0.72, 0.14, 0.54], [0, 1.48, 0.08], 0x6f432e);
  part(saddle, 'front-roll', [0.68, 0.22, 0.12], [0, 1.58, -0.16], 0xa16a3f);
  part(saddle, 'rear-roll', [0.68, 0.2, 0.12], [0, 1.56, 0.34], 0xa16a3f);
  part(saddle, 'left-strap', [0.08, 0.46, 0.12], [-0.39, 1.28, 0.1], 0x473126);
  part(saddle, 'right-strap', [0.08, 0.46, 0.12], [0.39, 1.28, 0.1], 0x473126);
  saddle.visible = false;
  root.add(saddle);
  root.userData.saddle = saddle;
  return root;
}

function createFrostfangModel() {
  const root = new THREE.Group();
  root.name = 'Frostfang';
  part(root, 'body-front', [0.58, 0.6, 0.7], [0, 0.98, -0.24], 0xb9d4dc);
  part(root, 'body-rear', [0.62, 0.56, 0.7], [0, 0.94, 0.4], 0xaecbd3);
  part(root, 'back', [0.52, 0.2, 1.0], [0, 1.36, 0.08], 0xe3eef0);
  part(root, 'head', [0.58, 0.6, 0.55], [0, 1.18, -0.58], 0xd5e6e9);
  part(root, 'snout', [0.36, 0.28, 0.34], [0, 1.08, -0.92], 0x91b5c0);
  part(root, 'ear-left', [0.18, 0.32, 0.16], [-0.19, 1.62, -0.53], 0x7fa7b4);
  part(root, 'ear-right', [0.18, 0.32, 0.16], [0.19, 1.62, -0.53], 0x7fa7b4);
  part(root, 'eye-left', [0.09, 0.09, 0.04], [-0.14, 1.25, -0.87], 0x4b78a5);
  part(root, 'eye-right', [0.09, 0.09, 0.04], [0.14, 1.25, -0.87], 0x4b78a5);
  part(root, 'fang-left', [0.07, 0.18, 0.07], [-0.11, 0.94, -1.08], 0xf2f7f4);
  part(root, 'fang-right', [0.07, 0.18, 0.07], [0.11, 0.94, -1.08], 0xf2f7f4);
  const legs = [
    [-0.23, 0.42, -0.28], [0.23, 0.42, -0.28], [-0.23, 0.42, 0.38], [0.23, 0.42, 0.38],
  ].map((position, index) => {
    const leg = part(root, `leg-${index}`, [0.16, 0.68, 0.17], position, 0x8bb0bb);
    part(leg, `paw-${index}`, [1.35, 0.2, 1.55], [0, -0.43, -0.08], 0x739aa7);
    return leg;
  });
  const tail = part(root, 'tail', [0.18, 0.18, 0.72], [0, 1.15, 0.73], 0xa5c6ce);
  tail.rotation.x = -0.65;
  root.userData.legs = legs;
  return root;
}

function createFishModel(name, bodyColor, finColor, eyeColor, hostile = false) {
  const root = new THREE.Group();
  root.name = name;
  part(root, 'body', hostile ? [0.7, 0.55, 1.3] : [0.62, 0.48, 1.12], [0, 0, 0], bodyColor);
  part(root, 'snout', [0.44, 0.34, 0.34], [0, -0.02, -0.72], hostile ? 0x3b5267 : 0x75b7ad);
  part(root, 'eye-left', [0.08, 0.08, 0.04], [-0.24, 0.13, -0.56], eyeColor);
  part(root, 'eye-right', [0.08, 0.08, 0.04], [0.24, 0.13, -0.56], eyeColor);
  const tailTop = part(root, 'tail-top', [0.1, 0.48, 0.58], [0, 0.2, 0.85], finColor);
  tailTop.rotation.x = -0.42;
  const tailBottom = part(root, 'tail-bottom', [0.1, 0.48, 0.58], [0, -0.2, 0.85], finColor);
  tailBottom.rotation.x = 0.42;
  const leftFin = part(root, 'fin-left', [0.48, 0.08, 0.5], [-0.48, -0.05, 0.08], finColor);
  leftFin.rotation.z = -0.32;
  const rightFin = part(root, 'fin-right', [0.48, 0.08, 0.5], [0.48, -0.05, 0.08], finColor);
  rightFin.rotation.z = 0.32;
  if (hostile) part(root, 'lure', [0.09, 0.09, 0.09], [0, 0.52, -0.42], 0x78d7d0);
  root.userData.legs = [];
  root.userData.swimParts = [tailTop, tailBottom, leftFin, rightFin];
  return root;
}

function createThorncasterModel() {
  const root = new THREE.Group();
  root.name = 'Thorncaster';
  part(root, 'trunk', [0.58, 1.15, 0.5], [0, 1.02, 0], 0x4d5e3f);
  part(root, 'crown', [0.78, 0.62, 0.68], [0, 1.72, -0.05], 0x667b4e);
  part(root, 'eye-left', [0.1, 0.1, 0.04], [-0.18, 1.78, -0.4], 0xf0a45c);
  part(root, 'eye-right', [0.1, 0.1, 0.04], [0.18, 1.78, -0.4], 0xf0a45c);
  const leftArm = part(root, 'branch-left', [0.18, 0.8, 0.18], [-0.48, 1.15, -0.03], 0x6f5536);
  const rightArm = part(root, 'branch-right', [0.18, 0.8, 0.18], [0.48, 1.15, -0.03], 0x6f5536);
  leftArm.rotation.z = -0.45;
  rightArm.rotation.z = 0.45;
  for (const [x, y, z, rotation] of [[-0.36, 1.5, 0, -0.6], [0.36, 1.5, 0, 0.6], [0, 2.12, 0, 0]]) {
    const thorn = part(root, 'thorn', [0.12, 0.42, 0.12], [x, y, z], 0xa6b769);
    thorn.rotation.z = rotation;
  }
  const legs = [
    [-0.2, 0.4, 0], [0.2, 0.4, 0],
  ].map((position, index) => part(root, `root-leg-${index}`, [0.22, 0.72, 0.25], position, 0x3d4934));
  root.userData.legs = legs;
  return root;
}

function createHollowWardenModel() {
  const root = new THREE.Group();
  root.name = 'Hollow Warden';
  part(root, 'root-body', [1.38, 1.48, 0.92], [0, 1.28, 0.05], 0x3e4439);
  part(root, 'stone-mantle', [1.72, 0.48, 1.02], [0, 1.98, 0.02], 0x626269);
  part(root, 'hollow-mask', [0.92, 0.82, 0.66], [0, 2.32, -0.38], 0x77757d);
  part(root, 'eye-left', [0.14, 0.14, 0.05], [-0.24, 2.38, -0.73], 0xc28df4);
  part(root, 'eye-right', [0.14, 0.14, 0.05], [0.24, 2.38, -0.73], 0xc28df4);
  const core = part(root, 'warden-core', [0.34, 0.46, 0.18], [0, 1.4, -0.55], 0xb17be8);
  part(root, 'left-arm', [0.42, 1.38, 0.42], [-0.92, 1.3, 0], 0x4a5141).rotation.z = -0.18;
  part(root, 'right-arm', [0.42, 1.38, 0.42], [0.92, 1.3, 0], 0x4a5141).rotation.z = 0.18;
  const legs = [
    part(root, 'left-root', [0.48, 0.92, 0.5], [-0.42, 0.42, 0.12], 0x353b32),
    part(root, 'right-root', [0.48, 0.92, 0.5], [0.42, 0.42, 0.12], 0x353b32),
  ];
  for (const side of [-1, 1]) {
    const antler = part(root, `${side < 0 ? 'left' : 'right'}-antler`, [0.18, 1.05, 0.18], [side * 0.38, 3.02, -0.18], 0x4d5548);
    antler.rotation.z = side * -0.34;
    const tine = part(root, `${side < 0 ? 'left' : 'right'}-tine`, [0.52, 0.16, 0.16], [side * 0.62, 3.18, -0.18], 0x596151);
    tine.rotation.z = side * -0.18;
  }
  root.userData.legs = legs;
  root.userData.bossCore = core;
  return root;
}

function createWayfarerModel() {
  const root = new THREE.Group();
  root.name = 'Hearthstead Wayfarer';
  part(root, 'cloak', [0.72, 1.02, 0.46], [0, 0.98, 0], 0x5b7158);
  part(root, 'belt', [0.76, 0.14, 0.5], [0, 0.82, 0], 0x6a4932);
  part(root, 'head', [0.58, 0.58, 0.56], [0, 1.72, -0.02], 0xc5966f);
  part(root, 'nose', [0.16, 0.18, 0.18], [0, 1.68, -0.36], 0xb98463);
  part(root, 'eye-left', [0.07, 0.07, 0.035], [-0.15, 1.79, -0.3], 0x2e2825);
  part(root, 'eye-right', [0.07, 0.07, 0.035], [0.15, 1.79, -0.3], 0x2e2825);
  part(root, 'hat-brim', [0.88, 0.12, 0.72], [0, 2.02, 0], 0x705441);
  part(root, 'hat-crown', [0.5, 0.38, 0.48], [0, 2.21, 0.04], 0x87684d);
  part(root, 'satchel', [0.38, 0.48, 0.22], [0.47, 1.02, 0.16], 0xa77842);
  part(root, 'arm-left', [0.17, 0.72, 0.18], [-0.46, 1.15, -0.02], 0x4f654f);
  part(root, 'arm-right', [0.17, 0.72, 0.18], [0.46, 1.15, -0.02], 0x4f654f);
  const legs = [
    part(root, 'left-leg', [0.22, 0.68, 0.24], [-0.2, 0.38, 0], 0x403d43),
    part(root, 'right-leg', [0.22, 0.68, 0.24], [0.2, 0.38, 0], 0x403d43),
  ];
  root.userData.legs = legs;
  return root;
}

function createEmberfoxModel() {
  const root = new THREE.Group();
  root.name = 'Emberfox';
  part(root, 'body-front', [0.48, 0.5, 0.6], [0, 0.76, -0.2], 0xc55f37);
  part(root, 'body-rear', [0.52, 0.46, 0.62], [0, 0.72, 0.34], 0xb95335);
  part(root, 'chest-fluff', [0.5, 0.48, 0.38], [0, 0.83, -0.35], 0xf0aa63);
  part(root, 'head', [0.56, 0.54, 0.52], [0, 1.08, -0.52], 0xd87540);
  part(root, 'snout', [0.34, 0.24, 0.3], [0, 0.98, -0.86], 0xe8a267);
  part(root, 'nose', [0.16, 0.13, 0.08], [0, 1.01, -1.02], 0x30282a);
  for (const side of [-1, 1]) {
    const ear = part(root, side < 0 ? 'ear-left' : 'ear-right', [0.2, 0.42, 0.18], [side * 0.18, 1.48, -0.5], 0x9f4934);
    ear.rotation.z = side * -0.12;
    part(root, side < 0 ? 'eye-left' : 'eye-right', [0.08, 0.08, 0.04], [side * 0.15, 1.14, -0.8], 0xffd46b);
  }
  const legs = [
    [-0.19, 0.34, -0.2], [0.19, 0.34, -0.2], [-0.19, 0.34, 0.32], [0.19, 0.34, 0.32],
  ].map((position, index) => {
    const leg = part(root, `leg-${index}`, [0.14, 0.55, 0.15], position, index < 2 ? 0x7f3b32 : 0xa84832);
    part(leg, `paw-${index}`, [1.3, 0.2, 1.5], [0, -0.36, -0.05], 0x492e2e);
    return leg;
  });
  const tail = part(root, 'ember-tail', [0.28, 0.3, 1.0], [0, 0.9, 0.83], 0xc95b35);
  tail.rotation.x = -0.58;
  part(tail, 'lumen-tip', [0.8, 0.85, 0.32], [0, 0, 0.54], 0xffbd62);
  const collar = part(root, 'bond-collar', [0.58, 0.12, 0.48], [0, 0.99, -0.32], 0x70e8dd);
  collar.visible = false;
  root.userData.legs = legs;
  root.userData.tail = tail;
  root.userData.collar = collar;
  return root;
}

function createEchoSentinelModel() {
  const root = new THREE.Group();
  root.name = 'Echo Sentinel';
  part(root, 'lower-stone', [0.82, 0.34, 0.72], [0, 0.58, 0], 0x46565e);
  part(root, 'floating-body', [0.92, 0.88, 0.72], [0, 1.2, 0], 0x61747b);
  part(root, 'rune-core', [0.34, 0.4, 0.12], [0, 1.24, -0.41], 0x70e8dd);
  part(root, 'mask', [0.68, 0.42, 0.48], [0, 1.78, -0.06], 0x8ca1a7);
  part(root, 'eye-left', [0.11, 0.09, 0.04], [-0.18, 1.8, -0.32], 0xb3fff7);
  part(root, 'eye-right', [0.11, 0.09, 0.04], [0.18, 1.8, -0.32], 0xb3fff7);
  for (const side of [-1, 1]) {
    const shard = part(root, side < 0 ? 'left-orbit' : 'right-orbit', [0.22, 0.68, 0.22], [side * 0.72, 1.18, 0.04], 0x7964a1);
    shard.rotation.z = side * 0.35;
  }
  root.userData.legs = [];
  root.userData.echoCore = root.getObjectByName('rune-core');
  return root;
}

function createAshhopperModel() {
  const root = new THREE.Group();
  root.name = 'Ashhopper';
  part(root, 'ash-body', [0.7, 0.5, 1.08], [0, 0.72, 0.08], 0x62504a);
  part(root, 'ember-belly', [0.58, 0.3, 0.72], [0, 0.57, -0.08], 0xa95635);
  part(root, 'wedge-head', [0.58, 0.46, 0.54], [0, 0.8, -0.62], 0x786059);
  part(root, 'snout', [0.38, 0.22, 0.3], [0, 0.7, -0.95], 0x493c3a);
  part(root, 'eye-left', [0.08, 0.08, 0.04], [-0.15, 0.87, -0.91], 0xffbd62);
  part(root, 'eye-right', [0.08, 0.08, 0.04], [0.15, 0.87, -0.91], 0xffbd62);
  const crystal = part(root, 'cinder-crest', [0.32, 0.5, 0.28], [0, 1.18, 0.12], 0xf28a4f);
  crystal.rotation.z = 0.18;
  const legs = [];
  for (let index = 0; index < 6; index += 1) {
    const side = index % 2 ? 1 : -1;
    const z = -0.34 + Math.floor(index / 2) * 0.34;
    const leg = part(root, `scale-leg-${index}`, [0.34, 0.15, 0.17], [side * 0.62, 0.42, z], 0x403637);
    leg.rotation.z = side * 0.22;
    legs.push(leg);
  }
  root.userData.legs = legs;
  root.userData.cinderCore = crystal;
  return root;
}

function createRiftstalkerModel() {
  const root = new THREE.Group();
  root.name = 'Riftstalker';
  part(root, 'char-body-front', [0.64, 0.6, 0.76], [0, 0.84, -0.24], 0x29262d);
  part(root, 'char-body-rear', [0.68, 0.56, 0.76], [0, 0.8, 0.43], 0x242229);
  part(root, 'ash-mantle', [0.58, 0.2, 1.12], [0, 1.22, 0.08], 0x514047);
  part(root, 'mask', [0.62, 0.58, 0.56], [0, 1.03, -0.64], 0x3c3238);
  part(root, 'jaw', [0.44, 0.24, 0.32], [0, 0.88, -0.97], 0x672f2b);
  part(root, 'eye-left', [0.11, 0.09, 0.04], [-0.17, 1.1, -0.93], 0xff6a3d);
  part(root, 'eye-right', [0.11, 0.09, 0.04], [0.17, 1.1, -0.93], 0xff6a3d);
  const core = part(root, 'rift-core', [0.3, 0.36, 0.16], [0, 0.92, -0.36], 0xf05a35);
  for (const side of [-1, 1]) {
    const horn = part(root, side < 0 ? 'horn-left' : 'horn-right', [0.16, 0.52, 0.16], [side * 0.28, 1.55, -0.52], 0x6d5051);
    horn.rotation.z = side * -0.34;
  }
  const legs = [
    [-0.24, 0.38, -0.25], [0.24, 0.38, -0.25], [-0.24, 0.38, 0.4], [0.24, 0.38, 0.4],
  ].map((position, index) => {
    const leg = part(root, `char-leg-${index}`, [0.17, 0.64, 0.18], position, 0x211f25);
    part(leg, `claw-${index}`, [1.35, 0.18, 1.5], [0, -0.41, -0.08], 0x672f2b);
    return leg;
  });
  const tail = part(root, 'rift-tail', [0.2, 0.2, 0.86], [0, 0.92, 0.82], 0x3a3036);
  tail.rotation.x = -0.5;
  root.userData.legs = legs;
  root.userData.tail = tail;
  root.userData.cinderCore = core;
  return root;
}

function createEmberwingModel() {
  const root = new THREE.Group();
  root.name = 'Emberwing';
  part(root, 'charred-body', [0.72, 0.48, 0.92], [0, 0.82, 0.08], 0x30272c);
  part(root, 'ember-breast', [0.46, 0.3, 0.58], [0, 0.72, -0.37], 0xb84d31);
  part(root, 'wedge-head', [0.5, 0.42, 0.46], [0, 0.94, -0.62], 0x49343a);
  part(root, 'beak', [0.22, 0.16, 0.28], [0, 0.86, -0.98], 0xd66d3c);
  part(root, 'eye-left', [0.08, 0.08, 0.04], [-0.14, 1.01, -0.86], 0xffc15c);
  part(root, 'eye-right', [0.08, 0.08, 0.04], [0.14, 1.01, -0.86], 0xffc15c);
  const core = part(root, 'flight-core', [0.24, 0.28, 0.12], [0, 0.77, -0.5], 0xf26135);
  const wings = [];
  for (const side of [-1, 1]) {
    const fore = part(root, side < 0 ? 'wing-left' : 'wing-right', [1.18, 0.1, 0.62], [side * 0.78, 0.92, -0.02], 0x76514a);
    fore.rotation.y = side * -0.14;
    const rear = part(root, side < 0 ? 'rear-wing-left' : 'rear-wing-right', [0.82, 0.08, 0.52], [side * 0.62, 0.83, 0.48], 0x5c3c3e);
    rear.rotation.y = side * 0.18;
    wings.push({ mesh: fore, side, phase: 0 }, { mesh: rear, side, phase: 0.65 });
  }
  const tail = part(root, 'ember-tail', [0.2, 0.18, 0.72], [0, 0.8, 0.78], 0x5a3437);
  tail.rotation.x = -0.28;
  root.userData.legs = [];
  root.userData.wings = wings;
  root.userData.tail = tail;
  root.userData.cinderCore = core;
  return root;
}

function createBramblehenModel() {
  const root = new THREE.Group();
  root.name = 'Bramblehen';
  part(root, 'bramble-body', [0.72, 0.58, 0.7], [0, 0.7, 0.08], 0x8f6f4d);
  part(root, 'moss-breast', [0.48, 0.4, 0.5], [0, 0.68, -0.3], 0x6f8950);
  part(root, 'head', [0.48, 0.48, 0.46], [0, 1.08, -0.38], 0xa6875b);
  part(root, 'beak', [0.24, 0.16, 0.28], [0, 1.01, -0.73], 0xd9a64b);
  part(root, 'eye-left', [0.07, 0.07, 0.04], [-0.13, 1.14, -0.62], 0x27251f);
  part(root, 'eye-right', [0.07, 0.07, 0.04], [0.13, 1.14, -0.62], 0x27251f);
  const crest = part(root, 'leaf-crest', [0.22, 0.3, 0.18], [0, 1.43, -0.34], 0x557c43);
  crest.rotation.z = 0.18;
  const wings = [];
  for (const side of [-1, 1]) {
    const wing = part(root, side < 0 ? 'wing-left' : 'wing-right', [0.16, 0.42, 0.54], [side * 0.42, 0.76, 0.08], 0x75583f);
    wing.rotation.z = side * 0.08;
    wings.push({ mesh: wing, side });
  }
  const tail = part(root, 'bramble-tail', [0.42, 0.38, 0.18], [0, 0.86, 0.55], 0x596f42);
  tail.rotation.x = -0.35;
  const legs = [
    part(root, 'leg-left', [0.12, 0.48, 0.12], [-0.18, 0.28, 0.02], 0xb98a48),
    part(root, 'leg-right', [0.12, 0.48, 0.12], [0.18, 0.28, 0.02], 0xb98a48),
  ];
  root.userData.legs = legs;
  root.userData.birdWings = wings;
  root.userData.tail = tail;
  return root;
}

function createSunmothModel() {
  const root = new THREE.Group();
  root.name = 'Sunmoth';
  part(root, 'golden-thorax', [0.38, 0.32, 0.48], [0, 0.72, 0], 0xd9a945);
  part(root, 'amber-abdomen', [0.32, 0.3, 0.54], [0, 0.7, 0.42], 0x8e6835);
  part(root, 'sun-band', [0.34, 0.32, 0.12], [0, 0.7, 0.24], 0xf0c85a);
  part(root, 'head', [0.34, 0.32, 0.34], [0, 0.76, -0.38], 0xb7863d);
  part(root, 'eye-left', [0.07, 0.09, 0.04], [-0.1, 0.81, -0.58], 0x2d2922);
  part(root, 'eye-right', [0.07, 0.09, 0.04], [0.1, 0.81, -0.58], 0x2d2922);
  for (const side of [-1, 1]) {
    const antenna = part(root, side < 0 ? 'antenna-left' : 'antenna-right', [0.035, 0.28, 0.035], [side * 0.1, 1.02, -0.48], 0x5f4930);
    antenna.rotation.z = side * -0.28;
  }
  const wings = [];
  for (const side of [-1, 1]) {
    const fore = part(root, side < 0 ? 'wing-left' : 'wing-right', [0.72, 0.06, 0.5], [side * 0.45, 0.86, -0.02], 0xd9e5c4);
    const rear = part(root, side < 0 ? 'rear-wing-left' : 'rear-wing-right', [0.52, 0.05, 0.4], [side * 0.36, 0.82, 0.36], 0xbdd9b4);
    wings.push({ mesh: fore, side, phase: 0 }, { mesh: rear, side, phase: 0.7 });
  }
  const pouch = part(root, 'nectar-pouch', [0.18, 0.16, 0.18], [0, 0.53, 0.18], 0xffcf5d);
  pouch.visible = false;
  root.userData.legs = [];
  root.userData.wings = wings;
  root.userData.nectarPouch = pouch;
  return root;
}

function createHearthguardModel() {
  const root = new THREE.Group();
  root.name = 'Hearthguard';
  part(root, 'iron-torso', [1.05, 1.2, 0.66], [0, 1.45, 0], 0xaeb8b6);
  part(root, 'chest-plate', [0.78, 0.68, 0.12], [0, 1.56, -0.39], 0x74817f);
  const core = part(root, 'hearth-core', [0.28, 0.34, 0.16], [0, 1.58, -0.48], 0xe59a4d);
  part(root, 'shoulder-left', [0.32, 0.34, 0.72], [-0.62, 1.78, 0], 0x879391);
  part(root, 'shoulder-right', [0.32, 0.34, 0.72], [0.62, 1.78, 0], 0x879391);
  const head = part(root, 'helm', [0.72, 0.62, 0.62], [0, 2.32, -0.03], 0xc6cecc);
  head.rotation.y = 0.03;
  part(root, 'brow', [0.58, 0.13, 0.1], [0, 2.43, -0.39], 0x626e6d);
  part(root, 'eye-left', [0.1, 0.09, 0.05], [-0.19, 2.34, -0.46], 0xf4b45b);
  part(root, 'eye-right', [0.1, 0.09, 0.05], [0.19, 2.34, -0.46], 0xf4b45b);
  const arms = [
    part(root, 'hammer-arm-left', [0.34, 1.25, 0.38], [-0.72, 1.12, 0], 0x929d9b),
    part(root, 'hammer-arm-right', [0.34, 1.25, 0.38], [0.72, 1.12, 0], 0x929d9b),
  ];
  part(arms[0], 'left-bracer', [1.18, 0.3, 1.18], [0, -0.44, 0], 0x596563);
  part(arms[1], 'right-bracer', [1.18, 0.3, 1.18], [0, -0.44, 0], 0x596563);
  const legs = [
    part(root, 'leg-left', [0.38, 0.92, 0.44], [-0.29, 0.46, 0], 0x7e8a88),
    part(root, 'leg-right', [0.38, 0.92, 0.44], [0.29, 0.46, 0], 0x7e8a88),
  ];
  part(root, 'back-rune', [0.42, 0.42, 0.08], [0, 1.62, 0.39], 0xc17b3e);
  root.userData.legs = legs;
  root.userData.guardArms = arms;
  root.userData.guardCore = core;
  return root;
}

export function creatureModel(type) {
  if (type === 'bramblehen') return createBramblehenModel();
  if (type === 'duskling') return createDusklingModel();
  if (type === 'hushpod') return createHushpodModel();
  if (type === 'briarweaver') return createBriarweaverModel();
  if (type === 'mireglob') return createMireglobModel();
  if (type === 'sandstrider') return createSandstriderModel();
  if (type === 'frostfang') return createFrostfangModel();
  if (type === 'reefglider') return createFishModel('Reefglider', 0x5aa89c, 0xe2b86f, 0x18313a);
  if (type === 'gloomfin') return createFishModel('Gloomfin', 0x30465d, 0x6b5a83, 0xa6fff2, true);
  if (type === 'thorncaster') return createThorncasterModel();
  if (type === 'hollow_warden') return createHollowWardenModel();
  if (type === 'wayfarer') return createWayfarerModel();
  if (type === 'emberfox') return createEmberfoxModel();
  if (type === 'echo_sentinel') return createEchoSentinelModel();
  if (type === 'ashhopper') return createAshhopperModel();
  if (type === 'riftstalker') return createRiftstalkerModel();
  if (type === 'emberwing') return createEmberwingModel();
  if (type === 'sunmoth') return createSunmothModel();
  if (type === 'hearthguard') return createHearthguardModel();
  return createGrazerModel();
}

export function realmSpawnProfile(biome) {
  if (biome === 'rootbound_hollow') return { passive: [], hostile: ['mireglob'], aquatic: [] };
  return biome === 'cinderreach'
    ? { passive: ['ashhopper'], hostile: ['riftstalker', 'emberwing'], aquatic: [] }
    : { passive: ['grazer', 'sandstrider', 'bramblehen', 'sunmoth'], hostile: ['duskling', 'hushpod', 'briarweaver', 'frostfang', 'thorncaster'], aquatic: ['reefglider', 'gloomfin'] };
}

export function caveSpawnAllowed(world, x, y, z, allowedBiomes = ['rootbound_hollow']) {
  x = Math.floor(Number(x)); y = Math.floor(Number(y)); z = Math.floor(Number(z));
  if (![x, y, z].every(Number.isFinite) || y < 5 || y > 39 || typeof world?.getBlock !== 'function') return false;
  const surface = Number(world.terrainHeight?.(x, z));
  if (!Number.isFinite(surface) || y >= surface - 2) return false;
  const biome = world.undergroundBiomeAt?.(x, y, z)?.id;
  if (!allowedBiomes.includes(biome)) return false;
  const floor = world.getBlock(x, y - 1, z);
  const feet = world.getBlock(x, y, z);
  const head = world.getBlock(x, y + 1, z);
  return Boolean(BLOCKS[floor]?.solid && !isLiquidBlock(floor) && feet === BLOCK.AIR && head === BLOCK.AIR);
}

export function caveSpawnHeight(world, x, z, centerY, allowedBiomes = ['rootbound_hollow']) {
  const center = Math.max(5, Math.min(39, Math.floor(Number(centerY) || 20)));
  const offsets = [0];
  for (let distance = 1; distance <= 12; distance += 1) offsets.push(-distance, distance);
  for (const offset of offsets) {
    const y = center + offset;
    if (caveSpawnAllowed(world, x, y, z, allowedBiomes)) return y;
  }
  return null;
}

export function pounceLandingPlan(world, start, target, options = {}) {
  if (!world || !start || !target) return null;
  const values = [start.x, start.y, start.z, target.x, target.z].map(Number);
  if (!values.every(Number.isFinite)) return null;
  const apex = Math.max(0.75, Math.min(4, Number(options.apex) || 2.15));
  const duration = Math.max(0.2, Math.min(0.8, Number(options.duration) || 0.42));
  const targetSurface = Number(world.terrainHeight?.(Math.floor(target.x), Math.floor(target.z)));
  if (!Number.isFinite(targetSurface) || targetSurface <= 17) return null;
  const end = new THREE.Vector3(target.x, targetSurface + 1, target.z);
  if (Math.abs(end.y - start.y) > 2.1) return null;
  if (typeof world.getBlock === 'function') {
    for (let step = 1; step <= 10; step += 1) {
      const t = step / 10;
      const x = THREE.MathUtils.lerp(start.x, end.x, t);
      const z = THREE.MathUtils.lerp(start.z, end.z, t);
      const y = THREE.MathUtils.lerp(start.y, end.y, t) + Math.sin(t * Math.PI) * apex;
      if ([0.12, 0.72, 1.28].some((offset) => BLOCKS[world.getBlock(Math.floor(x), Math.floor(y + offset), Math.floor(z))]?.solid)) return null;
    }
  }
  return { start: start.clone(), end, apex, duration };
}

function structureWalkSurface(world, x, z, referenceY, fallback) {
  const start = Math.min(SEA_LEVEL + 46, Math.floor(referenceY + 1));
  const end = Math.max(0, Math.floor(referenceY - 4));
  for (let y = start; y >= end; y -= 1) {
    if (!BLOCKS[world.getBlock?.(x, y, z)]?.solid) continue;
    if (BLOCKS[world.getBlock?.(x, y + 1, z)]?.solid || BLOCKS[world.getBlock?.(x, y + 2, z)]?.solid) continue;
    return y;
  }
  return fallback;
}

export function aquaticSpawnHeight(world, x, z, fraction = 0.5) {
  const ground = world.terrainHeight(Math.floor(x), Math.floor(z));
  if (ground > SEA_LEVEL - 2) return null;
  const minimum = ground + 1.15;
  const maximum = SEA_LEVEL - 0.55;
  if (minimum >= maximum) return null;
  return minimum + (maximum - minimum) * Math.max(0, Math.min(1, Number(fraction) || 0));
}

export function hostileSpawnAllowed(world, x, y, z, daylight, maximumLight = 7) {
  if (typeof world?.lightLevelAt !== 'function') return true;
  return world.lightLevelAt(x, y, z, daylight) <= maximumLight;
}

export function companionAttackAllowed(entity, deliberate = false) {
  const protectedAlly = Boolean((entity?.definition?.companion && entity.tamed) || entity?.definition?.guardian);
  return !protectedAlly || Boolean(deliberate);
}

export class EntityManager {
  constructor(scene, world, player, seed, callbacks = {}) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.seed = seed;
    this.onAttackPlayer = callbacks.onAttackPlayer || (() => {});
    this.onDrop = callbacks.onDrop || (() => {});
    this.onMessage = callbacks.onMessage || (() => {});
    this.onBreed = callbacks.onBreed || (() => {});
    this.onProduce = callbacks.onProduce || ((id, count, position) => this.onDrop(id, count, position));
    this.onSound = callbacks.onSound || (() => {});
    this.onRangedAttack = callbacks.onRangedAttack || (() => {});
    this.onVolatilePrime = callbacks.onVolatilePrime || (() => {});
    this.onVolatileDetonate = callbacks.onVolatileDetonate || (() => {});
    this.onPounceWindup = callbacks.onPounceWindup || (() => {});
    this.onSplit = callbacks.onSplit || (() => {});
    this.onDefeat = callbacks.onDefeat || (() => {});
    this.onMountStep = callbacks.onMountStep || (() => {});
    this.getHeldItem = callbacks.getHeldItem || (() => null);
    this.getOutposts = callbacks.getOutposts || (() => []);
    this.getResidentSchedule = callbacks.getResidentSchedule || (() => null);
    this.isVaultCleared = callbacks.isVaultCleared || (() => false);
    this.cinderwatchRemaining = callbacks.cinderwatchRemaining || (() => 0);
    this.root = new THREE.Group();
    this.root.name = 'Wildforge Creatures';
    this.scene.add(this.root);
    this.entities = [];
    this.byId = new Map();
    this.nextId = 1;
    this.spawnTimer = 0;
    this.mounted = null;
    this.time = 0;
    this.denCooldowns = new Map();
    this.randomState = (seed ^ 0xa341316c) >>> 0;
  }

  random() {
    let x = this.randomState || 1;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.randomState = x >>> 0;
    return this.randomState / 4294967296;
  }

  spawn(type, x, z, state = {}) {
    const definition = CREATURES[type];
    if (!definition) return null;
    if (definition.dungeon && typeof state.vaultKey === 'string' && this.isVaultCleared(state.vaultKey)) return null;
    const surface = this.world.terrainHeight(Math.floor(x), Math.floor(z));
    const savedY = Number(state.y);
    const swimHeight = definition.aquatic ? aquaticSpawnHeight(this.world, x, z, this.random()) : null;
    if (!definition.constructed && (definition.aquatic ? swimHeight == null : surface <= (definition.lowTerrain ? 8 : 17))) return null;
    if (definition.subterranean && (!Number.isFinite(savedY)
      || !caveSpawnAllowed(this.world, x, savedY, z, definition.biomes))) return null;
    const biome = definition.subterranean
      ? this.world.undergroundBiomeAt(Math.floor(x), Math.floor(savedY), Math.floor(z)).id
      : this.world.biomeAt(Math.floor(x), Math.floor(z), surface).id;
    if (definition.biomes && !definition.biomes.includes(biome)) return null;
    const root = creatureModel(type);
    const id = this.nextId++;
    const persistentKey = validCreaturePersistentKey(state.persistentKey) ? state.persistentKey : `creature-${this.seed >>> 0}-${id}`;
    const y = definition.constructed && Number.isFinite(savedY) ? Math.max(WORLD_MIN_Y + 1, Math.min(WORLD_HEIGHT - 3, savedY))
      : definition.subterranean ? Math.floor(savedY)
      : (definition.dungeon || typeof state.watchKey === 'string') && Number.isFinite(savedY) ? savedY
      : definition.flying && Number.isFinite(savedY)
      ? Math.max(surface + 2.25, Math.min(WORLD_HEIGHT - 3, savedY))
      : definition.flying ? Math.min(WORLD_HEIGHT - 3, surface + 3.5 + this.random() * 4.5)
      : definition.aquatic && Number.isFinite(savedY)
      ? Math.max(surface + 1.15, Math.min(SEA_LEVEL - 0.55, savedY))
      : definition.aquatic ? swimHeight : surface + 1;
    if (definition.hostile && Number.isFinite(state.maximumLight)
      && !hostileSpawnAllowed(this.world, x, y + 1, z, state.daylight, state.maximumLight)) return null;
    root.position.set(x, y, z);
    const initialHeading = this.random() * Math.PI * 2;
    root.rotation.y = entityVisualYaw(initialHeading);
    root.traverse((object) => { object.userData.entityId = id; });
    this.root.add(root);
    const globSize = definition.splitter
      ? Math.max(1, Math.min(definition.splitter.maximumSize, Math.floor(Number(state.globSize) || definition.splitter.defaultSize)))
      : 1;
    const maximumHealth = definition.splitter ? definition.splitter.healthBySize[globSize - 1] : definition.health;
    const entity = {
      id,
      persistentKey,
      type,
      definition,
      root,
      health: Number.isFinite(state.health) ? Math.max(1, Math.min(maximumHealth, state.health)) : maximumHealth,
      maximumHealth,
      globSize,
      heading: initialHeading,
      thinkTimer: 0.5 + this.random() * 2,
      attackCooldown: 0,
      age: 0,
      hurtTimer: 0,
      soundTimer: 4 + this.random() * 7,
      swimTargetY: definition.aquatic ? y : null,
      flightTargetY: definition.flying ? y : null,
      carryingNectar: Boolean(definition.pollinator && state.carryingNectar),
      pollinationCooldown: definition.pollinator ? Math.max(0, Math.min(30, Number(state.pollinationCooldown) || 0)) : 0,
      forageScanCooldown: 0,
      forageTarget: null,
      knockback: new THREE.Vector3(),
      isBaby: Boolean(state.isBaby),
      growthRemaining: Math.max(0, Number(state.growthRemaining) || 0),
      loveTimer: Math.max(0, Number(state.loveTimer) || 0),
      breedCooldown: Math.max(0, Number(state.breedCooldown) || 0),
      harvestCooldown: Math.max(0, Number(state.harvestCooldown) || 0),
      milkCooldown: Math.max(0, Number(state.milkCooldown) || 0),
      layTimer: definition.eggLayer
        ? Number.isFinite(state.layTimer) && state.layTimer > 0
          ? Math.max(0.05, Math.min(definition.eggLayer.maximum, state.layTimer))
          : definition.eggLayer.minimum + this.random() * (definition.eggLayer.maximum - definition.eggLayer.minimum)
        : null,
      volatileCharge: definition.volatile
        ? Math.max(0, Math.min(definition.volatile.fuse, Number(state.volatileCharge) || 0))
        : 0,
      volatilePrimed: Boolean(definition.volatile && Number(state.volatileCharge) > 0),
      pounceWindup: definition.pounce && Number.isFinite(state.pounceTargetX) && Number.isFinite(state.pounceTargetZ)
        ? Math.max(0, Math.min(definition.pounce.windup, Number(state.pounceWindup) || 0)) : 0,
      pounceCooldown: definition.pounce ? Math.max(0, Math.min(definition.pounce.cooldown, Number(state.pounceCooldown) || 0)) : 0,
      pounceTargetX: definition.pounce && Number.isFinite(state.pounceTargetX) ? Number(state.pounceTargetX) : null,
      pounceTargetZ: definition.pounce && Number.isFinite(state.pounceTargetZ) ? Number(state.pounceTargetZ) : null,
      pounceFlight: definition.pounce && state.pounceFlight
        && Array.isArray(state.pounceFlight.start) && Array.isArray(state.pounceFlight.end)
        && state.pounceFlight.start.length === 3 && state.pounceFlight.end.length === 3
        && [...state.pounceFlight.start, ...state.pounceFlight.end].every(Number.isFinite)
        ? {
          start: new THREE.Vector3(...state.pounceFlight.start),
          end: new THREE.Vector3(...state.pounceFlight.end),
          apex: Math.max(0.75, Math.min(4, Number(state.pounceFlight.apex) || definition.pounce.apex)),
          duration: Math.max(0.2, Math.min(0.8, Number(state.pounceFlight.duration) || definition.pounce.duration)),
          elapsed: Math.max(0, Math.min(0.8, Number(state.pounceFlight.elapsed) || 0)),
        }
        : null,
      hopRemaining: definition.hopper ? Math.max(0, Math.min(definition.hopper.duration, Number(state.hopRemaining) || 0)) : 0,
      hopCooldown: definition.hopper ? Math.max(0, Math.min(definition.hopper.interval, Number(state.hopCooldown) || 0)) : 0,
      persistent: Boolean(state.persistent),
      bond: Math.max(0, Math.min(definition.bondRequired || 0, Math.floor(Number(state.bond) || 0))),
      tamed: Boolean(state.tamed),
      saddled: Boolean(state.saddled),
      sitting: Boolean(state.sitting),
      downed: Boolean(state.downed && definition.companion && state.tamed),
      rideVelocity: 0,
      verticalVelocity: 0,
      mountGrounded: true,
      jumpHeld: false,
      mountStepTimer: 0,
      packId: typeof state.packId === 'string' ? state.packId : null,
      denKey: typeof state.denKey === 'string' ? state.denKey : null,
      alertTimer: Math.max(0, Number(state.alertTimer) || 0),
      phaseTriggered: Boolean(state.phaseTriggered),
      settlementKey: typeof state.settlementKey === 'string' ? state.settlementKey : null,
      outpostKey: typeof state.outpostKey === 'string' ? state.outpostKey : null,
      residenceKey: typeof state.residenceKey === 'string' ? state.residenceKey : typeof state.outpostKey === 'string' ? state.outpostKey : typeof state.settlementKey === 'string' ? state.settlementKey : null,
      residentSlot: Math.max(0, Math.min(2, Math.floor(Number(state.residentSlot) || 0))),
      socialKey: typeof state.socialKey === 'string' ? state.socialKey : null,
      profession: typeof state.profession === 'string' ? state.profession : null,
      schedulePhase: 'market',
      scheduleLabel: 'Trading at the commons',
      scheduleTradingOpen: true,
      vaultKey: typeof state.vaultKey === 'string' ? state.vaultKey : null,
      watchKey: typeof state.watchKey === 'string' ? state.watchKey : null,
      homeX: Number.isFinite(state.homeX) ? state.homeX : x,
      homeZ: Number.isFinite(state.homeZ) ? state.homeZ : z,
      homeY: Number.isFinite(state.homeY) ? state.homeY : y,
    };
    if (entity.tamed) entity.bond = definition.bondRequired || entity.bond;
    if (entity.downed) {
      entity.health = 1;
      entity.sitting = true;
    }
    if (definition.resident && entity.settlementKey) {
      entity.socialKey = entity.socialKey || `${entity.residenceKey || entity.settlementKey}#${entity.residentSlot}`;
      entity.profession = entity.profession || offersForTrader(this.seed, entity.settlementKey).profession;
      const professionColors = { provisioner: 0x63845c, delver: 0x68717a, outfitter: 0x8b6549, mechanist: 0x9b7844, railwright: 0x796a5c, herbalist: 0x527b69 };
      const cloak = root.getObjectByName('cloak');
      if (cloak?.material?.color) cloak.material.color.setHex(professionColors[entity.profession] || 0x5b7158);
    }
    if (!definition.mountable && !definition.companion) {
      entity.tamed = false;
      entity.saddled = false;
      entity.bond = 0;
    }
    if (root.userData.saddle) root.userData.saddle.visible = entity.saddled;
    if (root.userData.collar) root.userData.collar.visible = entity.tamed;
    if (root.userData.collar?.material?.color) root.userData.collar.material.color.setHex(entity.downed ? 0x436e69 : 0x70e8dd);
    if (root.userData.harvestLayer) root.userData.harvestLayer.visible = entity.harvestCooldown <= 0;
    if (entity.isBaby && entity.growthRemaining <= 0) entity.growthRemaining = 300;
    const sizeLabel = definition.splitter ? (globSize === 1 ? 'Small ' : globSize === 3 ? 'Elder ' : '') : '';
    root.name = `${entity.isBaby ? 'Young ' : ''}${sizeLabel}${definition.name}`;
    const creatureScale = definition.splitter ? definition.splitter.scaleBySize[globSize - 1] : 1;
    root.scale.setScalar((entity.isBaby ? 0.55 : 1) * creatureScale);
    this.entities.push(entity);
    this.byId.set(id, entity);
    return entity;
  }

  feed(entity, itemId) {
    if (!entity || !this.byId.has(entity.id) || entity.definition.breedItem !== itemId || entity.downed) return false;
    if (entity.isBaby || entity.breedCooldown > 0 || entity.loveTimer > 0) return false;
    entity.loveTimer = 30;
    entity.persistent = true;
    return true;
  }

  bond(entity, itemId) {
    if (!entity || !this.byId.has(entity.id) || entity.definition.tameItem !== itemId || entity.isBaby || entity.tamed) return null;
    entity.bond = Math.min(entity.definition.bondRequired, entity.bond + 1);
    entity.persistent = true;
    if (entity.bond >= entity.definition.bondRequired) {
      entity.tamed = true;
      if (entity.root.userData.collar) entity.root.userData.collar.visible = true;
      this.onMessage(`${entity.definition.name} trusts you`);
    }
    return { bond: entity.bond, required: entity.definition.bondRequired, tamed: entity.tamed };
  }

  toggleCompanion(entity) {
    if (!entity || !this.byId.has(entity.id) || !entity.definition.companion || !entity.tamed || entity.downed) return null;
    entity.sitting = !entity.sitting;
    entity.persistent = true;
    entity.knockback.set(0, 0, 0);
    return { sitting: entity.sitting };
  }

  healCompanion(entity, itemId) {
    if (!entity || !this.byId.has(entity.id) || !entity.definition.companion || !entity.tamed
      || itemId !== 'roasted_rimepod' || (!entity.downed && entity.health >= entity.definition.health)) return null;
    const revived = entity.downed;
    const before = entity.health;
    entity.downed = false;
    entity.sitting = false;
    entity.health = Math.min(entity.definition.health, Math.max(entity.health, revived ? 4 : entity.health) + 6);
    entity.persistent = true;
    entity.hurtTimer = 0;
    if (entity.root.userData.collar?.material?.color) entity.root.userData.collar.material.color.setHex(0x70e8dd);
    return { healed: entity.health - before, health: entity.health, maximum: entity.definition.health, revived };
  }

  repairGuardian(entity, itemId) {
    if (!entity || !this.byId.has(entity.id) || !entity.definition.guardian || itemId !== 'iron_ingot'
      || entity.health >= entity.maximumHealth) return null;
    const before = entity.health;
    entity.health = Math.min(entity.maximumHealth, entity.health + 15);
    entity.persistent = true;
    entity.hurtTimer = 0;
    return { repaired: entity.health - before, health: entity.health, maximum: entity.maximumHealth };
  }

  harvestMoss(entity, itemId) {
    if (!entity || !this.byId.has(entity.id) || entity.type !== 'grazer' || itemId !== 'moss_shears'
      || entity.isBaby || entity.harvestCooldown > 0) return null;
    const count = 1 + Math.floor(this.random() * 2);
    entity.harvestCooldown = 180;
    entity.persistent = true;
    if (entity.root.userData.harvestLayer) entity.root.userData.harvestLayer.visible = false;
    return { item: 'mosswool', count, remaining: entity.harvestCooldown };
  }

  milkGrazer(entity, itemId) {
    if (!entity || !this.byId.has(entity.id) || entity.type !== 'grazer' || itemId !== 'forged_pail'
      || entity.isBaby || entity.milkCooldown > 0) return null;
    entity.milkCooldown = 240;
    entity.persistent = true;
    return { item: 'mossmilk_pail', remaining: entity.milkCooldown };
  }

  equipSaddle(entity, itemId) {
    if (!entity || !this.byId.has(entity.id) || itemId !== 'trail_saddle' || !entity.tamed || entity.saddled || entity.isBaby) return false;
    entity.saddled = true;
    entity.persistent = true;
    if (entity.root.userData.saddle) entity.root.userData.saddle.visible = true;
    return true;
  }

  mount(entity, player = this.player) {
    if (!entity || !this.byId.has(entity.id) || !entity.definition.mountable || !entity.tamed || !entity.saddled || entity.isBaby || this.mounted) return false;
    this.mounted = entity;
    entity.rideVelocity = 0;
    entity.verticalVelocity = 0;
    entity.mountGrounded = true;
    this.syncRider(player);
    return true;
  }

  unmount(player = this.player, reposition = true) {
    const entity = this.mounted;
    if (!entity) return false;
    this.mounted = null;
    entity.rideVelocity = 0;
    if (reposition && player) {
      const candidates = [[1.35, 0], [-1.35, 0], [0, 1.35], [0, -1.35]].map(([dx, dz]) => {
        const x = entity.root.position.x + dx;
        const z = entity.root.position.z + dz;
        return new THREE.Vector3(x, this.world.terrainHeight(Math.floor(x), Math.floor(z)) + 1.01, z);
      });
      const safe = candidates.find((candidate) => !player.collides(candidate));
      player.position.copy(safe || entity.root.position.clone().add(new THREE.Vector3(0, 1.7, 0)));
      player.velocity.set(0, 0, 0);
      player.syncCamera();
    }
    return true;
  }

  syncRider(player = this.player) {
    if (!this.mounted || !player) return false;
    player.position.set(this.mounted.root.position.x, this.mounted.root.position.y + 1.18, this.mounted.root.position.z);
    player.velocity.set(0, 0, 0);
    player.grounded = false;
    player.moving = Math.abs(this.mounted.rideVelocity) > 0.12;
    player.sprinting = false;
    player.blocking = false;
    player.inWater = false;
    player.inLava = false;
    player.inLiquid = false;
    player.submerged = false;
    player.submergedLava = false;
    player.syncCamera();
    return true;
  }

  updateMount(dt, keys = new Set(), player = this.player) {
    const entity = this.mounted;
    if (!entity) return false;
    dt = Math.max(0, Math.min(0.05, Number(dt) || 0));
    const throttle = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
    const steering = Number(keys.has('KeyA')) - Number(keys.has('KeyD'));
    const sprinting = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const maximum = entity.definition.rideSpeed * (sprinting ? 1.16 : 1);
    if (throttle) entity.rideVelocity += throttle * dt * (throttle > 0 ? 13 : 8);
    entity.rideVelocity *= Math.max(0, 1 - dt * (throttle ? 1.15 : 5.2));
    entity.rideVelocity = Math.max(-2.6, Math.min(maximum, entity.rideVelocity));
    if (steering) entity.heading += steering * dt * (1.15 + Math.min(1, Math.abs(entity.rideVelocity) / 3));
    const jumpPressed = keys.has('Space');
    if (jumpPressed && !entity.jumpHeld && entity.mountGrounded) {
      entity.verticalVelocity = 8.4;
      entity.mountGrounded = false;
    }
    entity.jumpHeld = jumpPressed;
    const distance = entity.rideVelocity * dt;
    const nextX = entity.root.position.x + Math.sin(entity.heading) * distance;
    const nextZ = entity.root.position.z + Math.cos(entity.heading) * distance;
    const surface = this.world.terrainHeight(Math.floor(nextX), Math.floor(nextZ));
    const targetY = surface + 1;
    const blockedByWater = isWaterBlock(this.world.getBlock?.(nextX, targetY, nextZ));
    const airborneBlocked = !entity.mountGrounded && targetY > entity.root.position.y + 0.65;
    if (airborneBlocked || (entity.mountGrounded && (blockedByWater || surface <= 17 || Math.abs(targetY - entity.root.position.y) > 1.1))) {
      entity.rideVelocity *= -0.12;
    } else {
      entity.root.position.x = nextX;
      entity.root.position.z = nextZ;
      if (entity.mountGrounded) entity.root.position.y += (targetY - entity.root.position.y) * Math.min(1, dt * 14);
    }
    if (!entity.mountGrounded) {
      entity.verticalVelocity -= 22 * dt;
      entity.root.position.y += entity.verticalVelocity * dt;
      const landingY = this.world.terrainHeight(Math.floor(entity.root.position.x), Math.floor(entity.root.position.z)) + 1;
      if (entity.verticalVelocity <= 0 && entity.root.position.y <= landingY) {
        entity.root.position.y = landingY;
        entity.verticalVelocity = 0;
        entity.mountGrounded = true;
      }
    }
    entity.root.rotation.y = entityVisualYaw(entity.heading);
    entity.mountStepTimer -= dt;
    if (Math.abs(entity.rideVelocity) > 1.1 && entity.mountGrounded && entity.mountStepTimer <= 0) {
      entity.mountStepTimer = sprinting ? 0.24 : 0.34;
      this.onMountStep(entity.root.position.clone(), Math.abs(entity.rideVelocity));
    }
    this.syncRider(player);
    return true;
  }

  mateFor(entity, maximumDistance = 10) {
    if (!entity || entity.loveTimer <= 0 || entity.isBaby || entity.downed) return null;
    let closest = null;
    let closestDistance = maximumDistance;
    for (const candidate of this.entities) {
      if (candidate === entity || candidate.type !== entity.type || candidate.loveTimer <= 0 || candidate.isBaby || candidate.downed || candidate.breedCooldown > 0) continue;
      const distance = entity.root.position.distanceTo(candidate.root.position);
      if (distance < closestDistance) {
        closest = candidate;
        closestDistance = distance;
      }
    }
    return closest ? { entity: closest, distance: closestDistance } : null;
  }

  companionTargetFor(entity, maximumDistance = 12) {
    const activeCompanion = entity?.definition.companion && entity.tamed && !entity.sitting && !entity.downed;
    if (!activeCompanion && !entity?.definition.guardian) return null;
    if (entity?.definition.guardian) maximumDistance = Math.max(maximumDistance, 18);
    let closest = null;
    let closestDistance = maximumDistance;
    for (const candidate of this.entities) {
      if (candidate === entity || !candidate.definition.hostile || candidate.health <= 0) continue;
      const distance = entity.root.position.distanceTo(candidate.root.position);
      if (distance < closestDistance) {
        closest = candidate;
        closestDistance = distance;
      }
    }
    return closest ? { entity: closest, distance: closestDistance } : null;
  }

  breedPair(first, second) {
    if (!first || !second || first.type !== second.type || first.loveTimer <= 0 || second.loveTimer <= 0
      || first.isBaby || second.isBaby || first.downed || second.downed || first.breedCooldown > 0 || second.breedCooldown > 0) return null;
    const x = (first.root.position.x + second.root.position.x) * 0.5;
    const z = (first.root.position.z + second.root.position.z) * 0.5;
    const inheritsTrust = Boolean(first.definition.companion && first.tamed && second.tamed);
    const child = this.spawn(first.type, x, z, {
      isBaby: true,
      growthRemaining: 300,
      persistent: true,
      tamed: inheritsTrust,
      bond: inheritsTrust ? first.definition.bondRequired : 0,
    });
    if (!child) return null;
    first.loveTimer = 0;
    second.loveTimer = 0;
    first.breedCooldown = 300;
    second.breedCooldown = 300;
    first.persistent = true;
    second.persistent = true;
    this.onBreed(child.root.position.clone(), child);
    this.onMessage(`A young ${first.definition.name} joins the herd`);
    return child;
  }

  serialize() {
    return this.entities.filter((entity) => entity.persistent).map((entity) => ({
      type: entity.type,
      persistentKey: entity.persistentKey,
      x: entity.root.position.x,
      y: entity.root.position.y,
      z: entity.root.position.z,
      health: entity.health,
      isBaby: entity.isBaby,
      growthRemaining: entity.growthRemaining,
      loveTimer: entity.loveTimer,
      breedCooldown: entity.breedCooldown,
      harvestCooldown: entity.harvestCooldown,
      milkCooldown: entity.milkCooldown,
      layTimer: entity.layTimer,
      volatileCharge: entity.volatileCharge,
      pounceWindup: entity.pounceWindup,
      pounceCooldown: entity.pounceCooldown,
      carryingNectar: entity.carryingNectar,
      pollinationCooldown: entity.pollinationCooldown,
      pounceTargetX: entity.pounceTargetX,
      pounceTargetZ: entity.pounceTargetZ,
      pounceFlight: entity.pounceFlight ? {
        start: entity.pounceFlight.start.toArray(),
        end: entity.pounceFlight.end.toArray(),
        apex: entity.pounceFlight.apex,
        duration: entity.pounceFlight.duration,
        elapsed: entity.pounceFlight.elapsed,
      } : null,
      globSize: entity.globSize,
      hopRemaining: entity.hopRemaining,
      hopCooldown: entity.hopCooldown,
      persistent: true,
      bond: entity.bond,
      tamed: entity.tamed,
      saddled: entity.saddled,
      sitting: entity.sitting,
      downed: entity.downed,
      phaseTriggered: entity.phaseTriggered,
      settlementKey: entity.settlementKey,
      outpostKey: entity.outpostKey,
      residenceKey: entity.residenceKey,
      residentSlot: entity.residentSlot,
      socialKey: entity.socialKey,
      profession: entity.profession,
      vaultKey: entity.vaultKey,
      watchKey: entity.watchKey,
      homeX: entity.homeX,
      homeZ: entity.homeZ,
      homeY: entity.homeY,
    }));
  }

  restore(records) {
    if (!Array.isArray(records)) return 0;
    let restored = 0;
    for (const record of records.slice(0, 32)) {
      if (!record || !Number.isFinite(record.x) || !Number.isFinite(record.z)) continue;
      if (this.spawn(record.type, record.x, record.z, { ...record, persistent: true })) restored += 1;
    }
    return restored;
  }

  clear() {
    const count = this.entities.length;
    for (const entity of [...this.entities]) this.remove(entity, false);
    return count;
  }

  remove(entity, drop = false) {
    if (!this.byId.has(entity.id)) return;
    if (drop) {
      const dropsAllowed = !entity.definition.splitter || entity.globSize <= entity.definition.splitter.dropsAtSize;
      for (const { id, min, max } of dropsAllowed ? [entity.definition.drop, ...(entity.definition.extraDrops || [])] : []) {
        const count = min + Math.floor(this.random() * (max - min + 1));
        if (count > 0) this.onDrop(id, count, entity.root.position.clone());
      }
      if (entity.saddled) this.onDrop('trail_saddle', 1, entity.root.position.clone());
    }
    if (entity === this.mounted) this.unmount(this.player, false);
    entity.root.traverse((object) => {
      if (object.material) object.material.dispose();
    });
    this.root.remove(entity.root);
    this.byId.delete(entity.id);
    this.entities = this.entities.filter((candidate) => candidate !== entity);
  }

  trySpawn(type, state = {}) {
    const definition = CREATURES[type];
    const attempts = definition?.subterranean ? 18 : definition?.aquatic ? 12 : definition?.flying ? 6 : 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const angle = this.random() * Math.PI * 2;
      const distance = definition?.subterranean ? 8 + this.random() * 12 : 18 + this.random() * 18;
      const x = this.player.position.x + Math.cos(angle) * distance;
      const z = this.player.position.z + Math.sin(angle) * distance;
      const caveY = definition?.subterranean
        ? caveSpawnHeight(this.world, x, z, this.player.position.y, definition.biomes)
        : null;
      if (definition?.subterranean && caveY == null) continue;
      const spawned = this.spawn(type, x, z, definition?.subterranean ? { ...state, y: caveY } : state);
      if (spawned) return spawned;
    }
    return null;
  }

  ensureHearthsteadResidents(radius = 58) {
    const steads = this.world.hearthsteadsNear?.(this.player.position.x, this.player.position.z, radius) || [];
    let spawned = 0;
    for (const stead of steads) {
      const home = this.world.hearthsteadFeatures(stead).trader;
      for (let slot = 0; slot < 3; slot += 1) {
        if (this.entities.filter((entity) => entity.definition.resident).length >= 24) return spawned;
        if (this.entities.some((entity) => entity.residenceKey === stead.key && entity.residentSlot === slot)) continue;
        const resident = this.spawn('wayfarer', home.x + (slot - 1) * 1.15, home.z + (slot % 2 ? 0.7 : -0.35), {
          y: home.y,
          persistent: true,
          settlementKey: `${stead.key}:resident:${slot}`,
          residenceKey: stead.key,
          residentSlot: slot,
          socialKey: `${stead.key}#${slot}`,
          homeX: stead.originX,
          homeZ: stead.originZ,
        });
        if (resident) spawned += 1;
      }
    }
    return spawned;
  }

  ensureOutpostResidents() {
    let spawned = 0;
    for (const outpost of this.getOutposts()) {
      if (!outpost || typeof outpost.key !== 'string' || outpost.tier < 1) continue;
      for (let slot = 0; slot < Math.min(3, outpost.tier); slot += 1) {
        if (this.entities.filter((entity) => entity.definition.resident).length >= 24) return spawned;
        if (this.entities.some((entity) => entity.outpostKey === outpost.key && entity.residentSlot === slot)) continue;
        const tradeKey = `outpost:${outpost.key}:resident:${slot}`;
        const resident = this.spawn('wayfarer', outpost.x + 2.5 + slot * 0.8, outpost.z + 0.5, {
          persistent: true,
          settlementKey: tradeKey,
          residenceKey: outpost.key,
          outpostKey: outpost.key,
          residentSlot: slot,
          socialKey: `${outpost.key}#${slot}`,
          homeX: outpost.x,
          homeZ: outpost.z,
        });
        if (resident) spawned += 1;
      }
    }
    return spawned;
  }

  removeOutpostResidents(key) {
    const residents = this.entities.filter((entity) => entity.outpostKey === key);
    for (const resident of residents) this.remove(resident, false);
    return residents.length;
  }

  ensureEchoVaultGuardians(radius = 52) {
    const vaults = this.world.echoVaultsNear?.(this.player.position.x, this.player.position.z, radius) || [];
    let spawned = 0;
    for (const vault of vaults) {
      if (this.isVaultCleared(vault.key) || this.entities.some((entity) => entity.vaultKey === vault.key)) continue;
      const guardian = this.world.echoVaultFeatures(vault).guardian;
      if (Math.hypot(guardian.x - this.player.position.x, guardian.y - this.player.position.y, guardian.z - this.player.position.z) > 34) continue;
      const sentinel = this.spawn('echo_sentinel', guardian.x, guardian.z, {
        y: guardian.y,
        persistent: true,
        vaultKey: vault.key,
        homeX: guardian.x,
        homeY: guardian.y,
        homeZ: guardian.z,
      });
      if (sentinel) spawned += 1;
    }
    return spawned;
  }

  ensureCinderwatchGuardians(radius = 56) {
    const watches = this.world.cinderwatchesNear?.(this.player.position.x, this.player.position.z, radius) || [];
    let spawned = 0;
    for (const watch of watches) {
      const required = Math.max(0, Math.min(2, Math.floor(Number(this.cinderwatchRemaining(watch.key)) || 0)));
      if (required <= 0) continue;
      const features = this.world.cinderwatchFeatures(watch);
      if (this.world.getBlock?.(features.chest.x, features.chest.y, features.chest.z) !== BLOCK.CHEST) continue;
      const existing = this.entities.filter((entity) => entity.watchKey === watch.key);
      for (let index = existing.length; index < required; index += 1) {
        if (this.entities.filter((entity) => entity.definition.hostile && !entity.definition.aquatic).length >= 8) return spawned;
        const point = features.guardianSpawns[index % features.guardianSpawns.length];
        if (Math.hypot(point.x - this.player.position.x, point.y - this.player.position.y, point.z - this.player.position.z) > 40) continue;
        const guardian = this.spawn('riftstalker', point.x + 0.5, point.z + 0.5, {
          y: point.y,
          persistent: true,
          watchKey: watch.key,
          homeX: point.x + 0.5,
          homeY: point.y,
          homeZ: point.z + 0.5,
          alertTimer: 18,
        });
        if (guardian) spawned += 1;
      }
    }
    if (spawned) this.onMessage('Cinderwatch guardians emerge from the ember dark');
    return spawned;
  }

  spawnPackAtDen(den) {
    if (!den || typeof den.key !== 'string' || this.world.getBlock?.(den.x, den.y, den.z) !== BLOCK.SHADOW_DEN) return [];
    if (this.time < (this.denCooldowns.get(den.key) || 0)) return [];
    if (this.entities.some((entity) => entity.denKey === den.key)) return [];
    const distance = Math.hypot(den.x - this.player.position.x, den.z - this.player.position.z);
    if (distance < 10 || distance > 42) return [];
    const available = Math.max(0, 8 - this.entities.filter((entity) => entity.definition.hostile && !entity.definition.aquatic).length);
    const count = Math.min(available, 2 + Math.floor(this.random() * 3));
    if (count < 2) return [];
    const pack = [];
    const rotation = this.random() * Math.PI * 2;
    for (let index = 0; index < count; index += 1) {
      const angle = rotation + index / count * Math.PI * 2;
      const radius = 2.2 + (index % 2) * 0.75;
      const entity = this.spawn('duskling', den.x + Math.cos(angle) * radius, den.z + Math.sin(angle) * radius, {
        packId: den.key,
        denKey: den.key,
      });
      if (entity) pack.push(entity);
    }
    if (pack.length < 2) {
      for (const entity of pack) this.remove(entity);
      this.denCooldowns.set(den.key, this.time + 10);
      return [];
    }
    this.denCooldowns.set(den.key, this.time + 60);
    this.onMessage(`A Duskling pack stirs near a Shadow Den`);
    return pack;
  }

  summonBossAt(position) {
    if (!position || this.entities.some((entity) => entity.definition.boss)) return null;
    const x = Math.floor(position.x);
    const y = Math.floor(position.y);
    const z = Math.floor(position.z);
    if (this.world.getBlock?.(x, y, z) !== BLOCK.SHADOW_DEN) return null;
    const offsets = [[3, 0], [-3, 0], [0, 3], [0, -3], [0, 0]];
    let boss = null;
    for (const [dx, dz] of offsets) {
      boss = this.spawn('hollow_warden', x + dx + 0.5, z + dz + 0.5, { persistent: true });
      if (boss) break;
    }
    if (!boss) return null;
    boss.alertTimer = 30;
    boss.persistent = true;
    this.onMessage('The Hollow Warden answers the den ritual');
    return boss;
  }

  summonBossGuards(boss) {
    if (!boss || !boss.definition.boss) return [];
    const guards = [];
    const packId = `warden:${boss.id}`;
    for (const angle of [Math.PI * 0.35, Math.PI * 1.35]) {
      const guard = this.spawn('duskling', boss.root.position.x + Math.cos(angle) * 2.7, boss.root.position.z + Math.sin(angle) * 2.7, {
        packId,
        alertTimer: 18,
      });
      if (guard) guards.push(guard);
    }
    if (guards.length) this.onMessage('The wounded Warden calls shadows from the hollow');
    return guards;
  }

  activeBoss(maximumDistance = 72) {
    const bosses = this.entities.filter((entity) => entity.definition.boss
      && entity.root.position.distanceTo(this.player.position) <= maximumDistance);
    if (!bosses.length) return null;
    const boss = bosses.sort((a, b) => a.root.position.distanceTo(this.player.position) - b.root.position.distanceTo(this.player.position))[0];
    return { entity: boss, name: boss.definition.name, health: boss.health, maximum: boss.definition.health, enraged: boss.phaseTriggered };
  }

  alertPack(entity, duration = 10) {
    if (!entity || !entity.packId) return 0;
    let alerted = 0;
    for (const member of this.entities) {
      if (member.packId !== entity.packId || member.type !== entity.type) continue;
      member.alertTimer = Math.max(member.alertTimer, duration);
      alerted += 1;
    }
    return alerted;
  }

  update(dt, daylight, worldTime = 0.5) {
    this.time += Math.max(0, dt);
    this.spawnTimer -= dt;
    const passiveCount = this.entities.filter((entity) => !entity.definition.hostile && !entity.definition.aquatic
      && !entity.definition.resident && !(entity.definition.companion && entity.tamed)).length;
    const hostileCount = this.entities.filter((entity) => entity.definition.hostile && !entity.definition.aquatic).length;
    const aquaticCount = this.entities.filter((entity) => entity.definition.aquatic).length;
    const playerX = Math.floor(this.player.position.x);
    const playerZ = Math.floor(this.player.position.z);
    const playerSurface = this.world.terrainHeight(playerX, playerZ);
    const surfaceBiome = this.world.biomeAt(playerX, playerZ).id;
    const undergroundBiome = this.player.position.y < playerSurface - 3
      ? this.world.undergroundBiomeAt?.(playerX, Math.floor(this.player.position.y), playerZ)?.id
      : null;
    const activeBiome = undergroundBiome || surfaceBiome;
    const spawnProfile = realmSpawnProfile(activeBiome);
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 2.5;
      this.ensureHearthsteadResidents();
      this.ensureOutpostResidents();
      this.ensureEchoVaultGuardians();
      this.ensureCinderwatchGuardians();
      if (passiveCount < 9) {
        for (const type of spawnProfile.passive) {
          const current = this.entities.filter((entity) => !entity.definition.hostile && !entity.definition.aquatic
            && !entity.definition.resident && !(entity.definition.companion && entity.tamed)).length;
          if (current < 9) this.trySpawn(type);
        }
        if (this.time > 5 && passiveCount < 7 && !this.entities.some((entity) => entity.type === 'emberfox' && !entity.tamed)
          && surfaceBiome === 'forest' && !undergroundBiome && this.random() < 0.1) this.trySpawn('emberfox');
      }
      if ((daylight < 0.3 || surfaceBiome === 'cinderreach' || undergroundBiome) && hostileCount < 8) {
        const hasHostileCapacity = () => this.entities.filter((entity) => entity.definition.hostile && !entity.definition.aquatic).length < 8;
        const dens = surfaceBiome === 'cinderreach' || undergroundBiome ? [] : this.world.shadowDensNear?.(this.player.position.x, this.player.position.z, 42) || [];
        let denPack = false;
        for (const den of dens.sort((a, b) => Math.hypot(a.x - this.player.position.x, a.z - this.player.position.z)
          - Math.hypot(b.x - this.player.position.x, b.z - this.player.position.z))) {
          if (this.spawnPackAtDen(den).length) {
            denPack = true;
            break;
          }
        }
        const naturalHostile = surfaceBiome === 'cinderreach' ? { daylight } : { daylight, maximumLight: 7 };
        for (const type of spawnProfile.hostile) if (!denPack && hasHostileCapacity()) this.trySpawn(type, naturalHostile);
      }
      if (aquaticCount < 7) for (const type of spawnProfile.aquatic) this.trySpawn(type);
    }

    for (const entity of [...this.entities]) {
      if (!this.byId.has(entity.id)) continue;
      entity.age += dt;
      entity.thinkTimer -= dt;
      entity.attackCooldown -= dt;
      entity.soundTimer -= dt;
      entity.hurtTimer = Math.max(0, entity.hurtTimer - dt);
      entity.loveTimer = Math.max(0, entity.loveTimer - dt);
      entity.breedCooldown = Math.max(0, entity.breedCooldown - dt);
      entity.harvestCooldown = Math.max(0, entity.harvestCooldown - dt);
      entity.milkCooldown = Math.max(0, entity.milkCooldown - dt);
      entity.pounceCooldown = Math.max(0, entity.pounceCooldown - dt);
      const wasHopping = entity.hopRemaining > 0;
      entity.hopRemaining = Math.max(0, entity.hopRemaining - dt);
      entity.hopCooldown = Math.max(0, entity.hopCooldown - dt);
      const landedHop = wasHopping && entity.hopRemaining <= 0;
      if (entity.definition.eggLayer && !entity.isBaby) {
        entity.layTimer = Math.max(0, entity.layTimer - dt);
        if (entity.layTimer <= 0) {
          const position = entity.root.position.clone().add(new THREE.Vector3(0, 0.2, 0));
          entity.layTimer = entity.definition.eggLayer.minimum
            + this.random() * (entity.definition.eggLayer.maximum - entity.definition.eggLayer.minimum);
          entity.persistent = true;
          this.onProduce(entity.definition.eggLayer.item, 1, position, entity);
        }
      }
      if (entity.root.userData.harvestLayer) entity.root.userData.harvestLayer.visible = entity.harvestCooldown <= 0;
      entity.alertTimer = Math.max(0, entity.alertTimer - dt);
      if (entity === this.mounted) {
        const stride = Math.sin(entity.age * Math.max(2, Math.abs(entity.rideVelocity)) * 5.5) * Math.min(0.65, Math.abs(entity.rideVelocity) * 0.1);
        for (let index = 0; index < entity.root.userData.legs.length; index += 1) entity.root.userData.legs[index].rotation.x = stride * (index % 2 ? -1 : 1);
        continue;
      }
      if (entity.isBaby) {
        entity.growthRemaining = Math.max(0, entity.growthRemaining - dt);
        if (entity.growthRemaining <= 0) {
          entity.isBaby = false;
          entity.root.name = entity.definition.name;
          this.onMessage(`${entity.definition.name} has grown up`);
        }
      }
      const dx = this.player.position.x - entity.root.position.x;
      const dz = this.player.position.z - entity.root.position.z;
      const playerDy = this.player.position.y + 0.8 - entity.root.position.y;
      const distance = entity.definition.aquatic || entity.definition.flying || entity.definition.dungeon || entity.definition.subterranean
        ? Math.hypot(dx, playerDy, dz) : Math.hypot(dx, dz);
      if (distance > 64 || (entity.definition.hostile && !entity.definition.aquatic && !entity.definition.boss
        && !entity.definition.subterranean && !entity.definition.daylightSafe && daylight > 0.58)) {
        if (entity.persistent) continue;
        this.remove(entity);
        continue;
      }
      if (entity.soundTimer <= 0) {
        entity.soundTimer = 6 + this.random() * 10;
        if (distance < 28) this.onSound(entity.type, 'ambient', entity.root.position.clone(), entity.id);
      }

      const mate = this.mateFor(entity);
      const mateDx = mate ? mate.entity.root.position.x - entity.root.position.x : 0;
      const mateDz = mate ? mate.entity.root.position.z - entity.root.position.z : 0;
      const courting = Boolean(mate);
      const seesPlayer = entity.definition.hostile && distance < 19 && (!entity.definition.aquatic || this.player.inWater);
      if (seesPlayer && entity.packId) this.alertPack(entity, 7);
      const chasing = entity.definition.hostile && (seesPlayer || (entity.alertTimer > 0 && distance < 30))
        && (!entity.definition.aquatic || this.player.inWater);
      const enraged = entity.definition.boss && entity.phaseTriggered;
      const ranged = entity.definition.ranged ? {
        ...entity.definition.ranged,
        damage: entity.definition.ranged.damage + (enraged ? 2 : 0),
        cooldown: entity.definition.ranged.cooldown * (enraged ? 0.58 : 1),
        minimumRange: entity.definition.ranged.minimumRange * (enraged ? 0.72 : 1),
      } : null;
      const volatile = entity.definition.volatile;
      const wasVolatilePrimed = entity.volatilePrimed;
      if (volatile) {
        if (chasing && distance <= volatile.triggerRange) {
          entity.volatileCharge = Math.min(volatile.fuse, entity.volatileCharge + dt);
          entity.volatilePrimed = true;
          entity.persistent = true;
          if (!wasVolatilePrimed) this.onVolatilePrime(entity, { ...volatile });
        } else if (distance > volatile.cancelRange || !chasing) {
          entity.volatileCharge = Math.max(0, entity.volatileCharge - dt * 1.75);
          entity.volatilePrimed = entity.volatileCharge > 0;
        }
        if (entity.volatileCharge >= volatile.fuse) {
          const detonation = {
            type: entity.type,
            definition: entity.definition,
            position: entity.root.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
            stats: { ...volatile },
          };
          this.remove(entity, false);
          this.onVolatileDetonate(detonation);
          continue;
        }
      }
      const pounce = entity.definition.pounce;
      if (pounce && entity.pounceFlight) {
        const flight = entity.pounceFlight;
        flight.elapsed = Math.min(flight.duration, flight.elapsed + dt);
        const progress = Math.min(1, flight.elapsed / flight.duration);
        const next = flight.start.clone().lerp(flight.end, progress);
        next.y += Math.sin(progress * Math.PI) * flight.apex;
        const blocked = typeof this.world.getBlock === 'function'
          && [0.12, 0.72, 1.28].some((offset) => BLOCKS[this.world.getBlock(Math.floor(next.x), Math.floor(next.y + offset), Math.floor(next.z))]?.solid);
        if (blocked) {
          const safeSurface = this.world.terrainHeight(Math.floor(entity.root.position.x), Math.floor(entity.root.position.z));
          entity.root.position.y = safeSurface + 1;
          entity.pounceFlight = null;
          entity.pounceCooldown = pounce.cooldown;
        } else {
          entity.root.position.copy(next);
          const directionX = flight.end.x - flight.start.x;
          const directionZ = flight.end.z - flight.start.z;
          entity.heading = Math.atan2(directionX, directionZ);
          entity.root.rotation.y = entityVisualYaw(entity.heading);
          if (entity.root.userData.legs) for (const leg of entity.root.userData.legs) leg.rotation.x = -0.35 + Math.sin(progress * Math.PI) * 0.7;
          if (progress >= 1) {
            entity.pounceFlight = null;
            entity.pounceCooldown = pounce.cooldown;
            entity.pounceTargetX = null;
            entity.pounceTargetZ = null;
            const landingDistance = Math.hypot(this.player.position.x - entity.root.position.x, this.player.position.z - entity.root.position.z);
            if (landingDistance < 1.65) {
              this.onSound(entity.type, 'attack', entity.root.position.clone(), entity.id);
              this.onAttackPlayer(pounce.damage, `${entity.definition.name} pounce`);
            }
          }
        }
        continue;
      }
      if (pounce && entity.pounceWindup > 0) {
        entity.pounceWindup = Math.max(0, entity.pounceWindup - dt);
        entity.heading = Math.atan2(entity.pounceTargetX - entity.root.position.x, entity.pounceTargetZ - entity.root.position.z);
        entity.root.rotation.y = entityVisualYaw(entity.heading);
        if (entity.root.userData.pounceBody) {
          const base = entity.root.userData.pounceBodyBase;
          entity.root.userData.pounceBody.scale.set(base.x * 1.08, base.y * 0.72, base.z * 1.08);
        }
        if (entity.pounceWindup <= 0) {
          const plan = pounceLandingPlan(this.world, entity.root.position, new THREE.Vector3(entity.pounceTargetX, this.player.position.y, entity.pounceTargetZ), pounce);
          if (plan) {
            entity.pounceFlight = { ...plan, elapsed: 0 };
            this.onSound(entity.type, 'attack', entity.root.position.clone(), entity.id);
          } else {
            entity.pounceCooldown = pounce.cooldown * 0.5;
            entity.pounceTargetX = null;
            entity.pounceTargetZ = null;
          }
        }
        continue;
      }
      if (pounce && chasing && entity.pounceCooldown <= 0 && distance >= pounce.minimumRange && distance <= pounce.maximumRange) {
        entity.pounceWindup = pounce.windup;
        entity.pounceTargetX = this.player.position.x;
        entity.pounceTargetZ = this.player.position.z;
        entity.persistent = true;
        entity.knockback.set(0, 0, 0);
        this.onPounceWindup(entity, { ...pounce });
        continue;
      }
      const retreating = ranged && chasing && distance < ranged.minimumRange;
      const holdingRange = ranged && chasing && distance >= ranged.minimumRange && distance <= ranged.range;
      const lured = !entity.definition.hostile && entity.definition.breedItem === this.getHeldItem() && distance < 10;
      const guardTarget = this.companionTargetFor(entity);
      const guarding = Boolean(guardTarget);
      let followingOwner = Boolean(entity.definition.companion && entity.tamed && !entity.sitting && !guarding && distance > 3.25);
      if (followingOwner && distance > 24) {
        const catchUpOffsets = [[-2, -2], [2, -2], [-2, 2], [2, 2], [0, -3]];
        for (const [offsetX, offsetZ] of catchUpOffsets) {
          const catchX = this.player.position.x + offsetX;
          const catchZ = this.player.position.z + offsetZ;
          const catchSurface = this.world.terrainHeight(Math.floor(catchX), Math.floor(catchZ));
          if (catchSurface <= 17) continue;
          entity.root.position.set(catchX, catchSurface + 1, catchZ);
          entity.knockback.set(0, 0, 0);
          followingOwner = false;
          break;
        }
      }
      let residentSchedule = null;
      if (entity.definition.resident && entity.settlementKey) {
        residentSchedule = this.getResidentSchedule(entity, worldTime);
        const stead = !residentSchedule && (this.world.hearthsteadsNear?.(entity.homeX, entity.homeZ, 5) || []).find((candidate) => candidate.key === entity.residenceKey);
        if (stead) residentSchedule = wayfarerSchedule(this.seed, entity.settlementKey, worldTime, this.world.hearthsteadFeatures(stead));
        if (residentSchedule) {
          residentSchedule = { ...residentSchedule, target: residentSchedule.target ? { ...residentSchedule.target, x: residentSchedule.target.x + (entity.residentSlot - 1) * 0.75, z: residentSchedule.target.z + (entity.residentSlot % 2 ? 0.5 : -0.25) } : null };
          entity.schedulePhase = residentSchedule.phase;
          entity.scheduleLabel = residentSchedule.label;
          entity.scheduleTradingOpen = residentSchedule.tradingOpen;
        }
      }
      const scheduleTarget = residentSchedule?.target;
      const scheduleDistance = scheduleTarget ? Math.hypot(entity.root.position.x - scheduleTarget.x, entity.root.position.z - scheduleTarget.z) : 0;
      const followingSchedule = Boolean(scheduleTarget && scheduleDistance > 0.7);
      if (guarding) entity.heading = Math.atan2(guardTarget.entity.root.position.x - entity.root.position.x, guardTarget.entity.root.position.z - entity.root.position.z);
      else if (followingOwner) entity.heading = Math.atan2(dx, dz);
      else if (followingSchedule) entity.heading = Math.atan2(scheduleTarget.x - entity.root.position.x, scheduleTarget.z - entity.root.position.z);
      else if (courting) entity.heading = Math.atan2(mateDx, mateDz);
      else if (chasing) {
        const flank = entity.packId && !retreating && distance > 2.5 ? ((entity.id % 3) - 1) * 0.2 : 0;
        entity.heading = (retreating ? Math.atan2(-dx, -dz) : Math.atan2(dx, dz)) + flank;
      }
      else if (lured) entity.heading = Math.atan2(dx, dz);
      else if (entity.thinkTimer <= 0) {
        entity.thinkTimer = 2 + this.random() * 4;
        entity.heading += (this.random() - 0.5) * Math.PI * 1.5;
        if (entity.definition.aquatic) {
          const waterY = aquaticSpawnHeight(this.world, entity.root.position.x, entity.root.position.z, this.random());
          if (waterY != null) entity.swimTargetY = waterY;
        }
        if (entity.definition.flying) {
          const surface = this.world.terrainHeight(Math.floor(entity.root.position.x), Math.floor(entity.root.position.z));
          entity.flightTargetY = Math.min(WORLD_HEIGHT - 3, surface + 3 + this.random() * 5);
        }
      }

      const hopper = entity.definition.hopper;
      if (hopper && entity.hopRemaining <= 0 && entity.hopCooldown <= 0) {
        entity.hopRemaining = hopper.duration;
        entity.hopCooldown = hopper.interval;
        if (chasing) entity.persistent = true;
      }
      const hopping = Boolean(hopper && entity.hopRemaining > 0);
      const chargingVolatile = Boolean(volatile && entity.volatileCharge > 0);
      let speed = entity.sitting || chargingVolatile ? 0 : guarding ? entity.definition.speed * 1.12 : followingOwner ? entity.definition.speed
        : holdingRange ? 0 : chasing ? entity.definition.speed * (entity.packId && entity.alertTimer > 0 ? 1.08 : 1) * (enraged ? 1.38 : 1)
          : followingSchedule ? entity.definition.speed * residentSchedule.speedMultiplier : courting ? entity.definition.speed * 0.75
            : lured ? entity.definition.speed * 0.65 : entity.definition.speed * 0.2;
      if (hopper) speed = hopping ? speed * hopper.speedMultiplier : 0;
      const step = speed * dt;
      const nextX = entity.root.position.x + Math.sin(entity.heading) * step + entity.knockback.x * dt;
      const nextZ = entity.root.position.z + Math.cos(entity.heading) * step + entity.knockback.z * dt;
      entity.knockback.multiplyScalar(Math.max(0, 1 - dt * 7));
      const terrainSurface = this.world.terrainHeight(Math.floor(nextX), Math.floor(nextZ));
      const nextSurface = entity.definition.subterranean
        ? structureWalkSurface(this.world, nextX, nextZ, entity.root.position.y, Number.NaN)
        : entity.watchKey || entity.definition.constructed
        ? structureWalkSurface(this.world, nextX, nextZ, entity.root.position.y, terrainSurface)
        : terrainSurface;
      const nextSwimHeight = entity.definition.aquatic ? aquaticSpawnHeight(this.world, nextX, nextZ, 0.5) : null;
      const currentSurface = entity.root.position.y - 1;
      if (entity.definition.stationary) {
        entity.root.position.x += (entity.homeX - entity.root.position.x) * Math.min(1, dt * 3);
        entity.root.position.z += (entity.homeZ - entity.root.position.z) * Math.min(1, dt * 3);
        entity.root.position.y = entity.homeY + Math.sin(entity.age * 2.2 + entity.id) * 0.08;
      } else if (entity.definition.aquatic && nextSwimHeight != null) {
        entity.root.position.x = nextX;
        entity.root.position.z = nextZ;
        const minimumY = nextSurface + 1.15;
        const maximumY = SEA_LEVEL - 0.55;
        const desiredY = chasing
          ? Math.max(minimumY, Math.min(maximumY, this.player.position.y + 0.75))
          : Math.max(minimumY, Math.min(maximumY, entity.swimTargetY + Math.sin(entity.age * 1.4 + entity.id) * 0.16));
        const verticalDelta = desiredY - entity.root.position.y;
        entity.root.position.y += verticalDelta * Math.min(1, dt * 2.2);
        entity.root.rotation.x = -Math.max(-0.32, Math.min(0.32, verticalDelta * 0.4));
      } else if (entity.definition.flying) {
        const minimumY = nextSurface + 2.25;
        const desiredY = Math.max(minimumY, Math.min(WORLD_HEIGHT - 3, chasing
          ? this.player.position.y + 1.15
          : entity.flightTargetY + Math.sin(entity.age * 1.8 + entity.id) * 0.35));
        const verticalDelta = desiredY - entity.root.position.y;
        const nextY = entity.root.position.y + verticalDelta * Math.min(1, dt * 2.6);
        const blocked = typeof this.world.getBlock === 'function' && [0.25, 0.9, 1.35].some((offset) => BLOCKS[this.world.getBlock(nextX, nextY + offset, nextZ)]?.solid);
        if (!blocked) {
          entity.root.position.set(nextX, nextY, nextZ);
          entity.root.rotation.x = -Math.max(-0.38, Math.min(0.38, verticalDelta * 0.28));
        } else {
          entity.heading += Math.PI * (0.65 + this.random() * 0.35);
          entity.flightTargetY = Math.min(WORLD_HEIGHT - 3, Math.max(minimumY, entity.root.position.y + 1.5));
          entity.thinkTimer = 0.35;
        }
      } else if (!entity.definition.aquatic
        && (entity.definition.subterranean ? Number.isFinite(nextSurface) && nextSurface >= 4
          && entity.definition.biomes.includes(this.world.undergroundBiomeAt(nextX, nextSurface + 1, nextZ).id)
          : nextSurface > (entity.definition.lowTerrain ? 8 : 17))
        && Math.abs(nextSurface - currentSurface) <= 1.1) {
        entity.root.position.x = nextX;
        entity.root.position.z = nextZ;
        entity.root.position.y += (nextSurface + 1 - entity.root.position.y) * Math.min(1, dt * 10);
      } else {
        entity.heading += Math.PI * (0.5 + this.random() * 0.5);
        entity.thinkTimer = 0.5;
      }
      entity.root.rotation.y = entityVisualYaw(entity.heading);
      if (entity.root.userData.bossCore) {
        const pulse = (enraged ? 1.18 : 1) + Math.sin(entity.age * (enraged ? 8 : 4)) * 0.12;
        entity.root.userData.bossCore.scale.setScalar(pulse);
      }
      if (entity.root.userData.echoCore) {
        const pulse = 1 + Math.sin(entity.age * 5.5) * 0.16;
        entity.root.userData.echoCore.scale.setScalar(pulse);
      }
      if (entity.root.userData.cinderCore) {
        const pulse = 1 + Math.sin(entity.age * (entity.definition.hostile ? 7 : 4)) * 0.13;
        entity.root.userData.cinderCore.scale.setScalar(pulse);
      }
      if (entity.root.userData.volatileCore) {
        const progress = volatile ? entity.volatileCharge / volatile.fuse : 0;
        const pulse = 1 + progress * 0.42 + Math.sin(entity.age * (5 + progress * 18)) * (0.08 + progress * 0.14);
        entity.root.userData.volatileCore.scale.setScalar(pulse);
        const base = entity.root.userData.volatileShellBase;
        entity.root.userData.volatileShell.scale.set(base.x * (1 + progress * 0.1), base.y * (1 + progress * 0.04), base.z * (1 + progress * 0.1));
      }
      if (entity.root.userData.pounceBody) {
        entity.root.userData.pounceBody.scale.copy(entity.root.userData.pounceBodyBase);
        const base = entity.root.userData.silkSpinnerBase;
        const pulse = 1 + Math.sin(entity.age * 4.5) * 0.08;
        entity.root.userData.silkSpinner.scale.set(base.x * pulse, base.y * pulse, base.z * pulse);
      }
      if (entity.root.userData.globBody) {
        const progress = hopper ? 1 - entity.hopRemaining / hopper.duration : 0;
        const lift = hopping ? Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI) * hopper.height : 0;
        const stretch = hopping ? 1 + Math.sin(progress * Math.PI) * 0.16 : 1;
        entity.root.userData.globBody.position.y = lift;
        entity.root.userData.globBody.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
      }
      if (entity.root.userData.tail) entity.root.userData.tail.rotation.z = Math.sin(entity.age * (entity.sitting ? 2.4 : 5.2)) * (entity.sitting ? 0.12 : 0.24);
      if (entity.root.userData.wings) {
        for (const wing of entity.root.userData.wings) wing.mesh.rotation.z = wing.side * (0.16 + Math.sin(entity.age * 13 + wing.phase) * 0.48);
      }
      if (entity.root.userData.guardCore) {
        const pulse = 1 + Math.sin(entity.age * 4.2) * 0.11;
        entity.root.userData.guardCore.scale.setScalar(pulse);
      }
      if (entity.root.userData.birdWings) {
        for (const wing of entity.root.userData.birdWings) {
          wing.mesh.rotation.z = wing.side * (0.08 + Math.sin(entity.age * (2.5 + speed * 2)) * 0.055);
        }
      }
      if (entity.root.userData.collar?.material?.color) entity.root.userData.collar.material.color.setHex(entity.downed ? 0x436e69 : 0x70e8dd);
      const stride = Math.sin(entity.age * speed * 7) * Math.min(0.55, speed * 0.25);
      if (entity.root.userData.guardArms) {
        for (let index = 0; index < entity.root.userData.guardArms.length; index += 1) {
          entity.root.userData.guardArms[index].rotation.x = -stride * (index % 2 ? -0.62 : 0.62);
        }
      }
      if (entity.definition.aquatic) {
        for (let index = 0; index < entity.root.userData.swimParts.length; index += 1) {
          entity.root.userData.swimParts[index].rotation.y = stride * (index < 2 ? 1 : 0.35) * (index % 2 ? -1 : 1);
        }
      } else {
        for (let index = 0; index < entity.root.userData.legs.length; index += 1) {
          entity.root.userData.legs[index].rotation.x = entity.sitting ? (index < 2 ? -0.42 : 0.68) : stride * (index % 2 ? -1 : 1);
        }
      }
      const splitScale = entity.definition.splitter ? entity.definition.splitter.scaleBySize[entity.globSize - 1] : 1;
      const baseScale = (entity.isBaby ? 0.55 : 1) * splitScale;
      entity.root.scale.setScalar(baseScale * (entity.hurtTimer > 0 ? 1.07 : 1));

      if (mate && mate.distance < 1.7 && entity.id < mate.entity.id) this.breedPair(entity, mate.entity);

      if (guardTarget && guardTarget.distance < (entity.definition.attackReach || 1.5) && entity.attackCooldown <= 0 && this.byId.has(guardTarget.entity.id)) {
        entity.attackCooldown = entity.definition.attackInterval || 0.85;
        this.onSound(entity.type, 'attack', entity.root.position.clone(), entity.id);
        this.attack(guardTarget.entity, entity.definition.damage || 2, entity.definition.attackKnockback || 1.4, entity.root.position);
      }

      if (hopper && landedHop && chasing) {
        const landingDistance = Math.hypot(this.player.position.x - entity.root.position.x, this.player.position.z - entity.root.position.z);
        if (landingDistance < 1.55) {
          this.onSound(entity.type, 'attack', entity.root.position.clone(), entity.id);
          this.onAttackPlayer(hopper.damage, `${entity.definition.name} hop`);
        }
      }

      if (ranged && chasing && distance <= ranged.range && distance >= ranged.minimumRange && entity.attackCooldown <= 0) {
        entity.attackCooldown = ranged.cooldown;
        this.onSound(entity.type, 'attack', entity.root.position.clone(), entity.id);
        this.onRangedAttack(entity, { ...ranged });
      } else if (!ranged && !volatile && !pounce && !hopper && chasing && distance < 1.45 && entity.attackCooldown <= 0) {
        entity.attackCooldown = 1.2;
        this.onSound(entity.type, 'attack', entity.root.position.clone(), entity.id);
        this.onAttackPlayer(entity.definition.damage + (enraged ? 2 : 0), entity.definition.name);
      }
    }
  }

  raycast(camera, distance = 6) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = distance;
    const hit = raycaster.intersectObject(this.root, true)[0];
    if (!hit) return null;
    let object = hit.object;
    while (object && object.userData.entityId == null) object = object.parent;
    const entity = this.byId.get(object?.userData.entityId);
    if (entity === this.mounted) return null;
    return entity ? { entity, distance: hit.distance, point: hit.point } : null;
  }

  entityAtPoint(point, radius = 0.35) {
    let closest = null;
    let closestDistance = Infinity;
    for (const entity of this.entities) {
      const dx = point.x - entity.root.position.x;
      const dy = point.y - (entity.root.position.y + 0.9);
      const dz = point.z - entity.root.position.z;
      const distance = Math.hypot(dx, dy * 0.72, dz);
      if (distance <= radius + 0.58 && distance < closestDistance) {
        closest = entity;
        closestDistance = distance;
      }
    }
    return closest;
  }

  attack(entity, damage = 2, knockback = 2, origin = this.player.position) {
    if (!entity || !this.byId.has(entity.id) || entity.hurtTimer > 0) return false;
    entity.health -= damage;
    this.alertPack(entity, 12);
    if (entity.health <= 0 && entity.definition.companion && entity.tamed) {
      entity.health = 1;
      entity.downed = true;
      entity.sitting = true;
      entity.persistent = true;
      entity.loveTimer = 0;
      entity.knockback.set(0, 0, 0);
      entity.hurtTimer = 0.24;
      if (entity.root.userData.collar?.material?.color) entity.root.userData.collar.material.color.setHex(0x436e69);
      this.onSound(entity.type, 'hurt', entity.root.position.clone(), entity.id);
      this.onMessage(`${entity.definition.name} is downed · offer Roasted Rimepod to help`);
      return true;
    }
    if (entity.definition.boss && entity.health > 0 && entity.health <= entity.definition.health * 0.5 && !entity.phaseTriggered) {
      entity.phaseTriggered = true;
      entity.alertTimer = 30;
      this.summonBossGuards(entity);
    }
    entity.hurtTimer = 0.24;
    this.onSound(entity.type, entity.health <= 0 ? 'death' : 'hurt', entity.root.position.clone(), entity.id);
    const away = entity.root.position.clone().sub(origin).setY(0).normalize();
    if (away.lengthSq() === 0) away.set(0, 0, 1);
    entity.knockback.copy(away).multiplyScalar(knockback);
    if (entity.health <= 0) {
      this.onMessage(`${entity.definition.name} defeated`);
      const split = entity.definition.splitter;
      const experience = split ? split.experienceBySize[entity.globSize - 1] : entity.definition.experience || 0;
      this.onDefeat(entity.type, experience, entity.root.position.clone(), entity);
      const children = split && entity.globSize > 1 ? this.splitCreature(entity) : [];
      if (children.length) this.onSplit(entity.root.position.clone(), children, entity);
      this.remove(entity, true);
    }
    return true;
  }

  splitCreature(entity, maximumHostiles = 12) {
    if (!entity?.definition.splitter || entity.globSize <= 1 || !this.byId.has(entity.id)) return [];
    const split = entity.definition.splitter;
    const hostileAfterParent = this.entities.filter((candidate) => candidate.definition.hostile && candidate !== entity).length;
    const capacity = Math.max(0, maximumHostiles - hostileAfterParent);
    const children = [];
    const offsets = [[-0.42, 0], [0.42, 0], [0, -0.42], [0, 0.42]];
    for (const [dx, dz] of offsets) {
      if (children.length >= Math.min(split.children, capacity)) break;
      const child = this.spawn(entity.type, entity.root.position.x + dx, entity.root.position.z + dz, {
        y: entity.root.position.y,
        globSize: entity.globSize - 1,
        persistent: entity.persistent,
      });
      if (child) children.push(child);
    }
    return children;
  }
}

export function deterministicSpawnSample(seed, count = 8) {
  return Array.from({ length: count }, (_, index) => coordinateRandom(index * 17, index * -11, seed, 43));
}
