const MAX_WATCH_RECORDS = 128;
const GUARDIANS_PER_WATCH = 2;

function validKey(value) {
  return typeof value === 'string' && value.startsWith('cinderwatch:') && value.length <= 96;
}

export class CinderwatchState {
  constructor(saved = null) {
    this.defeats = new Map();
    for (const record of Array.isArray(saved?.defeats) ? saved.defeats.slice(0, MAX_WATCH_RECORDS) : []) {
      if (!Array.isArray(record) || !validKey(record[0])) continue;
      const count = Math.max(0, Math.min(GUARDIANS_PER_WATCH, Math.floor(Number(record[1]) || 0)));
      if (count > 0) this.defeats.set(record[0], count);
    }
  }

  defeated(key) {
    return validKey(key) ? this.defeats.get(key) || 0 : 0;
  }

  remaining(key) {
    return Math.max(0, GUARDIANS_PER_WATCH - this.defeated(key));
  }

  isCleared(key) {
    return this.remaining(key) === 0;
  }

  recordDefeat(key) {
    if (!validKey(key)) return null;
    const before = this.defeated(key);
    const defeated = Math.min(GUARDIANS_PER_WATCH, before + 1);
    this.defeats.set(key, defeated);
    return { changed: defeated !== before, defeated, remaining: GUARDIANS_PER_WATCH - defeated, cleared: defeated === GUARDIANS_PER_WATCH };
  }

  serialize() {
    return { defeats: [...this.defeats].sort(([a], [b]) => a.localeCompare(b)).slice(0, MAX_WATCH_RECORDS) };
  }
}

export const CINDERWATCH_GUARDIAN_COUNT = GUARDIANS_PER_WATCH;
