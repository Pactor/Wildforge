import { BLOCK } from './blocks.js';

export const CLIMATE_WARNING = 45;
export const CLIMATE_DANGER = 90;
export const CLIMATE_DAMAGE_INTERVAL = 4;
export const CLIMATE_MAX = 100;

const WARM_BLOCKS = new Set([
  BLOCK.HEARTHFIRE_LIT,
  BLOCK.EMBERFIRE,
  BLOCK.TORCH,
  BLOCK.TORCH_WALL_N,
  BLOCK.TORCH_WALL_E,
  BLOCK.TORCH_WALL_S,
  BLOCK.TORCH_WALL_W,
]);

const clamp = (value) => Math.max(0, Math.min(CLIMATE_MAX, Number(value) || 0));

export function nearbyWarmth(world, position, radius = 4) {
  if (!world || !position) return null;
  const cx = Math.floor(Number(position.x) || 0); const cy = Math.floor(Number(position.y) || 0); const cz = Math.floor(Number(position.z) || 0);
  radius = Math.max(1, Math.min(6, Math.floor(Number(radius) || 4)));
  let nearest = null;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dz = -radius; dz <= radius; dz += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (dx * dx + dz * dz > radius * radius || !WARM_BLOCKS.has(world.getBlock(cx + dx, cy + dy, cz + dz))) continue;
        const distance = Math.hypot(dx, dy, dz);
        if (!nearest || distance < nearest.distance) nearest = { x: cx + dx, y: cy + dy, z: cz + dz, distance };
      }
    }
  }
  return nearest;
}

export class ClimateExposureState {
  constructor(serialized = null) {
    this.heat = clamp(serialized?.heat);
    this.cold = clamp(serialized?.cold);
    this.damageTimer = Math.max(0, Math.min(CLIMATE_DAMAGE_INTERVAL, Number(serialized?.damageTimer) || 0));
    this.lastKind = serialized?.lastKind === 'heat' || serialized?.lastKind === 'cold' ? serialized.lastKind : null;
  }

  reset() {
    this.heat = 0; this.cold = 0; this.damageTimer = 0; this.lastKind = null;
  }

  update(dt, context = {}) {
    dt = Math.max(0, Math.min(5, Number(dt) || 0));
    const previousHeat = this.heat; const previousCold = this.cold;
    const biome = context.biome;
    const daylight = Math.max(0, Math.min(1, Number(context.daylight) || 0));
    const exposed = Boolean(context.exposed);
    const wet = Boolean(context.inWater);
    const sheltered = !exposed;
    const heatWard = Boolean(context.heatWard);
    const warmth = Boolean(context.nearHeat);
    const insulation = Math.max(0, Math.min(1, Number(context.insulation) || 0));
    const weather = context.weatherKind;

    const desertHeat = biome === 'desert' && daylight >= 0.58 && exposed && !wet && !heatWard;
    if (desertHeat) {
      const cloudRelief = weather === 'storm' ? 0.55 : weather === 'rain' ? 0.72 : 1;
      this.heat = clamp(this.heat + dt * (0.72 + daylight * 0.58) * cloudRelief);
    } else this.heat = clamp(this.heat - dt * (wet ? 4.8 : sheltered || heatWard ? 3.2 : 2.1));

    const frostCold = biome === 'snowy_highlands' && !sheltered && !warmth;
    if (frostCold) {
      const night = daylight < 0.3 ? 0.62 : daylight < 0.55 ? 0.28 : 0;
      const storm = weather === 'storm' ? 0.58 : weather === 'rain' ? 0.3 : 0;
      const wetPenalty = wet ? 0.82 : 0;
      const protection = 1 - insulation * 0.72;
      this.cold = clamp(this.cold + dt * (0.68 + night + storm + wetPenalty) * protection);
    } else this.cold = clamp(this.cold - dt * (warmth ? 5.2 : sheltered ? 3.4 : 2.1));

    const events = [];
    if (previousHeat < CLIMATE_WARNING && this.heat >= CLIMATE_WARNING) events.push({ type: 'warning', kind: 'heat', value: this.heat });
    if (previousCold < CLIMATE_WARNING && this.cold >= CLIMATE_WARNING) events.push({ type: 'warning', kind: 'cold', value: this.cold });
    const kind = this.heat >= this.cold && this.heat > 0 ? 'heat' : this.cold > 0 ? 'cold' : null;
    const dangerous = Math.max(this.heat, this.cold) >= CLIMATE_DANGER;
    if (dangerous) {
      this.damageTimer += dt;
      while (this.damageTimer >= CLIMATE_DAMAGE_INTERVAL) {
        this.damageTimer -= CLIMATE_DAMAGE_INTERVAL;
        events.push({ type: 'damage', kind, amount: 1, value: kind === 'heat' ? this.heat : this.cold });
      }
    } else this.damageTimer = 0;
    this.lastKind = kind;
    return events;
  }

  status() {
    const kind = this.heat >= this.cold && this.heat > 0 ? 'heat' : this.cold > 0 ? 'cold' : null;
    const value = kind === 'heat' ? this.heat : kind === 'cold' ? this.cold : 0;
    return { kind, value, heat: this.heat, cold: this.cold, warning: value >= CLIMATE_WARNING, dangerous: value >= CLIMATE_DANGER };
  }

  serialize() {
    return { heat: this.heat, cold: this.cold, damageTimer: this.damageTimer, lastKind: this.lastKind };
  }
}
