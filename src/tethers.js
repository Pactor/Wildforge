import * as THREE from 'three';
import { BLOCK, BLOCKS } from './blocks.js';

export const MAX_TETHERS = 32;
export const PLAYER_SOFT_LIMIT = 5;
export const FENCE_SOFT_LIMIT = 4;
export const TETHER_BREAK_DISTANCE = 12;

const validKey = (value) => typeof value === 'string' && value.length > 0 && value.length <= 80 && /^[a-z0-9:_-]+$/i.test(value);
const isFence = (id) => BLOCKS[id]?.model === 'fence';

export function tetherEligible(entity) {
  const definition = entity?.definition;
  return Boolean(entity && validKey(entity.persistentKey) && definition && !definition.hostile && !definition.resident
    && !definition.aquatic && !definition.flying && !definition.boss && !definition.guardian && !definition.constructed && !entity.downed);
}

function sanitizedRecord(record) {
  if (!record || !validKey(record.entityKey) || !validKey(record.realm)) return null;
  const anchor = record.anchor === 'fence' ? 'fence' : 'player';
  if (anchor === 'fence' && ![record.x, record.y, record.z].every(Number.isFinite)) return null;
  return {
    entityKey: record.entityKey,
    realm: record.realm,
    anchor,
    x: anchor === 'fence' ? Math.floor(record.x) : null,
    y: anchor === 'fence' ? Math.floor(record.y) : null,
    z: anchor === 'fence' ? Math.floor(record.z) : null,
  };
}

