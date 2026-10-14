import * as THREE from 'three';
import { itemDefinition } from './inventory.js';

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export function heldItemProfile(id) {
  const definition = id == null ? null : itemDefinition(id);
  if (!definition) return { id: null, type: 'hand', color: 0xc48c68, accent: 0x6d4938 };
  const key = String(id);
  let type = 'item';
  if (definition.scaffold) type = 'scaffold';
  else if (definition.outfitterStand) type = 'outfitterStand';
  else if (definition.hearthpot) type = 'hearthpot';
  else if (definition.mossweaveCarpet) type = 'carpet';
  else if (definition.trailBanner) type = 'banner';
  else if (definition.raincatchBasin) type = 'basin';
  else if (definition.archiveShelf) type = 'archiveShelf';
  else if (definition.infusionStill) type = 'infusionStill';
  else if (definition.forgeheartAnvil) type = 'forgeheartAnvil';
  else if (definition.runegrindWheel) type = 'runegrindWheel';
  else if (definition.stonewrightCutter) type = 'stonewrightCutter';
  else if (definition.furnaceMode) type = 'specializedFurnace';
  else if (definition.wayvault) type = 'wayvault';
  else if (definition.pane) type = 'pane';
  else if (definition.hearthcake) type = 'hearthcake';
  else if (definition.storageContainer === 'barrel') type = 'trailbarrel';
  else if (definition.torch) type = 'torch';
  else if (definition.resonanceBox) type = 'resonanceBox';
  else if (definition.waystar) type = 'waystar';
  else if (definition.hearthsongPlayer) type = 'hearthsongPlayer';
  else if (definition.forgeFunnel) type = 'forgeFunnel';
  else if (Number.isInteger(Number(id))) type = 'block';
  else if (key.includes('pickaxe')) type = 'pickaxe';
  else if (key.includes('_axe')) type = 'axe';
  else if (key.includes('shovel')) type = 'shovel';
  else if (key.includes('_hoe')) type = 'hoe';
  else if (key.includes('sword')) type = 'sword';
  else if (key === 'warden_maul') type = 'maul';
  else if (key === 'windbow') type = 'bow';
  else if (key === 'tide_rod') type = 'rod';
  else if (key === 'moss_shears') type = 'shears';
  else if (key === 'spark_striker') type = 'striker';
  else if (key === 'wayfinder_compass') type = 'compass';
  else if (key === 'trailchart') type = 'map';
  else if (key === 'oak_ladder') type = 'ladder';
  else if (key.startsWith('songstone_')) type = 'songstone';
  else if (key === 'forge_ejector') type = 'forgeEjector';
  else if (key === 'rune_dispenser') type = 'runeDispenser';
  else if (key === 'change_sentry') type = 'changeSentry';
  else if (key === 'binding_ram') type = 'bindingRam';
  else if (key === 'spark_inverter') type = 'sparkInverter';
  else if (key === 'spark_comparator') type = 'sparkComparator';
  else if (key === 'trail_tether') type = 'tether';
  else if (key === 'keepsake_frame') type = 'frame';
  else if (key === 'lore_folio') type = 'folio';
  else if (definition.category === 'pail') type = 'pail';
  else if (definition.category === 'food' || definition.category === 'tonic') type = 'consumable';
  else if (definition.category === 'shield') type = 'shield';
  return {
    id: key,
    type,
    color: definition.color ?? 0xb9a477,
    accent: definition.contents === 'water' ? 0x4f9bd5 : definition.contents === 'lava' ? 0xf07b2d : 0x5c4634,
    variant: definition.furnaceMode || definition.paneMaterial || null,
  };
}

export function heldItemPose(state = {}) {
  const time = Number(state.time) || 0;
  const moving = Boolean(state.moving);
  const sprint = Boolean(state.sprinting);
  const reducedMotion = Boolean(state.reducedMotion);
  const motionScale = reducedMotion ? 0.28 : 1;
  const bob = moving && !reducedMotion ? Math.sin(time * (sprint ? 13 : 9)) : 0;
  const mineSwing = state.mining ? Math.sin(time * 15) * 0.72 * motionScale : 0;
  const attack = clamp01(state.attack);
  const attackSwing = Math.sin(attack * Math.PI) * 0.92 * motionScale;
  const swing = mineSwing - attackSwing;
  const bow = clamp01(state.bowCharge);
  return {
    x: 0.56 + bob * 0.018 - bow * 0.18,
    y: -0.53 + Math.abs(bob) * 0.025 - (sprint ? 0.1 * motionScale : 0) + bow * 0.08,
    z: -0.82 + (sprint ? 0.05 * motionScale : 0) + bow * 0.12,
    rotationX: -0.16 + Math.abs(swing) * 0.32,
    rotationY: -0.2 + swing * 0.78,
    rotationZ: -0.08 + bob * 0.025 + swing * 0.34,
    bow,
    shieldX: state.blocking ? -0.43 : -0.68,
    shieldY: state.blocking ? -0.12 : -0.55,
    shieldZ: state.blocking ? -0.58 : -0.88,
    shieldRotationY: state.blocking ? 0.12 : 0.55,
  };
}

