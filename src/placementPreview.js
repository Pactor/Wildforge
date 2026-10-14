import * as THREE from 'three';
import { bedPlan } from './beds.js';
import { BLOCK, BLOCKS, isLiquidBlock } from './blocks.js';
import { doorPlan } from './doors.js';
import { directionalCircuitId } from './circuits.js';
import { gateIdFor } from './gates.js';
import { signIdFor } from './signs.js';
import { railPlacementId } from './rails.js';
import { stairIdFor } from './stairs.js';
import { trapdoorIdFor } from './trapdoors.js';
import { ladderIdForSupport } from './ladders.js';
import { keepsakeFrameIdForSupport } from './keepsakeFrames.js';
import { paneBoxesForConnections } from './panes.js';
import { hearthcakeBounds } from './hearthcake.js';
import { torchGeometry, torchIdForSupport } from './torches.js';
import { funnelBounds, funnelIdForSupport } from './funnels.js';
import { ejectorBounds, ejectorIdForSupport } from './ejectors.js';
import { dispenserBounds, dispenserIdForSupport } from './dispensers.js';
import { sentryBounds, sentryIdForSupport } from './changeSentries.js';

export function rotatedPlacementYaw(playerYaw, quarterTurns = 0) {
  const yaw = Number(playerYaw) || 0;
  return yaw + Math.round(Number(quarterTurns) || 0) * Math.PI / 2;
}

export function cardinalForYaw(yaw) {
  const dx = -Math.sin(yaw);
  const dz = -Math.cos(yaw);
  return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'E' : 'W') : (dz > 0 ? 'S' : 'N');
}

export function placementPlan(itemId, position, yaw, supportPosition = null) {
  if (!position) return null;
  const x = Math.floor(position.x);
  const y = Math.floor(position.y);
  const z = Math.floor(position.z);
  if (itemId === 'wooden_door') {
    const plan = doorPlan(x, y, z, yaw);
    return { itemId, kind: 'door', orientation: plan.orientation.toUpperCase(), parts: [plan.bottom, plan.top] };
  }
  if (itemId === 'moss_bed') {
    const plan = bedPlan(x, y, z, yaw);
    return { itemId, kind: 'bed', orientation: plan.orientation.toUpperCase(), parts: [plan.foot, plan.head] };
  }
  if (itemId === 'oak_gate') {
    const id = gateIdFor(yaw);
    return { itemId, kind: 'gate', orientation: cardinalForYaw(yaw), parts: [{ x, y, z, id }] };
  }
  if (itemId === 'oak_stairs' || itemId === 'stone_stairs') {
    const id = stairIdFor(itemId, yaw);
    return { itemId, kind: 'stair', orientation: cardinalForYaw(yaw), parts: [{ x, y, z, id }] };
  }
  if (itemId === 'oak_trapdoor') {
    const id = trapdoorIdFor(yaw);
    return { itemId, kind: 'trapdoor', orientation: cardinalForYaw(yaw), parts: [{ x, y, z, id }] };
  }
  if (itemId === 'oak_sign') {
    const id = signIdFor(yaw);
    return { itemId, kind: 'sign', orientation: cardinalForYaw(yaw), parts: [{ x, y, z, id }] };
  }
  if (itemId === 'oak_ladder') {
    const id = ladderIdForSupport(position, supportPosition, yaw);
    return { itemId, kind: 'ladder', orientation: BLOCKS[id].ladderFacing.toUpperCase(), support: supportPosition, parts: [{ x, y, z, id }] };
  }
  if (itemId === 'keepsake_frame') {
    const id = keepsakeFrameIdForSupport(position, supportPosition, yaw);
    return { itemId, kind: 'keepsakeFrame', orientation: BLOCKS[id].frameFacing.toUpperCase(), support: supportPosition, parts: [{ x, y, z, id }] };
  }
  if (Number(itemId) === BLOCK.TORCH) {
    const id = torchIdForSupport(position, supportPosition, yaw);
    return { itemId, kind: 'torch', orientation: BLOCKS[id].torchFacing.toUpperCase(), support: supportPosition, parts: [{ x, y, z, id }] };
  }
  if (Number(itemId) === BLOCK.FORGE_FUNNEL_DOWN) {
    const id = funnelIdForSupport(position, supportPosition, yaw);
    return { itemId, kind: 'forgeFunnel', orientation: BLOCKS[id].funnelFacing.toUpperCase(), support: supportPosition, parts: [{ x, y, z, id }] };
  }
  if (itemId === 'forge_ejector') {
    const id = ejectorIdForSupport(position, supportPosition, yaw);
    return { itemId, kind: 'forgeEjector', orientation: BLOCKS[id].ejectorFacing, support: supportPosition, parts: [{ x, y, z, id }] };
  }
  if (itemId === 'rune_dispenser') {
    const id = dispenserIdForSupport(position, supportPosition, yaw);
    return { itemId, kind: 'runeDispenser', orientation: BLOCKS[id].dispenserFacing, support: supportPosition, parts: [{ x, y, z, id }] };
  }
  if (itemId === 'change_sentry') {
    const id = sentryIdForSupport(position, supportPosition, yaw);
    return { itemId, kind: 'changeSentry', orientation: BLOCKS[id].sentryFacing, support: supportPosition, parts: [{ x, y, z, id }] };
  }
  if (['spark_relay', 'spark_inverter', 'spark_comparator', 'forge_ram', 'binding_ram', 'pulse_sequencer', 'freight_loader', 'freight_unloader'].includes(itemId)) {
    const id = directionalCircuitId(itemId, yaw);
    const kind = itemId === 'spark_relay' ? 'relay' : itemId === 'spark_inverter' ? 'inverter' : itemId === 'spark_comparator' ? 'comparator' : itemId === 'forge_ram' || itemId === 'binding_ram' ? 'ram' : itemId === 'pulse_sequencer' ? 'sequencer' : 'freight';
    return { itemId, kind, orientation: cardinalForYaw(yaw), parts: [{ x, y, z, id }] };
  }
  if (itemId === 'forge_rail' || itemId === 'powered_rail') {
    const id = railPlacementId(itemId, yaw);
    return { itemId, kind: 'rail', orientation: cardinalForYaw(yaw), parts: [{ x, y, z, id }] };
  }
  const id = Number(itemId);
  if (!Number.isInteger(id) || !BLOCKS[id] || id === BLOCK.AIR || isLiquidBlock(id)) return null;
  return { itemId, kind: BLOCKS[id].trailBanner ? 'trailBanner' : 'block', orientation: cardinalForYaw(yaw), parts: [{ x, y, z, id }] };
}

