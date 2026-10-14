import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createWorldBundle,
  decodeWorldBundle,
  EDITS_FORMAT,
  importWorldBundle,
  loadWorldEdits,
  loadWorldSave,
  SAVE_FORMAT,
  SAVE_SCHEMA_VERSION,
  writeWorldEdits,
  writeWorldSave,
} from '../src/saveSystem.js';

class MemoryStorage {
  constructor(entries = []) { this.values = new Map(entries); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

test('legacy player saves migrate sequentially into a seed-bound current envelope', () => {
  const storage = new MemoryStorage([['player', JSON.stringify({
    hotbar: ['stone'],
    playerPosition: [1, 22, 3],
    effects: { effects: [['windstep', { remaining: 5 }]] },
    trailMap: { cells: [[0, 0]] },
  })]]);
  const loaded = loadWorldSave(storage, 'player', 1234);
  assert.equal(loaded.status, 'migrated');
  assert.deepEqual(loaded.data.hotbarSlots, ['stone']);
  assert.deepEqual(loaded.data.position, [1, 22, 3]);
  assert.ok(loaded.data.statusEffects);
  assert.ok(loaded.data.explorationMap);
  assert.deepEqual(loaded.data.cinderHeat, { exposure: 0 });

  const current = JSON.parse(storage.getItem('player'));
  assert.equal(current.format, SAVE_FORMAT);
  assert.equal(current.schemaVersion, SAVE_SCHEMA_VERSION);
  assert.equal(current.seed, 1234);
  assert.equal(JSON.parse(storage.getItem('player:backup')).hotbar[0], 'stone');
});

test('malformed primary player data recovers from the last-known-good backup', () => {
  const storage = new MemoryStorage();
  assert.equal(writeWorldSave(storage, 'player', { worldTime: 0.2 }, 77, 1).ok, true);
  assert.equal(writeWorldSave(storage, 'player', { worldTime: 0.4 }, 77, 2).ok, true);
  storage.setItem('player', '{broken');
  const recovered = loadWorldSave(storage, 'player', 77);
  assert.equal(recovered.status, 'recovered');
  assert.equal(recovered.reason, 'malformed-json');
  assert.equal(recovered.data.worldTime, 0.2);
  assert.equal(JSON.parse(storage.getItem('player')).format, SAVE_FORMAT);
  assert.equal(loadWorldSave(storage, 'player', 77).status, 'current');
});

test('future or wrong-seed player records never silently enter the active world', () => {
  const future = JSON.stringify({ format: SAVE_FORMAT, schemaVersion: SAVE_SCHEMA_VERSION + 1, seed: 9, payload: {} });
  const storage = new MemoryStorage([['player', future]]);
  assert.equal(loadWorldSave(storage, 'player', 9).reason, 'future-version');
  assert.equal(loadWorldSave(storage, 'player', 10).reason, 'future-version');
  writeWorldSave(storage, 'valid', { worldTime: 0.5 }, 9);
  storage.setItem('other', storage.getItem('valid'));
  assert.equal(loadWorldSave(storage, 'other', 10).reason, 'wrong-seed');
});

test('legacy edits are bounded, sanitized, upgraded, and independently recoverable', () => {
  const storage = new MemoryStorage([['edits', JSON.stringify([
    ['1,2,3', 7], ['bad-key', 4], ['4,5,6', 999], ['-8,9,-10', 12],
  ])]]);
  const migrated = loadWorldEdits(storage, 'edits');
  assert.equal(migrated.status, 'migrated');
  assert.deepEqual(migrated.edits, [['1,2,3', 7], ['-8,9,-10', 12]]);
  assert.equal(JSON.parse(storage.getItem('edits')).format, EDITS_FORMAT);

  assert.equal(writeWorldEdits(storage, 'edits', [['2,3,4', 8]], 2).ok, true);
  storage.setItem('edits', 'not-json');
  const recovered = loadWorldEdits(storage, 'edits');
  assert.equal(recovered.status, 'recovered');
  assert.deepEqual(recovered.edits, [['1,2,3', 7], ['-8,9,-10', 12]]);
});

test('complete world bundles round-trip player state and edits while enforcing seed identity', () => {
  const bundle = createWorldBundle({
    seed: 815,
    seedText: 'ember-road',
    payload: { position: [4, 25, 8], inventory: { counts: [['cinder_shard', 3]] } },
    edits: [['4,24,8', 208]],
    exportedAt: 99,
  });
  const decoded = decodeWorldBundle(bundle, 815);
  assert.equal(decoded.ok, true);
  assert.deepEqual(decoded.payload.position, [4, 25, 8]);
  assert.deepEqual(decoded.edits, [['4,24,8', 208]]);
  assert.equal(decodeWorldBundle(bundle, 816).reason, 'wrong-seed');

  const storage = new MemoryStorage();
  const imported = importWorldBundle(bundle, { storage, playerKey: 'player', editsKey: 'edits', seed: 815 });
  assert.equal(imported.ok, true);
  assert.equal(loadWorldSave(storage, 'player', 815).data.inventory.counts[0][1], 3);
  assert.deepEqual(loadWorldEdits(storage, 'edits').edits, [['4,24,8', 208]]);
});

test('failed bundle edit writes roll the primary player record back atomically', () => {
  class FailingStorage extends MemoryStorage {
    setItem(key, value) {
      if (key === 'edits') throw new Error('quota');
      super.setItem(key, value);
    }
  }
  const storage = new FailingStorage([['player', JSON.stringify({ legacy: 'keep' })]]);
  const original = storage.getItem('player');
  const bundle = createWorldBundle({ seed: 42, payload: { replacement: true }, edits: [['0,1,0', 2]] });
  const imported = importWorldBundle(bundle, { storage, playerKey: 'player', editsKey: 'edits', seed: 42 });
  assert.equal(imported.ok, false);
  assert.equal(imported.reason, 'storage-failed');
  assert.equal(storage.getItem('player'), original);
});

test('unavailable browser storage degrades to a safe new world without throwing', () => {
  const storage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.deepEqual(loadWorldSave(storage, 'player', 1).data, {});
  assert.deepEqual(loadWorldEdits(storage, 'edits').edits, []);
  assert.equal(writeWorldSave(storage, 'player', {}, 1).reason, 'storage-failed');
  assert.equal(writeWorldEdits(storage, 'edits', []).reason, 'storage-failed');
});
