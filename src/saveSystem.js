import { isRegisteredBlockId, MAX_BLOCK_ID } from './blocks.js';
import { WORLD_HEIGHT, WORLD_MIN_Y } from './worldBounds.js';

export const SAVE_FORMAT = 'wildforge-save';
export const SAVE_SCHEMA_VERSION = 3;
export const EDITS_FORMAT = 'wildforge-edits';
export const EDITS_SCHEMA_VERSION = 2;
export const MAX_PERSISTED_BLOCK_ID = MAX_BLOCK_ID;
export const WORLD_BUNDLE_FORMAT = 'wildforge-world-bundle';
export const MAX_SAVE_BYTES = 4_000_000;
export const MAX_BUNDLE_BYTES = 8_000_000;
export const MAX_WORLD_EDITS = 250_000;

const isRecord = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const copyRecord = (value) => isRecord(value) ? { ...value } : {};
const backupKey = (key) => `${key}:backup`;
const readStorage = (storage, key) => {
  try { return storage?.getItem(key) ?? null; } catch { return null; }
};

function parseJson(text, maximumBytes = MAX_SAVE_BYTES) {
  if (typeof text !== 'string' || !text.length) return { ok: false, reason: 'missing' };
  if (text.length > maximumBytes) return { ok: false, reason: 'too-large' };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, reason: 'malformed-json' };
  }
}

const MIGRATIONS = Object.freeze([
  (payload) => {
    const next = copyRecord(payload);
    if (!Array.isArray(next.hotbarSlots) && Array.isArray(next.hotbar)) next.hotbarSlots = next.hotbar;
    if (!Array.isArray(next.position) && Array.isArray(next.playerPosition)) next.position = next.playerPosition;
    delete next.hotbar;
    delete next.playerPosition;
    return next;
  },
  (payload) => {
    const next = copyRecord(payload);
    if (!isRecord(next.realmTravel) && isRecord(next.realms)) next.realmTravel = next.realms;
    if (!isRecord(next.statusEffects) && isRecord(next.effects)) next.statusEffects = next.effects;
    delete next.realms;
    delete next.effects;
    return next;
  },
  (payload) => {
    const next = copyRecord(payload);
    if (!isRecord(next.explorationMap) && isRecord(next.trailMap)) next.explorationMap = next.trailMap;
    if (!isRecord(next.cinderHeat)) next.cinderHeat = { exposure: 0 };
    delete next.trailMap;
    return next;
  },
]);

export function migrateSavePayload(payload, fromVersion = 0) {
  if (!isRecord(payload)) return null;
  if (!Number.isInteger(fromVersion) || fromVersion < 0 || fromVersion > SAVE_SCHEMA_VERSION) return null;
  let data = copyRecord(payload);
  for (let version = fromVersion; version < SAVE_SCHEMA_VERSION; version += 1) data = MIGRATIONS[version](data);
  return data;
}

export function createSaveEnvelope(payload, seed, savedAt = Date.now()) {
  const data = migrateSavePayload(payload, SAVE_SCHEMA_VERSION);
  if (!data) return null;
  return {
    format: SAVE_FORMAT,
    schemaVersion: SAVE_SCHEMA_VERSION,
    seed: Number(seed) >>> 0,
    savedAt: Math.max(0, Number(savedAt) || 0),
    payload: data,
  };
}

export function decodeSave(value, expectedSeed = null) {
  if (!isRecord(value)) return { ok: false, reason: 'invalid-root' };
  const envelope = value.format === SAVE_FORMAT;
  const fromVersion = envelope ? Number(value.schemaVersion) : 0;
  if (envelope && (!Number.isInteger(fromVersion) || fromVersion < 0 || fromVersion > SAVE_SCHEMA_VERSION)) {
    return { ok: false, reason: fromVersion > SAVE_SCHEMA_VERSION ? 'future-version' : 'invalid-version' };
  }
  if (envelope && expectedSeed != null && (Number(value.seed) >>> 0) !== (Number(expectedSeed) >>> 0)) {
    return { ok: false, reason: 'wrong-seed' };
  }
  const payload = migrateSavePayload(envelope ? value.payload : value, fromVersion);
  if (!payload) return { ok: false, reason: 'invalid-payload' };
  return {
    ok: true,
    payload,
    migrated: !envelope || fromVersion !== SAVE_SCHEMA_VERSION,
    envelope: createSaveEnvelope(payload, expectedSeed ?? value.seed ?? 0, value.savedAt),
  };
}

