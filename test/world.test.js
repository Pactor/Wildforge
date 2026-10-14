import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { seedFromString } from '../src/noise.js';
import { CHUNK_SIZE, chunkVoxelIndex, SEA_LEVEL, VoxelWorld, WORLD_DEPTH, WORLD_HEIGHT, WORLD_MIN_Y } from '../src/world.js';
import { ATLAS_ROWS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { CINDERREACH_ORIGIN, realmAt, REALM } from '../src/realms.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

test('Cinderreach generates deterministic ash terrain, crystal resources, spires, and a return rift', () => {
  globalThis.localStorage = new MemoryStorage();
  const first = new VoxelWorld(new THREE.Scene(), 9173);
  const second = new VoxelWorld(new THREE.Scene(), 9173);
  const { x, z } = CINDERREACH_ORIGIN;
  assert.equal(realmAt(x, z), REALM.CINDERREACH);
  assert.equal(first.biomeAt(x, z).id, 'cinderreach');
  assert.equal(first.terrainHeight(x + 17, z - 23), second.terrainHeight(x + 17, z - 23));
  const cx = Math.floor(x / CHUNK_SIZE);
  const cz = Math.floor(z / CHUNK_SIZE);
  const a = first.generateChunk(cx, cz);
  const b = second.generateChunk(cx, cz);
  assert.deepEqual(a, b);
  assert.ok(a.includes(BLOCK.ASHSTONE));
  assert.ok(a.includes(BLOCK.EMBER_SOIL));
  const rift = first.cinderRiftPosition();
  assert.equal(first.getBlock(rift.x, rift.y, rift.z), BLOCK.CINDER_RIFT);
  const spire = Array.from({ length: 96 * 96 }, (_, index) => first.cinderSpireAt(x - 48 + index % 96, z - 48 + Math.floor(index / 96))).find(Boolean);
  assert.ok(spire, 'expected a deterministic Cinder Spire near the entry rift');
  assert.deepEqual(second.cinderSpireAt(spire.x, spire.z), spire);
});

test('chunk generation is deterministic and contains underground features', () => {
  globalThis.localStorage = new MemoryStorage();
  const first = new VoxelWorld(new THREE.Scene(), 12345);
  const second = new VoxelWorld(new THREE.Scene(), 12345);
  let caveBlocks = 0;
  let coalBlocks = 0;
  let ironBlocks = 0;
  for (let cz = -1; cz <= 1; cz += 1) {
    for (let cx = -1; cx <= 1; cx += 1) {
      const a = first.getChunk(cx, cz);
      const b = second.getChunk(cx, cz);
      assert.deepEqual(a, b);
      for (let y = WORLD_MIN_Y + 4; y < 27; y += 1) {
        for (let z = 0; z < CHUNK_SIZE; z += 1) {
          for (let x = 0; x < CHUNK_SIZE; x += 1) {
            const id = a[chunkVoxelIndex(x, y, z)];
            if (id === BLOCK.AIR) caveBlocks += 1;
            if (id === BLOCK.COAL) coalBlocks += 1;
            if (id === BLOCK.IRON_ORE) ironBlocks += 1;
          }
        }
      }
    }
  }
  assert.ok(caveBlocks > 0, 'expected generated underground cave air');
  assert.ok(coalBlocks > 0, 'expected generated coal deposits');
  assert.ok(ironBlocks > 0, 'expected generated iron deposits');
});

test('cave tunnels and deep aquifers are deterministic across chunk boundaries', () => {
  globalThis.localStorage = new MemoryStorage();
  const first = new VoxelWorld(new THREE.Scene(), 12345);
  const second = new VoxelWorld(new THREE.Scene(), 12345);
  let tunnelBlocks = 0;
  let aquiferBlocks = 0;
  let boundaryTunnels = 0;
  let lumenOreBlocks = 0;
  for (let z = -48; z < 48; z += 1) {
    for (let x = -48; x < 48; x += 1) {
      const height = first.terrainHeight(x, z);
      for (let y = -42; y < Math.min(38, height - 4); y += 1) {
        const feature = first.undergroundFeatureAt(x, y, z, height);
        assert.deepEqual(feature, second.undergroundFeatureAt(x, y, z, height));
        if (feature.tunnel) {
          tunnelBlocks += 1;
          if (x % CHUNK_SIZE === 0 || z % CHUNK_SIZE === 0) boundaryTunnels += 1;
          assert.ok([BLOCK.AIR, BLOCK.WATER, BLOCK.LAVA, BLOCK.LUMEN_BLOOM, BLOCK.ASHCAP].includes(first.getBlock(x, y, z)));
        }
        if (feature.flooded) {
          aquiferBlocks += 1;
          assert.equal(first.getBlock(x, y, z), BLOCK.WATER);
          assert.ok(y <= feature.aquiferLevel);
        }
        if (feature.lumenOre) {
          lumenOreBlocks += 1;
          assert.equal(first.getBlock(x, y, z), BLOCK.LUMEN_ORE);
        }
      }
    }
  }
  assert.ok(tunnelBlocks > 120, 'expected a useful connected-tunnel field');
  assert.ok(boundaryTunnels > 0, 'expected tunnels to continue through chunk boundaries');
  assert.ok(aquiferBlocks > 0, 'expected bounded groundwater inside deep caves');
  assert.ok(lumenOreBlocks > 0, 'expected rare Lumen Crystal Ore beside cave fields');
});

test('lava is confined to deterministic deepest cave basins and has dedicated geometry', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 12345);
  let lavaBlocks = 0;
  for (let z = -48; z < 48; z += 1) {
    for (let x = -48; x < 48; x += 1) {
      const height = world.terrainHeight(x, z);
      for (let y = WORLD_MIN_Y + 4; y <= WORLD_MIN_Y + 16; y += 1) {
        const feature = world.undergroundFeatureAt(x, y, z, height);
        if (!feature.lava) continue;
        lavaBlocks += 1;
        assert.ok(y <= WORLD_MIN_Y + 16);
        assert.equal(world.getBlock(x, y, z), BLOCK.LAVA);
      }
    }
  }
  assert.ok(lavaBlocks > 0, 'expected deep lava basins');
  world.setBlock(1, WORLD_HEIGHT - 2, 1, BLOCK.LAVA);
  const geometry = world.buildGeometry(0, 0, false, false, true);
  assert.ok(geometry.getAttribute('position').count > 0, 'expected a dedicated lava mesh');
});

