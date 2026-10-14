import * as THREE from 'three';
import { BLOCK, BLOCKS } from './blocks.js';

export const MAX_TRAIL_BANNERS = 256;
export const TRAIL_BANNER_BLOCKS = Object.freeze([
  BLOCK.TRAIL_BANNER_NATURAL, BLOCK.TRAIL_BANNER_SUN, BLOCK.TRAIL_BANNER_EMBER,
  BLOCK.TRAIL_BANNER_FROST, BLOCK.TRAIL_BANNER_HOLLOW,
]);
export const TRAIL_BANNER_EMBLEMS = Object.freeze(['plain', 'path', 'sunwheel', 'hollow-eye']);
export const TRAIL_BANNER_FACINGS = Object.freeze(['N', 'E', 'S', 'W']);

const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const boundedIndex = (value, length) => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) < length ? Number(value) : 0;

export function isTrailBanner(id) { return TRAIL_BANNER_BLOCKS.includes(Number(id)); }

export function trailBannerFacingForYaw(yaw) {
  const dx = -Math.sin(Number(yaw) || 0); const dz = -Math.cos(Number(yaw) || 0);
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 1 : 3;
  return dz > 0 ? 2 : 0;
}

export class TrailBannerState {
  constructor(serialized = null) {
    this.records = new Map();
    const source = Array.isArray(serialized) ? serialized : Array.isArray(serialized?.records) ? serialized.records : [];
    for (const raw of source.slice(0, MAX_TRAIL_BANNERS)) {
      if (!raw || ![raw.x, raw.y, raw.z].every(Number.isFinite)) continue;
      const record = {
        x: Math.floor(raw.x), y: Math.floor(raw.y), z: Math.floor(raw.z),
        facing: boundedIndex(raw.facing, TRAIL_BANNER_FACINGS.length),
        emblem: boundedIndex(raw.emblem, TRAIL_BANNER_EMBLEMS.length),
      };
      this.records.set(keyFor(record.x, record.y, record.z), record);
    }
  }

  get(x, y, z) { return this.records.get(keyFor(x, y, z)) || null; }

  ensure(x, y, z, yaw = 0) {
    const key = keyFor(x, y, z); const existing = this.records.get(key);
    if (existing) return existing;
    if (this.records.size >= MAX_TRAIL_BANNERS) return null;
    const record = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z), facing: trailBannerFacingForYaw(yaw), emblem: 0 };
    this.records.set(key, record); return record;
  }

  configure(x, y, z, yaw) {
    const record = this.ensure(x, y, z, yaw);
    if (record) record.facing = trailBannerFacingForYaw(yaw);
    return record;
  }

  rotate(x, y, z) {
    const record = this.get(x, y, z); if (!record) return null;
    record.facing = (record.facing + 1) % TRAIL_BANNER_FACINGS.length; return record;
  }

  cycleEmblem(x, y, z) {
    const record = this.get(x, y, z); if (!record) return null;
    record.emblem = (record.emblem + 1) % TRAIL_BANNER_EMBLEMS.length; return record;
  }

  blockChanged(x, y, z, previous, id) {
    const key = keyFor(x, y, z);
    if (isTrailBanner(previous) && !isTrailBanner(id)) return this.records.delete(key);
    if (isTrailBanner(id)) return this.ensure(x, y, z);
    return null;
  }

  recoverStale(world) {
    let removed = 0;
    for (const record of [...this.records.values()]) {
      const key = keyFor(record.x, record.y, record.z);
      const liveId = world.edits instanceof Map ? (world.edits.get(key) ?? BLOCK.AIR) : world.getBlock(record.x, record.y, record.z);
      if (!isTrailBanner(liveId)) { this.records.delete(key); removed += 1; }
    }
    return removed;
  }

  entries() { return [...this.records.values()]; }
  serialize() { return { records: this.entries().map((record) => ({ ...record })) }; }
}

export function detachUnsupportedTrailBanner(world, supportX, supportY, supportZ) {
  const x = Math.floor(supportX); const y = Math.floor(supportY) + 1; const z = Math.floor(supportZ);
  const id = world.getBlock(x, y, z);
  if (!isTrailBanner(id) || BLOCKS[world.getBlock(x, y - 1, z)]?.solid) return null;
  world.setBlock(x, y, z, BLOCK.AIR);
  return { x, y, z, id };
}

const paletteAccent = Object.freeze({ natural: 0xd7c68c, sun: 0x77512b, ember: 0xffd18b, frost: 0x476b7b, hollow: 0xb8e6c4 });

function part(group, size, position, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshLambertMaterial({ color, flatShading: true }));
  mesh.position.set(...position); group.add(mesh); return mesh;
}

function bannerModel(id, record) {
  const group = new THREE.Group(); const definition = BLOCKS[id]; const color = definition.color;
  const accent = paletteAccent[definition.bannerPalette] || 0xe4d7b0;
  part(group, [0.055, 1.78, 0.055], [0, 0.89, 0], 0x785332);
  part(group, [0.78, 0.055, 0.065], [0.25, 1.62, 0], 0x785332);
  for (let panel = 0; panel < 3; panel += 1) {
    const y = 1.43 - panel * 0.31; const x = 0.25 + panel * 0.018;
    part(group, [0.72, 0.3, 0.045], [x, y, 0.018], color);
  }
  if (record.emblem === 1) {
    part(group, [0.09, 0.78, 0.065], [0.25, 1.12, 0.045], accent);
    part(group, [0.32, 0.09, 0.065], [0.25, 1.3, 0.045], accent);
  } else if (record.emblem === 2) {
    part(group, [0.3, 0.3, 0.065], [0.25, 1.25, 0.045], accent);
    part(group, [0.09, 0.72, 0.065], [0.25, 1.25, 0.045], color);
    part(group, [0.72, 0.09, 0.065], [0.25, 1.25, 0.045], accent);
  } else if (record.emblem === 3) {
    part(group, [0.5, 0.27, 0.065], [0.25, 1.28, 0.045], accent);
    part(group, [0.2, 0.1, 0.075], [0.25, 1.28, 0.06], 0x27332f);
  }
  group.rotation.y = -record.facing * Math.PI / 2;
  group.name = `${definition.name} · ${TRAIL_BANNER_EMBLEMS[record.emblem]} · ${TRAIL_BANNER_FACINGS[record.facing]}`;
  return group;
}

function dispose(group) { group.traverse((object) => { object.geometry?.dispose?.(); object.material?.dispose?.(); }); group.removeFromParent(); }

export class TrailBannerRenderer {
  constructor(scene, world, state) {
    this.world = world; this.state = state; this.meshes = new Map(); this.root = new THREE.Group();
    this.root.name = 'Trail Banners'; scene.add(this.root); this.sync();
  }
  sync() {
    const wanted = new Set();
    for (const record of this.state.entries()) {
      const key = keyFor(record.x, record.y, record.z);
      const id = this.world.edits instanceof Map ? (this.world.edits.get(key) ?? BLOCK.AIR) : this.world.getBlock(record.x, record.y, record.z);
      if (!isTrailBanner(id)) continue;
      wanted.add(key); if (this.meshes.has(key)) dispose(this.meshes.get(key));
      const model = bannerModel(id, record); model.position.set(record.x + 0.5, record.y, record.z + 0.5);
      this.root.add(model); this.meshes.set(key, model);
    }
    for (const [key, model] of [...this.meshes]) if (!wanted.has(key)) { dispose(model); this.meshes.delete(key); }
  }
}
