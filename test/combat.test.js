import assert from 'node:assert/strict';
import test from 'node:test';
import { CombatState } from '../src/combat.js';

test('combat recovery blocks click-spam until the selected tool is ready', () => {
  const combat = new CombatState();
  const tool = { damage: 7, recovery: 0.54, knockback: 3.5 };
  assert.deepEqual(combat.tryAttack(tool), { damage: 7, recovery: 0.54, knockback: 3.5 });
  assert.equal(combat.tryAttack(tool), null);
  assert.equal(combat.readiness(), 0);
  combat.update(0.27);
  assert.ok(Math.abs(combat.readiness() - 0.5) < 1e-9);
  combat.update(0.27);
  assert.equal(combat.readiness(), 1);
  assert.ok(combat.tryAttack(tool));
});

test('combat state rejects invalid attacks and clamps oversized updates', () => {
  const combat = new CombatState();
  assert.equal(combat.tryAttack(null), null);
  assert.equal(combat.tryAttack({ damage: 0 }), null);
  combat.tryAttack({ damage: 2, recovery: 0.4, knockback: 2 });
  combat.update(50);
  assert.equal(combat.remaining, 0);
  assert.equal(combat.readiness(), 1);
});