test('block edits persist when the same seed is reconstructed', () => {
  globalThis.localStorage = new MemoryStorage();
  const original = new VoxelWorld(new THREE.Scene(), 777);
  original.setBlock(2, WORLD_HEIGHT - 2, -3, BLOCK.PLANKS);
  const reloaded = new VoxelWorld(new THREE.Scene(), 777);
  assert.equal(reloaded.getBlock(2, WORLD_HEIGHT - 2, -3), BLOCK.PLANKS);
});

test('the overworld has 192 playable vertical blocks with caves and diamond-tier ore far below zero', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 12345);
  assert.equal(WORLD_MIN_Y, -128);
  assert.equal(WORLD_DEPTH, 192);
  let deepAir = 0;
  let voidglass = 0;
  for (let cz = -2; cz <= 2; cz += 1) for (let cx = -2; cx <= 2; cx += 1) {
    const chunk = world.getChunk(cx, cz);
    assert.equal(chunk.length, CHUNK_SIZE * WORLD_DEPTH * CHUNK_SIZE);
    for (let y = WORLD_MIN_Y + 4; y <= -48; y += 1) for (let z = 0; z < CHUNK_SIZE; z += 1) for (let x = 0; x < CHUNK_SIZE; x += 1) {
      const id = chunk[chunkVoxelIndex(x, y, z)];
      if (id === BLOCK.AIR) deepAir += 1;
      if (id === BLOCK.VOIDGLASS_ORE) voidglass += 1;
    }
  }
  assert.ok(deepAir > 0, 'expected navigable caves below Y=-48');
  assert.ok(voidglass > 0, 'expected Voidglass Ore in the deep mine layer');
  assert.equal(world.getBlock(0, WORLD_MIN_Y - 1, 0), BLOCK.STONE);
});

test('negative-Y block edits persist without moving the existing surface', () => {
  globalThis.localStorage = new MemoryStorage();
  const original = new VoxelWorld(new THREE.Scene(), 778);
  const surface = original.terrainHeight(2, -3);
  original.setBlock(2, -80, -3, BLOCK.PLANKS);
  const reloaded = new VoxelWorld(new THREE.Scene(), 778);
  assert.equal(reloaded.terrainHeight(2, -3), surface);
  assert.equal(reloaded.getBlock(2, -80, -3), BLOCK.PLANKS);
});

test('climate biomes are deterministic and varied across a seed', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 24680);
  const repeat = new VoxelWorld(new THREE.Scene(), 24680);
  const biomes = new Set();
  for (let z = -1000; z <= 1000; z += 200) {
    for (let x = -1000; x <= 1000; x += 200) {
      const first = world.biomeAt(x, z);
      const second = repeat.biomeAt(x, z);
      assert.deepEqual(first, second);
      biomes.add(first.id);
    }
  }
  assert.ok(biomes.size >= 3, `expected at least three biomes, received ${[...biomes].join(', ')}`);
});

test('biomes grow deterministic compact, broad, and Frostpine tree silhouettes', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 24680);
  const repeat = new VoxelWorld(new THREE.Scene(), 24680);
  const samples = [
    { x: -305, z: -400, kind: 'plains_oak', trunk: 4, log: BLOCK.WOOD, leaves: BLOCK.LEAVES },
    { x: -262, z: -400, kind: 'forest_oak', trunk: 7, log: BLOCK.WOOD, leaves: BLOCK.LEAVES },
    { x: 383, z: -399, kind: 'frostpine', trunk: 7, log: BLOCK.FROSTPINE_LOG, leaves: BLOCK.FROSTPINE_NEEDLES },
  ];
  for (const sample of samples) {
    const profile = world.treeProfileAt(sample.x, sample.z);
    assert.deepEqual(profile, repeat.treeProfileAt(sample.x, sample.z));
    assert.equal(profile.kind, sample.kind);
    assert.equal(profile.trunk, sample.trunk);
    const ground = world.terrainHeight(sample.x, sample.z);
    assert.equal(world.getBlock(sample.x, ground + 1, sample.z), sample.log);
    assert.equal(world.getBlock(sample.x, ground + profile.trunk + 1, sample.z), sample.leaves);
  }
  assert.ok(world.treeProfileAt(-262, -400).radius > world.treeProfileAt(-305, -400).radius);
});