function stairBoxes(model) {
  const upper = model.endsWith('N') ? [0, 0.5, 0, 1, 1, 0.5]
    : model.endsWith('S') ? [0, 0.5, 0.5, 1, 1, 1]
      : model.endsWith('E') ? [0.5, 0.5, 0, 1, 1, 1]
        : [0, 0.5, 0, 0.5, 1, 1];
  return [[0, 0, 0, 1, 0.5, 1], upper];
}

function gateBoxes(model) {
  const alongX = model.endsWith('X');
  return alongX
    ? [[0, 0, 0.36, 0.18, 1.35, 0.64], [0.82, 0, 0.36, 1, 1.35, 0.64], [0.16, 0.43, 0.41, 0.84, 0.65, 0.59], [0.16, 0.93, 0.41, 0.84, 1.15, 0.59]]
    : [[0.36, 0, 0, 0.64, 1.35, 0.18], [0.36, 0, 0.82, 0.64, 1.35, 1], [0.41, 0.43, 0.16, 0.59, 0.65, 0.84], [0.41, 0.93, 0.16, 0.59, 1.15, 0.84]];
}

export function previewBoxes(id) {
  const definition = BLOCKS[id];
  if (!definition) return [];
  const model = definition.model || '';
  if (model === 'chest') return [
    [0.08, 0.04, 0.08, 0.92, 0.64, 0.92],
    [0.04, 0.62, 0.04, 0.96, 0.86, 0.96],
    [0.03, 0.04, 0.03, 0.97, 0.13, 0.97],
    [0.03, 0.57, 0.03, 0.97, 0.67, 0.97],
    [0.42, 0.45, 0.015, 0.58, 0.69, 0.1],
  ];
  if (model === 'craftingTable') return [[0.08, 0.68, 0.08, 0.92, 0.88, 0.92], [0.12, 0, 0.12, 0.28, 0.7, 0.28], [0.72, 0, 0.12, 0.88, 0.7, 0.28], [0.12, 0, 0.72, 0.28, 0.7, 0.88], [0.72, 0, 0.72, 0.88, 0.7, 0.88]];
  if (model === 'furnace') return [[0.06, 0, 0.06, 0.94, 0.78, 0.94], [0.13, 0.76, 0.13, 0.87, 0.9, 0.87], [0.25, 0.16, 0.015, 0.75, 0.52, 0.12]];
  if (model === 'forgeKiln') return [[0.08, 0, 0.08, 0.92, 0.82, 0.92], [0.18, 0.8, 0.18, 0.82, 0.96, 0.82], [0.23, 0.14, 0.02, 0.77, 0.57, 0.14]];
  if (model === 'hearthSmoker') return [[0.08, 0, 0.08, 0.92, 0.74, 0.92], [0.16, 0.72, 0.16, 0.84, 0.84, 0.84], [0.38, 0.82, 0.38, 0.62, 1.08, 0.62], [0.24, 0.18, 0.02, 0.76, 0.54, 0.13]];
  if (model === 'blastKeg') return [[0.14, 0.04, 0.14, 0.86, 0.86, 0.86], [0.08, 0, 0.08, 0.92, 0.13, 0.92], [0.08, 0.77, 0.08, 0.92, 0.9, 0.92], [0.44, 0.86, 0.44, 0.56, 1.02, 0.56]];
  if (model === 'hearthguardCore') return [[0.08, 0, 0.08, 0.92, 0.14, 0.92], [0.26, 0.12, 0.26, 0.74, 0.3, 0.74], [0.34, 0.28, 0.34, 0.66, 0.86, 0.66]];
  if (model === 'forgeLamp') return [[0.12, 0, 0.12, 0.88, 0.12, 0.88], [0.42, 0.1, 0.42, 0.58, 0.7, 0.58], [0.2, 0.42, 0.2, 0.8, 0.82, 0.8]];
  if (model === 'slab') return [[0, 0, 0, 1, 0.5, 1]];
  if (model.startsWith('stair')) return stairBoxes(model);
  if (model.startsWith('trapClosed')) return [[0, 0, 0, 1, 0.1875, 1]];
  if (model === 'trapOpenN') return [[0, 0, 0, 1, 1, 0.1875]];
  if (model === 'trapOpenS') return [[0, 0, 0.8125, 1, 1, 1]];
  if (model === 'trapOpenE') return [[0.8125, 0, 0, 1, 1, 1]];
  if (model === 'trapOpenW') return [[0, 0, 0, 0.1875, 1, 1]];
  if (model.startsWith('gate')) return gateBoxes(model);
  if (model === 'panelX') return [[0.44, 0, 0, 0.56, 1, 1]];
  if (model === 'panelZ') return [[0, 0, 0.44, 1, 1, 0.56]];
  if (definition.bed) return [[0.04, 0.12, 0.04, 0.96, 0.5, 0.96]];
  if (definition.sign) {
    const alongX = definition.signOrientation === 'n' || definition.signOrientation === 's';
    return [[0.45, 0, 0.45, 0.55, 0.5, 0.55], alongX ? [0.06, 0.48, 0.44, 0.94, 0.98, 0.56] : [0.44, 0.48, 0.06, 0.56, 0.98, 0.94]];
  }
  if (definition.ladder) {
    const facing = definition.ladderFacing;
    return facing === 'n' ? [[0.14, 0.02, 0.02, 0.86, 0.98, 0.1]]
      : facing === 's' ? [[0.14, 0.02, 0.9, 0.86, 0.98, 0.98]]
        : facing === 'e' ? [[0.9, 0.02, 0.14, 0.98, 0.98, 0.86]]
          : [[0.02, 0.02, 0.14, 0.1, 0.98, 0.86]];
  }
  if (definition.scaffold) return [
    [0.06, 0, 0.06, 0.18, 0.94, 0.18], [0.82, 0, 0.06, 0.94, 0.94, 0.18],
    [0.06, 0, 0.82, 0.18, 0.94, 0.94], [0.82, 0, 0.82, 0.94, 0.94, 0.94],
    [0.04, 0.86, 0.04, 0.96, 0.94, 0.16], [0.04, 0.86, 0.84, 0.96, 0.94, 0.96],
    [0.04, 0.86, 0.16, 0.16, 0.94, 0.84], [0.84, 0.86, 0.16, 0.96, 0.94, 0.84],
  ];
  if (definition.sunhive) return [[0.08, 0.08, 0.08, 0.92, 0.72, 0.92], [0.03, 0.7, 0.03, 0.97, 0.86, 0.97], [0.14, 0, 0.14, 0.28, 0.12, 0.28], [0.72, 0, 0.14, 0.86, 0.12, 0.28], [0.14, 0, 0.72, 0.28, 0.12, 0.86], [0.72, 0, 0.72, 0.86, 0.12, 0.86]];
  if (definition.keepsakeFrame) {
    if (definition.frameFacing === 'n') return [[0.1, 0.1, 0.02, 0.9, 0.9, 0.11]];
    if (definition.frameFacing === 's') return [[0.1, 0.1, 0.89, 0.9, 0.9, 0.98]];
    if (definition.frameFacing === 'w') return [[0.02, 0.1, 0.1, 0.11, 0.9, 0.9]];
    return [[0.89, 0.1, 0.1, 0.98, 0.9, 0.9]];
  }
  if (definition.outfitterStand) return [[0.12, 0, 0.12, 0.88, 0.12, 0.88], [0.44, 0.1, 0.44, 0.56, 1.58, 0.56], [0.18, 1.18, 0.44, 0.82, 1.3, 0.56], [0.34, 1.52, 0.34, 0.66, 1.82, 0.66]];
  if (definition.hearthpot) return [[0.28, 0, 0.28, 0.72, 0.12, 0.72], [0.22, 0.1, 0.22, 0.78, 0.38, 0.78], [0.18, 0.36, 0.18, 0.82, 0.44, 0.82]];
  if (definition.trailBanner) return [[0.47, 0, 0.47, 0.53, 1.82, 0.53], [0.46, 1.58, 0.46, 0.94, 1.65, 0.54], [0.5, 0.82, 0.48, 0.92, 1.58, 0.52]];
  if (definition.raincatchBasin) return [[0.08, 0, 0.08, 0.92, 0.14, 0.92], [0.05, 0.12, 0.05, 0.2, 0.82, 0.95], [0.8, 0.12, 0.05, 0.95, 0.82, 0.95], [0.2, 0.12, 0.05, 0.8, 0.82, 0.2], [0.2, 0.12, 0.8, 0.8, 0.82, 0.95]];
  if (definition.archiveShelf) return [[0.04, 0, 0.08, 0.96, 1, 0.96], [0, 0, 0.02, 1, 0.1, 0.18], [0, 0.45, 0.02, 1, 0.55, 0.18], [0, 0.9, 0.02, 1, 1, 0.18]];
  if (definition.infusionStill) return [[0.08, 0, 0.08, 0.92, 0.16, 0.92], [0.42, 0.14, 0.42, 0.58, 0.76, 0.58], [0.12, 0.72, 0.12, 0.88, 0.84, 0.88], [0.18, 0.16, 0.58, 0.34, 0.56, 0.76], [0.42, 0.16, 0.58, 0.58, 0.56, 0.76], [0.66, 0.16, 0.58, 0.82, 0.56, 0.76]];
  if (definition.forgeheartAnvil) return [[0.12, 0, 0.12, 0.88, 0.14, 0.88], [0.38, 0.12, 0.3, 0.62, 0.68, 0.7], [0.08, 0.64, 0.24, 0.92, 0.86, 0.76], [0.78, 0.58, 0.28, 0.98, 0.78, 0.72]];
  if (definition.runegrindWheel) return [[0.08, 0, 0.18, 0.92, 0.12, 0.82], [0.12, 0.1, 0.3, 0.26, 0.92, 0.7], [0.74, 0.1, 0.3, 0.88, 0.92, 0.7], [0.18, 0.78, 0.34, 0.82, 0.9, 0.66], [0.3, 0.28, 0.38, 0.7, 0.78, 0.62], [0.43, 0.4, 0.34, 0.57, 0.57, 0.66]];
  if (definition.stonewrightCutter) return [[0.08, 0, 0.08, 0.92, 0.18, 0.92], [0.12, 0.16, 0.12, 0.88, 0.34, 0.88], [0.44, 0.32, 0.42, 0.56, 0.78, 0.58], [0.12, 0.72, 0.36, 0.88, 0.82, 0.64], [0.46, 0.72, 0.28, 0.54, 0.94, 0.72]];
  if (definition.wayvault) return [[0.08, 0, 0.08, 0.92, 0.12, 0.92], [0.1, 0.1, 0.1, 0.9, 0.68, 0.9], [0.06, 0.68, 0.06, 0.94, 0.88, 0.94], [0.42, 0.42, 0.035, 0.58, 0.62, 0.12]];
  if (definition.pane) return paneBoxesForConnections({ west: true, east: true, north: true, south: true });
  if (definition.hearthcake) {
    const [left, , z0, right, , z1] = hearthcakeBounds(id);
    return [[left, 0, z0, right, 0.4, z1], [left, 0.38, z0 - 0.02, right, 0.5, z1 + 0.02], [0.22, 0.49, 0.31, 0.78, 0.56, 0.69]];
  }
  if (definition.storageContainer === 'barrel') return [[0.08, 0.02, 0.08, 0.92, 0.92, 0.92], [0.05, 0, 0.05, 0.95, 0.12, 0.95], [0.05, 0.84, 0.05, 0.95, 0.94, 0.95], [0.04, 0.18, 0.035, 0.96, 0.77, 0.965], [0.31, 0.91, 0.31, 0.69, 0.97, 0.69]];
  if (definition.torch) return torchGeometry(id).map(({ bounds }) => bounds);
  if (definition.resonanceBox) return [[0.04, 0, 0.04, 0.96, 0.82, 0.96], [0, 0.12, 0, 1, 0.22, 1], [0, 0.7, 0, 1, 0.82, 1], [0.36, 0.8, 0.36, 0.64, 0.94, 0.64]];
  if (definition.waystar) return [[0.06, 0, 0.06, 0.94, 0.14, 0.94], [0.12, 0.14, 0.12, 0.88, 0.82, 0.88], [0.3, 0.28, 0.3, 0.7, 0.7, 0.7], [0.42, 0.78, 0.42, 0.58, 0.94, 0.58]];
  if (definition.hearthsongPlayer) return [[0.04, 0, 0.04, 0.96, 0.18, 0.96], [0.08, 0.18, 0.08, 0.92, 0.8, 0.92], [0.18, 0.78, 0.18, 0.82, 0.9, 0.82], [0.34, 0.8, 0.34, 0.66, 0.86, 0.66]];
  if (definition.forgeFunnel) return funnelBounds(id);
  if (definition.forgeEjector) return ejectorBounds(id);
  if (definition.runeDispenser) return dispenserBounds(id);
  if (definition.changeSentry) return sentryBounds(id);
  if (definition.mossweaveCarpet) return [[0, 0, 0, 1, 0.0625, 1]];
  if (model === 'fence') return [[0.38, 0, 0.38, 0.62, 1.45, 0.62]];
  if (model === 'sparkSwitch') return [[0.2, 0, 0.2, 0.8, 0.58, 0.8]];
  if (model === 'sparkPlate') return [[0.1, 0, 0.1, 0.9, 0.1, 0.9]];
  if (model === 'sunEye') return [[0.12, 0, 0.12, 0.88, 0.4, 0.88]];
  if (model === 'sparkRelay') return [[0.08, 0, 0.08, 0.92, 0.42, 0.92]];
  if (model === 'sparkInverter') return [[0.08, 0, 0.08, 0.92, 0.46, 0.92]];
  if (model === 'sparkComparator') return [[0.06, 0, 0.06, 0.94, 0.36, 0.94]];
  if (model === 'pulseSequencer') return [[0.06, 0, 0.06, 0.94, 0.46, 0.94]];
  if (model === 'forgeRail') return [[0, 0.01, 0, 1, 0.12, 1]];
  if (model === 'freightStation') return [[0.04, 0, 0.04, 0.96, 0.92, 0.96]];
  if (model === 'charterPost') return [[0.34, 0, 0.34, 0.66, 1.35, 0.66], [0.08, 0.72, 0.18, 0.92, 1.18, 0.82]];
  if (model === 'forgeRam') return [[0.04, 0.04, 0.04, 0.96, 0.96, 0.96]];
  if (model === 'sunwire') return [[0, 0.01, 0.42, 1, 0.07, 0.58], [0.42, 0.01, 0, 0.58, 0.07, 1]];
  if (model === 'lantern') return [[0.18, 0, 0.18, 0.82, 0.56, 0.82]];
  if (model === 'hearthfire') return [[0.06, 0, 0.06, 0.94, definition.lit ? 0.68 : 0.3, 0.94]];
  if (model === 'dryingRack') return [[0.06, 0, 0.08, 0.18, 1.45, 0.22], [0.82, 0, 0.08, 0.94, 1.45, 0.22], [0.06, 0, 0.78, 0.18, 1.45, 0.92], [0.82, 0, 0.78, 0.94, 1.45, 0.92], [0.04, 1.3, 0.06, 0.96, 1.45, 0.94]];
  if (model === 'runeforge') return [[0.08, 0, 0.08, 0.92, 0.18, 0.92], [0.18, 0.18, 0.18, 0.82, 0.66, 0.82], [0.07, 0.66, 0.07, 0.93, 0.82, 0.93], [0.35, 0.82, 0.35, 0.65, 1.05, 0.65]];
  if (model === 'shadowDen') return [[0.05, 0, 0.08, 0.95, 0.68, 0.92]];
  if (definition.repairBench) return [[0.14, 0, 0.2, 0.86, 0.18, 0.8], [0.33, 0.18, 0.32, 0.67, 0.62, 0.68], [0.08, 0.62, 0.18, 0.9, 0.84, 0.82], [0.78, 0.68, 0.28, 1, 0.79, 0.72]];
  if (definition.composter) return [[0, 0, 0, 1, 1, 1]];
  if (model === 'cross') return [[0.46, 0, 0.08, 0.54, definition.cropHeight || 1, 0.92], [0.08, 0, 0.46, 0.92, definition.cropHeight || 1, 0.54]];
  return [[0, 0, 0, 1, definition.collisionHeight ?? 1, 1]];
}

