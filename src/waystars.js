import * as THREE from 'three';
import { BLOCK, BLOCKS, isLiquidBlock } from './blocks.js';
import { STATUS_EFFECTS } from './statusEffects.js';
import { WORLD_HEIGHT } from './world.js';

export const MAX_WAYSTARS = 64;
export const WAYSTAR_EFFECTS = Object.freeze(['windstep', 'stoneward', 'lumen_sight', 'hearthmend']);
export const WAYSTAR_MAX_LEVEL = 4;

const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const validEffectIndex = (value) => Math.max(0, Math.min(WAYSTAR_EFFECTS.length - 1, Math.floor(Number(value) || 0)));
export const isWaystar = (id) => Boolean(BLOCKS[id]?.waystar);

export function waystarPyramidLevel(world, x, y, z) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  let level = 0;
  for (let layer = 1; layer <= WAYSTAR_MAX_LEVEL; layer += 1) {
    const baseY = y - layer; let complete = baseY >= 0;
    for (let dx = -layer; complete && dx <= layer; dx += 1) {
      for (let dz = -layer; dz <= layer; dz += 1) {
        if (world.getBlock(x + dx, baseY, z + dz) !== BLOCK.FORGED_IRON_BLOCK) { complete = false; break; }
      }
    }
    if (!complete) break;
    level = layer;
  }
  return level;
}

export function waystarBeamClear(world, x, y, z) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  for (let scanY = y + 1; scanY < WORLD_HEIGHT; scanY += 1) {
    const id = world.getBlock(x, scanY, z); const definition = BLOCKS[id];
    if (id !== BLOCK.AIR && !isLiquidBlock(id) && definition?.solid && !definition?.transparent) return false;
  }
  return true;
}

export function waystarStatus(world, x, y, z, effectIndex = 0) {
  const pyramidLevel = waystarPyramidLevel(world, x, y, z);
  const clear = waystarBeamClear(world, x, y, z);
  const level = clear ? pyramidLevel : 0;
  const selectedIndex = level > 0 ? Math.min(validEffectIndex(effectIndex), level - 1) : 0;
  const effect = level > 0 ? WAYSTAR_EFFECTS[selectedIndex] : null;
  return {
    level, pyramidLevel, clear, effect, effectIndex: selectedIndex,
    effectName: effect ? STATUS_EFFECTS[effect].name : null,
    range: level > 0 ? 12 + level * 8 : 0,
  };
}

export class WaystarState {
  constructor(serialized = null) {
    this.records = new Map(); this.timer = 0;
    const source = Array.isArray(serialized) ? serialized : Array.isArray(serialized?.records) ? serialized.records : [];
    for (const raw of source.slice(0, MAX_WAYSTARS)) {
      if (!raw || ![raw.x, raw.y, raw.z].every(Number.isFinite)) continue;
      const record = { x: Math.floor(raw.x), y: Math.floor(raw.y), z: Math.floor(raw.z), effectIndex: validEffectIndex(raw.effectIndex) };
      this.records.set(keyFor(record.x, record.y, record.z), record);
    }
  }

  get(x, y, z) { return this.records.get(keyFor(x, y, z)) || null; }