test('Trailforge Ruins deterministically generate functional landmarks and seeded loot', () => {
  globalThis.localStorage = new MemoryStorage();
  const first = new VoxelWorld(new THREE.Scene(), 24680);
  const second = new VoxelWorld(new THREE.Scene(), 24680);
  let ruin = null;
  for (let cellZ = -12; cellZ <= 12 && !ruin; cellZ += 1) {
    for (let cellX = -12; cellX <= 12 && !ruin; cellX += 1) ruin = first.ruinForCell(cellX, cellZ);
  }
  assert.ok(ruin, 'expected a valid deterministic Trailforge Ruin');
  assert.deepEqual(ruin, second.ruinForCell(ruin.cellX, ruin.cellZ));
  const features = first.ruinFeatures(ruin);
  assert.equal(first.getBlock(features.chest.x, features.chest.y, features.chest.z), BLOCK.CHEST);
  assert.equal(first.getBlock(features.furnace.x, features.furnace.y, features.furnace.z), BLOCK.FURNACE);
  assert.equal(first.getBlock(features.table.x, features.table.y, features.table.z), BLOCK.CRAFTING_TABLE);
  assert.equal(first.getBlock(features.lantern.x, features.lantern.y, features.lantern.z), BLOCK.LUMEN_LANTERN);
  const loot = first.generatedContainerLoot(features.chest.x, features.chest.y, features.chest.z);
  assert.deepEqual(loot, second.generatedContainerLoot(features.chest.x, features.chest.y, features.chest.z));
  assert.equal(loot.key, ruin.key);
  assert.ok(loot.items.some((item) => item.id === 'iron_ingot' && item.count > 0));
  assert.equal(first.generatedContainerLoot(features.chest.x + 1, features.chest.y, features.chest.z), null);
  assert.ok(first.generatedLightsNear(ruin.originX, ruin.originZ, 12).some((position) => position.x === features.lantern.x && position.z === features.lantern.z));
});

test('Hearthsteads deterministically generate inhabited-hamlet landmarks and supplies', () => {
  globalThis.localStorage = new MemoryStorage();
  const first = new VoxelWorld(new THREE.Scene(), 1);
  const second = new VoxelWorld(new THREE.Scene(), 1);
  const stead = first.hearthsteadForCell(1, 0);
  assert.ok(stead, 'expected the known seed to contain a Hearthstead');
  assert.deepEqual(stead, second.hearthsteadForCell(1, 0));
  const features = first.hearthsteadFeatures(stead);
  assert.equal(first.getBlock(features.chest.x, features.chest.y, features.chest.z), BLOCK.CHEST);
  assert.equal(first.getBlock(features.table.x, features.table.y, features.table.z), BLOCK.CRAFTING_TABLE);
  assert.equal(first.getBlock(features.furnace.x, features.furnace.y, features.furnace.z), BLOCK.FURNACE);
  assert.equal(first.getBlock(features.lantern.x, features.lantern.y, features.lantern.z), BLOCK.LUMEN_LANTERN);
  assert.equal(first.getBlock(stead.originX - 5, stead.ground + 1, stead.originZ - 4), BLOCK.PLANKS);
  const loot = first.generatedContainerLoot(features.chest.x, features.chest.y, features.chest.z);
  assert.equal(loot.key, stead.key);
  assert.ok(loot.items.some((item) => item.id === 'bread' && item.count >= 2));
  assert.deepEqual(loot, second.generatedContainerLoot(features.chest.x, features.chest.y, features.chest.z));
  assert.ok(first.generatedLightsNear(stead.originX, stead.originZ, 20).some((position) => position.x === features.lantern.x));
});

test('underground biomes are continuous, deterministic, and generate distinct cave ecology', () => {
  globalThis.localStorage = new MemoryStorage();
  const first = new VoxelWorld(new THREE.Scene(), 7331);
  const second = new VoxelWorld(new THREE.Scene(), 7331);
  const classified = new Set();
  for (let z = -160; z <= 160; z += 16) {
    for (let x = -160; x <= 160; x += 16) {
      for (const y of [12, 20, 28, 34]) {
        const biome = first.undergroundBiomeAt(x, y, z);
        assert.deepEqual(biome, second.undergroundBiomeAt(x, y, z));
        classified.add(biome.id);
      }
    }
  }
  assert.ok(classified.has('lumen_grotto'));
  assert.ok(classified.has('rootbound_hollow'));

  const generated = new Set();
  for (let cz = -3; cz <= 3 && generated.size < 3; cz += 1) {
    for (let cx = -3; cx <= 3 && generated.size < 3; cx += 1) {
      const chunk = first.generateChunk(cx, cz);
      if (chunk.includes(BLOCK.ROOTSTONE)) generated.add(BLOCK.ROOTSTONE);
      if (chunk.includes(BLOCK.LUMEN_BLOOM)) generated.add(BLOCK.LUMEN_BLOOM);
      if (chunk.includes(BLOCK.ASHCAP)) generated.add(BLOCK.ASHCAP);
    }
  }
  assert.deepEqual(generated, new Set([BLOCK.ROOTSTONE, BLOCK.LUMEN_BLOOM, BLOCK.ASHCAP]));
  const lights = [...first.generatedCaveLights.values()].flat();
  assert.ok(lights.length > 0 && lights.every((position) => first.getBlock(position.x, position.y, position.z) === BLOCK.LUMEN_BLOOM));
});

test('Emberite and Voidglass generate deterministically within distinct depth bands', () => {
  globalThis.localStorage = new MemoryStorage();
  const first = new VoxelWorld(new THREE.Scene(), 99017);
  const second = new VoxelWorld(new THREE.Scene(), 99017);
  const found = new Map();
  for (let cz = -4; cz <= 4 && found.size < 2; cz += 1) {
    for (let cx = -4; cx <= 4 && found.size < 2; cx += 1) {
      const a = first.generateChunk(cx, cz);
      const b = second.generateChunk(cx, cz);
      assert.deepEqual(a, b);
      for (let index = 0; index < a.length; index += 1) {
        if (a[index] !== BLOCK.EMBERITE_ORE && a[index] !== BLOCK.VOIDGLASS_ORE) continue;
        const y = WORLD_MIN_Y + Math.floor(index / (CHUNK_SIZE * CHUNK_SIZE));
        found.set(a[index], y);
        if (a[index] === BLOCK.EMBERITE_ORE) assert.ok(y > -104 && y < 8);
        if (a[index] === BLOCK.VOIDGLASS_ORE) assert.ok(y <= -48);
      }
    }
  }
  assert.ok(found.has(BLOCK.EMBERITE_ORE), 'expected deep Emberite Ore');
  assert.ok(found.has(BLOCK.VOIDGLASS_ORE), 'expected rare deepest Voidglass Seam');
});