function decodeSaveText(text, expectedSeed) {
  const parsed = parseJson(text);
  return parsed.ok ? decodeSave(parsed.value, expectedSeed) : parsed;
}

export function writeWorldSave(storage, key, payload, seed, savedAt = Date.now()) {
  const envelope = createSaveEnvelope(payload, seed, savedAt);
  if (!envelope) return { ok: false, reason: 'invalid-payload' };
  const serialized = JSON.stringify(envelope);
  if (serialized.length > MAX_SAVE_BYTES) return { ok: false, reason: 'too-large' };
  try {
    const previous = readStorage(storage, key);
    if (previous && decodeSaveText(previous, seed).ok) storage.setItem(backupKey(key), previous);
    storage?.setItem(key, serialized);
    return { ok: true, bytes: serialized.length, envelope };
  } catch {
    return { ok: false, reason: 'storage-failed' };
  }
}

export function loadWorldSave(storage, key, seed) {
  const primaryText = readStorage(storage, key);
  const primary = decodeSaveText(primaryText, seed);
  if (primary.ok) {
    if (primary.migrated) writeWorldSave(storage, key, primary.payload, seed);
    return { data: primary.payload, status: primary.migrated ? 'migrated' : 'current', recovered: false };
  }
  const backupText = readStorage(storage, backupKey(key));
  const backup = decodeSaveText(backupText, seed);
  if (backup.ok) {
    try { storage?.setItem(key, JSON.stringify(backup.envelope)); } catch { /* usable in memory even if repair cannot persist */ }
    return { data: backup.payload, status: 'recovered', recovered: true, reason: primary.reason };
  }
  return { data: {}, status: primary.reason === 'missing' ? 'new' : 'reset', recovered: false, reason: primary.reason };
}

export function sanitizeWorldEdits(value) {
  if (!Array.isArray(value)) return null;
  const sanitized = [];
  for (const entry of value.slice(0, MAX_WORLD_EDITS)) {
    if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string' || !/^-?\d+,-?\d+,-?\d+$/.test(entry[0])) continue;
    const [, rawY] = entry[0].split(',').map(Number);
    if (rawY < WORLD_MIN_Y || rawY >= WORLD_HEIGHT) continue;
    const id = Number(entry[1]);
    if (!isRegisteredBlockId(id)) continue;
    sanitized.push([entry[0], id]);
  }
  return sanitized;
}

export function createEditsEnvelope(edits, savedAt = Date.now()) {
  const sanitized = sanitizeWorldEdits(edits);
  return sanitized ? { format: EDITS_FORMAT, schemaVersion: EDITS_SCHEMA_VERSION, savedAt: Math.max(0, Number(savedAt) || 0), edits: sanitized } : null;
}

function decodeEditsText(text) {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  const value = parsed.value;
  const legacy = Array.isArray(value);
  if (!legacy && (!isRecord(value) || value.format !== EDITS_FORMAT || ![1, EDITS_SCHEMA_VERSION].includes(value.schemaVersion))) return { ok: false, reason: 'invalid-edits' };
  const edits = sanitizeWorldEdits(legacy ? value : value.edits);
  return edits ? { ok: true, edits, migrated: legacy || value.schemaVersion !== EDITS_SCHEMA_VERSION } : { ok: false, reason: 'invalid-edits' };
}