  ensure(x, y, z) {
    const key = keyFor(x, y, z); const existing = this.records.get(key);
    if (existing) return existing;
    if (this.records.size >= MAX_WAYSTARS) return null;
    const record = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z), effectIndex: 0 };
    this.records.set(key, record); return record;
  }

  inspect(world, x, y, z) {
    const record = this.ensure(x, y, z);
    return record ? { ...waystarStatus(world, record.x, record.y, record.z, record.effectIndex), record } : null;
  }

  cycle(world, x, y, z) {
    const record = this.ensure(x, y, z); if (!record) return null;
    const before = waystarStatus(world, record.x, record.y, record.z, record.effectIndex);
    if (before.level <= 0) return { ...before, changed: false, record };
    record.effectIndex = (before.effectIndex + 1) % before.level;
    return { ...waystarStatus(world, record.x, record.y, record.z, record.effectIndex), changed: true, record };
  }

  blockChanged(x, y, z, previous, id) {
    if (isWaystar(id)) return Boolean(this.ensure(x, y, z));
    if (!isWaystar(previous)) return false;
    return this.records.delete(keyFor(x, y, z));
  }

  restore(world) {
    for (const [key, id] of world?.edits || []) if (isWaystar(id)) this.ensure(...key.split(',').map(Number));
    let removed = 0;
    for (const record of [...this.records.values()]) {
      const key = keyFor(record.x, record.y, record.z);
      const liveId = world?.edits instanceof Map ? (world.edits.get(key) ?? BLOCK.AIR) : world.getBlock(record.x, record.y, record.z);
      if (!isWaystar(liveId)) {
        this.records.delete(keyFor(record.x, record.y, record.z)); removed += 1;
      }
    }
    return { active: this.records.size, removed };
  }

  update(dt, world, playerPosition, applyEffect = () => {}) {
    if (!Number.isFinite(dt) || dt <= 0 || !playerPosition) return [];
    this.timer += dt; if (this.timer < 1) return [];
    this.timer %= 1; const applied = [];
    for (const record of this.records.values()) {
      const distance = Math.hypot(playerPosition.x - (record.x + 0.5), playerPosition.y - (record.y + 0.5), playerPosition.z - (record.z + 0.5));
      if (distance > 44) continue;
      const status = waystarStatus(world, record.x, record.y, record.z, record.effectIndex);
      if (!status.effect) continue;
      if (distance > status.range) continue;
      applyEffect(status.effect, 2.5); applied.push({ ...status, x: record.x, y: record.y, z: record.z });
    }
    return applied;
  }

  entries() { return [...this.records.values()]; }
  serialize() { return { records: this.entries().map((record) => ({ ...record })) }; }
}

const EFFECT_COLORS = Object.freeze({ windstep: 0x8ed07a, stoneward: 0xb9c4c2, lumen_sight: 0x73e4cf, hearthmend: 0xe47865 });
function dispose(object) { object.traverse((child) => { child.geometry?.dispose?.(); child.material?.dispose?.(); }); object.removeFromParent(); }

export class WaystarRenderer {
  constructor(scene, world, state) {
    this.world = world; this.state = state; this.root = new THREE.Group(); this.root.name = 'Waystar Beams'; this.meshes = new Map(); this.elapsed = 1;
    scene.add(this.root);
  }

  sync(playerPosition = null, visible = true) {
    this.root.visible = visible; const wanted = new Set();
    if (!visible) return;
    for (const record of this.state.entries()) {
      if (playerPosition && Math.hypot(record.x - playerPosition.x, record.z - playerPosition.z) > 96) continue;
      const status = waystarStatus(this.world, record.x, record.y, record.z, record.effectIndex);
      if (!status.effect) continue;
      const key = keyFor(record.x, record.y, record.z); const signature = `${status.level}:${status.effect}`; wanted.add(key);
      if (this.meshes.get(key)?.userData.signature === signature) continue;
      if (this.meshes.has(key)) dispose(this.meshes.get(key));
      const group = new THREE.Group(); const color = EFFECT_COLORS[status.effect] || 0x73e4cf;
      const height = WORLD_HEIGHT + 12 - (record.y + 0.96);
      const outer = new THREE.Mesh(new THREE.BoxGeometry(0.34, height, 0.34), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }));
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.1, height, 0.1), new THREE.MeshBasicMaterial({ color: 0xeaffff, transparent: true, opacity: 0.48, depthWrite: false, blending: THREE.AdditiveBlending }));
      outer.position.y = core.position.y = height / 2; group.add(outer, core);
      group.position.set(record.x + 0.5, record.y + 0.96, record.z + 0.5); group.userData.signature = signature;
      this.root.add(group); this.meshes.set(key, group);
    }
    for (const [key, mesh] of [...this.meshes]) if (!wanted.has(key)) { dispose(mesh); this.meshes.delete(key); }
  }

  update(dt, playerPosition, visible = true) {
    this.elapsed += Math.max(0, Number(dt) || 0);
    if (this.elapsed >= 0.75 || this.root.visible !== visible) { this.elapsed = 0; this.sync(playerPosition, visible); }
  }
}