test('slabs use half-height collision and glass is isolated in transparent geometry', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 9191);
  const y = WORLD_HEIGHT - 2;
  world.setBlock(1, y, 1, BLOCK.STONE_SLAB);
  world.setBlock(2, y, 1, BLOCK.GLASS);
  assert.equal(world.isSolid(1, y, 1), true);
  assert.equal(world.collisionHeight(1, y, 1), 0.5);
  assert.equal(world.collisionHeight(2, y, 1), 1);
  const solid = world.buildGeometry(0, 0, false, false);
  const transparent = world.buildGeometry(0, 0, false, true);
  assert.ok(solid.getAttribute('position').count > 0);
  assert.ok(transparent.getAttribute('position').count >= 24);
  const transparentY = transparent.getAttribute('position').array.filter((_, index) => index % 3 === 1);
  assert.ok(transparentY.some((value) => value === y));
  assert.ok(transparentY.some((value) => value === y + 1));
});

test('surface flora is deterministic, biome-constrained, and rendered with cutout pixels', () => {
  globalThis.localStorage = new MemoryStorage();
  const first = new VoxelWorld(new THREE.Scene(), 24680);
  const second = new VoxelWorld(new THREE.Scene(), 24680);
  const found = new Set();
  for (let z = -128; z <= 128; z += 2) {
    for (let x = -128; x <= 128; x += 2) {
      const decoration = first.surfaceDecoration(x, z);
      assert.equal(decoration, second.surfaceDecoration(x, z));
      if (decoration === BLOCK.AIR) continue;
      found.add(decoration);
      const biome = first.biomeAt(x, z).id;
      assert.notEqual(biome, 'desert');
      if (decoration === BLOCK.DUSKMUSHROOM) assert.equal(biome, 'forest');
      if (decoration === BLOCK.WINDGRASS || decoration === BLOCK.EMBERBELL) {
        assert.ok(biome === 'plains' || biome === 'forest');
      }
    }
  }
  assert.deepEqual(found, new Set([BLOCK.WINDGRASS, BLOCK.SUNPETAL, BLOCK.EMBERBELL, BLOCK.DUSKMUSHROOM]));
  const atlas = createBlockAtlas().image.data;
  const tileX = (28 % 8) * TILE_SIZE;
  const tileY = Math.floor(28 / 8) * TILE_SIZE;
  const alphas = [];
  for (let y = 0; y < TILE_SIZE; y += 1) {
    for (let x = 0; x < TILE_SIZE; x += 1) {
      alphas.push(atlas[((tileY + y) * TILE_SIZE * 8 + tileX + x) * 4 + 3]);
    }
  }
  assert.ok(alphas.includes(0) && alphas.includes(255));
});

test('depth-aware underwater beds deterministically generate Tidegrass and Glowkelp', () => {
  globalThis.localStorage = new MemoryStorage();
  const first = new VoxelWorld(new THREE.Scene(), 24680);
  const second = new VoxelWorld(new THREE.Scene(), 24680);
  const found = new Map();
  for (let z = -128; z <= 128; z += 1) {
    for (let x = -128; x <= 128; x += 1) {
      const plant = first.underwaterPlantAt(x, z);
      assert.deepEqual(plant, second.underwaterPlantAt(x, z));
      if (!plant || found.has(plant.id)) continue;
      found.set(plant.id, { x, z, ...plant });
      const ground = first.terrainHeight(x, z);
      assert.equal(ground + plant.depth, SEA_LEVEL);
      assert.ok(plant.height <= plant.depth);
      for (let oy = 1; oy <= plant.height; oy += 1) assert.equal(first.getBlock(x, ground + oy, z), plant.id);
    }
  }
  assert.ok(found.has(BLOCK.TIDEGRASS));
  assert.ok(found.has(BLOCK.GLOWKELP));
  const dryX = [...Array(500).keys()].find((x) => first.terrainHeight(x, 700) >= SEA_LEVEL - 1);
  assert.notEqual(dryX, undefined);
  assert.equal(first.underwaterPlantAt(dryX, 700), null);
});

test('connected barriers build rails, use tall collision, and target their base voxel', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 4141);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(1, y, 1, BLOCK.OAK_FENCE);
  world.setBlock(2, y, 1, BLOCK.STONE_WALL);
  assert.equal(world.collisionHeight(1, y, 1), 1.5);
  assert.equal(world.collisionHeight(2, y, 1), 1.5);
  const geometry = world.buildGeometry(0, 0);
  const positions = geometry.getAttribute('position').array;
  let barrierVertices = 0;
  let maximumY = -Infinity;
  for (let index = 0; index < positions.length; index += 3) {
    if (positions[index + 1] < y) continue;
    barrierVertices += 1;
    maximumY = Math.max(maximumY, positions[index + 1]);
  }
  assert.equal(barrierVertices, 144);
  assert.ok(Math.abs(maximumY - (y + 1.45)) < 1e-5);
  const targeted = world.resolveBreakVoxel(
    new THREE.Vector3(1.625, y + 1.2, 1.5),
    new THREE.Vector3(1, 0, 0),
  );
  assert.deepEqual(targeted.toArray(), [1, y, 1]);
});

