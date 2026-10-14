import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { ClimateExposureState, CLIMATE_DAMAGE_INTERVAL, CLIMATE_DANGER, CLIMATE_MAX, CLIMATE_WARNING, nearbyWarmth } from '../src/climateExposure.js';
import { EquipmentState } from '../src/equipment.js';

const context = (overrides = {}) => ({ biome: 'plains', daylight: 1, weatherKind: 'clear', exposed: true, inWater: false, nearHeat: false, heatWard: false, insulation: 0, ...overrides });

class GridWorld {
  constructor(entries = []) { this.blocks = new Map(entries); }
  getBlock(x, y, z) { return this.blocks.get(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`) ?? BLOCK.AIR; }
}

test('exposed daytime desert heat builds, warns, and eventually deals bounded periodic damage', () => {
  const state = new ClimateExposureState();
  const allEvents = []; for (let i = 0; i < 16; i += 1) allEvents.push(...state.update(5, context({ biome: 'desert' })));
  assert.ok(state.heat >= CLIMATE_DANGER); assert.equal(allEvents.some(({ type, kind }) => type === 'warning' && kind === 'heat'), true);
  const events = state.update(CLIMATE_DAMAGE_INTERVAL, context({ biome: 'desert' })); assert.equal(events.filter(({ type }) => type === 'damage').length, 1); assert.equal(state.heat, CLIMATE_MAX);
});

test('shade, water, Cinderward, night, and leaving the desert provide real heat counterplay', () => {
  for (const relief of [
    { exposed: false }, { inWater: true }, { heatWard: true }, { daylight: 0.3 }, { biome: 'plains' },
  ]) {
    const state = new ClimateExposureState({ heat: 70 }); state.update(5, context({ biome: 'desert', ...relief })); assert.ok(state.heat < 70);
  }
});

test('Frostveil cold responds to night, storms, wetness, Tough Hide, shelter, and warmth', () => {
  const clear = new ClimateExposureState(); clear.update(10, context({ biome: 'snowy_highlands' }));
  const harsh = new ClimateExposureState(); harsh.update(10, context({ biome: 'snowy_highlands', daylight: 0.1, weatherKind: 'storm', inWater: true })); assert.ok(harsh.cold > clear.cold);
  const insulated = new ClimateExposureState(); insulated.update(10, context({ biome: 'snowy_highlands', daylight: 0.1, weatherKind: 'storm', insulation: 1 })); assert.ok(insulated.cold < harsh.cold);
  for (const relief of [{ exposed: false }, { nearHeat: true }, { biome: 'forest' }]) {
    const state = new ClimateExposureState({ cold: 70 }); state.update(5, context({ biome: 'snowy_highlands', ...relief })); assert.ok(state.cold < 70);
  }
});

test('nearby warmth finds original fire sources within radius without treating ordinary light as heat', () => {
  const warm = new GridWorld([['3,1,0', BLOCK.HEARTHFIRE_LIT], ['1,1,0', BLOCK.LUMEN_LANTERN]]); assert.deepEqual(nearbyWarmth(warm, { x: 0, y: 1, z: 0 }, 4), { x: 3, y: 1, z: 0, distance: 3 });
  assert.equal(nearbyWarmth(new GridWorld([['1,1,0', BLOCK.LUMEN_LANTERN]]), { x: 0, y: 1, z: 0 }, 4), null);
  assert.equal(nearbyWarmth(new GridWorld([['5,1,0', BLOCK.EMBERFIRE]]), { x: 0, y: 1, z: 0 }, 4), null);
});

test('Tough Hide equipment provides quarter-step insulation without changing other armor', () => {
  const equipment = new EquipmentState({ slots: { head: 'hide_helmet', chest: 'hide_chestplate', legs: 'iron_leggings', feet: null } }); assert.equal(equipment.climateInsulation(), 0.5);
  assert.equal(new EquipmentState().climateInsulation(), 0);
});

test('climate saves sanitize malformed exposure and resume exact valid progress', () => {
  const exact = new ClimateExposureState({ heat: 34.5, cold: 12.25, damageTimer: 2.5, lastKind: 'heat' }); assert.deepEqual(exact.serialize(), { heat: 34.5, cold: 12.25, damageTimer: 2.5, lastKind: 'heat' });
  const malformed = new ClimateExposureState({ heat: 999, cold: -20, damageTimer: 99, lastKind: 'lava' }); assert.deepEqual(malformed.serialize(), { heat: 100, cold: 0, damageTimer: CLIMATE_DAMAGE_INTERVAL, lastKind: null }); malformed.reset(); assert.deepEqual(malformed.status(), { kind: null, value: 0, heat: 0, cold: 0, warning: false, dangerous: false });
});
