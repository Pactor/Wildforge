import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { Inventory, itemDefinition } from '../src/inventory.js';
import { PROFESSION_GIFTS, SettlementSocialState } from '../src/social.js';

function resident(key, residenceKey, x) {
  return {
    definition: { resident: true }, socialKey: key, residenceKey, schedulePhase: 'social', heading: 0,
    root: { position: new THREE.Vector3(x, 21, 0) },
  };
}

test('profession gifts build bounded persistent individual Wayfarer favor', () => {
  const social = new SettlementSocialState();
  const inventory = new Inventory();
  assert.equal(social.give('trader:0', 'provisioner', inventory).reason, 'missing');
  inventory.add('wheat', 5);
  for (let favor = 1; favor <= 5; favor += 1) {
    const result = social.give('trader:0', 'provisioner', inventory);
    assert.equal(result.success, true);
    assert.equal(result.favor, favor);
  }
  assert.equal(social.give('trader:0', 'provisioner', inventory).reason, 'maximum');
  assert.equal(inventory.count('wheat'), 0);
  const restored = new SettlementSocialState(social.serialize());
  assert.equal(restored.favor('trader:0'), 5);
  for (const itemId of Object.values(PROFESSION_GIFTS)) assert.ok(itemDefinition(itemId));
});

test('nearby co-residents form persistent social bonds only during gathering phases', () => {
  const social = new SettlementSocialState();
  const first = resident('stead#0', 'stead', 0);
  const second = resident('stead#1', 'stead', 1.5);
  const outsider = resident('other#0', 'other', 1);
  let events = social.update(0.1, [first, second, outsider]);
  assert.equal(events.length, 1);
  assert.equal(events[0].bond, 1);
  assert.equal(social.bond(first.socialKey, second.socialKey), 1);
  assert.equal(social.update(1, [first, second]).length, 0);
  events = social.update(10, [first, second]);
  assert.equal(events[0].bond, 2);
  first.schedulePhase = 'work';
  second.schedulePhase = 'work';
  assert.equal(social.update(10, [first, second]).length, 0);
  assert.equal(new SettlementSocialState(social.serialize()).bond(first.socialKey, second.socialKey), 2);
});
