import assert from 'node:assert/strict';
import test from 'node:test';
import { EquipmentState } from '../src/equipment.js';
import { Inventory } from '../src/inventory.js';
import {
  ensurePlaytestKit,
  PLAYTEST_KIT,
  PLAYTEST_PROFILE,
  PLAYTEST_START_HOTBAR,
  playtestModeFromSearch,
  saveKeysForMode,
  SURVIVAL_START_HOTBAR,
} from '../src/playtestMode.js';
import { SurvivalState } from '../src/survival.js';

test('playtest query parsing is explicit and defaults off', () => {
  assert.equal(playtestModeFromSearch('?seed=test'), false);
  assert.equal(playtestModeFromSearch('?playtest=0'), false);
  assert.equal(playtestModeFromSearch('?playtest=1'), true);
  assert.equal(playtestModeFromSearch(new URLSearchParams('playtest=true')), true);
});

test('playtest saves are isolated from normal player and edit saves', () => {
  assert.deepEqual(saveKeysForMode(42), { player: 'wildforge:42:player', edits: 'wildforge:42:edits' });
  assert.deepEqual(saveKeysForMode(42, true), { player: 'wildforge:42:playtest:player', edits: 'wildforge:42:playtest:edits' });
});

test('new survival worlds start empty while playtest mode has a focused hotbar', () => {
  assert.deepEqual(SURVIVAL_START_HOTBAR, Array(9).fill(null));
  assert.equal(PLAYTEST_START_HOTBAR.length, 9);
  assert.equal(PLAYTEST_START_HOTBAR[0], 'voidglass_pickaxe');
});

test('playtest kit refills minima without duplicating stacks', () => {
  const inventory = new Inventory();
  const equipment = new EquipmentState();
  ensurePlaytestKit(inventory, equipment);
  for (const [id, minimum] of PLAYTEST_KIT) assert.equal(inventory.count(id), minimum);
  assert.equal(equipment.armorPoints(), 19);
  assert.equal(equipment.hasShield(), true);
  ensurePlaytestKit(inventory, equipment);
  for (const [id, minimum] of PLAYTEST_KIT) assert.equal(inventory.count(id), minimum);
  assert.equal(inventory.count('oak_shield'), 0);
});

test('playtest survival takes quarter damage and one-tenth exhaustion', () => {
  const state = new SurvivalState().setModifiers(PLAYTEST_PROFILE);
  state.damage(8);
  state.addExhaustion(10);
  assert.equal(state.health, 18);
  assert.equal(state.exhaustion, 1);
});