test('closed and open gate states use distinct geometry and collision', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 5151);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(4, y, 4, BLOCK.GATE_X);
  assert.equal(world.collisionHeight(4, y, 4), 1.5);
  let geometry = world.buildGeometry(0, 0);
  let gateVertices = 0;
  for (let index = 1; index < geometry.getAttribute('position').array.length; index += 3) {
    if (geometry.getAttribute('position').array[index] >= y) gateVertices += 1;
  }
  assert.equal(gateVertices, 96);
  world.setBlock(4, y, 4, BLOCK.GATE_OPEN_X);
  assert.equal(world.collisionHeight(4, y, 4), 0);
  geometry = world.buildGeometry(0, 0);
  gateVertices = 0;
  for (let index = 1; index < geometry.getAttribute('position').array.length; index += 3) {
    if (geometry.getAttribute('position').array[index] >= y) gateVertices += 1;
  }
  assert.equal(gateVertices, 144);
});

test('stairs expose two oriented collision boxes and matching two-step geometry', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 6161);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(6, y, 6, BLOCK.OAK_STAIR_N);
  assert.deepEqual(world.collisionBoxes(6, y, 6), [
    [0, 0, 0, 1, 0.5, 1],
    [0, 0.5, 0, 1, 1, 0.5],
  ]);
  assert.equal(world.collisionHeight(6, y, 6), 1);
  let geometry = world.buildGeometry(0, 0);
  let vertices = 0;
  for (let index = 1; index < geometry.getAttribute('position').array.length; index += 3) {
    if (geometry.getAttribute('position').array[index] >= y) vertices += 1;
  }
  assert.equal(vertices, 48);
  world.setBlock(6, y, 6, BLOCK.STONE_STAIR_E);
  assert.deepEqual(world.collisionBoxes(6, y, 6)[1], [0.5, 0.5, 0, 1, 1, 1]);
});

test('trapdoors switch between thin horizontal and facing vertical collision geometry', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 7171);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(7, y, 7, BLOCK.TRAP_CLOSED_N);
  assert.deepEqual(world.collisionBoxes(7, y, 7), [[0, 0, 0, 1, 0.1875, 1]]);
  assert.equal(world.collisionHeight(7, y, 7), 0.1875);
  let geometry = world.buildGeometry(0, 0);
  let vertices = 0;
  for (let index = 1; index < geometry.getAttribute('position').array.length; index += 3) {
    if (geometry.getAttribute('position').array[index] >= y) vertices += 1;
  }
  assert.equal(vertices, 24);
  world.setBlock(7, y, 7, BLOCK.TRAP_OPEN_E);
  assert.deepEqual(world.collisionBoxes(7, y, 7), [[0.8125, 0, 0, 1, 1, 1]]);
  assert.equal(world.collisionHeight(7, y, 7), 1);
});

test('paired bed halves use low collision and distinct head pillow geometry', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 8181);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(8, y, 8, BLOCK.BED_N_FOOT);
  world.setBlock(8, y, 7, BLOCK.BED_N_HEAD);
  assert.deepEqual(world.collisionBoxes(8, y, 8), [[0, 0, 0, 1, 0.5, 1]]);
  assert.equal(world.collisionHeight(8, y, 7), 0.5);
  const geometry = world.buildGeometry(0, 0);
  let vertices = 0;
  for (let index = 1; index < geometry.getAttribute('position').array.length; index += 3) {
    if (geometry.getAttribute('position').array[index] >= y) vertices += 1;
  }
  assert.equal(vertices, 312);
});

test('standing signs use oriented board-and-post geometry without blocking movement', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 9191);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(9, y, 9, BLOCK.SIGN_N);
  assert.deepEqual(world.collisionBoxes(9, y, 9), []);
  let geometry = world.buildGeometry(0, 0);
  let vertices = 0;
  for (let index = 1; index < geometry.getAttribute('position').array.length; index += 3) {
    if (geometry.getAttribute('position').array[index] >= y) vertices += 1;
  }
  assert.equal(vertices, 48);
  const northPositions = [...geometry.getAttribute('position').array];
  world.setBlock(9, y, 9, BLOCK.SIGN_E);
  geometry = world.buildGeometry(0, 0);
  assert.notDeepEqual([...geometry.getAttribute('position').array], northPositions);
});

test('mature Amberroot renders as a non-colliding cutout crop with its own height and pixels', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 9292);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(10, y, 10, BLOCK.AMBERROOT_3);
  assert.deepEqual(world.collisionBoxes(10, y, 10), []);
  const positions = world.buildGeometry(0, 0).getAttribute('position').array;
  const cropY = [];
  for (let index = 1; index < positions.length; index += 3) {
    if (positions[index] >= y) cropY.push(positions[index]);
  }
  assert.equal(cropY.length, 8);
  assert.ok(Math.abs(Math.max(...cropY) - (y + 0.86)) < 1e-5);

  const atlas = createBlockAtlas().image.data;
  const tileX = (34 % 8) * TILE_SIZE;
  const tileY = Math.floor(34 / 8) * TILE_SIZE;
  const alpha = [];
  for (let py = 0; py < TILE_SIZE; py += 1) {
    for (let px = 0; px < TILE_SIZE; px += 1) alpha.push(atlas[((tileY + py) * TILE_SIZE * 8 + tileX + px) * 4 + 3]);
  }
  assert.ok(alpha.includes(0) && alpha.includes(255));
});