export class TetherSystem {
  constructor(scene, world, player, getEntities, saved = null, callbacks = {}) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.getEntities = typeof getEntities === 'function' ? getEntities : () => [];
    this.onDrop = callbacks.onDrop || (() => {});
    this.records = new Map();
    this.lines = new Map();
    for (const raw of (saved?.records || []).slice(0, MAX_TETHERS)) {
      const record = sanitizedRecord(raw);
      if (record && !this.records.has(record.entityKey)) this.records.set(record.entityKey, record);
    }
  }

  has(entity) { return Boolean(entity?.persistentKey && this.records.has(entity.persistentKey)); }

  recordFor(entity) { return entity?.persistentKey ? this.records.get(entity.persistentKey) || null : null; }

  attach(entity, realm = 'overworld') {
    if (!tetherEligible(entity) || this.records.size >= MAX_TETHERS || this.records.has(entity.persistentKey) || !validKey(realm)) return false;
    entity.persistent = true;
    this.records.set(entity.persistentKey, { entityKey: entity.persistentKey, realm, anchor: 'player', x: null, y: null, z: null });
    return true;
  }

  anchorPlayerTethers(x, y, z, realm = 'overworld') {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (!validKey(realm) || !isFence(this.world.getBlock(x, y, z))) return 0;
    let anchored = 0;
    for (const record of this.records.values()) {
      if (record.realm !== realm || record.anchor !== 'player') continue;
      Object.assign(record, { anchor: 'fence', x, y, z });
      anchored += 1;
    }
    return anchored;
  }

  releaseEntity(entity, recover = true) {
    const record = this.recordFor(entity);
    if (!record) return false;
    this.records.delete(record.entityKey);
    this.removeLine(record.entityKey);
    if (recover) this.onDrop('trail_tether', 1, entity.root.position.clone().add(new THREE.Vector3(0, 0.35, 0)));
    return true;
  }

  releaseFence(x, y, z, realm = 'overworld', recover = true) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    const released = [];
    for (const record of [...this.records.values()]) {
      if (record.realm !== realm || record.anchor !== 'fence' || record.x !== x || record.y !== y || record.z !== z) continue;
      this.records.delete(record.entityKey);
      this.removeLine(record.entityKey);
      released.push(record);
    }
    if (recover && released.length) this.onDrop('trail_tether', released.length, new THREE.Vector3(x + 0.5, y + 0.9, z + 0.5));
    return released.length;
  }

  releasePlayerAnchors(realm = 'overworld', recover = true) {
    let released = 0;
    for (const record of [...this.records.values()]) {
      if (record.realm !== realm || record.anchor !== 'player') continue;
      this.records.delete(record.entityKey);
      this.removeLine(record.entityKey);
      released += 1;
    }
    if (recover && released) this.onDrop('trail_tether', released, this.player.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
    return released;
  }

  blockChanged(x, y, z, previous, id, realm = 'overworld') {
    if (!isFence(previous) || isFence(id)) return 0;
    return this.releaseFence(x, y, z, realm, true);
  }

  entityByKey(key) {
    return this.getEntities().find((entity) => entity.persistentKey === key) || null;
  }

  anchorPosition(record) {
    return record.anchor === 'player'
      ? this.player.position.clone().add(new THREE.Vector3(0, 1.05, 0))
      : new THREE.Vector3(record.x + 0.5, record.y + 1.08, record.z + 0.5);
  }

  pull(entity, anchor, softLimit, dt) {
    const offset = anchor.clone().sub(entity.root.position);
    const distance = Math.hypot(offset.x, offset.z);
    if (distance <= softLimit) return true;
    const amount = Math.min(0.22, (distance - softLimit) * Math.min(1, dt * 2.8));
    const nx = entity.root.position.x + offset.x / distance * amount;
    const nz = entity.root.position.z + offset.z / distance * amount;
    const ground = this.world.terrainHeight(Math.floor(nx), Math.floor(nz));
    const ny = ground + 1;
    if (Math.abs(ny - entity.root.position.y) > 1.15 || this.world.isSolid(Math.floor(nx), Math.floor(ny), Math.floor(nz))
      || this.world.isSolid(Math.floor(nx), Math.floor(ny + 1), Math.floor(nz))) return false;
    entity.root.position.set(nx, ny, nz);
    entity.heading = Math.atan2(offset.x, offset.z);
    entity.root.rotation.y = entity.heading;
    return true;
  }

  lineFor(key) {
    let line = this.lines.get(key);
    if (line) return line;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xd8d5c2, transparent: true, opacity: 0.9 }));
    line.frustumCulled = false;
    this.scene.add(line);
    this.lines.set(key, line);
    return line;
  }

  updateLine(key, entity, anchor) {
    const line = this.lineFor(key);
    const positions = line.geometry.getAttribute('position');
    positions.setXYZ(0, entity.root.position.x, entity.root.position.y + (entity.isBaby ? 0.4 : 0.75), entity.root.position.z);
    positions.setXYZ(1, anchor.x, anchor.y, anchor.z);
    positions.needsUpdate = true;
    line.geometry.computeBoundingSphere();
  }

  removeLine(key) {
    const line = this.lines.get(key);
    if (!line) return;
    line.geometry.dispose();
    line.material.dispose();
    this.scene.remove(line);
    this.lines.delete(key);
  }

  update(dt, realm = 'overworld') {
    dt = Math.max(0, Math.min(0.05, Number(dt) || 0));
    const visible = new Set();
    for (const record of [...this.records.values()]) {
      if (record.realm !== realm) continue;
      const entity = this.entityByKey(record.entityKey);
      if (!entity) continue;
      if (record.anchor === 'fence' && !isFence(this.world.getBlock(record.x, record.y, record.z))) {
        this.releaseFence(record.x, record.y, record.z, realm, true);
        continue;
      }
      const anchor = this.anchorPosition(record);
      const distance = entity.root.position.distanceTo(anchor);
      const breakDistance = record.anchor === 'player' ? TETHER_BREAK_DISTANCE : TETHER_BREAK_DISTANCE - 2;
      if (distance > breakDistance) {
        this.releaseEntity(entity, true);
        continue;
      }
      this.pull(entity, anchor, record.anchor === 'player' ? PLAYER_SOFT_LIMIT : FENCE_SOFT_LIMIT, dt);
      this.updateLine(record.entityKey, entity, anchor);
      visible.add(record.entityKey);
    }
    for (const key of [...this.lines.keys()]) if (!visible.has(key)) this.removeLine(key);
  }

  serialize() { return { records: [...this.records.values()].slice(0, MAX_TETHERS).map((record) => ({ ...record })) }; }

  dispose() { for (const key of [...this.lines.keys()]) this.removeLine(key); }
}
