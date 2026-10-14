import { BLOCK, BLOCKS } from './blocks.js';

export const MAX_RESONANCE_BOXES = 512;
export const RESONANCE_PITCHES = Object.freeze(Array.from({ length: 25 }, (_, pitch) => {
  const frequency = 185 * 2 ** (pitch / 12);
  const names = ['F♯', 'G', 'G♯', 'A', 'A♯', 'B', 'C', 'C♯', 'D', 'D♯', 'E', 'F'];
  const noteIndex = pitch % 12;
  const octave = 3 + Math.floor((pitch + 6) / 12);
  return Object.freeze({ pitch, frequency, label: `${names[noteIndex]}${octave}` });
}));

const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
export const isResonanceBox = (id) => Boolean(BLOCKS[id]?.resonanceBox);

export function resonanceInstrument(world, x, y, z) {
  const below = world?.getBlock?.(Math.floor(x), Math.floor(y) - 1, Math.floor(z));
  const definition = BLOCKS[below];
  if (below === BLOCK.GLASS || below === BLOCK.VOIDGLASS_ORE) return { id: 'crystal', name: 'Crystal Chime', waveform: 'sine', color: 0x8ff5e8, duration: 0.48 };
  if (below === BLOCK.SAND || below === BLOCK.SNOW || below === BLOCK.SNOWY_GRASS) return { id: 'hollow', name: 'Hollow Bell', waveform: 'sine', color: 0xe7d58b, duration: 0.62 };
  if (definition?.material === 'cloth') return { id: 'soft', name: 'Soft Hum', waveform: 'sine', color: 0xb99ad7, duration: 0.75 };
  if (definition?.tool === 'pickaxe' || definition?.wall) return { id: 'stone', name: 'Stone Pulse', waveform: 'square', color: 0xaeb8b8, duration: 0.22 };
  if (definition?.tool === 'axe' || below === BLOCK.WOOD || below === BLOCK.PLANKS) return { id: 'timber', name: 'Timber Pluck', waveform: 'triangle', color: 0xd5a15f, duration: 0.32 };
  return { id: 'aether', name: 'Aether Tone', waveform: 'triangle', color: 0x70dac8, duration: 0.4 };
}

export class ResonanceBoxState {
  constructor(serialized = null) {
    this.records = new Map();
    for (const raw of (Array.isArray(serialized) ? serialized : []).slice(0, MAX_RESONANCE_BOXES)) {
      if (!raw || ![raw.x, raw.y, raw.z].every(Number.isFinite)) continue;
      const record = {
        x: Math.floor(raw.x), y: Math.floor(raw.y), z: Math.floor(raw.z),
        pitch: Math.max(0, Math.min(RESONANCE_PITCHES.length - 1, Math.floor(Number(raw.pitch) || 0))),
        powered: Boolean(raw.powered),
      };
      this.records.set(keyFor(record.x, record.y, record.z), record);
    }
  }

  get(x, y, z) { return this.records.get(keyFor(x, y, z)) || null; }

  ensure(x, y, z) {
    const key = keyFor(x, y, z);
    if (this.records.has(key)) return this.records.get(key);
    if (this.records.size >= MAX_RESONANCE_BOXES) return null;
    const record = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z), pitch: 0, powered: false };
    this.records.set(key, record); return record;
  }

  event(world, record) {
    if (!record) return null;
    const note = RESONANCE_PITCHES[record.pitch]; const instrument = resonanceInstrument(world, record.x, record.y, record.z);
    return { x: record.x, y: record.y, z: record.z, pitch: record.pitch, frequency: note.frequency, note: note.label, ...instrument };
  }

  play(world, x, y, z) { return this.event(world, this.ensure(x, y, z)); }

  cycle(world, x, y, z) {
    const record = this.ensure(x, y, z); if (!record) return null;
    record.pitch = (record.pitch + 1) % RESONANCE_PITCHES.length;
    return this.event(world, record);
  }

  setPowered(world, x, y, z, powered) {
    const record = this.ensure(x, y, z); if (!record) return null;
    const rising = Boolean(powered) && !record.powered; record.powered = Boolean(powered);
    return rising ? this.event(world, record) : null;
  }

  blockChanged(x, y, z, previous, id) {
    if (isResonanceBox(id)) return this.ensure(x, y, z);
    if (!isResonanceBox(previous)) return null;
    const key = keyFor(x, y, z); const record = this.records.get(key) || null; this.records.delete(key); return record;
  }

  restore(world) {
    for (const [key, id] of world?.edits || []) if (isResonanceBox(id)) this.ensure(...key.split(',').map(Number));
    for (const record of [...this.records.values()]) if (!isResonanceBox(world?.getBlock?.(record.x, record.y, record.z))) this.records.delete(keyFor(record.x, record.y, record.z));
    return this.records.size;
  }

  serialize() { return [...this.records.values()].map((record) => ({ ...record })); }
}
