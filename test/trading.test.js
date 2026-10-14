import assert from 'node:assert/strict';
import test from 'node:test';
import { Inventory } from '../src/inventory.js';
import { nextReputationTier, offersForTrader, pricedOffer, reputationTier, TradingState, wayfarerSchedule } from '../src/trading.js';

test('Wayfarer professions and offers are deterministic per world and settlement', () => {
  const first = offersForTrader(12345, 'hearthstead:1,0');
  assert.deepEqual(first, offersForTrader(12345, 'hearthstead:1,0'));
  assert.equal(first.offers.length, 6);
  assert.ok(first.title.includes('Hearthstead'));
  assert.ok(first.offers.every((offer) => offer.count > 0 && offer.output.count > 0 && offer.maximumUses === 8 && offer.requiredReputation >= 0));
  const professions = new Set(Array.from({ length: 200 }, (_, index) => offersForTrader(12345, `hearthstead:${index},${index % 7}`).profession));
  assert.deepEqual(professions, new Set(['provisioner', 'delver', 'outfitter', 'mechanist', 'railwright', 'herbalist']));
});

test('reputation tiers unlock advanced stock and improve both buying and selling prices', () => {
  assert.equal(reputationTier(0).name, 'Stranger');
  assert.equal(reputationTier(8).name, 'Neighbor');
  assert.equal(reputationTier(24).name, 'Trusted');
  assert.equal(reputationTier(48).name, 'Hearthkin');
  assert.equal(nextReputationTier(24).minimum, 48);
  const traderKey = 'hearthstead:5,3';
  const advanced = offersForTrader(9876, traderKey).offers.at(-1);
  const trading = new TradingState();
  const inventory = new Inventory({ counts: [['hearthmark', 99]] });
  assert.equal(trading.unlocked(advanced), false);
  assert.equal(trading.trade(traderKey, advanced, inventory), false);
  trading.reputation = 48;
  const discounted = trading.effectiveOffer(advanced);
  assert.equal(discounted.count, Math.max(1, advanced.count - 3));
  assert.equal(trading.trade(traderKey, advanced, inventory), true);
  const sale = { id: 'wheat', count: 10, output: { id: 'hearthmark', count: 1 } };
  assert.equal(pricedOffer(sale, 48).output.count, 2);
  assert.equal(pricedOffer(sale, 0, 4).output.count, 2);
  const purchase = { id: 'hearthmark', count: 7, output: { id: 'bread', count: 1 } };
  assert.equal(pricedOffer(purchase, 0, 4).count, 5);
});

test('Wayfarer schedules deterministically move through home, work, market, and evening phases', () => {
  const features = {
    home: { x: 0, y: 21, z: 0 }, trader: { x: 4, y: 21, z: 0 }, workshop: { x: 6, y: 21, z: 4 },
    railYard: { x: 8, y: 21, z: 0 }, garden: { x: -7, y: 21, z: 1 }, lantern: { x: 0, y: 23, z: 0 },
  };
  const key = 'hearthstead:2,9';
  assert.equal(wayfarerSchedule(55, key, 0.1, features).phase, 'rest');
  assert.equal(wayfarerSchedule(55, key, 0.1, features).tradingOpen, false);
  assert.equal(wayfarerSchedule(55, key, 0.5, features).phase, 'work');
  assert.equal(wayfarerSchedule(55, key, 0.72, features).phase, 'market');
  assert.equal(wayfarerSchedule(55, key, 0.82, features).phase, 'social');
  assert.deepEqual(wayfarerSchedule(55, key, 0.5, features), wayfarerSchedule(55, key, 0.5, features));
});

test('trading atomically exchanges inventory, limits stock, and persists reputation', () => {
  const traderKey = 'hearthstead:1,0';
  const offer = offersForTrader(12345, traderKey).offers[0];
  const inventory = new Inventory();
  const trading = new TradingState();
  assert.equal(trading.trade(traderKey, offer, inventory), false);
  inventory.add(offer.id, offer.count * 8);
  for (let use = 0; use < 8; use += 1) assert.equal(trading.trade(traderKey, offer, inventory), true);
  assert.equal(inventory.count(offer.id), 0);
  assert.equal(inventory.count(offer.output.id), offer.output.count * 8);
  assert.equal(trading.remaining(traderKey, offer), 0);
  assert.equal(trading.trade(traderKey, offer, inventory), false);
  const restored = new TradingState(trading.serialize());
  assert.equal(restored.reputation, 8);
  assert.equal(restored.remaining(traderKey, offer), 0);
  restored.restock(traderKey);
  assert.equal(restored.remaining(traderKey, offer), 8);
  restored.trade(traderKey, offer, new Inventory({ counts: [[offer.id, offer.count]] }));
  assert.equal(restored.restockAll(), 1);
  assert.equal(restored.remaining(traderKey, offer), 8);
});
