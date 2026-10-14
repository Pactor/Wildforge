import { BLOCK, BLOCKS } from './blocks.js';

export const MAX_CHANGE_SENTRIES = 512;
export const SENTRY_DELAY = 0.1;
export const SENTRY_PULSE = 0.2;
export const SENTRY_OFF = Object.freeze([
  BLOCK.CHANGE_SENTRY_N_OFF, BLOCK.CHANGE_SENTRY_E_OFF, BLOCK.CHANGE_SENTRY_S_OFF,
  BLOCK.CHANGE_SENTRY_W_OFF, BLOCK.CHANGE_SENTRY_UP_OFF, BLOCK.CHANGE_SENTRY_DOWN_OFF,
]);
export const SENTRY_ON = Object.freeze([
  BLOCK.CHANGE_SENTRY_N_ON, BLOCK.CHANGE_SENTRY_E_ON, BLOCK.CHANGE_SENTRY_S_ON,
  BLOCK.CHANGE_SENTRY_W_ON, BLOCK.CHANGE_SENTRY_UP_ON, BLOCK.CHANGE_SENTRY_DOWN_ON,
]);
export const SENTRY_BLOCKS = Object.freeze([...SENTRY_OFF, ...SENTRY_ON]);

const DIRECTIONS = Object.freeze([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]);
const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const pointFor = (key) => key.split(',').map(Number);

export const isChangeSentry = (id) => SENTRY_BLOCKS.includes(Number(id));
export const sentryDirection = (id) => BLOCKS[id]?.circuitFacing || [0, 0, -1];
export const sentryVariant = (id, powered) => {
  let index = SENTRY_OFF.indexOf(Number(id));
  if (index < 0) index = SENTRY_ON.indexOf(Number(id));
  return index < 0 ? Number(id) : (powered ? SENTRY_ON : SENTRY_OFF)[index];
};

export function sentryIdForSupport(position, supportPosition, yaw = 0, powered = false) {
  let index = -1;
  if (position && supportPosition) {
    const dx = Math.floor(supportPosition.x) - Math.floor(position.x);
    const dy = Math.floor(supportPosition.y) - Math.floor(position.y);
    const dz = Math.floor(supportPosition.z) - Math.floor(position.z);
    if (dy > 0) index = 4; else if (dy < 0) index = 5; else if (dx > 0) index = 1;
    else if (dx < 0) index = 3; else if (dz > 0) index = 2; else if (dz < 0) index = 0;
  }
  if (index < 0) {
    const dx = -Math.sin(Number(yaw) || 0); const dz = -Math.cos(Number(yaw) || 0);
    index = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 1 : 3) : (dz > 0 ? 2 : 0);
  }
  return (powered ? SENTRY_ON : SENTRY_OFF)[index];
}

export function sentryBounds(id) {
  const [dx, dy, dz] = sentryDirection(id);
  const bounds = [[0.04, 0.04, 0.04, 0.96, 0.96, 0.96], [0.12, 0.12, 0.12, 0.88, 0.88, 0.88]];
  const plate = dx < 0 ? [0, 0.2, 0.2, 0.08, 0.8, 0.8] : dx > 0 ? [0.92, 0.2, 0.2, 1, 0.8, 0.8]
    : dy < 0 ? [0.2, 0, 0.2, 0.8, 0.08, 0.8] : dy > 0 ? [0.2, 0.92, 0.2, 0.8, 1, 0.8]
      : dz < 0 ? [0.2, 0.2, 0, 0.8, 0.8, 0.08] : [0.2, 0.2, 0.92, 0.8, 0.8, 1];
  const back = dx < 0 ? [0.93, 0.34, 0.34, 1, 0.66, 0.66] : dx > 0 ? [0, 0.34, 0.34, 0.07, 0.66, 0.66]
    : dy < 0 ? [0.34, 0.93, 0.34, 0.66, 1, 0.66] : dy > 0 ? [0.34, 0, 0.34, 0.66, 0.07, 0.66]
      : dz < 0 ? [0.34, 0.34, 0.93, 0.66, 0.66, 1] : [0.34, 0.34, 0, 0.66, 0.66, 0.07];
  return [...bounds, plate, back];
}

