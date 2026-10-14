const MAX_TRAILMARKS = 24;
const MAX_DISCOVERIES = 64;
const TAU = Math.PI * 2;

const finitePoint = (value) => value && Number.isFinite(value.x) && Number.isFinite(value.z);
const cleanLabel = (value, fallback) => String(value || fallback).replace(/[<>\r\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 24) || fallback;
const pointRecord = (value, fallbackLabel, kind) => finitePoint(value) ? {
  id: String(value.id || `${kind}:${Math.floor(value.x)},${Math.floor(value.z)}`).slice(0, 80),
  label: cleanLabel(value.label, fallbackLabel),
  kind,
  x: Math.max(-1000000, Math.min(1000000, Number(value.x))),
  z: Math.max(-1000000, Math.min(1000000, Number(value.z))),
} : null;

export function normalizeAngle(angle) {
  angle = Number(angle) || 0;
  return ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
}

export function compassReading(origin, target, viewYaw = 0) {
  if (!finitePoint(origin) || !finitePoint(target)) return null;
  const dx = target.x - origin.x;
  const dz = target.z - origin.z;
  const bearing = Math.atan2(-dx, -dz);
  const directions = ['N', 'NW', 'W', 'SW', 'S', 'SE', 'E', 'NE'];
  const sector = Math.round(((bearing % TAU) + TAU) % TAU / (TAU / 8)) % 8;
  return {
    distance: Math.round(Math.hypot(dx, dz)),
    bearing,
    relative: normalizeAngle(bearing - viewYaw),
    direction: directions[sector],
  };
}

export function discoverLandmarks(world, x, z, radius = 176) {
  if (!world || !Number.isFinite(x) || !Number.isFinite(z)) return [];
  radius = Math.max(24, Math.min(256, Number(radius) || 176));
  const found = [];
  const add = (kind, label, record, px = record?.originX ?? record?.x, pz = record?.originZ ?? record?.z) => {
    if (!record || !Number.isFinite(px) || !Number.isFinite(pz) || Math.hypot(px - x, pz - z) > radius) return;
    found.push({ id: `landmark:${record.key || `${kind}:${Math.floor(px)},${Math.floor(pz)}`}`, label, kind: 'landmark', landmarkKind: kind, x: px, z: pz });
  };
  for (const value of world.ruinsNear?.(x - radius, x + radius, z - radius, z + radius) || []) add('ruin', 'Trailforge Ruin', value);
  for (const value of world.hearthsteadsNear?.(x, z, radius) || []) add('settlement', 'Hearthstead', value);
  for (const value of world.shadowDensNear?.(x, z, radius) || []) add('den', 'Shadow Den', value);
  for (const value of world.sunstepShrinesNear?.(x, z, radius) || []) add('shrine', 'Sunstep Shrine', value);
  for (const value of world.sunstepGauntletsNear?.(x, z, radius) || []) add('gauntlet', 'Sunstep Gauntlet', value);
  for (const value of world.sunstepPulseHallsNear?.(x, z, radius) || []) add('hall', 'Sunstep Pulse Hall', value);
  for (const value of world.echoVaultsNear?.(x, z, radius) || []) add('vault', 'Buried Echo Vault', value);
  for (const value of world.cinderwatchesNear?.(x, z, radius) || []) add('cinderwatch', 'Cinderwatch', value);
  const unique = new Map(found.map((entry) => [entry.id, entry]));
  return [...unique.values()].sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
}

export class NavigationState {
  constructor(serialized = null, origin = { x: 0, z: 0 }) {
    this.origin = pointRecord(serialized?.origin, 'World Origin', 'origin') || pointRecord({ ...origin, id: 'origin', label: 'World Origin' }, 'World Origin', 'origin');
    this.trailmarks = (serialized?.trailmarks || []).map((value) => pointRecord(value, 'Trailmark', 'trailmark')).filter(Boolean).slice(0, MAX_TRAILMARKS);
    this.discoveries = (serialized?.discoveries || []).map((value) => {
      const record = pointRecord(value, 'Landmark', 'landmark');
      if (record) record.landmarkKind = cleanLabel(value.landmarkKind, 'landmark').toLowerCase();
      return record;
    }).filter(Boolean).slice(0, MAX_DISCOVERIES);
    this.activeId = typeof serialized?.activeId === 'string' ? serialized.activeId.slice(0, 80) : this.origin?.id || null;
    this.nextTrailmark = Math.max(1, Math.min(999, Math.floor(Number(serialized?.nextTrailmark) || this.trailmarks.length + 1)));
  }

  addTrailmark(x, z, label = null) {
    if (!Number.isFinite(x) || !Number.isFinite(z) || this.trailmarks.length >= MAX_TRAILMARKS) return null;
    const index = this.nextTrailmark++;
    const record = pointRecord({ id: `trailmark:${Date.now()}:${index}`, label: label || `Trailmark ${index}`, x, z }, `Trailmark ${index}`, 'trailmark');
    this.trailmarks.push(record);
    this.activeId = record.id;
    return { ...record };
  }

  removeNearest(x, z, radius = 6) {
    let best = null;
    let distance = Math.max(0, Number(radius) || 0);
    for (const record of this.trailmarks) {
      const next = Math.hypot(record.x - x, record.z - z);
      if (next <= distance) { best = record; distance = next; }
    }
    if (!best) return null;
    this.trailmarks.splice(this.trailmarks.indexOf(best), 1);
    if (this.activeId === best.id) this.activeId = this.origin?.id || null;
    return { ...best };
  }

  discover(records) {
    let added = 0;
    const known = new Set(this.discoveries.map((record) => record.id));
    for (const value of records || []) {
      if (known.has(value?.id) || this.discoveries.length >= MAX_DISCOVERIES) continue;
      const record = pointRecord(value, 'Landmark', 'landmark');
      if (!record) continue;
      record.landmarkKind = cleanLabel(value.landmarkKind, 'landmark').toLowerCase();
      this.discoveries.push(record);
      known.add(record.id);
      added += 1;
    }
    return added;
  }

  targets(extra = []) {
    const records = [this.origin, ...this.trailmarks, ...this.discoveries, ...(extra || [])].filter(Boolean);
    return [...new Map(records.map((record) => [record.id, record])).values()];
  }

  active(targets = this.targets()) {
    return targets.find((record) => record.id === this.activeId) || targets[0] || null;
  }

  cycle(targets = this.targets(), step = 1) {
    if (!targets.length) return null;
    const current = targets.findIndex((record) => record.id === this.activeId);
    const index = (current + (Number(step) < 0 ? -1 : 1) + targets.length) % targets.length;
    this.activeId = targets[index].id;
    return targets[index];
  }

  serialize() {
    return {
      origin: this.origin ? { ...this.origin } : null,
      trailmarks: this.trailmarks.map((record) => ({ ...record })),
      discoveries: this.discoveries.map((record) => ({ ...record })),
      activeId: this.activeId,
      nextTrailmark: this.nextTrailmark,
    };
  }
}
