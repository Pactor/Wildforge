import test from 'node:test';
import assert from 'node:assert/strict';
import { CINDERREACH_ORIGIN, CINDERREACH_RADIUS, CinderHeatState, realmAt, REALM, RealmTravelState } from '../src/realms.js';

test('Cinderreach occupies a deterministic bounded folded coordinate realm', () => {
  assert.equal(realmAt(0, 0), REALM.OVERWORLD);
  assert.equal(realmAt(CINDERREACH_ORIGIN.x, CINDERREACH_ORIGIN.z), REALM.CINDERREACH);
  assert.equal(realmAt(CINDERREACH_ORIGIN.x + CINDERREACH_RADIUS, CINDERREACH_ORIGIN.z), REALM.CINDERREACH);
  assert.equal(realmAt(CINDERREACH_ORIGIN.x + CINDERREACH_RADIUS + 1, CINDERREACH_ORIGIN.z), REALM.OVERWORLD);
});

test('realm travel preserves an exact return and isolates persistent creature records', () => {
  const state = new RealmTravelState(null, { legacyEntities: [{ type: 'grazer', x: 2, z: 3 }] });
  assert.equal(state.entitiesFor(REALM.OVERWORLD).length, 1);
  state.storeEntities(REALM.OVERWORLD, [{ type: 'emberfox', x: 4, z: 5 }]);
  const entry = state.enter({ x: 20, y: 24, z: -8 });
  assert.equal(entry.realm, REALM.CINDERREACH);
  assert.equal(realmAt(entry.x, entry.z), REALM.CINDERREACH);
  assert.deepEqual(state.entitiesFor(), []);
  state.storeEntities(REALM.CINDERREACH, [{ type: 'frostfang', x: entry.x, z: entry.z }]);
  assert.deepEqual(state.leave(), { realm: REALM.OVERWORLD, x: 21.5, y: 24, z: -7.5 });
  const restored = new RealmTravelState(state.serialize([{ type: 'emberfox', x: 4, z: 5 }]));
  assert.equal(restored.current, REALM.OVERWORLD);
  assert.equal(restored.entitiesFor(REALM.CINDERREACH)[0].type, 'frostfang');
});

test('Cinderreach heat pulses every four exposed seconds and cools under shelter', () => {
  const heat = new CinderHeatState();
  assert.equal(heat.update(3.9, true, false), false);
  assert.equal(heat.update(0.2, true, false), true);
  assert.equal(heat.update(2, true, true), false);
  assert.equal(heat.exposure, 0);
  heat.update(3, true, false);
  const restored = new CinderHeatState(heat.serialize());
  assert.equal(restored.update(1, true, false), true);
  assert.equal(restored.update(10, false, false), false);
  assert.equal(restored.exposure, 0);
});