export class ChangeSentryState {
  constructor(world, callbacks = {}, serialized = null) {
    this.world = world;
    this.setPowered = callbacks.setPowered || (() => false);
    this.onPulse = callbacks.onPulse || (() => {});
    this.records = new Map();
    const source = Array.isArray(serialized) ? serialized : Array.isArray(serialized?.records) ? serialized.records : [];
    for (const raw of source.slice(0, MAX_CHANGE_SENTRIES)) {
      if (!raw || ![raw.x, raw.y, raw.z].every(Number.isFinite)) continue;
      const phase = raw.phase === 'powered' ? 'powered' : raw.phase === 'waiting' ? 'waiting' : 'idle';
      const maximum = phase === 'powered' ? SENTRY_PULSE : phase === 'waiting' ? SENTRY_DELAY : 0;
      const record = { x: Math.floor(raw.x), y: Math.floor(raw.y), z: Math.floor(raw.z), phase, timer: Math.max(0, Math.min(maximum, Number(raw.timer) || 0)), queued: Boolean(raw.queued) };
      this.records.set(keyFor(record.x, record.y, record.z), record);
    }
  }

  ensure(x, y, z) {
    const key = keyFor(x, y, z);
    if (this.records.has(key)) return this.records.get(key);
    if (this.records.size >= MAX_CHANGE_SENTRIES) return null;
    const id = this.world.getBlock(x, y, z);
    const powered = Boolean(BLOCKS[id]?.powered);
    const record = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z), phase: powered ? 'powered' : 'idle', timer: powered ? SENTRY_PULSE : 0, queued: false };
    this.records.set(key, record);
    return record;
  }

  observe(x, y, z) {
    const id = this.world.getBlock(x, y, z);
    if (!isChangeSentry(id)) return false;
    const record = this.ensure(x, y, z);
    if (!record) return false;
    if (record.phase === 'idle') { record.phase = 'waiting'; record.timer = SENTRY_DELAY; return true; }
    if (record.phase === 'powered') record.queued = true;
    return false;
  }

  blockChanged(x, y, z, previous, id) {
    const key = keyFor(x, y, z);
    if (isChangeSentry(id)) this.ensure(x, y, z);
    else if (isChangeSentry(previous)) this.records.delete(key);
    let scheduled = 0;
    for (const [dx, dy, dz] of DIRECTIONS) {
      const sx = x - dx; const sy = y - dy; const sz = z - dz;
      const sentryId = this.world.getBlock(sx, sy, sz);
      const facing = sentryDirection(sentryId);
      if (isChangeSentry(sentryId) && facing[0] === dx && facing[1] === dy && facing[2] === dz && this.observe(sx, sy, sz)) scheduled += 1;
    }
    return scheduled;
  }

  update(dt) {
    let remaining = Math.max(0, Number(dt) || 0); const events = [];
    for (const record of this.records.values()) {
      if (record.phase === 'idle' || record.timer <= 0) continue;
      let budget = remaining;
      while (record.phase !== 'idle' && budget + 1e-9 >= record.timer) {
        budget -= record.timer;
        const id = this.world.getBlock(record.x, record.y, record.z);
        if (!isChangeSentry(id)) { this.records.delete(keyFor(record.x, record.y, record.z)); break; }
        if (record.phase === 'waiting') {
          record.phase = 'powered'; record.timer = SENTRY_PULSE;
          this.setPowered(record.x, record.y, record.z, true);
          this.onPulse({ x: record.x, y: record.y, z: record.z, powered: true });
          events.push({ type: 'sentry', point: [record.x, record.y, record.z], powered: true });
        } else {
          this.setPowered(record.x, record.y, record.z, false);
          this.onPulse({ x: record.x, y: record.y, z: record.z, powered: false });
          events.push({ type: 'sentry', point: [record.x, record.y, record.z], powered: false });
          record.phase = record.queued ? 'waiting' : 'idle'; record.timer = record.queued ? SENTRY_DELAY : 0; record.queued = false;
        }
      }
      if (record.phase !== 'idle') record.timer = Math.max(0.000001, record.timer - budget);
    }
    return events;
  }

  restore() {
    for (const [key, id] of this.world?.edits || []) if (isChangeSentry(id)) this.ensure(...pointFor(key));
    for (const [key, record] of [...this.records]) {
      const liveId = this.world?.edits instanceof Map ? (this.world.edits.get(key) ?? BLOCK.AIR) : this.world.getBlock(record.x, record.y, record.z);
      if (!isChangeSentry(liveId)) { this.records.delete(key); continue; }
      const shouldPower = record.phase === 'powered';
      if (Boolean(BLOCKS[liveId]?.powered) !== shouldPower) this.setPowered(record.x, record.y, record.z, shouldPower);
    }
    return this.records.size;
  }

  entries() { return [...this.records.values()]; }
  serialize() { return { records: this.entries().map((record) => ({ ...record })) }; }
}
