import assert from 'node:assert/strict';
import test from 'node:test';
import { SurvivalState } from '../src/survival.js';

test('damage, healing, death, and respawn are bounded', () => {
  const state = new SurvivalState();
  state.damage(7);
  assert.equal(state.health, 13);
  state.heal(100);
  assert.equal(state.health, 20);
  state.damage(30);
  assert.equal(state.dead, true);
  state.respawn();
  assert.equal(state.dead, false);
  assert.equal(state.health, 20);
});

test('exhaustion consumes saturation before hunger', () => {
  const state = new SurvivalState({ saturation: 1, hunger: 20 });
  state.addExhaustion(8);
  state.update(0);
  assert.equal(state.saturation, 0);
  assert.equal(state.hunger, 19);
});

test('starvation eventually causes damage', () => {
  const state = new SurvivalState({ hunger: 0, saturation: 0, health: 20 });
  state.update(4.1);
  assert.equal(state.health, 19);
});

test('food restores hunger without exceeding its cap', () => {
  const state = new SurvivalState({ hunger: 15, saturation: 0 });
  assert.equal(state.eat(3, 1), true);
  assert.equal(state.hunger, 18);
  assert.equal(state.saturation, 1);
  state.eat(10, 10);
  assert.equal(state.hunger, 20);
  assert.equal(state.saturation, 11);
  assert.equal(state.eat(1, 1), false);
});

test('breath depletes underwater, causes drowning, and recovers in air', () => {
  const state = new SurvivalState({ air: 0.5, health: 20 });
  state.updateBreathing(0.6, true);
  assert.equal(state.air, 0);
  state.updateBreathing(0.5, true);
  assert.equal(state.health, 18);
  state.updateBreathing(2, false);
  assert.equal(state.air, 10);
});

test('lava immersion causes rapid periodic damage and resets after escape', () => {
  const state = new SurvivalState({ health: 20 });
  assert.equal(state.updateLava(0.49, true), false);
  assert.equal(state.health, 20);
  assert.equal(state.updateLava(0.02, true), true);
  assert.equal(state.health, 18);
  state.updateLava(0.3, false);
  assert.equal(state.updateLava(0.3, true), false);
  assert.equal(state.updateLava(0.21, true), true);
  assert.equal(state.health, 16);
});
