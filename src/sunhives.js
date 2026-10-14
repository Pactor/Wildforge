import * as THREE from 'three';
import { BLOCK, BLOCKS } from './blocks.js';

export const MAX_SUNHIVES = 256;
export const NECTAR_VISITS_PER_LEVEL = 2;
const FLOWERS = new Set([BLOCK.SUNPETAL, BLOCK.EMBERBELL]);
const key = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const coordinates = (value) => value.split(',').map(Number);

export const isSunhive = (id) => Boolean(BLOCKS[id]?.sunhive);
export const sunhiveLevel = (id) => Math.max(0, Math.min(3, Number(BLOCKS[id]?.hiveLevel) || 0));
export const sunhiveBlock = (level) => [BLOCK.SUNHIVE_0, BLOCK.SUNHIVE_1, BLOCK.SUNHIVE_2, BLOCK.SUNHIVE_3][Math.max(0, Math.min(3, Math.floor(level)))] || BLOCK.SUNHIVE_0;

export class SunhiveState {
  constructor(world, serialized = null, callbacks = {}) {
    this.world = world;
    this.onDrop = callbacks.onDrop || (() => {});
    this.onPollinate = callbacks.onPollinate || (() => {});
    this.onDeposit = callbacks.onDeposit || (() => {});
    this.onBlockChanged = callbacks.onBlockChanged || (() => {});
    this.records = new Map();
    for (const entry of (serialized?.records || []).slice(0, MAX_SUNHIVES)) {
      const [recordKey, value] = entry || [];
      if (typeof recordKey !== 'string') continue;
      const [x, y, z] = coordinates(recordKey);
      if (![x, y, z].every(Number.isFinite) || !isSunhive(world.getBlock(x, y, z))) continue;
      this.records.set(key(x, y, z), { progress: Math.max(0, Math.min(NECTAR_VISITS_PER_LEVEL - 0.001, Number(value?.progress) || 0)) });
    }
    for (const [editKey, id] of world.edits || []) {
      if (this.records.size >= MAX_SUNHIVES) break;
      if (isSunhive(id) && !this.records.has(editKey)) this.records.set(editKey, { progress: 0 });
    }
  }

  blockChanged(x, y, z, previous, id) {
    const recordKey = key(x, y, z);
    if (isSunhive(previous) && !isSunhive(id)) {
      this.records.delete(recordKey);
      const comb = sunhiveLevel(previous);
      if (comb > 0) this.onDrop('suncomb', comb, new THREE.Vector3(Math.floor(x) + 0.5, Math.floor(y) + 0.55, Math.floor(z) + 0.5));
      return { removed: true, comb };
    }
    if (isSunhive(id) && !this.records.has(recordKey) && this.records.size < MAX_SUNHIVES) this.records.set(recordKey, { progress: 0 });
    return null;
  }

  status(x, y, z) {
    const id = this.world.getBlock(x, y, z);
    if (!isSunhive(id)) return null;
    return { level: sunhiveLevel(id), progress: this.records.get(key(x, y, z))?.progress || 0, full: sunhiveLevel(id) >= 3 };
  }