test('mature Rimepods render distinct icy pod silhouettes from the twelfth atlas row', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 9302);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(10, y, 10, BLOCK.RIMEPOD_3);
  assert.deepEqual(world.collisionBoxes(10, y, 10), []);
  const positions = world.buildGeometry(0, 0).getAttribute('position').array;
  const cropY = [];
  for (let index = 1; index < positions.length; index += 3) if (positions[index] >= y) cropY.push(positions[index]);
  assert.equal(cropY.length, 8);
  assert.ok(Math.abs(Math.max(...cropY) - (y + 0.94)) < 1e-5);

  const image = createBlockAtlas().image;
  assert.equal(image.height, TILE_SIZE * ATLAS_ROWS);
  const tileX = (91 % 8) * TILE_SIZE;
  const tileY = Math.floor(91 / 8) * TILE_SIZE;
  const alpha = [];
  for (let py = 0; py < TILE_SIZE; py += 1) {
    for (let px = 0; px < TILE_SIZE; px += 1) alpha.push(image.data[((tileY + py) * image.width + tileX + px) * 4 + 3]);
  }
  assert.ok(alpha.includes(0) && alpha.includes(255));
});

test('Compost Bins render open wooden walls and visibly gain a filled interior', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 9393);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(11, y, 11, BLOCK.COMPOSTER_0);
  assert.equal(world.collisionHeight(11, y, 11), 1);
  let positions = world.buildGeometry(0, 0).getAttribute('position').array;
  let vertices = 0;
  for (let index = 1; index < positions.length; index += 3) if (positions[index] >= y) vertices += 1;
  assert.equal(vertices, 120);
  world.setBlock(11, y, 11, BLOCK.COMPOSTER_7);
  positions = world.buildGeometry(0, 0).getAttribute('position').array;
  vertices = 0;
  for (let index = 1; index < positions.length; index += 3) if (positions[index] >= y) vertices += 1;
  assert.equal(vertices, 144);
});

test('Repair Benches render a low-poly stone pedestal and iron work surface', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 9494);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(12, y, 12, BLOCK.REPAIR_BENCH);
  assert.equal(world.collisionHeight(12, y, 12), 1);
  const positions = world.buildGeometry(0, 0).getAttribute('position').array;
  let vertices = 0;
  for (let index = 1; index < positions.length; index += 3) if (positions[index] >= y) vertices += 1;
  assert.equal(vertices, 96);
  assert.ok(Math.abs(Math.max(...positions.filter((_, index) => index % 3 === 1)) - (y + 0.84)) < 1e-5);
});

test('Runeforges render an original layered rune pedestal with partial collision', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 9545);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(12, y, 13, BLOCK.RUNEFORGE);
  assert.equal(world.collisionHeight(12, y, 13), 0.88);
  const positions = world.buildGeometry(0, 0).getAttribute('position').array;
  let vertices = 0;
  for (let index = 1; index < positions.length; index += 3) if (positions[index] >= y) vertices += 1;
  assert.equal(vertices, 96);
  assert.ok(Math.abs(Math.max(...positions.filter((_, index) => index % 3 === 1)) - (y + 1.05)) < 1e-5);
});

test('Shadow Dens generate deterministically in valid biomes and remain destroyed through edits', () => {
  globalThis.localStorage = new MemoryStorage();
  const first = new VoxelWorld(new THREE.Scene(), 9671);
  let den = null;
  for (let cellZ = -20; cellZ <= 20 && !den; cellZ += 1) {
    for (let cellX = -20; cellX <= 20 && !den; cellX += 1) den = first.shadowDenForCell(cellX, cellZ);
  }
  assert.ok(den, 'expected at least one valid Shadow Den candidate');
  assert.ok(['plains', 'forest'].includes(den.biome));
  assert.equal(first.getBlock(den.x, den.y, den.z), BLOCK.SHADOW_DEN);
  const repeated = new VoxelWorld(new THREE.Scene(), 9671).shadowDenForCell(den.cellX, den.cellZ);
  assert.deepEqual(repeated, den);
  assert.ok(first.shadowDensNear(den.x, den.z, 2).some((candidate) => candidate.key === den.key));

  first.setBlock(den.x, den.y, den.z, BLOCK.AIR);
  const restored = new VoxelWorld(new THREE.Scene(), 9671);
  assert.equal(restored.getBlock(den.x, den.y, den.z), BLOCK.AIR);
});

test('Shadow Dens render as compact layered mounds with partial collision', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 9681);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(13, y, 12, BLOCK.SHADOW_DEN);
  assert.equal(world.collisionHeight(13, y, 12), 0.62);
  const positions = world.buildGeometry(0, 0).getAttribute('position').array;
  let vertices = 0;
  for (let index = 1; index < positions.length; index += 3) if (positions[index] >= y) vertices += 1;
  assert.equal(vertices, 96);
  assert.ok(Math.abs(Math.max(...positions.filter((_, index) => index % 3 === 1)) - (y + 0.68)) < 1e-5);
});

test('Lumen Lanterns render a compact crystal cage with low collision', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 9595);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(13, y, 13, BLOCK.LUMEN_LANTERN);
  assert.equal(world.collisionHeight(13, y, 13), 0.55);
  const positions = world.buildGeometry(0, 0).getAttribute('position').array;
  let vertices = 0;
  for (let index = 1; index < positions.length; index += 3) if (positions[index] >= y) vertices += 1;
  assert.equal(vertices, 168);
  assert.ok(Math.abs(Math.max(...positions.filter((_, index) => index % 3 === 1)) - (y + 0.56)) < 1e-5);
});

test('automation blocks render distinct low-profile switch and connected conduit geometry', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 9606);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(10, y, 10, BLOCK.SPARK_SWITCH_ON);
  world.setBlock(11, y, 10, BLOCK.SUNWIRE_ON);
  world.setBlock(12, y, 10, BLOCK.FORGE_LAMP_ON);
  assert.deepEqual(world.collisionBoxes(10, y, 10), []);
  assert.deepEqual(world.collisionBoxes(11, y, 10), []);
  assert.equal(world.collisionHeight(12, y, 10), 0.82);
  assert.equal(BLOCKS[BLOCK.FORGE_LAMP_ON].light.color, 0xffd278);
  const positions = world.buildGeometry(0, 0).getAttribute('position').array;
  const upper = [];
  for (let index = 1; index < positions.length; index += 3) if (positions[index] >= y) upper.push(positions[index]);
  assert.ok(upper.length >= 120);
  assert.ok(Math.max(...upper) >= y + 0.8);
  assert.ok(upper.some((value) => value > y && value < y + 0.07), 'Sunwire should hug the supporting surface');
});