function material(color) {
  return new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false, toneMapped: false });
}

function piece(parent, scale, position, color, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material(color));
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.renderOrder = 1000;
  parent.add(mesh);
  return mesh;
}

function disposeGroup(group) {
  group.traverse((object) => {
    object.geometry?.dispose?.();
    object.material?.dispose?.();
  });
  group.clear();
}

function buildTool(parent, profile) {
  const wood = 0x805a38;
  const { type, color, accent } = profile;
  if (type === 'block') {
    piece(parent, [0.34, 0.34, 0.34], [0, 0.05, 0], color, [0.18, 0.5, 0.08]);
    piece(parent, [0.27, 0.025, 0.27], [0, 0.23, 0], 0xffffff, [0.18, 0.5, 0.08]).material.opacity = 0.12;
    parent.children.at(-1).material.transparent = true;
  } else if (type === 'scaffold') {
    for (const x of [-0.17, 0.17]) for (const z of [-0.08, 0.08]) piece(parent, [0.045, 0.54, 0.045], [x, 0.18, z], wood, [0, 0, -0.12]);
    for (const y of [-0.05, 0.18, 0.41]) piece(parent, [0.42, 0.045, 0.07], [0, y, 0], color, [0, 0, -0.12]);
    piece(parent, [0.42, 0.055, 0.22], [0, 0.48, 0], color, [0, 0, -0.12]);
  } else if (type === 'outfitterStand') {
    piece(parent, [0.5, 0.08, 0.34], [0, -0.04, 0], 0x85817b, [0, 0, -0.12]);
    piece(parent, [0.07, 0.64, 0.07], [0, 0.25, 0], color, [0, 0, -0.12]);
    piece(parent, [0.48, 0.07, 0.07], [0, 0.34, 0], color, [0, 0, -0.12]);
    piece(parent, [0.22, 0.2, 0.2], [0, 0.6, 0], color, [0, 0, -0.12]);
  } else if (type === 'hearthpot') {
    piece(parent, [0.38, 0.28, 0.38], [0, 0.1, 0], color, [0, 0, -0.12]);
    piece(parent, [0.5, 0.07, 0.5], [0, 0.25, 0], color, [0, 0, -0.12]);
    piece(parent, [0.31, 0.05, 0.31], [0, 0.28, 0], 0x42392f, [0, 0, -0.12]);
  } else if (type === 'carpet') {
    piece(parent, [0.62, 0.055, 0.46], [0, 0.08, 0], color, [0.18, 0.45, -0.08]);
    for (const x of [-0.27, -0.18, -0.09, 0, 0.09, 0.18, 0.27]) piece(parent, [0.025, 0.08, 0.035], [x, 0.03, 0.22], accent, [0.18, 0.45, -0.08]);
  } else if (type === 'banner') {
    piece(parent, [0.055, 0.72, 0.055], [-0.18, 0.18, 0], 0x805a38, [0, 0, -0.12]);
    piece(parent, [0.45, 0.055, 0.06], [0.02, 0.48, 0], 0x805a38, [0, 0, -0.12]);
    piece(parent, [0.38, 0.46, 0.045], [0.04, 0.25, 0], color, [0, 0, -0.12]);
    piece(parent, [0.08, 0.3, 0.055], [0.04, 0.26, 0.025], accent, [0, 0, -0.12]);
  } else if (type === 'basin') {
    piece(parent, [0.54, 0.1, 0.42], [0, -0.02, 0], color, [0.18, 0.45, -0.08]);
    piece(parent, [0.1, 0.38, 0.42], [-0.25, 0.17, 0], color, [0.18, 0.45, -0.08]);
    piece(parent, [0.1, 0.38, 0.42], [0.25, 0.17, 0], color, [0.18, 0.45, -0.08]);
    piece(parent, [0.42, 0.32, 0.09], [0, 0.14, -0.18], color, [0.18, 0.45, -0.08]);
    piece(parent, [0.42, 0.32, 0.09], [0, 0.14, 0.18], color, [0.18, 0.45, -0.08]);
  } else if (type === 'archiveShelf') {
    piece(parent, [0.54, 0.5, 0.18], [0, 0.2, 0], color, [0.16, 0.5, -0.08]);
    for (const y of [0.02, 0.25, 0.48]) piece(parent, [0.58, 0.06, 0.22], [0, y, 0], 0x754a2d, [0.16, 0.5, -0.08]);
    for (let index = 0; index < 6; index += 1) piece(parent, [0.065, 0.17, 0.205], [-0.21 + index * 0.085, index % 2 ? 0.34 : 0.13, -0.015], index % 3 === 0 ? 0xbf674f : index % 3 === 1 ? 0x4f9787 : 0xd1a45d, [0.16, 0.5, -0.08]);
  } else if (type === 'infusionStill') {
    piece(parent, [0.54, 0.11, 0.42], [0, -0.03, 0], 0x59696c, [0.16, 0.5, -0.08]);
    piece(parent, [0.1, 0.42, 0.1], [0, 0.19, 0], color, [0.16, 0.5, -0.08]);
    piece(parent, [0.46, 0.08, 0.3], [0, 0.38, 0], 0x89a7a8, [0.16, 0.5, -0.08]);
    for (const x of [-0.15, 0, 0.15]) {
      piece(parent, [0.1, 0.22, 0.1], [x, 0.22, 0.11], 0x7bdacb, [0.16, 0.5, -0.08]);
      piece(parent, [0.13, 0.05, 0.13], [x, 0.33, 0.11], 0xd4e4d6, [0.16, 0.5, -0.08]);
    }
  } else if (type === 'forgeheartAnvil') {
    piece(parent, [0.5, 0.1, 0.36], [0, -0.05, 0], 0x51575a, [0.16, 0.5, -0.08]);
    piece(parent, [0.17, 0.35, 0.2], [0, 0.15, 0], 0x676e70, [0.16, 0.5, -0.08]);
    piece(parent, [0.58, 0.15, 0.28], [-0.02, 0.36, 0], color, [0.16, 0.5, -0.08]);
    piece(parent, [0.2, 0.12, 0.3], [0.28, 0.36, 0], 0x3d4244, [0.16, 0.5, -0.08]);
    piece(parent, [0.1, 0.1, 0.06], [0, 0.22, 0.12], 0xf08a42, [0.16, 0.5, -0.08]);
  } else if (type === 'runegrindWheel') {
    piece(parent, [0.52, 0.08, 0.3], [0, -0.04, 0], 0x805a38, [0.16, 0.5, -0.08]);
    for (const x of [-0.2, 0.2]) piece(parent, [0.07, 0.5, 0.08], [x, 0.2, 0], 0x805a38, [0.16, 0.5, -0.08]);
    piece(parent, [0.46, 0.08, 0.08], [0, 0.38, 0], 0x6a7375, [0.16, 0.5, -0.08]);
    piece(parent, [0.34, 0.34, 0.12], [0, 0.22, 0.02], color, [0.16, 0.5, Math.PI / 4]);
    piece(parent, [0.1, 0.1, 0.14], [0, 0.22, 0.03], 0x70dac8, [0.16, 0.5, Math.PI / 4]);
  } else if (type === 'stonewrightCutter') {
    piece(parent, [0.52, 0.16, 0.4], [0, -0.02, 0], 0x805a38, [0.16, 0.5, -0.08]);
    piece(parent, [0.48, 0.12, 0.36], [0, 0.12, 0], color, [0.16, 0.5, -0.08]);
    piece(parent, [0.09, 0.46, 0.09], [0, 0.3, 0], 0x697174, [0.16, 0.5, -0.08]);
    piece(parent, [0.52, 0.08, 0.16], [0, 0.44, 0], 0xb7bebe, [0.16, 0.5, -0.08]);
    piece(parent, [0.07, 0.16, 0.18], [0, 0.5, 0], 0xe1e5e2, [0.16, 0.5, -0.08]);
  } else if (type === 'specializedFurnace') {
    const smoker = profile.variant === 'smoker';
    piece(parent, [0.48, 0.48, 0.42], [0, 0.16, 0], profile.color, [0.16, 0.5, -0.08]);
    for (const x of [-0.2, 0.2]) piece(parent, [0.055, 0.52, 0.46], [x, 0.16, 0], smoker ? 0x6b432b : 0x44494b, [0.16, 0.5, -0.08]);
    piece(parent, [0.28, 0.2, 0.035], [0, 0.14, 0.22], smoker ? 0x292421 : 0xd06c35, [0.16, 0.5, -0.08]);
    piece(parent, [0.34, 0.055, 0.46], [0, 0.42, 0], smoker ? 0x9b683d : 0xabb2b3, [0.16, 0.5, -0.08]);
  } else if (type === 'wayvault') {
    piece(parent, [0.5, 0.36, 0.4], [0, 0.12, 0], profile.color, [0.16, 0.5, -0.08]);
    piece(parent, [0.56, 0.12, 0.46], [0, 0.36, 0], 0x315f5e, [0.16, 0.5, -0.08]);
    for (const x of [-0.23, 0.23]) piece(parent, [0.055, 0.5, 0.44], [x, 0.16, 0], 0x1b282d, [0.16, 0.5, -0.08]);
    piece(parent, [0.14, 0.17, 0.035], [0, 0.18, 0.22], 0x6ee0cd, [0.16, 0.5, -0.08]);
  } else if (type === 'pane') {
    const glass = profile.variant === 'glass';
    piece(parent, [0.5, 0.5, 0.055], [0, 0.18, 0], profile.color, [0.16, 0.5, -0.08]);
    for (const x of [-0.22, 0.22]) piece(parent, [0.055, 0.54, 0.075], [x, 0.18, 0], glass ? 0xd5eff1 : 0x545c60, [0.16, 0.5, -0.08]);
    for (const y of [-0.06, 0.42]) piece(parent, [0.5, 0.055, 0.075], [0, y, 0], glass ? 0xd5eff1 : 0x545c60, [0.16, 0.5, -0.08]);
    if (!glass) piece(parent, [0.055, 0.5, 0.08], [0, 0.18, 0], 0xb68d4a, [0.16, 0.5, -0.08]);
  } else if (type === 'hearthcake') {
    piece(parent, [0.54, 0.22, 0.42], [0, 0.06, 0], 0xd69b4d, [0.16, 0.5, -0.08]);
    piece(parent, [0.56, 0.08, 0.44], [0, 0.2, 0], 0xeee4bb, [0.16, 0.5, -0.08]);
    for (const x of [-0.16, 0, 0.16]) piece(parent, [0.07, 0.06, 0.07], [x, 0.27, 0], 0xe0aa3c, [0.16, 0.5, -0.08]);
  } else if (type === 'trailbarrel') {
    piece(parent, [0.46, 0.52, 0.4], [0, 0.18, 0], profile.color, [0.16, 0.5, -0.08]);
    for (const y of [-0.05, 0.39]) piece(parent, [0.52, 0.075, 0.45], [0, y, 0], 0x654229, [0.16, 0.5, -0.08]);
    for (const y of [0.06, 0.3]) piece(parent, [0.5, 0.045, 0.44], [0, y, 0], 0x697174, [0.16, 0.5, -0.08]);
    piece(parent, [0.18, 0.055, 0.18], [0, 0.46, 0], 0xc19652, [0.16, 0.5, -0.08]);
  } else if (type === 'torch') {
    piece(parent, [0.08, 0.62, 0.08], [0, 0.18, 0], 0x805a38, [0, 0, -0.42]);
    piece(parent, [0.19, 0.2, 0.19], [-0.14, 0.49, 0], 0xf2b544, [0, 0, -0.42]);
    piece(parent, [0.09, 0.11, 0.09], [-0.18, 0.58, 0], 0xffe08a, [0, 0, -0.42]);
  } else if (type === 'resonanceBox') {
    piece(parent, [0.5, 0.42, 0.44], [0, 0.15, 0], profile.color, [0.16, 0.5, -0.08]);
    for (const y of [-0.03, 0.34]) piece(parent, [0.56, 0.07, 0.49], [0, y, 0], 0x68452d, [0.16, 0.5, -0.08]);
    piece(parent, [0.22, 0.09, 0.22], [0, 0.42, 0], 0x70dac8, [0.16, 0.5, -0.08]);
  } else if (type === 'waystar') {
    piece(parent, [0.52, 0.09, 0.48], [0, -0.01, 0], 0x6f797b, [0.16, 0.5, -0.08]);
    piece(parent, [0.42, 0.38, 0.38], [0, 0.21, 0], 0xb8dbdc, [0.16, 0.5, -0.08]);
    piece(parent, [0.22, 0.22, 0.22], [0, 0.23, 0], 0x58dacc, [0.16, 0.5, -0.08]);
    piece(parent, [0.1, 0.13, 0.1], [0, 0.47, 0], 0xe1fff9, [0.16, 0.5, -0.08]);
  } else if (type === 'hearthsongPlayer') {
    piece(parent, [0.54, 0.46, 0.48], [0, 0.15, 0], profile.color, [0.16, 0.5, -0.08]);
    piece(parent, [0.58, 0.09, 0.52], [0, -0.05, 0], 0x5a3c29, [0.16, 0.5, -0.08]);
    piece(parent, [0.32, 0.055, 0.2], [0, 0.4, 0], 0x272d31, [0.16, 0.5, -0.08]);
    piece(parent, [0.12, 0.08, 0.05], [0, 0.23, -0.25], 0x48cbbd, [0.16, 0.5, -0.08]);
  } else if (type === 'forgeFunnel') {
    for (const x of [-0.21, 0.21]) piece(parent, [0.08, 0.2, 0.46], [x, 0.3, 0], 0x7d898c, [0.16, 0.5, -0.08]);
    for (const z of [-0.19, 0.19]) piece(parent, [0.36, 0.2, 0.08], [0, 0.3, z], 0x7d898c, [0.16, 0.5, -0.08]);
    piece(parent, [0.34, 0.22, 0.34], [0, 0.13, 0], profile.color, [0.16, 0.5, -0.08]);
    piece(parent, [0.15, 0.2, 0.15], [0, -0.08, 0], 0x4b5356, [0.16, 0.5, -0.08]);
  } else if (type === 'forgeEjector') {
    piece(parent, [0.5, 0.5, 0.46], [0, 0.17, 0], profile.color, [0.16, 0.5, -0.08]);
    for (const x of [-0.21, 0.21]) piece(parent, [0.055, 0.54, 0.5], [x, 0.17, 0], 0x4d5558, [0.16, 0.5, -0.08]);
    for (const y of [-0.06, 0.4]) piece(parent, [0.5, 0.055, 0.5], [0, y, 0], 0x4d5558, [0.16, 0.5, -0.08]);
    piece(parent, [0.25, 0.25, 0.08], [0, 0.17, -0.25], 0x252b2d, [0.16, 0.5, -0.08]);
    piece(parent, [0.1, 0.1, 0.09], [0, 0.17, -0.3], 0x72d9cb, [0.16, 0.5, -0.08]);
  } else if (type === 'runeDispenser') {
    piece(parent, [0.52, 0.52, 0.48], [0, 0.17, 0], profile.color, [0.16, 0.5, -0.08]);
    for (const y of [-0.05, 0.39]) piece(parent, [0.56, 0.07, 0.52], [0, y, 0], 0x3f4950, [0.16, 0.5, -0.08]);
    piece(parent, [0.3, 0.3, 0.08], [0, 0.17, -0.26], 0x182126, [0.16, 0.5, -0.08]);
    for (const angle of [0, Math.PI / 2]) piece(parent, [0.06, 0.4, 0.06], [0, 0.17, -0.31], 0x7de2d4, [0.16, 0.5, angle]);
  } else if (type === 'changeSentry') {
    piece(parent, [0.52, 0.5, 0.48], [0, 0.17, 0], profile.color, [0.16, 0.5, -0.08]);
    for (const y of [-0.04, 0.38]) piece(parent, [0.56, 0.06, 0.5], [0, y, 0], 0x596263, [0.16, 0.5, -0.08]);
    piece(parent, [0.34, 0.3, 0.06], [0, 0.18, -0.26], 0x313b3c, [0.16, 0.5, -0.08]);
    for (const x of [-0.1, 0.1]) piece(parent, [0.07, 0.07, 0.075], [x, 0.2, -0.3], 0xe7b85c, [0.16, 0.5, -0.08]);
    piece(parent, [0.08, 0.22, 0.08], [0, 0.18, 0.27], 0x70d6c8, [0.16, 0.5, -0.08]);
  } else if (type === 'bindingRam') {
    piece(parent, [0.5, 0.5, 0.46], [0, 0.17, 0], profile.color, [0.16, 0.5, -0.08]);
    for (const y of [-0.04, 0.38]) piece(parent, [0.54, 0.06, 0.5], [0, y, 0], 0x485854, [0.16, 0.5, -0.08]);
    piece(parent, [0.18, 0.18, 0.32], [0, 0.17, -0.27], 0x677476, [0.16, 0.5, -0.08]);
    piece(parent, [0.38, 0.38, 0.08], [0, 0.17, -0.42], 0x72d1ad, [0.16, 0.5, -0.08]);
    for (const angle of [0, Math.PI / 2]) piece(parent, [0.045, 0.34, 0.045], [0, 0.17, -0.47], 0xd5e46c, [0.16, 0.5, angle]);
  } else if (type === 'sparkInverter') {
    piece(parent, [0.54, 0.06, 0.42], [0, -0.03, 0], 0x767b78, [0.16, 0.5, -0.08]);
    piece(parent, [0.08, 0.46, 0.08], [0, 0.18, 0], 0x5f4632, [0.16, 0.5, -0.08]);
    piece(parent, [0.19, 0.16, 0.19], [0, 0.4, 0], profile.color, [0.16, 0.5, -0.08]);
    piece(parent, [0.09, 0.08, 0.09], [0, 0.49, 0], 0xffdf83, [0.16, 0.5, -0.08]);
    piece(parent, [0.38, 0.05, 0.05], [0, 0.02, 0.16], 0x65d5c4, [0.16, 0.5, -0.08]);
  } else if (type === 'sparkComparator') {
    piece(parent, [0.56, 0.07, 0.46], [0, -0.02, 0], 0x747c79, [0.16, 0.5, -0.08]);
    for (const x of [-0.17, 0.17]) piece(parent, [0.08, 0.24, 0.08], [x, 0.12, 0.1], 0x5e4634, [0.16, 0.5, -0.08]);
    piece(parent, [0.1, 0.31, 0.1], [0, 0.16, -0.12], 0x62d7c8, [0.16, 0.5, -0.08]);
    piece(parent, [0.42, 0.045, 0.05], [0, 0.025, 0.12], 0x57cdbc, [0.16, 0.5, -0.08]);
    piece(parent, [0.32, 0.045, 0.05], [0, 0.025, -0.12], 0xb58bd0, [0.16, 0.5, -0.08]);
  } else if (type === 'songstone') {
    piece(parent, [0.5, 0.055, 0.5], [0, 0.18, 0], 0x252a2e, [0.16, 0.5, -0.08]);
    piece(parent, [0.2, 0.065, 0.2], [0, 0.2, 0], profile.color, [0.16, 0.5, -0.08]);
  } else if (['pickaxe', 'axe', 'shovel', 'hoe', 'sword', 'maul', 'rod'].includes(type)) {
    const length = type === 'rod' ? 0.82 : type === 'maul' ? 0.65 : 0.62;
    piece(parent, [0.075, length, 0.075], [0, length * 0.22, 0], wood, [0, 0, -0.52]);
    if (type === 'pickaxe') piece(parent, [0.56, 0.1, 0.12], [-0.2, 0.48, 0], color, [0, 0, -0.15]);
    if (type === 'axe') piece(parent, [0.3, 0.3, 0.11], [-0.2, 0.44, 0], color, [0, 0, 0.16]);
    if (type === 'shovel') piece(parent, [0.22, 0.3, 0.1], [-0.24, 0.48, 0], color, [0, 0, -0.52]);
    if (type === 'hoe') piece(parent, [0.4, 0.1, 0.1], [-0.17, 0.47, 0], color, [0, 0, -0.18]);
    if (type === 'sword') {
      piece(parent, [0.11, 0.64, 0.055], [-0.23, 0.46, 0], color, [0, 0, -0.52]);
      piece(parent, [0.38, 0.08, 0.1], [-0.05, 0.18, 0], accent, [0, 0, -0.52]);
    }
    if (type === 'maul') piece(parent, [0.48, 0.3, 0.3], [-0.2, 0.52, 0], color, [0.12, 0, -0.52]);
    if (type === 'rod') piece(parent, [0.04, 0.82, 0.04], [-0.24, 0.54, 0], color, [0, 0, -0.52]);
  } else if (type === 'ladder') {
    piece(parent, [0.07, 0.68, 0.07], [-0.16, 0.18, 0], color, [0, 0, -0.12]);
    piece(parent, [0.07, 0.68, 0.07], [0.16, 0.18, 0], color, [0, 0, -0.12]);
    for (const y of [-0.06, 0.12, 0.3, 0.48]) piece(parent, [0.36, 0.055, 0.065], [0, y, 0], color, [0, 0, -0.12]);
  } else if (type === 'tether') {
    for (let index = 0; index < 7; index += 1) {
      const angle = index / 7 * Math.PI * 2;
      piece(parent, [0.055, 0.055, 0.18], [Math.cos(angle) * 0.2, 0.2 + Math.sin(angle) * 0.2, 0], color, [0, 0, -angle]);
    }
    piece(parent, [0.07, 0.34, 0.07], [0.24, -0.02, 0], accent, [0, 0, -0.42]);
  } else if (type === 'frame') {
    piece(parent, [0.46, 0.055, 0.08], [0, 0.4, 0], color, [0, 0, -0.12]);
    piece(parent, [0.46, 0.055, 0.08], [0, -0.02, 0], color, [0, 0, -0.12]);
    piece(parent, [0.055, 0.46, 0.08], [-0.21, 0.19, 0], color, [0, 0, -0.12]);
    piece(parent, [0.055, 0.46, 0.08], [0.21, 0.19, 0], color, [0, 0, -0.12]);
    piece(parent, [0.34, 0.34, 0.045], [0, 0.19, 0.03], 0x775038, [0, 0, -0.12]);
  } else if (type === 'folio') {
    piece(parent, [0.48, 0.055, 0.38], [0, 0.16, 0], 0x785238, [0.08, 0.48, -0.06]);
    piece(parent, [0.42, 0.08, 0.34], [0, 0.2, 0], 0xd8c998, [0.08, 0.48, -0.06]);
    piece(parent, [0.48, 0.055, 0.38], [0, 0.25, 0], color, [0.08, 0.48, -0.06]);
    piece(parent, [0.06, 0.13, 0.4], [-0.22, 0.2, 0], 0x5d3e2e, [0.08, 0.48, -0.06]);
  } else if (type === 'bow') {
    const upper = piece(parent, [0.07, 0.46, 0.07], [-0.08, 0.29, 0], color, [0, 0, -0.32]);
    const lower = piece(parent, [0.07, 0.46, 0.07], [-0.08, -0.1, 0], color, [0, 0, 0.32]);
    piece(parent, [0.035, 0.78, 0.025], [0.03, 0.1, 0], 0xd9d3b1);
    parent.userData.bowArms = [upper, lower];
  } else if (type === 'shears') {
    piece(parent, [0.08, 0.56, 0.055], [-0.13, 0.25, 0], color, [0, 0, -0.38]);
    piece(parent, [0.08, 0.56, 0.055], [0.13, 0.25, 0], color, [0, 0, 0.38]);
    piece(parent, [0.22, 0.18, 0.08], [-0.18, -0.03, 0], accent, [0, 0, -0.38]);
    piece(parent, [0.22, 0.18, 0.08], [0.18, -0.03, 0], accent, [0, 0, 0.38]);
    piece(parent, [0.11, 0.11, 0.09], [0, 0.15, 0], 0x6d6258);
  } else if (type === 'striker') {
    piece(parent, [0.12, 0.5, 0.12], [-0.08, 0.16, 0], 0xaeb6b4, [0, 0, -0.45]);
    piece(parent, [0.34, 0.13, 0.13], [0.08, 0.35, 0], 0x6e7879, [0, 0, 0.22]);
    piece(parent, [0.18, 0.22, 0.15], [0.2, 0.42, 0], 0x45494a, [0.1, 0, 0.55]);
    piece(parent, [0.09, 0.09, 0.09], [0.3, 0.5, 0], 0xffb548);
  } else if (type === 'pail') {
    piece(parent, [0.34, 0.08, 0.3], [0, -0.05, 0], color);
    piece(parent, [0.08, 0.32, 0.3], [-0.16, 0.1, 0], color);
    piece(parent, [0.08, 0.32, 0.3], [0.16, 0.1, 0], color);
    if (profile.accent !== 0x5c4634) piece(parent, [0.24, 0.04, 0.22], [0, 0.14, 0], accent);
  } else if (type === 'compass') {
    piece(parent, [0.34, 0.06, 0.34], [0, 0.02, 0], 0x6b5234, [0.08, 0.25, 0]);
    piece(parent, [0.28, 0.075, 0.28], [0, 0.055, 0], color, [0.08, 0.25, 0]);
    piece(parent, [0.055, 0.035, 0.23], [0, 0.105, -0.025], 0x70e8dd, [0, -0.25, 0]);
    piece(parent, [0.06, 0.04, 0.11], [0, 0.108, 0.145], 0xd85444, [0, -0.25, 0]);
    piece(parent, [0.05, 0.08, 0.05], [0, 0.12, 0], 0xf3e7b5);
  } else if (type === 'map') {
    piece(parent, [0.5, 0.035, 0.42], [0, 0.04, 0], color, [0.15, 0.2, 0.05]);
    piece(parent, [0.08, 0.045, 0.18], [-0.12, 0.07, -0.04], 0x63885b, [0.15, 0.2, 0.05]);
    piece(parent, [0.16, 0.047, 0.09], [0.09, 0.072, 0.09], 0xb8894d, [0.15, 0.2, 0.05]);
    piece(parent, [0.045, 0.055, 0.045], [0, 0.09, -0.02], 0x70e8dd, [0.15, 0.2, 0.05]);
  } else if (type === 'consumable') {
    piece(parent, [0.25, 0.32, 0.25], [0, 0.05, 0], color, [0.1, 0.25, 0.05]);
    piece(parent, [0.11, 0.08, 0.11], [0, 0.25, 0], accent);
  } else if (type !== 'hand') piece(parent, [0.25, 0.25, 0.25], [0, 0.03, 0], color, [0.15, 0.4, 0]);
}

