import * as THREE from 'three';
import { BLOCK, BLOCKS } from './blocks.js';

export const MAX_HEARTHSONG_PLAYERS = 128;
const song = (name, base, interval, waveform, color, notes) => Object.freeze({ name, base, interval, waveform, color, notes: Object.freeze(notes) });
export const SONGSTONES = Object.freeze({
  songstone_trail: song('Open Road', 196, 0.42, 'triangle', 0xd8b66b, [0, 4, 7, 9, 7, 4, 2, 0, 2, 5, 9, 12, 9, 7, 4, 2, 0, 4, 7, 11, 9, 7, 5, 4, 2, 5, 9, 7, 4, 2, 0, null]),
  songstone_sun: song('Brass Horizon', 220, 0.36, 'square', 0xf1c85b, [0, 7, 4, 9, 7, 12, 11, 9, 4, 7, 9, 16, 14, 12, 9, 7, 0, 4, 7, 12, 11, 9, 7, 4, 2, 7, 11, 14, 12, 9, 7, null]),
  songstone_hollow: song('Lanterns Below', 130.81, 0.5, 'sine', 0x8cded2, [0, 3, 7, 10, 7, 3, -2, 0, 5, 8, 12, 10, 8, 5, 3, null, 0, 7, 10, 15, 12, 10, 7, 5, 3, 8, 7, 3, 0, -2, 0, null]),
  songstone_cinder: song('Emberwake', 164.81, 0.32, 'sawtooth', 0xed7d45, [0, 0, 7, 5, 3, 0, 10, 7, 5, 3, 12, 10, 7, 5, 3, null, 0, 3, 7, 10, 12, 10, 15, 12, 10, 7, 5, 3, 7, 5, 0, null]),
});
export const SONGSTONE_IDS = Object.freeze(Object.keys(SONGSTONES));

const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
export const isSongstone = (id) => Boolean(SONGSTONES[id]);
export const isHearthsongPlayer = (id) => Boolean(BLOCKS[id]?.hearthsongPlayer);
const sanitizedSongstone = (id) => isSongstone(id) ? id : null;

function recordFrom(raw) {
  if (!raw || ![raw.x, raw.y, raw.z].every(Number.isFinite)) return null;
  const songstone = sanitizedSongstone(raw.songstone); const definition = SONGSTONES[songstone];
  return {
    x: Math.floor(raw.x), y: Math.floor(raw.y), z: Math.floor(raw.z), songstone,
    playing: Boolean(songstone && raw.playing),
    step: definition ? Math.max(0, Math.min(definition.notes.length - 1, Math.floor(Number(raw.step) || 0))) : 0,
    timer: definition ? Math.max(0, Math.min(definition.interval, Number(raw.timer) || 0)) : 0,
  };
}

export class HearthsongState {
  constructor(serialized = null) {
    this.records = new Map();
    const source = Array.isArray(serialized) ? serialized : Array.isArray(serialized?.records) ? serialized.records : [];
    for (const raw of source.slice(0, MAX_HEARTHSONG_PLAYERS)) {
      const record = recordFrom(raw); if (record) this.records.set(keyFor(record.x, record.y, record.z), record);
    }
  }