test('Hearthfires render original log rings with a taller lit flame and warm block light', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 9616);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(9, y, 9, BLOCK.HEARTHFIRE_UNLIT);
  let positions = world.buildGeometry(0, 0).getAttribute('position').array;
  const unlitTop = Math.max(...positions.filter((_, index) => index % 3 === 1));
  assert.ok(Math.abs(unlitTop - (y + 0.28)) < 1e-5);
  assert.equal(world.collisionHeight(9, y, 9), 0.32);
  world.setBlock(9, y, 9, BLOCK.HEARTHFIRE_LIT);
  positions = world.buildGeometry(0, 0).getAttribute('position').array;
  const litTop = Math.max(...positions.filter((_, index) => index % 3 === 1));
  assert.ok(Math.abs(litTop - (y + 0.68)) < 1e-5);
  assert.equal(world.collisionHeight(9, y, 9), 0.42);
  assert.equal(BLOCKS[BLOCK.HEARTHFIRE_LIT].light.color, 0xff9b4b);
});

test('Windracks render an open low-poly frame with four hanging provisions and narrow post collision', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 9626);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(8, y, 8, BLOCK.DRYING_RACK);
  const boxes = world.collisionBoxes(8, y, 8);
  assert.equal(boxes.length, 4);
  assert.ok(boxes.every((box) => box[4] === 1.45));
  const positions = world.buildGeometry(0, 0).getAttribute('position').array;
  const rackY = [];
  for (let index = 1; index < positions.length; index += 3) if (positions[index] >= y) rackY.push(positions[index]);
  assert.ok(rackY.length >= 250);
  assert.ok(Math.abs(Math.max(...rackY) - (y + 1.45)) < 1e-5);
});

test('underwater plants render original non-colliding cutout silhouettes', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 9696);
  const y = WORLD_HEIGHT - 1;
  world.setBlock(14, y, 14, BLOCK.TIDEGRASS);
  assert.deepEqual(world.collisionBoxes(14, y, 14), []);
  let positions = world.buildGeometry(0, 0).getAttribute('position').array;
  let plantY = [];
  for (let index = 1; index < positions.length; index += 3) if (positions[index] >= y) plantY.push(positions[index]);
  assert.equal(plantY.length, 8);
  assert.ok(Math.abs(Math.max(...plantY) - (y + 0.78)) < 1e-5);
  world.setBlock(14, y, 14, BLOCK.GLOWKELP);
  positions = world.buildGeometry(0, 0).getAttribute('position').array;
  plantY = [];
  for (let index = 1; index < positions.length; index += 3) if (positions[index] >= y) plantY.push(positions[index]);
  assert.equal(plantY.length, 8);
  assert.equal(Math.max(...plantY), y + 1);

  const atlas = createBlockAtlas().image.data;
  for (const tile of [43, 44]) {
    const tileX = (tile % 8) * TILE_SIZE;
    const tileY = Math.floor(tile / 8) * TILE_SIZE;
    const alpha = [];
    for (let py = 0; py < TILE_SIZE; py += 1) {
      for (let px = 0; px < TILE_SIZE; px += 1) alpha.push(atlas[((tileY + py) * TILE_SIZE * 8 + tileX + px) * 4 + 3]);
    }
    assert.ok(alpha.includes(0) && alpha.includes(255));
  }
});

test('liquid ray targeting finds water surfaces for fishing without selecting water blocks', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 9797);
  const y = WORLD_HEIGHT - 2;
  world.setBlock(0, y, -4, BLOCK.WATER);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 20);
  camera.position.set(0.5, y + 0.5, 0.5);
  camera.lookAt(0.5, y + 0.5, -4.5);
  camera.updateMatrixWorld(true);
  const hit = world.raycastLiquid(camera, 8);
  assert.deepEqual({ x: hit.x, y: hit.y, z: hit.z }, { x: 0, y, z: -4 });
  camera.lookAt(8, y + 0.5, 0.5);
  camera.updateMatrixWorld(true);
  assert.equal(world.raycastLiquid(camera, 3), null);
});

test('levelled water meshes expose their exact shallow surface height', () => {
  const world = new VoxelWorld(new THREE.Scene(), 0x51a110);
  world.setBlock(1, 60, 1, BLOCK.WATER_7);
  const geometry = world.buildGeometry(0, 0, true);
  const positions = geometry.getAttribute('position');
  const highWaterVertices = [];
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    if (x >= 1 && x <= 2 && z >= 1 && z <= 2 && y > 60) highWaterVertices.push(y);
  }
  assert.ok(highWaterVertices.length > 0);
  assert.ok(highWaterVertices.every((y) => Math.abs(y - 60.18) < 0.0001));
  geometry.dispose();
});

test('batched world edits rebuild once per dirty chunk and notify fluid listeners', () => {
  const world = new VoxelWorld(new THREE.Scene(), 0xba7c4ed);
  const events = [];
  world.onBlockChange((x, y, z, previous, id) => events.push({ x, y, z, previous, id }));
  const changed = world.setBlocks([
    { x: 2, y: 50, z: 2, id: BLOCK.WATER_3 },
    { x: 3, y: 50, z: 2, id: BLOCK.WATER_4 },
  ]);
  assert.equal(changed, 2);
  assert.equal(events.length, 2);
  assert.equal(events[0].previous, BLOCK.AIR);
  assert.equal(world.getBlock(3, 50, 2), BLOCK.WATER_4);
});