export class HeldItemView {
  constructor(scene, camera) {
    this.camera = camera;
    if (!camera.parent) scene.add(camera);
    this.root = new THREE.Group();
    this.root.name = 'First Person Held Item';
    camera.add(this.root);
    this.arm = new THREE.Group();
    piece(this.arm, [0.24, 0.72, 0.22], [0.08, -0.23, 0.17], 0xc48c68, [0, 0, -0.18]);
    this.cuff = piece(this.arm, [0.26, 0.2, 0.24], [0.02, 0.04, 0.1], 0x53655a, [0, 0, -0.18]);
    this.itemRoot = new THREE.Group();
    this.itemRoot.position.set(-0.14, 0.16, -0.02);
    this.root.add(this.arm, this.itemRoot);
    this.shieldRoot = new THREE.Group();
    piece(this.shieldRoot, [0.52, 0.7, 0.1], [0, 0, 0], 0x8c623d);
    piece(this.shieldRoot, [0.08, 0.72, 0.13], [0, 0, -0.02], 0xc1c7c2);
    piece(this.shieldRoot, [0.54, 0.08, 0.13], [0, 0.13, -0.02], 0xc1c7c2);
    camera.add(this.shieldRoot);
    this.currentId = Symbol('unset');
    this.time = 0;
  }