  get(x, y, z) { return this.records.get(keyFor(x, y, z)) || null; }
  ensure(x, y, z) {
    const key = keyFor(x, y, z); if (this.records.has(key)) return this.records.get(key);
    if (this.records.size >= MAX_HEARTHSONG_PLAYERS) return null;
    const record = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z), songstone: null, playing: false, step: 0, timer: 0 };
    this.records.set(key, record); return record;
  }

  insert(world, x, y, z, songstone) {
    if (!isHearthsongPlayer(world?.getBlock?.(x, y, z)) || !isSongstone(songstone)) return null;
    const record = this.ensure(x, y, z); if (!record || record.songstone) return null;
    record.songstone = songstone; record.playing = true; record.step = 0; record.timer = 0;
    return { ...record, definition: SONGSTONES[songstone] };
  }

  eject(x, y, z) {
    const record = this.get(x, y, z); if (!record?.songstone) return null;
    const songstone = record.songstone; record.songstone = null; record.playing = false; record.step = 0; record.timer = 0;
    return songstone;
  }

  toggle(x, y, z) {
    const record = this.get(x, y, z); if (!record?.songstone) return null;
    if (!record.playing && record.step >= SONGSTONES[record.songstone].notes.length - 1) record.step = 0;
    record.playing = !record.playing; record.timer = 0; return { ...record };
  }

  blockChanged(x, y, z, previous, id) {
    if (isHearthsongPlayer(id)) { this.ensure(x, y, z); return null; }
    if (!isHearthsongPlayer(previous)) return null;
    const key = keyFor(x, y, z); const record = this.records.get(key); this.records.delete(key);
    return record?.songstone ? { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z), id: record.songstone } : null;
  }

  restore(world) {
    for (const [key, id] of world?.edits || []) if (isHearthsongPlayer(id)) this.ensure(...key.split(',').map(Number));
    const recovered = [];
    for (const record of [...this.records.values()]) {
      const key = keyFor(record.x, record.y, record.z);
      const liveId = world?.edits instanceof Map ? (world.edits.get(key) ?? BLOCK.AIR) : world.getBlock(record.x, record.y, record.z);
      if (isHearthsongPlayer(liveId)) continue;
      if (record.songstone) recovered.push({ x: record.x, y: record.y, z: record.z, id: record.songstone });
      this.records.delete(key);
    }
    return recovered;
  }

  update(dt, listenerPosition, emit = () => {}) {
    dt = Math.max(0, Math.min(1, Number(dt) || 0)); if (dt <= 0) return [];
    const events = [];
    for (const record of this.records.values()) {
      if (!record.playing || !record.songstone) continue;
      const definition = SONGSTONES[record.songstone]; record.timer -= dt; let guard = 0;
      while (record.timer <= 0 && record.playing && guard < 4) {
        const semitone = definition.notes[record.step]; const distance = listenerPosition
          ? Math.hypot(listenerPosition.x - (record.x + 0.5), listenerPosition.y - (record.y + 0.65), listenerPosition.z - (record.z + 0.5)) : Infinity;
        if (semitone != null && distance <= 32) {
          const event = { x: record.x, y: record.y, z: record.z, songstone: record.songstone, name: definition.name, step: record.step, frequency: definition.base * 2 ** (semitone / 12), waveform: definition.waveform, duration: definition.interval * 0.86, color: definition.color, distance };
          events.push(event); emit(event);
        }
        record.step += 1; record.timer += definition.interval; guard += 1;
        if (record.step >= definition.notes.length) { record.step = definition.notes.length - 1; record.playing = false; record.timer = 0; }
      }
    }
    return events;
  }

  playingNear(position, range = 32) {
    if (!position) return false;
    return this.entries().some((record) => record.playing && record.songstone
      && Math.hypot(position.x - (record.x + 0.5), position.y - (record.y + 0.5), position.z - (record.z + 0.5)) <= range);
  }

  entries() { return [...this.records.values()]; }
  serialize() { return { records: this.entries().map((record) => ({ ...record })) }; }
}

function dispose(group) { group.traverse((object) => { object.geometry?.dispose?.(); object.material?.dispose?.(); }); group.removeFromParent(); }
export class HearthsongRenderer {
  constructor(scene, state) {
    this.state = state; this.root = new THREE.Group(); this.root.name = 'Hearthsong Songstones'; this.meshes = new Map(); scene.add(this.root); this.sync();
  }
  sync() {
    const wanted = new Set();
    for (const record of this.state.entries()) {
      if (!record.songstone) continue; const key = keyFor(record.x, record.y, record.z); wanted.add(key);
      const existing = this.meshes.get(key);
      if (existing?.userData.songstone === record.songstone) { existing.userData.playing = record.playing; continue; }
      if (existing) dispose(existing);
      const definition = SONGSTONES[record.songstone]; const group = new THREE.Group();
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.045, 16), new THREE.MeshLambertMaterial({ color: 0x20252a, flatShading: true }));
      const rune = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.052, 8), new THREE.MeshBasicMaterial({ color: definition.color }));
      group.add(plate, rune); group.position.set(record.x + 0.5, record.y + 0.93, record.z + 0.5); group.userData.songstone = record.songstone; group.userData.playing = record.playing;
      this.root.add(group); this.meshes.set(key, group);
    }
    for (const [key, group] of [...this.meshes]) if (!wanted.has(key)) { dispose(group); this.meshes.delete(key); }
  }
  update(dt) {
    for (const [key, group] of this.meshes) {
      const record = this.state.records.get(key); group.userData.playing = Boolean(record?.playing);
      if (record?.playing) group.rotation.y += Math.max(0, Number(dt) || 0) * 2.4;
    }
  }
}
