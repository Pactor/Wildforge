import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { blockTargetLabel } from '../src/targetLabels.js';

test('target labels identify common terrain before mining', () => {
  assert.equal(blockTargetLabel(BLOCK.SAND).name, 'Sand');
  assert.equal(blockTargetLabel(BLOCK.STONE).name, 'Stone');
  assert.match(blockTargetLabel(BLOCK.STONE).detail, /PICKAXE/);
});

test('ore target labels include tool and tier guidance where required', () => {
  const label = blockTargetLabel(BLOCK.VOIDGLASS_ORE);
  assert.equal(label.name, 'Voidglass Seam');
  assert.match(label.detail, /PICKAXE/);
  assert.match(label.detail, /TIER.*REQUIRED/);
  assert.equal(blockTargetLabel(999999), null);
});

test('storage targets advertise how to open them before interaction', () => {
  assert.match(blockTargetLabel(BLOCK.CHEST).detail, /RIGHT-CLICK.*E TO OPEN/);
  assert.match(blockTargetLabel(BLOCK.WAYVAULT_CHEST).detail, /RIGHT-CLICK.*E TO OPEN/);
});
