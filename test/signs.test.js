import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { isSign, normalizeSignText, signIdFor, signInfo, SignState } from '../src/signs.js';

test('sign facing quantizes yaw into four persistent block states', () => {
  assert.equal(signIdFor(0), BLOCK.SIGN_N);
  assert.equal(signIdFor(-Math.PI / 2), BLOCK.SIGN_E);
  assert.equal(signIdFor(Math.PI), BLOCK.SIGN_S);
  assert.equal(signIdFor(Math.PI / 2), BLOCK.SIGN_W);
  assert.deepEqual(signInfo(BLOCK.SIGN_E), { orientation: 'e' });
  assert.equal(isSign(BLOCK.STONE), false);
});

test('sign text is sanitized, bounded to four short lines, and persists by coordinate', () => {
  const text = normalizeSignText('01234567890123456789\nsecond\nthird\n fourth \nfifth\u0001');
  assert.equal(text, '012345678901234567\nsecond\nthird\n fourth ');
  const state = new SignState();
  state.set(1.9, 2.2, -3.1, text);
  assert.equal(state.get(1, 2, -4).text, text);
  const restored = new SignState(state.serialize());
  assert.equal(restored.get(1, 2, -4).text, text);
  assert.equal(restored.remove(1, 2, -4), true);
  assert.equal(restored.get(1, 2, -4), null);
});