export class PlacementGhost {
  constructor(scene) {
    this.root = new THREE.Group();
    this.root.name = 'Placement Ghost';
    this.root.visible = false;
    this.fillMaterial = new THREE.MeshBasicMaterial({ color: 0x86edaa, transparent: true, opacity: 0.08, depthWrite: false, depthTest: true, polygonOffset: true, polygonOffsetFactor: -2 });
    this.edgeMaterial = new THREE.LineBasicMaterial({ color: 0xc8ffe0, transparent: true, opacity: 0.58, depthTest: true });
    this.signature = '';
    this.valid = true;
    scene.add(this.root);
  }

  clearGeometry() {
    for (const child of [...this.root.children]) {
      child.geometry?.dispose();
      this.root.remove(child);
    }
  }

  setValidity(valid) {
    this.valid = Boolean(valid);
    this.fillMaterial.color.setHex(this.valid ? 0x86edaa : 0xef625f);
    this.edgeMaterial.color.setHex(this.valid ? 0xc8ffe0 : 0xffaaa6);
  }

  update(plan, valid) {
    if (!plan?.parts?.length) return this.hide();
    const signature = plan.parts.map((part) => `${part.x},${part.y},${part.z},${part.id}`).join('|');
    if (signature !== this.signature) {
      this.clearGeometry();
      for (const part of plan.parts) {
        for (const [x0, y0, z0, x1, y1, z1] of previewBoxes(part.id)) {
          const geometry = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
          const mesh = new THREE.Mesh(geometry, this.fillMaterial);
          mesh.position.set(part.x + (x0 + x1) / 2, part.y + (y0 + y1) / 2, part.z + (z0 + z1) / 2);
          this.root.add(mesh);
          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), this.edgeMaterial);
          edges.position.copy(mesh.position);
          this.root.add(edges);
        }
      }
      this.signature = signature;
    }
    this.setValidity(valid);
    this.root.visible = true;
    return true;
  }

  hide() {
    this.root.visible = false;
    return false;
  }
}
