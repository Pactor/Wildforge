import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { ITEMS, itemDefinition } from '../src/inventory.js';
import { itemIconKind, itemIconMarkup } from '../src/itemIcons.js';

test('icon classifier gives blocks and major equipment distinct silhouettes', () => {
  assert.equal(itemIconKind(BLOCK.GRASS, itemDefinition(BLOCK.GRASS)), 'block');
  assert.equal(itemIconKind('voidglass_pickaxe', itemDefinition('voidglass_pickaxe')), 'pickaxe');
  assert.equal(itemIconKind('voidglass_sword', itemDefinition('voidglass_sword')), 'sword');
  assert.equal(itemIconKind('voidglass_chestplate', itemDefinition('voidglass_chestplate')), 'chest');
  assert.equal(itemIconKind('oak_shield', itemDefinition('oak_shield')), 'shield');
});

test('provisions, tonics, navigation, and resources do not fall back to block icons', () => {
  assert.equal(itemIconKind('bread', itemDefinition('bread')), 'food');
  assert.equal(itemIconKind('hearthmend_tonic', itemDefinition('hearthmend_tonic')), 'tonic');
  assert.equal(itemIconKind('wayfinder_compass', itemDefinition('wayfinder_compass')), 'compass');
  assert.equal(itemIconKind('trailchart', itemDefinition('trailchart')), 'map');
  assert.equal(itemIconKind('emberite_ingot', itemDefinition('emberite_ingot')), 'ingot');
  assert.equal(itemIconKind('voidglass_shard', itemDefinition('voidglass_shard')), 'crystal');
});

test('every registered item and block produces bounded inline SVG markup', () => {
  for (const [id, definition] of [...Object.entries(ITEMS), ...Object.entries(BLOCKS)]) {
    const markup = itemIconMarkup(id, definition, 'test-icon');
    assert.match(markup, /^<svg /);
    assert.match(markup, /viewBox="0 0 32 32"/);
    assert.match(markup, /class="item-icon test-icon"/);
    assert.ok(markup.length < 1400, `icon markup should stay compact for ${id}`);
    assert.equal(markup.includes('<script'), false);
  }
});