  harvest(x, y, z) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (sunhiveLevel(this.world.getBlock(x, y, z)) < 3) return null;
    const previous = this.world.getBlock(x, y, z);
    this.records.set(key(x, y, z), { progress: 0 });
    this.world.setBlock(x, y, z, BLOCK.SUNHIVE_0);
    this.onBlockChanged(x, y, z, previous, BLOCK.SUNHIVE_0);
    return { id: 'sunnectar_flask', count: 1 };
  }

  nearestHive(position, maximum = 14) {
    let closest = null;
    let best = maximum * maximum;
    for (const [recordKey, record] of this.records) {
      const [x, y, z] = coordinates(recordKey);
      const level = sunhiveLevel(this.world.getBlock(x, y, z));
      if (level >= 3) continue;
      const distanceSq = position.distanceToSquared(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5));
      if (distanceSq >= best) continue;
      best = distanceSq;
      closest = { x, y, z, level, record, position: new THREE.Vector3(x + 0.5, y + 0.7, z + 0.5) };
    }
    return closest;
  }

  nearestFlower(position, radius = 6) {
    let closest = null;
    let best = radius * radius;
    const minY = Math.max(1, Math.floor(position.y) - 7);
    const maxY = Math.min(63, Math.floor(position.y) + 1);
    for (let z = Math.floor(position.z) - radius; z <= Math.floor(position.z) + radius; z += 1) {
      for (let x = Math.floor(position.x) - radius; x <= Math.floor(position.x) + radius; x += 1) {
        for (let y = minY; y <= maxY; y += 1) {
          if (!FLOWERS.has(this.world.getBlock(x, y, z))) continue;
          const target = new THREE.Vector3(x + 0.5, y + 0.75, z + 0.5);
          const distanceSq = position.distanceToSquared(target);
          if (distanceSq >= best) continue;
          best = distanceSq;
          closest = { x, y, z, position: target };
        }
      }
    }
    return closest;
  }

  steer(entity, target) {
    const dx = target.x - entity.root.position.x;
    const dz = target.z - entity.root.position.z;
    entity.heading = Math.atan2(dx, dz);
    entity.flightTargetY = target.y + 0.45;
    entity.thinkTimer = Math.max(0.8, entity.thinkTimer || 0);
  }

  pollinateNearby(farming, position, radius = 5) {
    const candidates = farming.entries().filter((crop) => crop.stage < 3
      && Math.hypot(crop.x + 0.5 - position.x, crop.y + 0.5 - position.y, crop.z + 0.5 - position.z) <= radius);
    candidates.sort((a, b) => a.stage - b.stage || a.x - b.x || a.z - b.z);
    const crop = candidates[0];
    if (!crop) return null;
    const result = farming.fertilize(crop.x, crop.y, crop.z, 1);
    if (!result) return null;
    this.world.setBlock(crop.x, crop.y, crop.z, result.block);
    this.onPollinate(crop, result);
    return { crop, result };
  }

  deposit(entity, hive) {
    const record = this.records.get(key(hive.x, hive.y, hive.z));
    if (!record || hive.level >= 3) return null;
    record.progress += 1;
    let level = hive.level;
    if (record.progress >= NECTAR_VISITS_PER_LEVEL) {
      record.progress -= NECTAR_VISITS_PER_LEVEL;
      level += 1;
      const previous = this.world.getBlock(hive.x, hive.y, hive.z);
      const id = sunhiveBlock(level);
      this.world.setBlock(hive.x, hive.y, hive.z, id);
      this.onBlockChanged(hive.x, hive.y, hive.z, previous, id);
    }
    entity.carryingNectar = false;
    entity.pollinationCooldown = 6;
    if (entity.root.userData.nectarPouch) entity.root.userData.nectarPouch.visible = false;
    this.onDeposit(hive, level, record.progress);
    return { level, progress: record.progress };
  }

  update(dt, entities, farming) {
    dt = Math.max(0, Math.min(0.05, Number(dt) || 0));
    for (const entity of entities || []) {
      if (!entity.definition?.pollinator || entity.downed) continue;
      entity.pollinationCooldown = Math.max(0, (Number(entity.pollinationCooldown) || 0) - dt);
      if (entity.root.userData.nectarPouch) entity.root.userData.nectarPouch.visible = Boolean(entity.carryingNectar);
      if (entity.carryingNectar) {
        const hive = this.nearestHive(entity.root.position);
        if (!hive) continue;
        this.steer(entity, hive.position);
        if (entity.root.position.distanceTo(hive.position) <= 1.55) this.deposit(entity, hive);
        continue;
      }
      if (entity.pollinationCooldown > 0) continue;
      entity.forageScanCooldown = Math.max(0, (Number(entity.forageScanCooldown) || 0) - dt);
      if (entity.forageScanCooldown <= 0 || !entity.forageTarget || !FLOWERS.has(this.world.getBlock(entity.forageTarget.x, entity.forageTarget.y, entity.forageTarget.z))) {
        entity.forageTarget = this.nearestFlower(entity.root.position);
        entity.forageScanCooldown = 0.75;
      }
      if (!entity.forageTarget) continue;
      this.steer(entity, entity.forageTarget.position);
      if (entity.root.position.distanceTo(entity.forageTarget.position) > 1.45) continue;
      entity.carryingNectar = true;
      entity.persistent = true;
      entity.pollinationCooldown = 4;
      if (entity.root.userData.nectarPouch) entity.root.userData.nectarPouch.visible = true;
      this.pollinateNearby(farming, entity.forageTarget.position);
      entity.forageTarget = null;
    }
  }

  serialize() { return { records: [...this.records.entries()].slice(0, MAX_SUNHIVES).map(([recordKey, value]) => [recordKey, { progress: value.progress }]) }; }
}
