export const REALM = Object.freeze({ OVERWORLD: 'overworld', CINDERREACH: 'cinderreach' });
export const CINDERREACH_ORIGIN = Object.freeze({ x: 524288, z: 524288 });
export const CINDERREACH_RADIUS = 4096;
const WORLD_MIN_Y = -128;

const validRealm = (value) => value === REALM.CINDERREACH ? REALM.CINDERREACH : REALM.OVERWORLD;
const finitePosition = (value) => value && Number.isFinite(value.x) && Number.isFinite(value.z);
const sanitizePosition = (value) => finitePosition(value) ? {
  x: Math.max(-1000000, Math.min(1000000, Number(value.x))),
  y: Number.isFinite(value.y) ? Math.max(WORLD_MIN_Y + 1, Math.min(62, Number(value.y))) : null,
  z: Math.max(-1000000, Math.min(1000000, Number(value.z))),
} : null;

export function realmAt(x, z) {
  return Number.isFinite(x) && Number.isFinite(z)
    && Math.abs(x - CINDERREACH_ORIGIN.x) <= CINDERREACH_RADIUS
    && Math.abs(z - CINDERREACH_ORIGIN.z) <= CINDERREACH_RADIUS
    ? REALM.CINDERREACH : REALM.OVERWORLD;
}

export function cinderreachLocal(x, z) {
  return { x: x - CINDERREACH_ORIGIN.x, z: z - CINDERREACH_ORIGIN.z };
}

export class RealmTravelState {
  constructor(serialized = null, options = {}) {
    this.current = options.initialRealm === REALM.CINDERREACH || options.initialRealm === REALM.OVERWORLD
      ? options.initialRealm : validRealm(serialized?.current);
    this.overworldReturn = sanitizePosition(serialized?.overworldReturn);
    const savedEntities = serialized?.entities && typeof serialized.entities === 'object' ? serialized.entities : {};
    this.entities = {
      [REALM.OVERWORLD]: Array.isArray(savedEntities[REALM.OVERWORLD]) ? savedEntities[REALM.OVERWORLD].slice(0, 32) : Array.isArray(options.legacyEntities) ? options.legacyEntities.slice(0, 32) : [],
      [REALM.CINDERREACH]: Array.isArray(savedEntities[REALM.CINDERREACH]) ? savedEntities[REALM.CINDERREACH].slice(0, 32) : [],
    };
  }

  storeEntities(realm, records) {
    realm = validRealm(realm);
    this.entities[realm] = Array.isArray(records) ? records.filter(Boolean).slice(0, 32) : [];
    return this.entities[realm].length;
  }

  entitiesFor(realm = this.current) {
    return (this.entities[validRealm(realm)] || []).map((record) => ({ ...record }));
  }

  enter(portalPosition) {
    if (this.current !== REALM.OVERWORLD || !finitePosition(portalPosition)) return null;
    this.overworldReturn = sanitizePosition({ x: portalPosition.x + 1.5, y: portalPosition.y, z: portalPosition.z + 0.5 });
    this.current = REALM.CINDERREACH;
    return { realm: this.current, x: CINDERREACH_ORIGIN.x + 0.5, z: CINDERREACH_ORIGIN.z + 2.5 };
  }

  leave(fallback = { x: 0.5, z: 0.5 }) {
    if (this.current !== REALM.CINDERREACH) return null;
    const target = this.overworldReturn || sanitizePosition(fallback);
    this.current = REALM.OVERWORLD;
    return target ? { realm: this.current, ...target } : null;
  }

  serialize(currentEntities = null) {
    const entities = {
      [REALM.OVERWORLD]: this.entitiesFor(REALM.OVERWORLD),
      [REALM.CINDERREACH]: this.entitiesFor(REALM.CINDERREACH),
    };
    if (Array.isArray(currentEntities)) entities[this.current] = currentEntities.filter(Boolean).slice(0, 32);
    return { current: this.current, overworldReturn: this.overworldReturn ? { ...this.overworldReturn } : null, entities };
  }
}

export class CinderHeatState {
  constructor(serialized = null) {
    this.exposure = Math.max(0, Math.min(4, Number(serialized?.exposure) || 0));
  }

  update(dt, inCinderreach, sheltered) {
    if (!Number.isFinite(dt) || dt <= 0) return false;
    if (!inCinderreach || sheltered) {
      this.exposure = Math.max(0, this.exposure - dt * 2);
      return false;
    }
    this.exposure += dt;
    if (this.exposure < 4) return false;
    this.exposure %= 4;
    return true;
  }

  serialize() {
    return { exposure: this.exposure };
  }
}