  setItem(id) {
    const profile = heldItemProfile(id);
    if (profile.id === this.currentId) return false;
    this.currentId = profile.id;
    disposeGroup(this.itemRoot);
    this.itemRoot.userData = {};
    buildTool(this.itemRoot, profile);
    this.profile = profile;
    return true;
  }

  update(dt, state = {}) {
    this.time += Math.max(0, Math.min(0.05, Number(dt) || 0));
    this.setItem(state.id);
    const pose = heldItemPose({ ...state, time: this.time });
    this.root.visible = Boolean(state.visible);
    this.shieldRoot.visible = Boolean(state.visible && state.hasShield);
    this.root.position.set(pose.x, pose.y, pose.z);
    this.root.rotation.set(pose.rotationX, pose.rotationY, pose.rotationZ);
    this.shieldRoot.position.set(pose.shieldX, pose.shieldY, pose.shieldZ);
    this.shieldRoot.rotation.set(-0.08, pose.shieldRotationY, -0.05);
    if (this.profile?.type === 'bow' && this.itemRoot.userData.bowArms) {
      this.itemRoot.userData.bowArms[0].rotation.z = -0.32 - pose.bow * 0.34;
      this.itemRoot.userData.bowArms[1].rotation.z = 0.32 + pose.bow * 0.34;
      this.itemRoot.scale.z = 1 + pose.bow * 0.35;
    } else this.itemRoot.scale.set(1, 1, 1);
    const primary = state.cosmetic?.primary;
    this.cuff.material.color.setHex(Number.isFinite(primary) ? primary : 0x53655a);
    return pose;
  }
}
