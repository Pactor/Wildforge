import assert from 'node:assert/strict';
import test from 'node:test';
import { StatusEffectState } from '../src/statusEffects.js';

test('tonics apply deterministic effects, refresh safely, persist, and expire', () => {
  const effects = new StatusEffectState();
  assert.equal(effects.drink('windstep_tonic').id, 'windstep');
  assert.equal(effects.speedMultiplier(), 1.22);
  effects.update(45);
  effects.apply('windstep');
  assert.equal(effects.remaining('windstep'), 120);

  const restored = new StatusEffectState(effects.serialize());
  assert.equal(restored.remaining('windstep'), 120);
  assert.deepEqual(restored.update(120), ['windstep']);
  assert.equal(restored.speedMultiplier(), 1);
});

test('Stoneward provides its bounded damage multiplier while active', () => {
  const effects = new StatusEffectState();
  effects.drink('stoneward_tonic');
  assert.equal(effects.damageMultiplier(), 0.72);
  effects.apply('stoneward', 9999);
  assert.equal(effects.remaining('stoneward'), 240);
  effects.update(240);
  assert.equal(effects.damageMultiplier(), 1);
});

test('Hearthmend pulse timing survives a save and resumes exactly', () => {
  const effects = new StatusEffectState();
  effects.drink('hearthmend_tonic');
  effects.update(2.5);

  const restored = new StatusEffectState(effects.serialize());
  const pulses = [];
  restored.update(0.6, (effect) => pulses.push(effect));
  assert.equal(pulses.length, 1);
  assert.equal(pulses[0].id, 'hearthmend');
  assert.equal(pulses[0].heal, 1);
  assert.ok(Math.abs(restored.serialize().effects[0][1].pulse - 0.1) < 1e-9);
});

test('unknown and malformed saved effects are ignored safely', () => {
  const effects = new StatusEffectState({ effects: [
    ['not_real', { remaining: 50 }],
    ['windstep', { remaining: -4 }],
    ['stoneward', { remaining: 9999, pulse: 'bad' }],
  ] });
  assert.equal(effects.has('not_real'), false);
  assert.equal(effects.has('windstep'), false);
  assert.equal(effects.remaining('stoneward'), 240);
  assert.equal(effects.drink('not_a_tonic'), null);
  assert.deepEqual(effects.update(Number.NaN), []);
});

test('Cinderward tonic provides a persistent bounded heat ward', () => {
  const effects = new StatusEffectState();
  const applied = effects.drink('cinderward_tonic');
  assert.equal(applied.id, 'cinderward');
  assert.equal(applied.heatWard, true);
  assert.equal(effects.has('cinderward'), true);
  const restored = new StatusEffectState(effects.serialize());
  assert.equal(restored.remaining('cinderward'), 180);
  assert.deepEqual(restored.update(180), ['cinderward']);
  assert.equal(restored.has('cinderward'), false);
});

test('Ashglide persistently reduces only fall damage to one quarter', () => {
  const effects = new StatusEffectState();
  const applied = effects.drink('ashglide_tonic');
  assert.equal(applied.id, 'ashglide');
  assert.equal(effects.fallMultiplier(), 0.25);
  assert.equal(effects.fallDamage(12), 3);
  assert.equal(effects.fallDamage(1), 0);
  assert.equal(effects.damageMultiplier(), 1);

  const restored = new StatusEffectState(effects.serialize());
  assert.equal(restored.remaining('ashglide'), 180);
  assert.equal(restored.fallDamage(8), 2);
  restored.update(180);
  assert.equal(restored.fallDamage(8), 8);
});