test('accumulated snow layers mesh and collide at their exact fractional height', () => {
  const world = new VoxelWorld(new THREE.Scene(), 0x5a0f1a7e);
  world.setBlock(1, 60, 1, BLOCK.SNOW_LAYER_4);
  assert.equal(world.collisionHeight(1, 60, 1), 0.5);
  const geometry = world.buildGeometry(0, 0);
  const positions = geometry.getAttribute('position');
  let foundTop = false;
  for (let index = 0; index < positions.count; index += 1) {
    if (positions.getX(index) >= 1 && positions.getX(index) <= 2
      && positions.getZ(index) >= 1 && positions.getZ(index) <= 2
      && Math.abs(positions.getY(index) - 60.5) < 0.0001) foundTop = true;
  }
  assert.equal(foundTop, true);
  geometry.dispose();
});

test('rebuilt chunks retain a queryable propagated light field for shading and spawning', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 0x11947);
  world.rebuildChunk(0, 0);
  assert.equal(world.skyLightAt(3, WORLD_HEIGHT - 1, 3), 15);
  world.setBlock(3, 60, 3, BLOCK.TORCH);
  assert.ok(world.blockLightAt(3, 60, 3) > world.blockLightAt(10, 60, 10));
  assert.equal(world.lightLevelAt(3, 61, 3, 1), 15);
  assert.ok(world.lightFields.has('0,0'));
});

test('streaming loads every active chunk explicitly and repairs missing terrain meshes in place', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 919191);
  world.setRenderRadius(1);
  const position = new THREE.Vector3(0.5, world.terrainHeight(0, 0) + 2, 0.5);
  for (let index = 0; index < 9; index += 1) world.update(position);
  const complete = world.activeChunkIntegrity(position);
  assert.equal(complete.expected, 9);
  assert.equal(complete.valid, 9);
  assert.deepEqual(complete.missing, []);
  assert.equal(world.chunks.size >= 9, true, 'rendering must load voxel data instead of relying on incidental block queries');

  const damagedKey = '1,0';
  world.removeMeshes(damagedKey);
  world.chunks.delete(damagedKey);
  assert.equal(world.activeChunkIntegrity(position).missing.some(({ cx, cz }) => cx === 1 && cz === 0), true);
  world.update(position);
  assert.equal(world.meshes.has(damagedKey), true, 'a stationary player must receive an automatic repair');
  assert.equal(world.chunks.has(damagedKey), true);
  assert.equal(world.activeChunkIntegrity(position).missing.length, 0);

  const detachedKey = '-1,0';
  const detached = world.meshes.get(detachedKey);
  world.scene.remove(detached);
  detached.geometry.dispose();
  assert.equal(world.chunkMeshIsHealthy(-1, 0), false, 'detached or disposed terrain is not healthy');
  world.update(position);
  assert.equal(world.chunkMeshIsHealthy(-1, 0), true, 'the active integrity audit replaces renderer-damaged terrain');
});

test('streaming detects and repairs missing liquid and transparent render passes', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), seedFromString('j1mh04-n5f6'));
  world.setRenderRadius(1);
  const position = new THREE.Vector3(51.4, 19.01, -32);
  world.update(position);

  const damagedKey = [...world.waterMeshes.keys()][0];
  assert.ok(damagedKey, 'the coastal regression area must contain a water render pass');
  const damaged = world.waterMeshes.get(damagedKey);
  world.scene.remove(damaged);
  damaged.geometry.dispose();
  const [cx, cz] = damagedKey.split(',').map(Number);
  assert.equal(world.chunkMeshIsHealthy(cx, cz), false, 'a chunk with missing water must not report healthy');

  world.update(position);
  assert.equal(world.chunkMeshIsHealthy(cx, cz), true, 'the active audit must rebuild every expected render pass');
  assert.notEqual(world.waterMeshes.get(damagedKey), damaged);

  world.setBlock(50, 21, -32, BLOCK.GLASS);
  const transparentKey = '3,-2';
  const transparent = world.transparentMeshes.get(transparentKey);
  assert.ok(transparent, 'a placed glass block must publish a transparent render pass');
  world.scene.remove(transparent);
  transparent.geometry.dispose();
  assert.equal(world.chunkMeshIsHealthy(3, -2), false, 'a chunk with missing transparent geometry must not report healthy');
  world.update(position);
  assert.equal(world.chunkMeshIsHealthy(3, -2), true);
  assert.notEqual(world.transparentMeshes.get(transparentKey), transparent);
});

test('streaming synchronously protects the player with a complete validated safety ring', () => {
  globalThis.localStorage = new MemoryStorage();
  const world = new VoxelWorld(new THREE.Scene(), 404404);
  world.setRenderRadius(2);
  const position = new THREE.Vector3(0.5, world.terrainHeight(0, 0) + 2, 0.5);

  world.update(position);
  for (let cz = -1; cz <= 1; cz += 1) {
    for (let cx = -1; cx <= 1; cx += 1) assert.equal(world.chunkMeshIsHealthy(cx, cz), true);
  }
  assert.equal(world.meshes.size, 10, 'the safety ring and one queued outer chunk are ready before rendering');

  const oldMesh = world.meshes.get('0,0');
  const corrupted = world.chunks.get('0,0');
  world.chunks.set('0,0', new Uint8Array(3));
  assert.equal(world.rebuildChunk(0, 0), false);
  assert.equal(world.meshes.get('0,0'), oldMesh, 'an invalid rebuild cannot replace a healthy visible mesh');
  world.chunks.set('0,0', corrupted);
});