export function writeWorldEdits(storage, key, edits, savedAt = Date.now()) {
  const envelope = createEditsEnvelope(edits, savedAt);
  if (!envelope) return { ok: false, reason: 'invalid-edits' };
  const serialized = JSON.stringify(envelope);
  if (serialized.length > MAX_SAVE_BYTES) return { ok: false, reason: 'too-large' };
  try {
    const previous = readStorage(storage, key);
    if (previous && decodeEditsText(previous).ok) storage.setItem(backupKey(key), previous);
    storage?.setItem(key, serialized);
    return { ok: true, bytes: serialized.length };
  } catch {
    return { ok: false, reason: 'storage-failed' };
  }
}

export function loadWorldEdits(storage, key) {
  const primary = decodeEditsText(readStorage(storage, key));
  if (primary.ok) {
    if (primary.migrated) writeWorldEdits(storage, key, primary.edits);
    return { edits: primary.edits, status: primary.migrated ? 'migrated' : 'current' };
  }
  const backup = decodeEditsText(readStorage(storage, backupKey(key)));
  if (backup.ok) {
    writeWorldEdits(storage, key, backup.edits);
    return { edits: backup.edits, status: 'recovered', reason: primary.reason };
  }
  return { edits: [], status: primary.reason === 'missing' ? 'new' : 'reset', reason: primary.reason };
}

export function createWorldBundle({ seed, seedText = '', payload, edits, exportedAt = Date.now() }) {
  const player = createSaveEnvelope(payload, seed, exportedAt);
  const worldEdits = createEditsEnvelope(edits, exportedAt);
  if (!player || !worldEdits) return null;
  return JSON.stringify({
    format: WORLD_BUNDLE_FORMAT,
    bundleVersion: 1,
    seed: Number(seed) >>> 0,
    seedText: String(seedText).slice(0, 128),
    exportedAt: Math.max(0, Number(exportedAt) || 0),
    player,
    worldEdits,
  }, null, 2);
}

export function decodeWorldBundle(text, expectedSeed) {
  const parsed = parseJson(text, MAX_BUNDLE_BYTES);
  if (!parsed.ok) return parsed;
  const value = parsed.value;
  if (!isRecord(value) || value.format !== WORLD_BUNDLE_FORMAT || value.bundleVersion !== 1) return { ok: false, reason: 'invalid-bundle' };
  if ((Number(value.seed) >>> 0) !== (Number(expectedSeed) >>> 0)) return { ok: false, reason: 'wrong-seed' };
  const player = decodeSave(value.player, expectedSeed);
  const worldEdits = isRecord(value.worldEdits) && value.worldEdits.format === EDITS_FORMAT
    ? sanitizeWorldEdits(value.worldEdits.edits) : null;
  if (!player.ok || !worldEdits) return { ok: false, reason: player.reason || 'invalid-edits' };
  return { ok: true, payload: player.payload, edits: worldEdits, seedText: typeof value.seedText === 'string' ? value.seedText : '' };
}

export function importWorldBundle(text, { storage, playerKey, editsKey, seed }) {
  const decoded = decodeWorldBundle(text, seed);
  if (!decoded.ok) return decoded;
  const previousPlayer = readStorage(storage, playerKey);
  const previousEdits = readStorage(storage, editsKey);
  const playerWrite = writeWorldSave(storage, playerKey, decoded.payload, seed);
  if (!playerWrite.ok) return playerWrite;
  const editsWrite = writeWorldEdits(storage, editsKey, decoded.edits);
  if (editsWrite.ok) return { ...decoded, imported: true };
  try {
    if (previousPlayer == null) storage?.removeItem?.(playerKey);
    else storage?.setItem(playerKey, previousPlayer);
    if (previousEdits == null) storage?.removeItem?.(editsKey);
    else storage?.setItem(editsKey, previousEdits);
  } catch { /* report the original write failure; backups still retain the previous valid records */ }
  return editsWrite;
}
