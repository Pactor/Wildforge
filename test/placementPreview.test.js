import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK } from '../src/blocks.js';
import {
  cardinalForYaw,
  PlacementGhost,
  placementPlan,
  previewBoxes,
  rotatedPlacementYaw,
} from '../src/placementPreview.js';

test('manual quarter turns rotate placement independently from the current view offset', () => {
  assert.equal(cardinalForYaw(rotatedPlacementYaw(0, 0)), 'N');
  assert.equal(cardinalForYaw(rotatedPlacementYaw(0, 1)), 'W');
  assert.equal(cardinalForYaw(rotatedPlacementYaw(0, 2)), 'S');
  assert.equal(cardinalForYaw(rotatedPlacementYaw(0, 3)), 'E');
  assert.ok(Math.abs(rotatedPlacementYaw(0.3, 4) - (0.3 + Math.PI * 2)) < 1e-9);
});

test('placement plans expose exact oriented and multiblock footprints', () => {
  const position = { x: 4.8, y: 12.2, z: -3.1 };
  const door = placementPlan('wooden_door', position, 0);
  assert.equal(door.kind, 'door');
  assert.deepEqual(door.parts.map(({ x, y, z }) => [x, y, z]), [[4, 12, -4], [4, 13, -4]]);
  assert.deepEqual(door.parts.map(({ id }) => id), [BLOCK.DOOR_Z_BOTTOM, BLOCK.DOOR_Z_TOP]);

  const bed = placementPlan('moss_bed', position, -Math.PI / 2);
  assert.equal(bed.parts.length, 2);
  assert.deepEqual(bed.parts.map(({ x, z }) => [x, z]), [[4, -4], [5, -4]]);
  assert.equal(placementPlan('oak_stairs', position, Math.PI / 2).parts[0].id, BLOCK.OAK_STAIR_W);
  assert.equal(placementPlan(BLOCK.STONE_SLAB, position, 0).parts[0].id, BLOCK.STONE_SLAB);
  assert.equal(placementPlan(BLOCK.WATER, position, 0), null);
  assert.equal(placementPlan('stick', position, 0), null);
});

test('preview silhouettes retain important partial and directional block shapes', () => {
  assert.deepEqual(previewBoxes(BLOCK.STONE_SLAB), [[0, 0, 0, 1, 0.5, 1]]);
  assert.equal(previewBoxes(BLOCK.OAK_STAIR_N).length, 2);
  assert.deepEqual(previewBoxes(BLOCK.DOOR_X_BOTTOM), [[0.44, 0, 0, 0.56, 1, 1]]);
  assert.deepEqual(previewBoxes(BLOCK.TRAP_CLOSED_N), [[0, 0, 0, 1, 0.1875, 1]]);
  assert.equal(previewBoxes(BLOCK.SIGN_E).length, 2);
  assert.equal(previewBoxes(BLOCK.GATE_X).length, 4);
});

test('crafted functional objects never fall back to a single terrain cube', () => {
  const authoredObjects = [
    BLOCK.CRAFTING_TABLE,
    BLOCK.FURNACE,
    BLOCK.CHEST,
    BLOCK.FORGE_LAMP_OFF,
    BLOCK.BLAST_KEG,
    BLOCK.HEARTHGUARD_CORE,
    BLOCK.FORGE_KILN,
    BLOCK.HEARTH_SMOKER,
    BLOCK.TRAILBARREL,
    BLOCK.REPAIR_BENCH,
    BLOCK.RUNEFORGE,
    BLOCK.DRYING_RACK,
  ];
  for (const id of authoredObjects) {
    assert.ok(previewBoxes(id).length > 1, `expected authored multi-part silhouette for block ${id}`);
  }
});

test('placement ghost rebuilds only when its footprint changes and reflects validity', () => {
  const scene = new THREE.Scene();
  const ghost = new PlacementGhost(scene);
  const plan = placementPlan('wooden_door', { x: 1, y: 5, z: 2 }, 0);
  assert.equal(ghost.update(plan, true), true);
  assert.equal(ghost.root.visible, true);
  assert.equal(ghost.root.children.length, 4);
  const firstChild = ghost.root.children[0];
  ghost.update(plan, false);
  assert.equal(ghost.root.children[0], firstChild);
  assert.equal(ghost.valid, false);
  assert.equal(ghost.fillMaterial.color.getHex(), 0xef625f);
  assert.equal(ghost.hide(), false);
  assert.equal(ghost.root.visible, false);
});
