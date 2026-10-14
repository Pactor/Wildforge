import * as THREE from 'three';
import {
  BLOCK,
  BLOCKS,
  blockTexture,
  faceShade,
  fluidKind,
  fluidSurfaceHeight,
  isLavaBlock,
  isLiquidBlock,
  isWaterBlock,
} from './blocks.js';
import { coordinateRandom, fbm2, valueNoise3 } from './noise.js';
import { createBlockAtlas, tileUVs } from './textures.js';
import { emittedLightLevel, MAX_LIGHT, VoxelLightField } from './voxelLighting.js';
import { CINDERREACH_ORIGIN, cinderreachLocal, realmAt, REALM } from './realms.js';
import { loadWorldEdits, writeWorldEdits } from './saveSystem.js';
import { paneBoxes } from './panes.js';
import { hearthcakeBounds } from './hearthcake.js';
import { torchGeometry } from './torches.js';
import { funnelBounds } from './funnels.js';
import { ejectorBounds } from './ejectors.js';
import { dispenserBounds } from './dispensers.js';
import { sentryBounds } from './changeSentries.js';
import { WORLD_DEPTH, WORLD_HEIGHT, WORLD_MIN_Y } from './worldBounds.js';

export const CHUNK_SIZE = 16;
export { WORLD_DEPTH, WORLD_HEIGHT, WORLD_MIN_Y } from './worldBounds.js';
export const SEA_LEVEL = 16;
export const VOXEL_ID_BITS = 16;
export const VOXEL_ARRAY_TYPE = Uint16Array;

const FACES = [
  { dir: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { dir: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { dir: [0, 0, 1], corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { dir: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
];

const floorDiv = (n, d) => Math.floor(n / d);
const mod = (n, d) => ((n % d) + d) % d;
const chunkKey = (cx, cz) => `${cx},${cz}`;
const blockKey = (x, y, z) => `${x},${y},${z}`;
export const chunkVoxelIndex = (lx, y, lz) => lx + CHUNK_SIZE * (lz + CHUNK_SIZE * (y - WORLD_MIN_Y));

export class VoxelWorld {
  constructor(scene, seed, { editsKey = null } = {}) {
    this.scene = scene;
    this.seed = seed >>> 0;
    this.editsKey = editsKey || `wildforge:${this.seed}:edits`;
    this.chunks = new Map();
    this.meshes = new Map();
    this.waterMeshes = new Map();
    this.lavaMeshes = new Map();
    this.transparentMeshes = new Map();
    this.lightFields = new Map();
    this.generatedCaveLights = new Map();
    this.renderRadius = 2;
    this.lastCenter = '';
    this.buildQueue = [];
    this.blockChangeListeners = new Set();
    this.edits = this.loadEdits();
    this.atlas = createBlockAtlas();
    this.solidMaterial = new THREE.MeshLambertMaterial({ map: this.atlas, vertexColors: true, alphaTest: 0.5 });
    this.waterMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true,
      map: this.atlas,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.lavaMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true,
      map: this.atlas,
      emissive: new THREE.Color(0x8f2508),
      emissiveIntensity: 0.72,
    });
    this.transparentMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true,
      map: this.atlas,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  terrainHeight(x, z) {
    if (realmAt(x, z) === REALM.CINDERREACH) {
      const local = cinderreachLocal(x, z);
      const shelves = fbm2(local.x / 72, local.z / 72, this.seed + 73001, 4);
      const fractures = Math.abs(fbm2(local.x / 31, local.z / 31, this.seed + 73019, 3) - 0.5) * 2;
      return Math.max(12, Math.min(WORLD_HEIGHT - 12, Math.floor(17 + shelves * 18 + fractures * 8)));
    }
    const broad = fbm2(x / 90, z / 90, this.seed, 4);
    const detail = fbm2(x / 28, z / 28, this.seed + 9001, 3);
    const ridge = Math.abs(fbm2(x / 55, z / 55, this.seed + 4409, 3) - 0.5) * 2;
    return Math.max(5, Math.min(WORLD_HEIGHT - 10, Math.floor(9 + broad * 17 + detail * 5 + ridge * 3)));
  }

  biomeAt(x, z, knownHeight = null) {
    if (realmAt(x, z) === REALM.CINDERREACH) return { id: 'cinderreach', name: 'Cinderreach', temperature: 1, moisture: 0.04 };
    const height = knownHeight ?? this.terrainHeight(x, z);
    const temperature = fbm2(x / 210, z / 210, this.seed + 311, 3);
    const moisture = fbm2(x / 170, z / 170, this.seed + 719, 3);
    if (height > 31 || temperature < 0.3) return { id: 'snowy_highlands', name: 'Snowy Highlands', temperature, moisture };
    if (temperature > 0.57 && moisture < 0.39) return { id: 'desert', name: 'Desert', temperature, moisture };
    if (moisture > 0.58) return { id: 'forest', name: 'Forest', temperature, moisture };
    return { id: 'plains', name: 'Plains', temperature, moisture };
  }

  shouldGrowTree(x, z) {
    if (realmAt(x, z) === REALM.CINDERREACH) return false;
    const h = this.terrainHeight(x, z);
    const biome = this.biomeAt(x, z, h);
    if (h <= SEA_LEVEL + 1 || biome.id === 'desert') return false;
    const threshold = biome.id === 'forest' ? 0.965 : biome.id === 'snowy_highlands' ? 0.988 : 0.991;
    return coordinateRandom(x, z, this.seed, 7) > threshold;
  }

  treeProfileAt(x, z) {
    if (!this.shouldGrowTree(x, z)) return null;
    const height = this.terrainHeight(x, z);
    const biome = this.biomeAt(x, z, height).id;
    const variation = coordinateRandom(x, z, this.seed, 11);
    if (biome === 'snowy_highlands') {
      return { kind: 'frostpine', trunk: 7 + Math.floor(variation * 3), radius: 3, log: BLOCK.FROSTPINE_LOG, leaves: BLOCK.FROSTPINE_NEEDLES };
    }
    if (biome === 'forest') {
      return { kind: 'forest_oak', trunk: 5 + Math.floor(variation * 3), radius: 3, log: BLOCK.WOOD, leaves: BLOCK.LEAVES };
    }
    return { kind: 'plains_oak', trunk: 4 + Math.floor(variation * 2), radius: 2, log: BLOCK.WOOD, leaves: BLOCK.LEAVES };
  }

  shouldGrowCactus(x, z) {
    if (realmAt(x, z) === REALM.CINDERREACH) return false;
    const height = this.terrainHeight(x, z);
    return height > SEA_LEVEL && this.biomeAt(x, z, height).id === 'desert'
      && coordinateRandom(x, z, this.seed, 37) > 0.986;
  }

  surfaceDecoration(x, z) {
    if (realmAt(x, z) === REALM.CINDERREACH) return BLOCK.AIR;
    const height = this.terrainHeight(x, z);
    if (height <= SEA_LEVEL + 1 || this.shouldGrowTree(x, z) || this.shouldGrowCactus(x, z)) return BLOCK.AIR;
    const biome = this.biomeAt(x, z, height).id;
    const roll = coordinateRandom(x, z, this.seed, 151);
    if (biome === 'plains') {
      if (roll > 0.982) return BLOCK.SUNPETAL;
      if (roll > 0.958) return BLOCK.EMBERBELL;
      if (roll > 0.73) return BLOCK.WINDGRASS;
    }
    if (biome === 'forest') {
      if (roll < 0.045) return BLOCK.DUSKMUSHROOM;
      if (roll > 0.978) return BLOCK.EMBERBELL;
      if (roll > 0.78) return BLOCK.WINDGRASS;
    }
    if (biome === 'snowy_highlands' && roll > 0.986) return BLOCK.SUNPETAL;
    return BLOCK.AIR;
  }

  underwaterPlantAt(x, z) {
    if (realmAt(x, z) === REALM.CINDERREACH) return null;
    const ground = this.terrainHeight(x, z);
    const depth = SEA_LEVEL - ground;
    if (depth < 2) return null;
    const roll = coordinateRandom(x, z, this.seed, 211);
    if (roll > 0.974) {
      const height = Math.min(depth, 2 + Math.floor(coordinateRandom(x, z, this.seed, 223) * 2));
      return { id: BLOCK.GLOWKELP, height, depth };
    }
    if (roll > 0.84) return { id: BLOCK.TIDEGRASS, height: 1, depth };
    return null;
  }

  undergroundBiomeAt(x, y, z) {
    if (realmAt(x, z) === REALM.CINDERREACH) return { id: 'cinder_hollows', name: 'Cinder Hollows' };
    if (y <= -96) return { id: 'abyssal_depths', name: 'Abyssal Depths' };
    if (y >= 40) return { id: 'stone_caves', name: 'Stone Caves' };
    const ecology = valueNoise3(x / 68, y / 42, z / 68, this.seed + 36109);
    const moisture = valueNoise3(x / 41, y / 31, z / 41, this.seed + 41777);
    if (y <= 12 && ecology > 0.57 && moisture > 0.43) return { id: 'lumen_grotto', name: 'Lumen Grotto' };
    if (y <= 38 && y > -88 && ecology < 0.43 && moisture > 0.35) return { id: 'rootbound_hollow', name: 'Rootbound Hollow' };
    if (y <= -48 && ecology > 0.5) return { id: 'lumen_grotto', name: 'Deep Lumen Grotto' };
    return { id: 'stone_caves', name: 'Stone Caves' };
  }

  caveDecorationAt(x, y, z, belowId) {
    const biome = this.undergroundBiomeAt(x, y, z);
    const roll = coordinateRandom(x + y * 29, z - y * 17, this.seed, 251);
    const stoneFloor = [BLOCK.STONE, BLOCK.MOSSY_STONE, BLOCK.ROOTSTONE].includes(belowId);
    if (!stoneFloor) return BLOCK.AIR;
    if (biome.id === 'lumen_grotto' && roll > 0.955) return BLOCK.LUMEN_BLOOM;
    if (biome.id === 'rootbound_hollow' && roll > 0.963) return BLOCK.ASHCAP;
    return BLOCK.AIR;
  }

  undergroundFeatureAt(x, y, z, knownHeight = null) {
    const height = knownHeight ?? this.terrainHeight(x, z);
    if (y <= WORLD_MIN_Y + 3 || y >= height - 4) return { carved: false, chamber: false, tunnel: false, flooded: false, lava: false, lumenOre: false, aquiferLevel: WORLD_MIN_Y };
    const chamberNoise = valueNoise3(x / 25, y / 17, z / 25, this.seed + 2203);
    const chamberDetail = valueNoise3(x / 10, y / 9, z / 10, this.seed + 8171);
    const chamber = chamberNoise > 0.69 && chamberDetail > 0.43;
    // The intersection of two smooth near-zero fields produces long, winding
    // curves instead of disconnected spherical voids.
    const tunnelFieldA = Math.abs(valueNoise3(x / 34, y / 23, z / 34, this.seed + 12041) - 0.5);
    const tunnelFieldB = Math.abs(valueNoise3(x / 29, y / 31, z / 29, this.seed + 18427) - 0.5);
    const deepOpenness = y < -40 ? 0.012 : 0;
    const tunnel = y < 38 && tunnelFieldA < 0.062 + deepOpenness && tunnelFieldB < 0.072 + deepOpenness;
    const carved = chamber || tunnel;
    const nearChamber = chamberNoise > 0.64 && chamberDetail > 0.39;
    const nearTunnel = tunnelFieldA < 0.095 && tunnelFieldB < 0.105;
    const crystalNoise = valueNoise3(x / 5.5, y / 5.5, z / 5.5, this.seed + 31991);
    const lumenOre = !carved && y < 18 && (nearChamber || nearTunnel) && crystalNoise > 0.79;
    const aquiferLevel = -30 + Math.floor(fbm2(x / 92, z / 92, this.seed + 23173, 3) * 12);
    const aquiferMask = valueNoise3(x / 38, y / 22, z / 38, this.seed + 27851);
    const lava = carved && y <= WORLD_MIN_Y + 16;
    const flooded = carved && !lava && y <= aquiferLevel && aquiferMask > 0.48;
    return { carved, chamber, tunnel, flooded, lava, lumenOre, aquiferLevel };
  }

  cinderRiftPosition() {
    const x = CINDERREACH_ORIGIN.x;
    const z = CINDERREACH_ORIGIN.z;
    return { x, y: this.terrainHeight(x, z) + 2, z };
  }

  cinderSpireAt(x, z) {
    if (realmAt(x, z) !== REALM.CINDERREACH || Math.hypot(x - CINDERREACH_ORIGIN.x, z - CINDERREACH_ORIGIN.z) < 14
      || coordinateRandom(x, z, this.seed, 73157) < 0.996) return null;
    return { x, z, ground: this.terrainHeight(x, z), height: 3 + Math.floor(coordinateRandom(x, z, this.seed, 73171) * 6) };
  }

  generateChunk(cx, cz) {
    const blocks = new VOXEL_ARRAY_TYPE(CHUNK_SIZE * WORLD_DEPTH * CHUNK_SIZE);
    const caveLights = [];
    this.generatedCaveLights.set(chunkKey(cx, cz), caveLights);
    const index = chunkVoxelIndex;
    const setLocal = (wx, y, wz, id) => {
      const lx = wx - cx * CHUNK_SIZE;
      const lz = wz - cz * CHUNK_SIZE;
      if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE && y >= WORLD_MIN_Y && y < WORLD_HEIGHT) {
        blocks[index(lx, y, lz)] = id;
      }
    };
    const setLeaf = (wx, y, wz, id) => {
      const lx = wx - cx * CHUNK_SIZE;
      const lz = wz - cz * CHUNK_SIZE;
      if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE || y < WORLD_MIN_Y || y >= WORLD_HEIGHT) return;
      const existing = blocks[index(lx, y, lz)];
      if (existing === BLOCK.WOOD || existing === BLOCK.FROSTPINE_LOG) return;
      blocks[index(lx, y, lz)] = id;
    };

    for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
      for (let lx = 0; lx < CHUNK_SIZE; lx += 1) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;
        const height = this.terrainHeight(wx, wz);
        const biome = this.biomeAt(wx, wz, height);
        for (let y = WORLD_MIN_Y; y <= Math.max(height, SEA_LEVEL); y += 1) {
          let id = BLOCK.AIR;
          if (biome.id === 'cinderreach') {
            if (y > height) id = BLOCK.AIR;
            else if (y === height) id = BLOCK.EMBER_SOIL;
            else {
              id = BLOCK.ASHSTONE;
              if (y > WORLD_MIN_Y + 3 && y < height - 3) {
                const chamber = valueNoise3(wx / 24, y / 18, wz / 24, this.seed + 73103) > 0.7;
                const fissure = Math.abs(valueNoise3(wx / 33, y / 27, wz / 33, this.seed + 73121) - 0.5) < 0.055;
                const carved = chamber || fissure;
                if (carved) id = y <= WORLD_MIN_Y + 18 ? BLOCK.LAVA : BLOCK.AIR;
                else if (y < 12 && valueNoise3(wx / 5.2, y / 5.2, wz / 5.2, this.seed + 73133) > 0.82) id = BLOCK.CINDER_CRYSTAL_ORE;
              }
            }
          } else if (y > height) id = BLOCK.WATER;
          else if (height <= SEA_LEVEL - 1 && y >= height - 2 && valueNoise3(wx / 7.5, y / 5, wz / 7.5, this.seed + 61813) > 0.56) id = BLOCK.TIDECLAY;
          else if ((height <= SEA_LEVEL + 1 || biome.id === 'desert') && y >= height - 3) id = BLOCK.SAND;
          else if (y === height && biome.id === 'snowy_highlands') id = BLOCK.SNOWY_GRASS;
          else if (y === height) id = BLOCK.GRASS;
          else if (y >= height - 3) id = BLOCK.DIRT;
          else {
            id = BLOCK.STONE;
            if (y > WORLD_MIN_Y + 3 && y < height - 4) {
              const underground = this.undergroundFeatureAt(wx, y, wz, height);
              if (underground.carved) id = underground.lava ? BLOCK.LAVA : underground.flooded ? BLOCK.WATER : BLOCK.AIR;
              else if (underground.lumenOre) id = BLOCK.LUMEN_ORE;
              else {
                const ore = valueNoise3(wx / 4.5, y / 4.5, wz / 4.5, this.seed + 5107);
                const rareOre = valueNoise3(wx / 5.8, y / 5.2, wz / 5.8, this.seed + 52919);
                const gravel = valueNoise3(wx / 6.4, y / 5.8, wz / 6.4, this.seed + 18731);
                if (gravel > 0.82 && y > WORLD_MIN_Y + 8 && y < height - 2) id = BLOCK.GRAVEL;
                else if (y <= -48 && rareOre > 0.81) id = BLOCK.VOIDGLASS_ORE;
                else if (y > -104 && y < 8 && rareOre < 0.14) id = BLOCK.EMBERITE_ORE;
                else if (y > -72 && y < 27 && ore > 0.79) id = BLOCK.IRON_ORE;
                else if (y > -48 && y < 42 && ore < 0.2) id = BLOCK.COAL;
                else {
                  const caveBiome = this.undergroundBiomeAt(wx, y, wz).id;
                  const wallPattern = valueNoise3(wx / 9, y / 7, wz / 9, this.seed + 46349);
                  if (caveBiome === 'rootbound_hollow' && wallPattern > 0.44) id = BLOCK.ROOTSTONE;
                  else if (caveBiome === 'lumen_grotto' && wallPattern > 0.56) id = BLOCK.MOSSY_STONE;
                }
              }
            }
          }
          blocks[index(lx, y, lz)] = id;
        }
      }
    }

    for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
      for (let lx = 0; lx < CHUNK_SIZE; lx += 1) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;
        const height = this.terrainHeight(wx, wz);
        for (let y = WORLD_MIN_Y + 5; y < Math.min(height - 3, 39); y += 1) {
          if (blocks[index(lx, y, lz)] !== BLOCK.AIR) continue;
          const decoration = this.caveDecorationAt(wx, y, wz, blocks[index(lx, y - 1, lz)]);
          if (decoration === BLOCK.AIR) continue;
          blocks[index(lx, y, lz)] = decoration;
          if (decoration === BLOCK.LUMEN_BLOOM) caveLights.push({ x: wx, y, z: wz });
        }
      }
    }

    for (let wx = cx * CHUNK_SIZE - 3; wx < (cx + 1) * CHUNK_SIZE + 3; wx += 1) {
      for (let wz = cz * CHUNK_SIZE - 3; wz < (cz + 1) * CHUNK_SIZE + 3; wz += 1) {
        const profile = this.treeProfileAt(wx, wz);
        if (!profile) continue;
        const ground = this.terrainHeight(wx, wz);
        for (let y = 1; y <= profile.trunk; y += 1) setLocal(wx, ground + y, wz, profile.log);
        if (profile.kind === 'frostpine') {
          for (let oy = 2; oy <= profile.trunk + 1; oy += 1) {
            const distanceFromTop = profile.trunk + 1 - oy;
            const radius = oy === profile.trunk + 1 ? 0 : Math.min(profile.radius, 1 + Math.floor(distanceFromTop / 2));
            for (let ox = -radius; ox <= radius; ox += 1) {
              for (let oz = -radius; oz <= radius; oz += 1) {
                if (oy <= profile.trunk && ox === 0 && oz === 0) continue;
                if (Math.abs(ox) + Math.abs(oz) > radius + 1) continue;
                if (radius > 1 && Math.abs(ox) === radius && Math.abs(oz) === radius) continue;
                setLeaf(wx + ox, ground + oy, wz + oz, profile.leaves);
              }
            }
          }
          continue;
        }
        for (let oy = profile.trunk - 2; oy <= profile.trunk + 1; oy += 1) {
          const radius = oy === profile.trunk + 1 ? 1 : profile.radius;
          for (let ox = -radius; ox <= radius; ox += 1) {
            for (let oz = -radius; oz <= radius; oz += 1) {
              if (oy <= profile.trunk && ox === 0 && oz === 0) continue;
              if (Math.abs(ox) === radius && Math.abs(oz) === radius && coordinateRandom(wx + ox, wz + oz, this.seed, oy) > 0.45) continue;
              setLeaf(wx + ox, ground + oy, wz + oz, profile.leaves);
            }
          }
        }
      }
    }

    for (let wx = cx * CHUNK_SIZE; wx < (cx + 1) * CHUNK_SIZE; wx += 1) {
      for (let wz = cz * CHUNK_SIZE; wz < (cz + 1) * CHUNK_SIZE; wz += 1) {
        if (!this.shouldGrowCactus(wx, wz)) continue;
        const ground = this.terrainHeight(wx, wz);
        const height = 2 + Math.floor(coordinateRandom(wx, wz, this.seed, 41) * 2);
        for (let y = 1; y <= height; y += 1) setLocal(wx, ground + y, wz, BLOCK.CACTUS);
      }
    }

    for (let wx = cx * CHUNK_SIZE; wx < (cx + 1) * CHUNK_SIZE; wx += 1) {
      for (let wz = cz * CHUNK_SIZE; wz < (cz + 1) * CHUNK_SIZE; wz += 1) {
        const decoration = this.surfaceDecoration(wx, wz);
        if (decoration !== BLOCK.AIR) setLocal(wx, this.terrainHeight(wx, wz) + 1, wz, decoration);
        const underwaterPlant = this.underwaterPlantAt(wx, wz);
        if (underwaterPlant) {
          const ground = this.terrainHeight(wx, wz);
          for (let oy = 1; oy <= underwaterPlant.height; oy += 1) setLocal(wx, ground + oy, wz, underwaterPlant.id);
        }
      }
    }

    const chunkRealm = realmAt(cx * CHUNK_SIZE + CHUNK_SIZE / 2, cz * CHUNK_SIZE + CHUNK_SIZE / 2);
    if (chunkRealm === REALM.CINDERREACH) {
      this.placeCinderSpires(cx, cz, setLocal);
      this.placeCinderRift(cx, cz, setLocal);
      this.placeCinderwatches(cx, cz, setLocal);
    }
    else {
      this.placeRuins(cx, cz, setLocal);
      this.placeShadowDens(cx, cz, setLocal);
      this.placeHearthsteads(cx, cz, setLocal);
      this.placeSunstepShrines(cx, cz, setLocal);
      this.placeSunstepGauntlets(cx, cz, setLocal);
      this.placeSunstepPulseHalls(cx, cz, setLocal);
      this.placeEchoVaults(cx, cz, setLocal);
    }

    for (const [key, id] of this.edits) {
      const [x, y, z] = key.split(',').map(Number);
      if (floorDiv(x, CHUNK_SIZE) === cx && floorDiv(z, CHUNK_SIZE) === cz && y >= WORLD_MIN_Y && y < WORLD_HEIGHT) {
        blocks[index(mod(x, CHUNK_SIZE), y, mod(z, CHUNK_SIZE))] = id;
      }
    }
    return blocks;
  }

  placeCinderRift(cx, cz, setLocal) {
    const center = this.cinderRiftPosition();
    if (floorDiv(center.x, CHUNK_SIZE) < cx - 1 || floorDiv(center.x, CHUNK_SIZE) > cx + 1
      || floorDiv(center.z, CHUNK_SIZE) < cz - 1 || floorDiv(center.z, CHUNK_SIZE) > cz + 1) return;
    for (let ox = -3; ox <= 3; ox += 1) {
      for (let oz = -3; oz <= 3; oz += 1) {
        const x = center.x + ox;
        const z = center.z + oz;
        const edge = Math.max(Math.abs(ox), Math.abs(oz)) === 3;
        setLocal(x, center.y - 1, z, edge ? BLOCK.CINDER_CRYSTAL_ORE : BLOCK.ASHSTONE);
        for (let oy = 0; oy <= 3; oy += 1) setLocal(x, center.y + oy, z, BLOCK.AIR);
      }
    }
    setLocal(center.x, center.y, center.z, BLOCK.CINDER_RIFT);
  }

  placeCinderSpires(cx, cz, setLocal) {
    for (let x = cx * CHUNK_SIZE; x < (cx + 1) * CHUNK_SIZE; x += 1) {
      for (let z = cz * CHUNK_SIZE; z < (cz + 1) * CHUNK_SIZE; z += 1) {
        const spire = this.cinderSpireAt(x, z);
        if (!spire) continue;
        for (let oy = 1; oy <= spire.height; oy += 1) {
          const crystal = oy === spire.height || (oy > 1 && coordinateRandom(x + oy, z - oy, this.seed, 73177) > 0.84);
          setLocal(x, spire.ground + oy, z, crystal ? BLOCK.CINDER_CRYSTAL_ORE : BLOCK.ASHSTONE);
        }
      }
    }
  }

  placeCinderwatches(cx, cz, setLocal) {
    const cellSize = 160;
    const reach = 12;
    const minCellX = floorDiv(cx * CHUNK_SIZE - reach, cellSize);
    const maxCellX = floorDiv((cx + 1) * CHUNK_SIZE + reach, cellSize);
    const minCellZ = floorDiv(cz * CHUNK_SIZE - reach, cellSize);
    const maxCellZ = floorDiv((cz + 1) * CHUNK_SIZE + reach, cellSize);
    for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        const watch = this.cinderwatchForCell(cellX, cellZ);
        if (!watch) continue;
        const { ground } = watch;
        // A raised foundation makes the structure reliable on Cinderreach's
        // fractured shelves while the support skirt keeps it visually grounded.
        for (let ox = -6; ox <= 6; ox += 1) {
          for (let oz = -8; oz <= 8; oz += 1) {
            const point = this.cinderwatchPoint(watch, ox, oz);
            for (let support = 0; support <= 3; support += 1) {
              if (support === 0 || Math.abs(ox) === 6 || Math.abs(oz) === 8) {
                setLocal(point.x, ground + 1 - support, point.z, support === 0 && (ox + oz) % 7 === 0 ? BLOCK.EMBER_SOIL : BLOCK.ASHSTONE);
              }
            }
            for (let oy = 2; oy <= 7; oy += 1) setLocal(point.x, ground + oy, point.z, BLOCK.AIR);
            const edge = Math.abs(ox) === 6 || Math.abs(oz) === 8;
            const doorway = oz === -8 && Math.abs(ox) <= 1;
            if (edge && !doorway) {
              for (let oy = 2; oy <= 5; oy += 1) {
                const crystalBand = oy === 4 && ((Math.abs(ox) === 6 && oz % 4 === 0) || (Math.abs(oz) === 8 && ox % 4 === 0));
                setLocal(point.x, ground + oy, point.z, crystalBand ? BLOCK.CINDER_CRYSTAL_ORE : BLOCK.ASHSTONE);
              }
            }
            if (Math.abs(ox) <= 5 && Math.abs(oz) <= 7) setLocal(point.x, ground + 6, point.z, (ox + oz) % 11 === 0 ? BLOCK.CINDER_CRYSTAL_ORE : BLOCK.ASHSTONE);
            if (edge && (ox + oz) % 2 === 0) setLocal(point.x, ground + 7, point.z, BLOCK.ASHSTONE);
          }
        }
        // A sheltered two-room route remains fully traversable from the front
        // arch to the reward altar; the center opening cannot be sealed by the
        // decorative divider pillars.
        for (let ox = -5; ox <= 5; ox += 1) {
          if (Math.abs(ox) <= 1) continue;
          const point = this.cinderwatchPoint(watch, ox, 1);
          for (let oy = 2; oy <= 4; oy += 1) setLocal(point.x, ground + oy, point.z, (Math.abs(ox) === 2 && oy === 3) ? BLOCK.CINDER_CRYSTAL_ORE : BLOCK.ASHSTONE);
        }
        for (let oz = -10; oz <= -9; oz += 1) {
          for (let ox = -2; ox <= 2; ox += 1) {
            const point = this.cinderwatchPoint(watch, ox, oz);
            setLocal(point.x, ground + 1, point.z, ox === 0 ? BLOCK.EMBER_SOIL : BLOCK.ASHSTONE);
            for (let oy = 2; oy <= 4; oy += 1) setLocal(point.x, ground + oy, point.z, BLOCK.AIR);
          }
        }
        const features = this.cinderwatchFeatures(watch);
        setLocal(features.chest.x, features.chest.y, features.chest.z, BLOCK.CHEST);
        for (const light of features.lights) {
          setLocal(light.x, light.y - 1, light.z, BLOCK.ASHSTONE);
          setLocal(light.x, light.y, light.z, BLOCK.CINDER_CRYSTAL_ORE);
        }
        for (const altar of features.altar) setLocal(altar.x, altar.y, altar.z, altar.id);
      }
    }
  }

  cinderwatchForCell(cellX, cellZ) {
    const cellSize = 160;
    if (coordinateRandom(cellX, cellZ, this.seed, 73201) < 0.62) return null;
    const originX = cellX * cellSize + 18 + Math.floor(coordinateRandom(cellX, cellZ, this.seed, 73217) * 124);
    const originZ = cellZ * cellSize + 18 + Math.floor(coordinateRandom(cellX, cellZ, this.seed, 73229) * 124);
    const rotation = Math.floor(coordinateRandom(cellX, cellZ, this.seed, 73241) * 4);
    const samples = [[0, 0], [-7, -11], [7, -11], [-7, 9], [7, 9]].map(([ox, oz]) => {
      const rotations = [[ox, oz], [-oz, ox], [-ox, -oz], [oz, -ox]];
      const [rx, rz] = rotations[rotation] || rotations[0];
      return { x: originX + rx, z: originZ + rz };
    });
    if (samples.some((point) => realmAt(point.x, point.z) !== REALM.CINDERREACH)) return null;
    if (Math.hypot(originX - CINDERREACH_ORIGIN.x, originZ - CINDERREACH_ORIGIN.z) < 44) return null;
    const heights = samples.map((point) => this.terrainHeight(point.x, point.z));
    if (Math.max(...heights) - Math.min(...heights) > 7) return null;
    return {
      key: `cinderwatch:${cellX},${cellZ}`,
      cellX,
      cellZ,
      originX,
      originZ,
      ground: Math.max(...heights),
      rotation,
    };
  }

  cinderwatchPoint(watch, ox, oz) {
    const rotations = [[ox, oz], [-oz, ox], [-ox, -oz], [oz, -ox]];
    const [rx, rz] = rotations[watch.rotation] || rotations[0];
    return { x: watch.originX + rx, z: watch.originZ + rz };
  }

  cinderwatchFeatures(watch) {
    const at = (ox, oz, oy = 2) => ({ ...this.cinderwatchPoint(watch, ox, oz), y: watch.ground + oy });
    return {
      entrance: at(0, -9),
      chest: at(0, 5),
      guardianSpawns: [at(-3, -3), at(3, 3)],
      lights: [[-4, -5], [4, -5], [-4, 4], [4, 4]].map(([ox, oz]) => at(ox, oz)),
      altar: [
        { ...at(-1, 6), id: BLOCK.ASHSTONE },
        { ...at(0, 6), id: BLOCK.CINDER_CRYSTAL_ORE },
        { ...at(1, 6), id: BLOCK.ASHSTONE },
      ],
    };
  }

  cinderwatchesNear(x, z, radius = 192) {
    const cellSize = 160;
    const watches = [];
    for (let cellZ = floorDiv(z - radius, cellSize); cellZ <= floorDiv(z + radius, cellSize); cellZ += 1) {
      for (let cellX = floorDiv(x - radius, cellSize); cellX <= floorDiv(x + radius, cellSize); cellX += 1) {
        const watch = this.cinderwatchForCell(cellX, cellZ);
        if (watch && Math.hypot(watch.originX - x, watch.originZ - z) <= radius) watches.push(watch);
      }
    }
    return watches;
  }

  placeRuins(cx, cz, setLocal) {
    const cellSize = 48;
    const minCellX = floorDiv(cx * CHUNK_SIZE - 8, cellSize);
    const maxCellX = floorDiv((cx + 1) * CHUNK_SIZE + 8, cellSize);
    const minCellZ = floorDiv(cz * CHUNK_SIZE - 8, cellSize);
    const maxCellZ = floorDiv((cz + 1) * CHUNK_SIZE + 8, cellSize);
    for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        const ruin = this.ruinForCell(cellX, cellZ);
        if (!ruin) continue;
        const { originX, originZ, ground } = ruin;
        for (let ox = -3; ox <= 3; ox += 1) {
          for (let oz = -3; oz <= 3; oz += 1) {
            const { x: wx, z: wz } = this.ruinPoint(ruin, ox, oz);
            setLocal(wx, ground + 1, wz, coordinateRandom(wx, wz, this.seed, 107) > 0.38 ? BLOCK.MOSSY_STONE : BLOCK.STONE);
            for (let oy = 2; oy <= 4; oy += 1) setLocal(wx, ground + oy, wz, BLOCK.AIR);
            const edge = Math.abs(ox) === 3 || Math.abs(oz) === 3;
            const doorway = oz === -3 && ox === 0;
            if (!edge || doorway) continue;
            const wallHeight = 1 + Math.floor(coordinateRandom(wx, wz, this.seed, 109) * 3);
            for (let oy = 2; oy <= 1 + wallHeight; oy += 1) {
              const id = coordinateRandom(wx, wz + oy, this.seed, 113) > 0.55 ? BLOCK.MOSSY_STONE : BLOCK.STONE;
              setLocal(wx, ground + oy, wz, id);
            }
          }
        }
        for (const ox of [-1, 1]) {
          const pillar = this.ruinPoint(ruin, ox, -3);
          for (let oy = 2; oy <= 4; oy += 1) setLocal(pillar.x, ground + oy, pillar.z, BLOCK.MOSSY_STONE);
        }
        const lintel = this.ruinPoint(ruin, 0, -3);
        setLocal(lintel.x, ground + 4, lintel.z, BLOCK.STONE);
        const features = this.ruinFeatures(ruin);
        setLocal(features.chest.x, features.chest.y, features.chest.z, BLOCK.CHEST);
        setLocal(features.furnace.x, features.furnace.y, features.furnace.z, BLOCK.FURNACE);
        setLocal(features.table.x, features.table.y, features.table.z, BLOCK.CRAFTING_TABLE);
        setLocal(features.lantern.x, features.lantern.y, features.lantern.z, BLOCK.LUMEN_LANTERN);
      }
    }
  }

  placeShadowDens(cx, cz, setLocal) {
    const cellSize = 64;
    const minCellX = floorDiv(cx * CHUNK_SIZE - 4, cellSize);
    const maxCellX = floorDiv((cx + 1) * CHUNK_SIZE + 4, cellSize);
    const minCellZ = floorDiv(cz * CHUNK_SIZE - 4, cellSize);
    const maxCellZ = floorDiv((cz + 1) * CHUNK_SIZE + 4, cellSize);
    for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        const den = this.shadowDenForCell(cellX, cellZ);
        if (!den) continue;
        setLocal(den.x, den.y, den.z, BLOCK.SHADOW_DEN);
        for (const [dx, dz] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
          const x = den.x + dx;
          const z = den.z + dz;
          setLocal(x, this.terrainHeight(x, z) + 1, z, BLOCK.DUSKMUSHROOM);
        }
      }
    }
  }

  placeHearthsteads(cx, cz, setLocal) {
    const cellSize = 112;
    const reach = 12;
    const minCellX = floorDiv(cx * CHUNK_SIZE - reach, cellSize);
    const maxCellX = floorDiv((cx + 1) * CHUNK_SIZE + reach, cellSize);
    const minCellZ = floorDiv(cz * CHUNK_SIZE - reach, cellSize);
    const maxCellZ = floorDiv((cz + 1) * CHUNK_SIZE + reach, cellSize);
    const placeHouse = (stead, centerX, centerZ, entranceZ) => {
      const { ground } = stead;
      for (let ox = -2; ox <= 2; ox += 1) {
        for (let oz = -2; oz <= 2; oz += 1) {
          const x = centerX + ox;
          const z = centerZ + oz;
          setLocal(x, ground + 1, z, BLOCK.PLANKS);
          const edge = Math.abs(ox) === 2 || Math.abs(oz) === 2;
          for (let oy = 2; oy <= 4; oy += 1) setLocal(x, ground + oy, z, edge ? BLOCK.PLANKS : BLOCK.AIR);
          setLocal(x, ground + 5, z, Math.abs(ox) === 2 || Math.abs(oz) === 2 ? BLOCK.WOOD : BLOCK.WOOD_SLAB);
        }
      }
      for (const [ox, oz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
        for (let oy = 2; oy <= 4; oy += 1) setLocal(centerX + ox, ground + oy, centerZ + oz, BLOCK.WOOD);
      }
      const doorZ = centerZ + entranceZ * 2;
      setLocal(centerX, ground + 2, doorZ, BLOCK.DOOR_Z_BOTTOM);
      setLocal(centerX, ground + 3, doorZ, BLOCK.DOOR_Z_TOP);
      setLocal(centerX - 2, ground + 3, centerZ, BLOCK.GLASS);
      setLocal(centerX + 2, ground + 3, centerZ, BLOCK.GLASS);
    };
    for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        const stead = this.hearthsteadForCell(cellX, cellZ);
        if (!stead) continue;
        const { originX, originZ, ground } = stead;
        for (let ox = -9; ox <= 9; ox += 1) {
          for (let oz = -8; oz <= 8; oz += 1) {
            const x = originX + ox;
            const z = originZ + oz;
            const path = Math.abs(ox) <= 1 || Math.abs(oz) <= 1;
            setLocal(x, ground, z, path ? BLOCK.DIRT : BLOCK.GRASS);
            for (let oy = 1; oy <= 6; oy += 1) setLocal(x, ground + oy, z, BLOCK.AIR);
          }
        }
        placeHouse(stead, originX - 5, originZ - 4, 1);
        placeHouse(stead, originX + 5, originZ + 4, -1);
        for (const [dx, dz] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) {
          setLocal(originX + dx, ground + 1, originZ + dz, BLOCK.MOSSY_STONE);
        }
        setLocal(originX, ground + 1, originZ, BLOCK.WATER);
        setLocal(originX, ground + 2, originZ, BLOCK.OAK_FENCE);
        setLocal(originX, ground + 3, originZ, BLOCK.LUMEN_LANTERN);
        const features = this.hearthsteadFeatures(stead);
        setLocal(features.chest.x, features.chest.y, features.chest.z, BLOCK.CHEST);
        setLocal(features.table.x, features.table.y, features.table.z, BLOCK.CRAFTING_TABLE);
        setLocal(features.furnace.x, features.furnace.y, features.furnace.z, BLOCK.FURNACE);
      }
    }
  }

  placeSunstepShrines(cx, cz, setLocal) {
    const cellSize = 176;
    const reach = 9;
    const minCellX = floorDiv(cx * CHUNK_SIZE - reach, cellSize);
    const maxCellX = floorDiv((cx + 1) * CHUNK_SIZE + reach, cellSize);
    const minCellZ = floorDiv(cz * CHUNK_SIZE - reach, cellSize);
    const maxCellZ = floorDiv((cz + 1) * CHUNK_SIZE + reach, cellSize);
    for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        const shrine = this.sunstepShrineForCell(cellX, cellZ);
        if (!shrine) continue;
        const { ground } = shrine;
        for (let ox = -7; ox <= 6; ox += 1) {
          for (let oz = -5; oz <= 5; oz += 1) {
            const point = this.sunstepShrinePoint(shrine, ox, oz);
            setLocal(point.x, ground + 1, point.z, (Math.abs(ox) + Math.abs(oz)) % 9 === 0 ? BLOCK.SHRINE_RUNE : BLOCK.SHRINE_STONE);
            for (let oy = 2; oy <= 6; oy += 1) setLocal(point.x, ground + oy, point.z, BLOCK.AIR);
          }
        }

        // A sealed 5x7 chamber makes the relay-and-Ram sequence the only route to its reward.
        for (let ox = 0; ox <= 5; ox += 1) {
          for (let oz = -3; oz <= 3; oz += 1) {
            const point = this.sunstepShrinePoint(shrine, ox, oz);
            const wall = ox === 0 || ox === 5 || Math.abs(oz) === 3;
            for (let oy = 2; oy <= 4; oy += 1) {
              setLocal(point.x, ground + oy, point.z, wall ? BLOCK.SHRINE_STONE : BLOCK.AIR);
            }
            setLocal(point.x, ground + 5, point.z, (ox + Math.abs(oz)) % 7 === 0 ? BLOCK.SHRINE_RUNE : BLOCK.SHRINE_STONE);
          }
        }
        for (const [ox, oz] of [[0, -3], [0, 3], [5, -3], [5, 3], [-6, -3], [-6, 3]]) {
          const point = this.sunstepShrinePoint(shrine, ox, oz);
          for (let oy = 2; oy <= 4; oy += 1) setLocal(point.x, ground + oy, point.z, oy === 3 ? BLOCK.SHRINE_RUNE : BLOCK.SHRINE_STONE);
        }

        const features = this.sunstepShrineFeatures(shrine);
        setLocal(features.entrance.x, features.entrance.y + 1, features.entrance.z, BLOCK.AIR);
        setLocal(features.keystone.x, features.keystone.y, features.keystone.z, BLOCK.SHRINE_KEYSTONE);
        setLocal(features.destination.x, features.destination.y, features.destination.z, BLOCK.AIR);
        setLocal(features.plate.x, features.plate.y, features.plate.z, BLOCK.TRAIL_PLATE_OFF);
        for (const wire of features.wires) setLocal(wire.x, wire.y, wire.z, BLOCK.SUNWIRE_OFF);
        setLocal(features.relay.x, features.relay.y, features.relay.z, features.relay.id);
        setLocal(features.ram.x, features.ram.y, features.ram.z, features.ram.id);
        setLocal(features.chest.x, features.chest.y, features.chest.z, BLOCK.CHEST);
        setLocal(features.lantern.x, features.lantern.y, features.lantern.z, BLOCK.LUMEN_LANTERN);
      }
    }
  }

  sunstepShrineForCell(cellX, cellZ) {
    const cellSize = 176;
    if (coordinateRandom(cellX, cellZ, this.seed, 811) < 0.72) return null;
    const originX = cellX * cellSize + 24 + Math.floor(coordinateRandom(cellX, cellZ, this.seed, 821) * 128);
    const originZ = cellZ * cellSize + 24 + Math.floor(coordinateRandom(cellX, cellZ, this.seed, 823) * 128);
    const ground = this.terrainHeight(originX, originZ);
    const biome = this.biomeAt(originX, originZ, ground).id;
    if (ground <= SEA_LEVEL + 3 || !['plains', 'desert', 'snowy_highlands'].includes(biome)) return null;
    const samples = [[-7, -5], [7, -5], [-7, 5], [7, 5], [0, 0]].map(([dx, dz]) => this.terrainHeight(originX + dx, originZ + dz));
    if (Math.max(ground, ...samples) - Math.min(ground, ...samples) > 2) return null;
    if (this.ruinsNear(originX - 12, originX + 12, originZ - 10, originZ + 10).length) return null;
    if (this.hearthsteadsNear(originX, originZ, 28).length || this.shadowDensNear(originX, originZ, 18).length) return null;
    return {
      key: `sunstep-shrine:${cellX},${cellZ}`,
      cellX,
      cellZ,
      originX,
      originZ,
      ground,
      biome,
      rotation: Math.floor(coordinateRandom(cellX, cellZ, this.seed, 827) * 4),
    };
  }

  sunstepShrinePoint(shrine, ox, oz) {
    const rotations = [[ox, oz], [-oz, ox], [-ox, -oz], [oz, -ox]];
    const [rx, rz] = rotations[shrine.rotation] || rotations[0];
    return { x: shrine.originX + rx, z: shrine.originZ + rz };
  }

  sunstepShrineFeatures(shrine) {
    const at = (ox, oz, oy = 2) => ({ ...this.sunstepShrinePoint(shrine, ox, oz), y: shrine.ground + oy });
    const relayIds = [BLOCK.SPARK_RELAY_E_OFF, BLOCK.SPARK_RELAY_S_OFF, BLOCK.SPARK_RELAY_W_OFF, BLOCK.SPARK_RELAY_N_OFF];
    const ramIds = [BLOCK.FORGE_RAM_S_OFF, BLOCK.FORGE_RAM_W_OFF, BLOCK.FORGE_RAM_N_OFF, BLOCK.FORGE_RAM_E_OFF];
    const plate = at(-5, -2);
    const wires = [[-4, -2], [-2, -2], [-1, -2], [-1, -1]].map(([ox, oz]) => at(ox, oz));
    const relay = { ...at(-3, -2), id: relayIds[shrine.rotation] };
    const ram = { ...at(0, -1), id: ramIds[shrine.rotation] };
    return {
      plate,
      wires,
      relay,
      ram,
      keystone: at(0, 0),
      destination: at(0, 1),
      entrance: at(0, 0),
      chest: at(3, 0),
      lantern: at(3, -2),
      nodes: [plate, ...wires, relay, ram],
    };
  }

  sunstepShrinesNear(x, z, radius = 112) {
    const cellSize = 176;
    const shrines = [];
    for (let cellZ = floorDiv(z - radius, cellSize); cellZ <= floorDiv(z + radius, cellSize); cellZ += 1) {
      for (let cellX = floorDiv(x - radius, cellSize); cellX <= floorDiv(x + radius, cellSize); cellX += 1) {
        const shrine = this.sunstepShrineForCell(cellX, cellZ);
        if (shrine && Math.hypot(shrine.originX - x, shrine.originZ - z) <= radius) shrines.push(shrine);
      }
    }
    return shrines;
  }

  generatedCircuitNodesNear(x, z, radius = 64) {
    return [
      ...this.sunstepShrinesNear(x, z, radius).flatMap((shrine) => this.sunstepShrineFeatures(shrine).nodes),
      ...this.sunstepGauntletsNear(x, z, radius).flatMap((gauntlet) => this.sunstepGauntletFeatures(gauntlet).nodes),
      ...this.sunstepPulseHallsNear(x, z, radius).flatMap((hall) => this.sunstepPulseHallFeatures(hall).nodes),
    ];
  }

  sunstepShrineSolved(shrine) {
    if (!shrine) return false;
    const features = this.sunstepShrineFeatures(shrine);
    return this.getBlock(features.keystone.x, features.keystone.y, features.keystone.z) === BLOCK.AIR
      && this.getBlock(features.destination.x, features.destination.y, features.destination.z) === BLOCK.SHRINE_KEYSTONE;
  }

  placeSunstepGauntlets(cx, cz, setLocal) {
    const cellSize = 224;
    const reach = 15;
    const minCellX = floorDiv(cx * CHUNK_SIZE - reach, cellSize);
    const maxCellX = floorDiv((cx + 1) * CHUNK_SIZE + reach, cellSize);
    const minCellZ = floorDiv(cz * CHUNK_SIZE - reach, cellSize);
    const maxCellZ = floorDiv((cz + 1) * CHUNK_SIZE + reach, cellSize);
    for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        const gauntlet = this.sunstepGauntletForCell(cellX, cellZ);
        if (!gauntlet) continue;
        const { ground } = gauntlet;

        // A broad approach keeps the exterior timing plate readable and free of terrain clutter.
        for (let ox = -5; ox <= 13; ox += 1) {
          for (let oz = -3; oz <= 3; oz += 1) {
            const point = this.sunstepGauntletPoint(gauntlet, ox, oz);
            setLocal(point.x, ground + 1, point.z, (Math.abs(ox) + Math.abs(oz)) % 8 === 0 ? BLOCK.SHRINE_RUNE : BLOCK.SHRINE_STONE);
            for (let oy = 2; oy <= 6; oy += 1) setLocal(point.x, ground + oy, point.z, BLOCK.AIR);
          }
        }

        // The one-wide central lane prevents either two-block gate from being bypassed.
        for (let ox = 2; ox <= 12; ox += 1) {
          for (let oz = -2; oz <= 2; oz += 1) {
            const point = this.sunstepGauntletPoint(gauntlet, ox, oz);
            const shell = ox === 2 || ox === 12 || Math.abs(oz) === 2;
            for (let oy = 2; oy <= 4; oy += 1) setLocal(point.x, ground + oy, point.z, shell ? BLOCK.SHRINE_STONE : BLOCK.AIR);
            setLocal(point.x, ground + 5, point.z, (ox + Math.abs(oz)) % 6 === 0 ? BLOCK.SHRINE_RUNE : BLOCK.SHRINE_STONE);
          }
        }
        for (const oz of [-1, 0, 1]) {
          const point = this.sunstepGauntletPoint(gauntlet, 9, oz);
          for (let oy = 2; oy <= 4; oy += 1) setLocal(point.x, ground + oy, point.z, BLOCK.SHRINE_STONE);
        }
        for (const [ox, oz] of [[2, -2], [2, 2], [9, -2], [9, 2], [12, -2], [12, 2]]) {
          const point = this.sunstepGauntletPoint(gauntlet, ox, oz);
          setLocal(point.x, ground + 3, point.z, BLOCK.SHRINE_RUNE);
        }

        const features = this.sunstepGauntletFeatures(gauntlet);
        for (const gate of features.gates) {
          setLocal(gate.x, gate.y, gate.z, BLOCK.SUNSTEP_GATE_CLOSED);
          setLocal(gate.x, gate.y + 1, gate.z, BLOCK.AIR);
        }
        for (const plate of features.plates) setLocal(plate.x, plate.y, plate.z, BLOCK.TRAIL_PLATE_OFF);
        for (const wire of features.wires) setLocal(wire.x, wire.y, wire.z, BLOCK.SUNWIRE_OFF);
        for (const relay of features.relays) setLocal(relay.x, relay.y, relay.z, relay.id);
        setLocal(features.chest.x, features.chest.y, features.chest.z, BLOCK.CHEST);
        setLocal(features.lantern.x, features.lantern.y, features.lantern.z, BLOCK.LUMEN_LANTERN);
      }
    }
  }

  sunstepGauntletForCell(cellX, cellZ) {
    const cellSize = 224;
    if (coordinateRandom(cellX, cellZ, this.seed, 863) < 0.8) return null;
    const originX = cellX * cellSize + 28 + Math.floor(coordinateRandom(cellX, cellZ, this.seed, 877) * 168);
    const originZ = cellZ * cellSize + 28 + Math.floor(coordinateRandom(cellX, cellZ, this.seed, 881) * 168);
    const ground = this.terrainHeight(originX, originZ);
    const biome = this.biomeAt(originX, originZ, ground).id;
    if (ground <= SEA_LEVEL + 3 || !['plains', 'desert', 'snowy_highlands'].includes(biome)) return null;
    const samples = [[-6, -4], [14, -4], [-6, 4], [14, 4], [4, 0]].map(([dx, dz]) => this.terrainHeight(originX + dx, originZ + dz));
    if (Math.max(ground, ...samples) - Math.min(ground, ...samples) > 2) return null;
    if (this.ruinsNear(originX - 18, originX + 18, originZ - 10, originZ + 10).length) return null;
    if (this.hearthsteadsNear(originX, originZ, 32).length || this.shadowDensNear(originX, originZ, 20).length) return null;
    if (this.sunstepShrinesNear(originX, originZ, 34).length) return null;
    return {
      key: `sunstep-gauntlet:${cellX},${cellZ}`,
      cellX,
      cellZ,
      originX,
      originZ,
      ground,
      biome,
      rotation: Math.floor(coordinateRandom(cellX, cellZ, this.seed, 883) * 4),
    };
  }

  sunstepGauntletPoint(gauntlet, ox, oz) {
    const rotations = [[ox, oz], [-oz, ox], [-ox, -oz], [oz, -ox]];
    const [rx, rz] = rotations[gauntlet.rotation] || rotations[0];
    return { x: gauntlet.originX + rx, z: gauntlet.originZ + rz };
  }

  sunstepGauntletFeatures(gauntlet) {
    const at = (ox, oz, oy = 2) => ({ ...this.sunstepGauntletPoint(gauntlet, ox, oz), y: gauntlet.ground + oy });
    const relayAIds = [BLOCK.SPARK_RELAY_E_OFF, BLOCK.SPARK_RELAY_S_OFF, BLOCK.SPARK_RELAY_W_OFF, BLOCK.SPARK_RELAY_N_OFF];
    const plateA = at(-3, 0);
    const relayA = { ...at(-1, 0), id: relayAIds[gauntlet.rotation], delayIndex: 3 };
    const plateB = at(5, 0);
    const relayB = { ...at(7, 1), id: relayAIds[gauntlet.rotation], delayIndex: 1 };
    const exteriorWires = [[-2, 0], [0, 0], [1, 0]].map(([ox, oz]) => at(ox, oz));
    const interiorWires = [[3, 0], [4, 0], [5, 1], [6, 1], [8, 1], [8, 0]].map(([ox, oz]) => at(ox, oz));
    return {
      plates: [plateA, plateB],
      relays: [relayA, relayB],
      wires: [...exteriorWires, ...interiorWires],
      gates: [at(2, 0), at(9, 0)],
      chest: at(11, 0),
      lantern: at(11, 1, 3),
      nodes: [plateA, ...exteriorWires, relayA, plateB, ...interiorWires, relayB, at(2, 0), at(9, 0)],
    };
  }

  sunstepGauntletsNear(x, z, radius = 128) {
    const cellSize = 224;
    const gauntlets = [];
    for (let cellZ = floorDiv(z - radius, cellSize); cellZ <= floorDiv(z + radius, cellSize); cellZ += 1) {
      for (let cellX = floorDiv(x - radius, cellSize); cellX <= floorDiv(x + radius, cellSize); cellX += 1) {
        const gauntlet = this.sunstepGauntletForCell(cellX, cellZ);
        if (gauntlet && Math.hypot(gauntlet.originX - x, gauntlet.originZ - z) <= radius) gauntlets.push(gauntlet);
      }
    }
    return gauntlets;
  }

  sunstepGauntletOpen(gauntlet) {
    if (!gauntlet) return [false, false];
    return this.sunstepGauntletFeatures(gauntlet).gates.map((gate) => this.getBlock(gate.x, gate.y, gate.z) === BLOCK.SUNSTEP_GATE_OPEN);
  }

  placeSunstepPulseHalls(cx, cz, setLocal) {
    const cellSize = 256;
    const reach = 17;
    const minCellX = floorDiv(cx * CHUNK_SIZE - reach, cellSize);
    const maxCellX = floorDiv((cx + 1) * CHUNK_SIZE + reach, cellSize);
    const minCellZ = floorDiv(cz * CHUNK_SIZE - reach, cellSize);
    const maxCellZ = floorDiv((cz + 1) * CHUNK_SIZE + reach, cellSize);
    for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        const hall = this.sunstepPulseHallForCell(cellX, cellZ);
        if (!hall) continue;
        const { ground } = hall;
        for (let ox = -3; ox <= 15; ox += 1) {
          for (let oz = -3; oz <= 3; oz += 1) {
            const point = this.sunstepPulseHallPoint(hall, ox, oz);
            setLocal(point.x, ground + 1, point.z, (ox + Math.abs(oz)) % 7 === 0 ? BLOCK.SHRINE_RUNE : BLOCK.SHRINE_STONE);
            for (let oy = 2; oy <= 6; oy += 1) setLocal(point.x, ground + oy, point.z, BLOCK.AIR);
          }
        }
        for (let ox = 0; ox <= 14; ox += 1) {
          for (let oz = -2; oz <= 2; oz += 1) {
            const point = this.sunstepPulseHallPoint(hall, ox, oz);
            const shell = ox === 0 || ox === 14 || Math.abs(oz) === 2;
            for (let oy = 2; oy <= 4; oy += 1) setLocal(point.x, ground + oy, point.z, shell ? BLOCK.SHRINE_STONE : BLOCK.AIR);
            setLocal(point.x, ground + 5, point.z, (ox * 3 + Math.abs(oz)) % 8 === 0 ? BLOCK.SHRINE_RUNE : BLOCK.SHRINE_STONE);
          }
        }
        for (const gateX of [3, 7, 11]) {
          for (const oz of [-1, 0, 1]) {
            const point = this.sunstepPulseHallPoint(hall, gateX, oz);
            for (let oy = 2; oy <= 4; oy += 1) setLocal(point.x, ground + oy, point.z, BLOCK.SHRINE_STONE);
          }
        }
        const features = this.sunstepPulseHallFeatures(hall);
        for (const gate of features.gates) {
          setLocal(gate.x, gate.y, gate.z, BLOCK.SUNSTEP_GATE_CLOSED);
          setLocal(gate.x, gate.y + 1, gate.z, BLOCK.AIR);
        }
        for (const plate of features.plates) setLocal(plate.x, plate.y, plate.z, BLOCK.TRAIL_PLATE_OFF);
        for (const wire of features.wires) setLocal(wire.x, wire.y, wire.z, BLOCK.SUNWIRE_OFF);
        for (const sequencer of features.sequencers) setLocal(sequencer.x, sequencer.y, sequencer.z, sequencer.id);
        setLocal(features.chest.x, features.chest.y, features.chest.z, BLOCK.CHEST);
        setLocal(features.lantern.x, features.lantern.y, features.lantern.z, BLOCK.LUMEN_LANTERN);
      }
    }
  }

  sunstepPulseHallForCell(cellX, cellZ) {
    const cellSize = 256;
    if (coordinateRandom(cellX, cellZ, this.seed, 911) < 0.83) return null;
    const originX = cellX * cellSize + 30 + Math.floor(coordinateRandom(cellX, cellZ, this.seed, 919) * 196);
    const originZ = cellZ * cellSize + 30 + Math.floor(coordinateRandom(cellX, cellZ, this.seed, 929) * 196);
    const ground = this.terrainHeight(originX, originZ);
    const biome = this.biomeAt(originX, originZ, ground).id;
    if (ground <= SEA_LEVEL + 3 || !['plains', 'desert', 'snowy_highlands'].includes(biome)) return null;
    const samples = [[-4, -4], [16, -4], [-4, 4], [16, 4], [7, 0]].map(([dx, dz]) => this.terrainHeight(originX + dx, originZ + dz));
    if (Math.max(ground, ...samples) - Math.min(ground, ...samples) > 2) return null;
    if (this.ruinsNear(originX - 20, originX + 20, originZ - 10, originZ + 10).length) return null;
    if (this.hearthsteadsNear(originX, originZ, 34).length || this.shadowDensNear(originX, originZ, 22).length) return null;
    if (this.sunstepShrinesNear(originX, originZ, 36).length || this.sunstepGauntletsNear(originX, originZ, 38).length) return null;
    return {
      key: `sunstep-pulse-hall:${cellX},${cellZ}`,
      cellX,
      cellZ,
      originX,
      originZ,
      ground,
      biome,
      rotation: Math.floor(coordinateRandom(cellX, cellZ, this.seed, 937) * 4),
    };
  }

  sunstepPulseHallPoint(hall, ox, oz) {
    const rotations = [[ox, oz], [-oz, ox], [-ox, -oz], [oz, -ox]];
    const [rx, rz] = rotations[hall.rotation] || rotations[0];
    return { x: hall.originX + rx, z: hall.originZ + rz };
  }

  sunstepPulseHallFeatures(hall) {
    const at = (ox, oz, oy = 2) => ({ ...this.sunstepPulseHallPoint(hall, ox, oz), y: hall.ground + oy });
    const sequencerIds = [BLOCK.PULSE_SEQUENCER_E_OFF, BLOCK.PULSE_SEQUENCER_S_OFF, BLOCK.PULSE_SEQUENCER_W_OFF, BLOCK.PULSE_SEQUENCER_N_OFF];
    const plates = [];
    const sequencers = [];
    const wires = [];
    const gates = [];
    for (let stage = 0; stage < 3; stage += 1) {
      const baseX = 1 + stage * 4;
      plates.push(at(baseX, 0));
      wires.push(at(baseX, 1), at(baseX + 2, 1));
      sequencers.push({ ...at(baseX + 1, 1), id: sequencerIds[hall.rotation], pulseCount: 3 });
      gates.push(at(baseX + 2, 0));
    }
    return {
      plates,
      sequencers,
      wires,
      gates,
      chest: at(13, 0),
      lantern: at(13, 1, 3),
      nodes: [...plates, ...sequencers, ...wires, ...gates],
    };
  }

  sunstepPulseHallsNear(x, z, radius = 144) {
    const cellSize = 256;
    const halls = [];
    for (let cellZ = floorDiv(z - radius, cellSize); cellZ <= floorDiv(z + radius, cellSize); cellZ += 1) {
      for (let cellX = floorDiv(x - radius, cellSize); cellX <= floorDiv(x + radius, cellSize); cellX += 1) {
        const hall = this.sunstepPulseHallForCell(cellX, cellZ);
        if (hall && Math.hypot(hall.originX - x, hall.originZ - z) <= radius) halls.push(hall);
      }
    }
    return halls;
  }

  sunstepPulseHallOpen(hall) {
    if (!hall) return [false, false, false];
    return this.sunstepPulseHallFeatures(hall).gates.map((gate) => this.getBlock(gate.x, gate.y, gate.z) === BLOCK.SUNSTEP_GATE_OPEN);
  }

  placeEchoVaults(cx, cz, setLocal) {
    const cellSize = 144;
    const reach = 12;
    const minCellX = floorDiv(cx * CHUNK_SIZE - reach, cellSize);
    const maxCellX = floorDiv((cx + 1) * CHUNK_SIZE + reach, cellSize);
    const minCellZ = floorDiv(cz * CHUNK_SIZE - reach, cellSize);
    const maxCellZ = floorDiv((cz + 1) * CHUNK_SIZE + reach, cellSize);
    for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        const vault = this.echoVaultForCell(cellX, cellZ);
        if (!vault) continue;
        const { ground, y, variant } = vault;
        for (let ox = -6; ox <= 6; ox += 1) {
          for (let oz = -8; oz <= 8; oz += 1) {
            const point = this.echoVaultPoint(vault, ox, oz);
            const edge = Math.abs(ox) === 6 || Math.abs(oz) === 8;
            setLocal(point.x, y, point.z, (ox + oz + variant) % 7 === 0 ? BLOCK.ECHO_RUNE : BLOCK.ECHO_BRICK);
            for (let oy = 1; oy <= 3; oy += 1) setLocal(point.x, y + oy, point.z, edge ? BLOCK.ECHO_BRICK : BLOCK.AIR);
            setLocal(point.x, y + 4, point.z, (Math.abs(ox) + Math.abs(oz) + variant) % 11 === 0 ? BLOCK.ECHO_RUNE : BLOCK.ECHO_BRICK);
          }
        }

        // A deterministic room grammar changes the route without changing the vault's key locations.
        const partitions = variant === 0
          ? [[-3, -2, -3, 3], [3, -2, 3, 3]]
          : variant === 1
            ? [[-5, 0, -1, 0], [1, 0, 5, 0]]
            : [[-5, -2, -1, -2], [1, 2, 5, 2]];
        for (const [x0, z0, x1, z1] of partitions) {
          const length = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
          for (let step = 0; step <= length; step += 1) {
            const ox = Math.round(x0 + (x1 - x0) * (length ? step / length : 0));
            const oz = Math.round(z0 + (z1 - z0) * (length ? step / length : 0));
            if ((Math.abs(ox) + Math.abs(oz)) % 5 === 0) continue;
            const point = this.echoVaultPoint(vault, ox, oz);
            setLocal(point.x, y + 1, point.z, BLOCK.ECHO_BRICK);
            setLocal(point.x, y + 2, point.z, BLOCK.ECHO_BRICK);
          }
        }

        // The treasure wing is a real sealed room; only the 3x2 resonance doorway can open it.
        for (let ox = -5; ox <= 5; ox += 1) {
          for (let oy = 1; oy <= 3; oy += 1) {
            const point = this.echoVaultPoint(vault, ox, 4);
            setLocal(point.x, y + oy, point.z, BLOCK.ECHO_BRICK);
          }
        }

        for (const [ox, oz] of [[-4, -5], [4, -5], [-4, 4], [4, 4]]) {
          const point = this.echoVaultPoint(vault, ox, oz);
          for (let oy = 1; oy <= 3; oy += 1) setLocal(point.x, y + oy, point.z, oy === 2 ? BLOCK.ECHO_RUNE : BLOCK.ECHO_BRICK);
        }

        const features = this.echoVaultFeatures(vault);
        setLocal(features.chest.x, features.chest.y, features.chest.z, BLOCK.CHEST);
        setLocal(features.trap.x, features.trap.y, features.trap.z, BLOCK.ECHO_SPIKES_ARMED);
        for (const seal of features.seal) setLocal(seal.x, seal.y, seal.z, BLOCK.VAULT_SEAL);

        // The resonance well is both a visible landmark and a swimmable route back to the surface.
        const entry = features.entry;
        for (let shaftY = y + 1; shaftY <= ground + 1; shaftY += 1) setLocal(entry.x, shaftY, entry.z, BLOCK.WATER);
        for (let ox = -2; ox <= 2; ox += 1) {
          for (let oz = -2; oz <= 2; oz += 1) {
            const point = this.echoVaultPoint(vault, ox, oz - 7);
            if (Math.abs(ox) === 2 || Math.abs(oz) === 2) {
              setLocal(point.x, ground + 1, point.z, (ox === 0 || oz === 0) ? BLOCK.ECHO_RUNE : BLOCK.ECHO_BRICK);
            } else if (ox !== 0 || oz !== 0) {
              for (let clearY = ground + 1; clearY <= ground + 3; clearY += 1) setLocal(point.x, clearY, point.z, BLOCK.AIR);
            }
          }
        }
      }
    }
  }

  echoVaultForCell(cellX, cellZ) {
    const cellSize = 144;
    if (coordinateRandom(cellX, cellZ, this.seed, 701) < 0.68) return null;
    const originX = cellX * cellSize + 20 + Math.floor(coordinateRandom(cellX, cellZ, this.seed, 709) * 104);
    const originZ = cellZ * cellSize + 20 + Math.floor(coordinateRandom(cellX, cellZ, this.seed, 719) * 104);
    if (realmAt(originX, originZ) !== REALM.OVERWORLD) return null;
    const ground = this.terrainHeight(originX, originZ);
    if (ground <= SEA_LEVEL + 4) return null;
    const surfaceSamples = [[-2, -9], [2, -9], [-2, -5], [2, -5]].map(([dx, dz]) => this.terrainHeight(originX + dx, originZ + dz));
    if (Math.max(ground, ...surfaceSamples) - Math.min(ground, ...surfaceSamples) > 3) return null;
    const burialDepth = 72 + Math.floor(coordinateRandom(cellX, cellZ, this.seed, 723) * 38);
    return {
      key: `echo-vault:${cellX},${cellZ}`,
      cellX,
      cellZ,
      originX,
      originZ,
      ground,
      y: Math.max(WORLD_MIN_Y + 18, ground - burialDepth),
      rotation: Math.floor(coordinateRandom(cellX, cellZ, this.seed, 727) * 4),
      variant: Math.floor(coordinateRandom(cellX, cellZ, this.seed, 733) * 3),
    };
  }

  echoVaultPoint(vault, ox, oz) {
    const rotations = [[ox, oz], [-oz, ox], [-ox, -oz], [oz, -ox]];
    const [rx, rz] = rotations[vault.rotation] || rotations[0];
    return { x: vault.originX + rx, z: vault.originZ + rz };
  }

  echoVaultFeatures(vault) {
    const at = (ox, oz, oy = 1) => ({ ...this.echoVaultPoint(vault, ox, oz), y: vault.y + oy });
    const seal = [];
    for (const ox of [-1, 0, 1]) for (const oy of [1, 2]) seal.push(at(ox, 4, oy));
    return {
      entry: { ...this.echoVaultPoint(vault, 0, -7), y: vault.ground + 1 },
      trap: at(0, -1),
      guardian: { ...at(0, 2), x: at(0, 2).x + 0.5, z: at(0, 2).z + 0.5 },
      chest: at(0, 6),
      seal,
      lights: [[-4, -5], [4, -5], [-4, 4], [4, 4]].map(([ox, oz]) => at(ox, oz, 2)),
    };
  }

  echoVaultsNear(x, z, radius = 96) {
    const cellSize = 144;
    const vaults = [];
    for (let cellZ = floorDiv(z - radius, cellSize); cellZ <= floorDiv(z + radius, cellSize); cellZ += 1) {
      for (let cellX = floorDiv(x - radius, cellSize); cellX <= floorDiv(x + radius, cellSize); cellX += 1) {
        const vault = this.echoVaultForCell(cellX, cellZ);
        if (vault && Math.hypot(vault.originX - x, vault.originZ - z) <= radius) vaults.push(vault);
      }
    }
    return vaults;
  }

  hearthsteadForCell(cellX, cellZ) {
    const cellSize = 112;
    if (coordinateRandom(cellX, cellZ, this.seed, 401) < 0.76) return null;
    const originX = cellX * cellSize + 16 + Math.floor(coordinateRandom(cellX, cellZ, this.seed, 409) * 80);
    const originZ = cellZ * cellSize + 16 + Math.floor(coordinateRandom(cellX, cellZ, this.seed, 419) * 80);
    const ground = this.terrainHeight(originX, originZ);
    const biome = this.biomeAt(originX, originZ, ground).id;
    if (ground <= SEA_LEVEL + 2 || !['plains', 'forest'].includes(biome)) return null;
    const heights = [[-9, -8], [9, -8], [-9, 8], [9, 8], [0, -8], [0, 8]].map(([dx, dz]) => this.terrainHeight(originX + dx, originZ + dz));
    if (Math.max(ground, ...heights) - Math.min(ground, ...heights) > 1) return null;
    if (this.ruinsNear(originX - 14, originX + 14, originZ - 14, originZ + 14).length) return null;
    if (this.shadowDensNear(originX, originZ, 18).length) return null;
    return { key: `hearthstead:${cellX},${cellZ}`, cellX, cellZ, originX, originZ, ground, biome };
  }

  hearthsteadFeatures(stead) {
    return {
      trader: { x: stead.originX + 2.5, y: stead.ground + 1, z: stead.originZ - 1.5 },
      home: { x: stead.originX - 5, y: stead.ground + 1, z: stead.originZ - 2 },
      workshop: { x: stead.originX + 5, y: stead.ground + 1, z: stead.originZ + 2 },
      railYard: { x: stead.originX + 8, y: stead.ground + 1, z: stead.originZ - 1 },
      garden: { x: stead.originX - 8, y: stead.ground + 1, z: stead.originZ + 1 },
      chest: { x: stead.originX - 6, y: stead.ground + 2, z: stead.originZ - 4 },
      table: { x: stead.originX + 4, y: stead.ground + 2, z: stead.originZ + 4 },
      furnace: { x: stead.originX + 6, y: stead.ground + 2, z: stead.originZ + 4 },
      lantern: { x: stead.originX, y: stead.ground + 3, z: stead.originZ },
    };
  }

  hearthsteadsNear(x, z, radius = 72) {
    const cellSize = 112;
    const steads = [];
    for (let cellZ = floorDiv(z - radius, cellSize); cellZ <= floorDiv(z + radius, cellSize); cellZ += 1) {
      for (let cellX = floorDiv(x - radius, cellSize); cellX <= floorDiv(x + radius, cellSize); cellX += 1) {
        const stead = this.hearthsteadForCell(cellX, cellZ);
        if (stead && Math.hypot(stead.originX - x, stead.originZ - z) <= radius) steads.push(stead);
      }
    }
    return steads;
  }

  shadowDenForCell(cellX, cellZ) {
    const cellSize = 64;
    if (coordinateRandom(cellX, cellZ, this.seed, 307) < 0.68) return null;
    const x = cellX * cellSize + 8 + Math.floor(coordinateRandom(cellX, cellZ, this.seed, 311) * 48);
    const z = cellZ * cellSize + 8 + Math.floor(coordinateRandom(cellX, cellZ, this.seed, 313) * 48);
    const ground = this.terrainHeight(x, z);
    const biome = this.biomeAt(x, z, ground).id;
    if (ground <= SEA_LEVEL + 1 || !['plains', 'forest'].includes(biome)) return null;
    const heights = [[-2, 0], [2, 0], [0, -2], [0, 2]].map(([dx, dz]) => this.terrainHeight(x + dx, z + dz));
    if (Math.max(ground, ...heights) - Math.min(ground, ...heights) > 1) return null;
    if ([[0, 0], [-2, 0], [2, 0], [0, -2], [0, 2]].some(([dx, dz]) => this.shouldGrowTree(x + dx, z + dz))) return null;
    if (this.ruinsNear(x - 8, x + 8, z - 8, z + 8).length) return null;
    return { key: `shadow-den:${cellX},${cellZ}`, cellX, cellZ, x, y: ground + 1, z, ground, biome };
  }

  shadowDensNear(x, z, radius = 40) {
    const cellSize = 64;
    const dens = [];
    for (let cellZ = floorDiv(z - radius, cellSize); cellZ <= floorDiv(z + radius, cellSize); cellZ += 1) {
      for (let cellX = floorDiv(x - radius, cellSize); cellX <= floorDiv(x + radius, cellSize); cellX += 1) {
        const den = this.shadowDenForCell(cellX, cellZ);
        if (den && Math.hypot(den.x - x, den.z - z) <= radius) dens.push(den);
      }
    }
    return dens;
  }

  ruinForCell(cellX, cellZ) {
    const cellSize = 48;
    if (coordinateRandom(cellX, cellZ, this.seed, 97) < 0.76) return null;
    const originX = cellX * cellSize + 7 + Math.floor(coordinateRandom(cellX, cellZ, this.seed, 101) * 34);
    const originZ = cellZ * cellSize + 7 + Math.floor(coordinateRandom(cellX, cellZ, this.seed, 103) * 34);
    if (realmAt(originX, originZ) !== REALM.OVERWORLD) return null;
    const ground = this.terrainHeight(originX, originZ);
    if (ground <= SEA_LEVEL + 1) return null;
    const corners = [
      this.terrainHeight(originX - 3, originZ - 3), this.terrainHeight(originX + 3, originZ - 3),
      this.terrainHeight(originX - 3, originZ + 3), this.terrainHeight(originX + 3, originZ + 3),
    ];
    if (Math.max(...corners) - Math.min(...corners) > 2) return null;
    return {
      key: `trailforge:${cellX},${cellZ}`,
      cellX,
      cellZ,
      originX,
      originZ,
      ground,
      rotation: Math.floor(coordinateRandom(cellX, cellZ, this.seed, 127) * 4),
    };
  }

  ruinPoint(ruin, ox, oz) {
    const rotations = [[ox, oz], [-oz, ox], [-ox, -oz], [oz, -ox]];
    const [rx, rz] = rotations[ruin.rotation] || rotations[0];
    return { x: ruin.originX + rx, z: ruin.originZ + rz };
  }

  ruinFeatures(ruin) {
    const feature = (ox, oz) => ({ ...this.ruinPoint(ruin, ox, oz), y: ruin.ground + 2 });
    return {
      chest: feature(2, 2),
      furnace: feature(-2, 1),
      table: feature(-2, -1),
      lantern: feature(0, 2),
    };
  }

  ruinsNear(minX, maxX, minZ, maxZ) {
    const cellSize = 48;
    const ruins = [];
    for (let cellZ = floorDiv(minZ - 8, cellSize); cellZ <= floorDiv(maxZ + 8, cellSize); cellZ += 1) {
      for (let cellX = floorDiv(minX - 8, cellSize); cellX <= floorDiv(maxX + 8, cellSize); cellX += 1) {
        const ruin = this.ruinForCell(cellX, cellZ);
        if (ruin && ruin.originX + 4 >= minX && ruin.originX - 4 <= maxX && ruin.originZ + 4 >= minZ && ruin.originZ - 4 <= maxZ) ruins.push(ruin);
      }
    }
    return ruins;
  }

  generatedContainerLoot(x, y, z) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    for (const watch of this.cinderwatchesNear(x, z, 28)) {
      const chest = this.cinderwatchFeatures(watch).chest;
      if (chest.x !== x || chest.y !== y || chest.z !== z) continue;
      const items = [
        { id: 'cinder_shard', count: 3 + Math.floor(coordinateRandom(watch.cellX, watch.cellZ, this.seed, 73259) * 4) },
        { id: 'ashscale', count: 2 + Math.floor(coordinateRandom(watch.cellX, watch.cellZ, this.seed, 73271) * 3) },
        { id: 'ember_gland', count: 1 },
        { id: 'emberbulb_cutting', count: 1 + Math.floor(coordinateRandom(watch.cellX, watch.cellZ, this.seed, 73253) * 2) },
        { id: 'songstone_cinder', count: 1 },
      ];
      if (coordinateRandom(watch.cellX, watch.cellZ, this.seed, 73277) > 0.35) items.push({ id: 'emberite_ingot', count: 1 });
      if (coordinateRandom(watch.cellX, watch.cellZ, this.seed, 73291) > 0.7) items.push({ id: 'voidglass_shard', count: 1 });
      return { key: watch.key, items };
    }
    for (const ruin of this.ruinsNear(x - 1, x + 1, z - 1, z + 1)) {
      const chest = this.ruinFeatures(ruin).chest;
      if (chest.x !== x || chest.y !== y || chest.z !== z) continue;
      const iron = 1 + Math.floor(coordinateRandom(ruin.cellX, ruin.cellZ, this.seed, 131) * 3);
      const coal = 2 + Math.floor(coordinateRandom(ruin.cellX, ruin.cellZ, this.seed, 137) * 5);
      const items = [{ id: 'iron_ingot', count: iron }, { id: 'coal', count: coal }];
      items.push({ id: 'songstone_trail', count: 1 });
      if (coordinateRandom(ruin.cellX, ruin.cellZ, this.seed, 139) > 0.38) items.push({ id: 'bread', count: 1 });
      if (coordinateRandom(ruin.cellX, ruin.cellZ, this.seed, 149) > 0.74) items.push({ id: 'lumen_shard', count: 1 });
      return { key: ruin.key, items };
    }
    for (const stead of this.hearthsteadsNear(x, z, 24)) {
      const chest = this.hearthsteadFeatures(stead).chest;
      if (chest.x !== x || chest.y !== y || chest.z !== z) continue;
      const items = [
        { id: 'bread', count: 2 + Math.floor(coordinateRandom(stead.cellX, stead.cellZ, this.seed, 431) * 3) },
        { id: 'wheat_seeds', count: 3 + Math.floor(coordinateRandom(stead.cellX, stead.cellZ, this.seed, 433) * 4) },
      ];
      if (coordinateRandom(stead.cellX, stead.cellZ, this.seed, 439) > 0.48) items.push({ id: 'amberroot', count: 1 });
      return { key: stead.key, items };
    }
    for (const shrine of this.sunstepShrinesNear(x, z, 24)) {
      const chest = this.sunstepShrineFeatures(shrine).chest;
      if (chest.x !== x || chest.y !== y || chest.z !== z) continue;
      const items = [
        { id: BLOCK.SUNWIRE_OFF, count: 4 + Math.floor(coordinateRandom(shrine.cellX, shrine.cellZ, this.seed, 839) * 5) },
        { id: 'iron_ingot', count: 2 + Math.floor(coordinateRandom(shrine.cellX, shrine.cellZ, this.seed, 853) * 3) },
        { id: 'spark_relay', count: 1 },
      ];
      if (coordinateRandom(shrine.cellX, shrine.cellZ, this.seed, 857) > 0.48) items.push({ id: 'emberite_ingot', count: 1 });
      return { key: shrine.key, items };
    }
    for (const gauntlet of this.sunstepGauntletsNear(x, z, 28)) {
      const chest = this.sunstepGauntletFeatures(gauntlet).chest;
      if (chest.x !== x || chest.y !== y || chest.z !== z) continue;
      const items = [
        { id: 'forge_ram', count: 1 },
        { id: 'sun_eye', count: 1 },
        { id: 'iron_ingot', count: 3 + Math.floor(coordinateRandom(gauntlet.cellX, gauntlet.cellZ, this.seed, 887) * 4) },
      ];
      if (coordinateRandom(gauntlet.cellX, gauntlet.cellZ, this.seed, 907) > 0.4) items.push({ id: 'emberite_ingot', count: 1 });
      return { key: gauntlet.key, items };
    }
    for (const hall of this.sunstepPulseHallsNear(x, z, 30)) {
      const chest = this.sunstepPulseHallFeatures(hall).chest;
      if (chest.x !== x || chest.y !== y || chest.z !== z) continue;
      const items = [
        { id: 'pulse_sequencer', count: 1 },
        { id: BLOCK.SUNWIRE_OFF, count: 6 + Math.floor(coordinateRandom(hall.cellX, hall.cellZ, this.seed, 941) * 5) },
        { id: 'lumen_shard', count: 2 + Math.floor(coordinateRandom(hall.cellX, hall.cellZ, this.seed, 947) * 3) },
        { id: 'songstone_sun', count: 1 },
      ];
      if (coordinateRandom(hall.cellX, hall.cellZ, this.seed, 953) > 0.48) items.push({ id: 'voidglass_shard', count: 1 });
      return { key: hall.key, items };
    }
    for (const vault of this.echoVaultsNear(x, z, 24)) {
      const chest = this.echoVaultFeatures(vault).chest;
      if (chest.x !== x || chest.y !== y || chest.z !== z) continue;
      const items = [
        { id: 'iron_ingot', count: 2 + Math.floor(coordinateRandom(vault.cellX, vault.cellZ, this.seed, 743) * 4) },
        { id: 'lumen_shard', count: 2 + Math.floor(coordinateRandom(vault.cellX, vault.cellZ, this.seed, 751) * 3) },
        { id: 'bread', count: 1 + Math.floor(coordinateRandom(vault.cellX, vault.cellZ, this.seed, 757) * 2) },
        { id: 'songstone_hollow', count: 1 },
      ];
      if (coordinateRandom(vault.cellX, vault.cellZ, this.seed, 761) > 0.42) items.push({ id: 'voidglass_shard', count: 1 });
      return { key: vault.key, items };
    }
    return null;
  }

  generatedLightsNear(x, z, radius) {
    const positions = this.ruinsNear(x - radius, x + radius, z - radius, z + radius).map((ruin) => this.ruinFeatures(ruin).lantern);
    for (const watch of this.cinderwatchesNear(x, z, radius)) positions.push(...this.cinderwatchFeatures(watch).lights);
    positions.push(...this.hearthsteadsNear(x, z, radius).map((stead) => this.hearthsteadFeatures(stead).lantern));
    positions.push(...this.sunstepShrinesNear(x, z, radius).map((shrine) => this.sunstepShrineFeatures(shrine).lantern));
    positions.push(...this.sunstepGauntletsNear(x, z, radius).map((gauntlet) => this.sunstepGauntletFeatures(gauntlet).lantern));
    positions.push(...this.sunstepPulseHallsNear(x, z, radius).map((hall) => this.sunstepPulseHallFeatures(hall).lantern));
    for (const vault of this.echoVaultsNear(x, z, radius)) positions.push(...this.echoVaultFeatures(vault).lights);
    for (const lights of this.generatedCaveLights.values()) {
      for (const position of lights) {
        if (Math.abs(position.x - x) <= radius && Math.abs(position.z - z) <= radius) positions.push(position);
      }
    }
    positions.sort((a, b) => (a.x - x) ** 2 + (a.z - z) ** 2 - ((b.x - x) ** 2 + (b.z - z) ** 2));
    return positions.slice(0, 16);
  }

  getChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    if (!this.chunks.has(key)) this.chunks.set(key, this.generateChunk(cx, cz));
    return this.chunks.get(key);
  }

  getBlock(x, y, z) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (y < WORLD_MIN_Y) return BLOCK.STONE;
    if (y >= WORLD_HEIGHT) return BLOCK.AIR;
    const cx = floorDiv(x, CHUNK_SIZE);
    const cz = floorDiv(z, CHUNK_SIZE);
    const data = this.getChunk(cx, cz);
    return data[chunkVoxelIndex(mod(x, CHUNK_SIZE), y, mod(z, CHUNK_SIZE))];
  }

  lightFieldAt(x, z) {
    return this.lightFields.get(chunkKey(floorDiv(Math.floor(x), CHUNK_SIZE), floorDiv(Math.floor(z), CHUNK_SIZE))) || null;
  }

  skyLightAt(x, y, z) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    const field = this.lightFieldAt(x, z);
    if (field) return field.skyLevelAt(x, y, z);
    for (let aboveY = Math.max(WORLD_MIN_Y, y); aboveY < WORLD_HEIGHT; aboveY += 1) {
      const definition = BLOCKS[this.getBlock(x, aboveY, z)];
      if (definition?.solid && !definition.transparent && !definition.lightPasses) return 0;
    }
    return MAX_LIGHT;
  }

  blockLightAt(x, y, z) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    const field = this.lightFieldAt(x, z);
    if (field) return field.blockLevelAt(x, y, z);
    let level = 0;
    for (const [key, id] of this.edits) {
      const emitted = emittedLightLevel(id);
      if (!emitted) continue;
      const [lx, ly, lz] = key.split(',').map(Number);
      level = Math.max(level, emitted - Math.abs(lx - x) - Math.abs(ly - y) - Math.abs(lz - z));
    }
    return Math.max(0, level);
  }

  lightLevelAt(x, y, z, daylight = 1) {
    const sky = Math.round(this.skyLightAt(x, y, z) * Math.max(0, Math.min(1, Number(daylight) || 0)));
    return Math.max(sky, this.blockLightAt(x, y, z));
  }

  isSolid(x, y, z) {
    return Boolean(BLOCKS[this.getBlock(x, y, z)]?.solid);
  }

  collisionHeight(x, y, z) {
    return this.collisionBoxes(x, y, z).reduce((height, box) => Math.max(height, box[4]), 0);
  }

  collisionBoxes(x, y, z) {
    const definition = BLOCKS[this.getBlock(x, y, z)];
    if (!definition?.solid) return [];
    if (definition.model === 'slab') return [[0, 0, 0, 1, 0.5, 1]];
    if (definition.bed) return [[0, 0, 0, 1, 0.5, 1]];
    if (definition.model?.startsWith('trap')) {
      if (definition.model.startsWith('trapClosed')) return [[0, 0, 0, 1, 0.1875, 1]];
      if (definition.model.endsWith('N')) return [[0, 0, 0, 1, 1, 0.1875]];
      if (definition.model.endsWith('S')) return [[0, 0, 0.8125, 1, 1, 1]];
      if (definition.model.endsWith('E')) return [[0.8125, 0, 0, 1, 1, 1]];
      return [[0, 0, 0, 0.1875, 1, 1]];
    }
    if (definition.model?.startsWith('stair')) {
      const upper = definition.model.endsWith('N') ? [0, 0.5, 0, 1, 1, 0.5]
        : definition.model.endsWith('S') ? [0, 0.5, 0.5, 1, 1, 1]
          : definition.model.endsWith('E') ? [0.5, 0.5, 0, 1, 1, 1]
            : [0, 0.5, 0, 0.5, 1, 1];
      return [[0, 0, 0, 1, 0.5, 1], upper];
    }
    if (definition.model === 'panelX') return [[0.44, 0, 0, 0.56, 1, 1]];
    if (definition.model === 'panelZ') return [[0, 0, 0.44, 1, 1, 0.56]];
    if (definition.model === 'charterPost') return [[0.34, 0, 0.34, 0.66, 1.35, 0.66], [0.08, 0.72, 0.18, 0.92, 1.18, 0.82]];
    if (definition.model === 'dryingRack') return [[0.06, 0, 0.08, 0.18, 1.45, 0.22], [0.82, 0, 0.08, 0.94, 1.45, 0.22], [0.06, 0, 0.78, 0.18, 1.45, 0.92], [0.82, 0, 0.78, 0.94, 1.45, 0.92]];
    if (definition.model === 'cinderGate') return [[0.08, 0, 0.08, 0.92, 0.28, 0.92], [0.28, 0.28, 0.28, 0.72, 0.82, 0.72]];
    if (definition.model === 'cinderRift') return [[0.08, 0, 0.08, 0.92, 0.35, 0.92]];
    if (definition.scaffold) return [[0, 0.88, 0, 1, 1, 1]];
    if (definition.sunhive) return [[0.08, 0, 0.08, 0.92, 0.86, 0.92]];
    if (definition.outfitterStand) return [[0.12, 0, 0.12, 0.88, 0.12, 0.88], [0.34, 0.12, 0.34, 0.66, 1.82, 0.66]];
    if (definition.hearthpot) return [[0.18, 0, 0.18, 0.82, 0.44, 0.82]];
    if (definition.raincatchBasin) return [[0.08, 0, 0.08, 0.92, 0.82, 0.92]];
    if (definition.infusionStill) return [[0.08, 0, 0.08, 0.92, 0.16, 0.92], [0.36, 0.16, 0.36, 0.64, 0.84, 0.64]];
    if (definition.forgeheartAnvil) return [[0.12, 0, 0.12, 0.88, 0.14, 0.88], [0.32, 0.12, 0.24, 0.68, 0.86, 0.76]];
    if (definition.runegrindWheel) return [[0.08, 0, 0.18, 0.92, 0.12, 0.82], [0.12, 0.1, 0.3, 0.26, 0.92, 0.7], [0.74, 0.1, 0.3, 0.88, 0.92, 0.7], [0.3, 0.28, 0.38, 0.7, 0.9, 0.62]];
    if (definition.stonewrightCutter) return [[0.08, 0, 0.08, 0.92, 0.34, 0.92], [0.4, 0.34, 0.32, 0.6, 0.82, 0.68]];
    if (definition.wayvault) return [[0.06, 0, 0.06, 0.94, 0.88, 0.94]];
    if (definition.storageContainer === 'barrel') return [[0.06, 0, 0.06, 0.94, 0.94, 0.94]];
    if (definition.model === 'chest') return [[0.05, 0, 0.05, 0.95, 0.9, 0.95]];
    if (definition.waystar) return [[0.06, 0, 0.06, 0.94, 0.9, 0.94]];
    if (definition.hearthsongPlayer) return [[0.04, 0, 0.04, 0.96, 0.9, 0.96]];
    if (definition.forgeFunnel) return funnelBounds(this.getBlock(x, y, z));
    if (definition.forgeEjector) return [[0.04, 0.04, 0.04, 0.96, 0.96, 0.96]];
    if (definition.runeDispenser) return [[0.03, 0.03, 0.03, 0.97, 0.97, 0.97]];
    if (definition.changeSentry) return [[0.04, 0.04, 0.04, 0.96, 0.96, 0.96]];
    if (definition.pane) return paneBoxes(this, Math.floor(x), Math.floor(y), Math.floor(z));
    if (definition.hearthcake) return [hearthcakeBounds(this.getBlock(x, y, z))];
    if (definition.mossweaveCarpet) return [[0, 0, 0, 1, 0.0625, 1]];
    return [[0, 0, 0, 1, definition.collisionHeight ?? 1, 1]];
  }

  setBlock(x, y, z, id) {
    return this.setBlocks([{ x, y, z, id }]);
  }

  onBlockChange(listener) {
    if (typeof listener !== 'function') return () => {};
    this.blockChangeListeners.add(listener);
    return () => this.blockChangeListeners.delete(listener);
  }

  setBlocks(changes) {
    const dirty = new Set();
    const applied = [];
    for (const change of changes || []) {
      const x = Math.floor(change?.x);
      const y = Math.floor(change?.y);
      const z = Math.floor(change?.z);
      const id = Math.floor(change?.id);
      if (![x, y, z, id].every(Number.isFinite) || y < WORLD_MIN_Y || y >= WORLD_HEIGHT || !BLOCKS[id]) continue;
      const cx = floorDiv(x, CHUNK_SIZE);
      const cz = floorDiv(z, CHUNK_SIZE);
      const data = this.getChunk(cx, cz);
      const index = chunkVoxelIndex(mod(x, CHUNK_SIZE), y, mod(z, CHUNK_SIZE));
      const previous = data[index];
      if (previous === id) continue;
      data[index] = id;
      this.edits.set(blockKey(x, y, z), id);
      applied.push({ x, y, z, previous, id });
      dirty.add(chunkKey(cx, cz));
      if (mod(x, CHUNK_SIZE) === 0) dirty.add(chunkKey(cx - 1, cz));
      if (mod(x, CHUNK_SIZE) === CHUNK_SIZE - 1) dirty.add(chunkKey(cx + 1, cz));
      if (mod(z, CHUNK_SIZE) === 0) dirty.add(chunkKey(cx, cz - 1));
      if (mod(z, CHUNK_SIZE) === CHUNK_SIZE - 1) dirty.add(chunkKey(cx, cz + 1));
    }
    if (!applied.length) return 0;
    this.saveEdits();
    for (const key of dirty) {
      const [cx, cz] = key.split(',').map(Number);
      this.rebuildChunk(cx, cz);
    }
    for (const change of applied) {
      for (const listener of this.blockChangeListeners) listener(change.x, change.y, change.z, change.previous, change.id);
    }
    return applied.length;
  }

  buildGeometry(cx, cz, waterOnly = false, transparentOnly = false, lavaOnly = false, lightField = null) {
    const positions = [];
    const normals = [];
    const colors = [];
    const uvs = [];
    const indices = [];
    const startX = cx * CHUNK_SIZE;
    const startZ = cz * CHUNK_SIZE;
    const data = this.getChunk(cx, cz);
    const localIndex = chunkVoxelIndex;
    const litColor = (id, normalY, sampleX, sampleY, sampleZ) => {
      const base = faceShade(id, normalY);
      const brightness = BLOCKS[id]?.light ? 1.12 : lightField?.brightnessAt(sampleX, sampleY, sampleZ) ?? 1;
      return base.map((channel) => channel * brightness);
    };
    const appendBox = (lx, y, lz, id, bounds) => {
      const [x0, y0, z0, x1, y1, z1] = bounds;
      for (const face of FACES) {
        const base = positions.length / 3;
        const sampleY = face.dir[1] > 0 ? Math.ceil(y + y1) : face.dir[1] < 0 ? Math.floor(y + y0) - 1 : Math.floor(y + (y0 + y1) * 0.5);
        const color = litColor(id, face.dir[1], startX + lx + face.dir[0], sampleY, startZ + lz + face.dir[2]);
        const faceUVs = tileUVs(blockTexture(id, face.dir[1]));
        face.corners.forEach((corner, cornerIndex) => {
          positions.push(
            lx + x0 + corner[0] * (x1 - x0),
            y + y0 + corner[1] * (y1 - y0),
            lz + z0 + corner[2] * (z1 - z0),
          );
          normals.push(...face.dir);
          colors.push(...color);
          uvs.push(...faceUVs[cornerIndex]);
        });
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    };

    for (let y = WORLD_MIN_Y; y < WORLD_HEIGHT; y += 1) {
      for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
        for (let lx = 0; lx < CHUNK_SIZE; lx += 1) {
          const id = data[localIndex(lx, y, lz)];
          const isWater = isWaterBlock(id);
          const isLava = isLavaBlock(id);
          const isLiquid = isWater || isLava;
          const isTransparent = Boolean(BLOCKS[id]?.transparent);
          if (id === BLOCK.AIR) continue;
          if (transparentOnly ? !isTransparent : lavaOnly ? !isLava : waterOnly ? !isWater : isLiquid || isTransparent) continue;
          const wx = startX + lx;
          const wz = startZ + lz;
          const definition = BLOCKS[id];
          if (!waterOnly && definition?.model === 'sparkSwitch') {
            appendBox(lx, y, lz, BLOCK.STONE, [0.2, 0, 0.2, 0.8, 0.12, 0.8]);
            appendBox(lx, y, lz, id, [0.42, 0.11, 0.42, 0.58, definition.powered ? 0.58 : 0.34, 0.58]);
            appendBox(lx, y, lz, id, definition.powered ? [0.37, 0.52, 0.37, 0.63, 0.66, 0.63] : [0.24, 0.3, 0.4, 0.54, 0.44, 0.6]);
            continue;
          }
          if (!waterOnly && definition?.model === 'sparkPlate') {
            appendBox(lx, y, lz, id, [0.1, 0.01, 0.1, 0.9, definition.powered ? 0.055 : 0.1, 0.9]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.05, 0, 0.05, 0.2, 0.07, 0.2]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.8, 0, 0.8, 0.95, 0.07, 0.95]);
            continue;
          }
          if (!waterOnly && definition?.model === 'sunEye') {
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.12, 0, 0.12, 0.88, 0.1, 0.88]);
            appendBox(lx, y, lz, id, [0.22, 0.1, 0.22, 0.78, 0.24, 0.78]);
            appendBox(lx, y, lz, id, [0.38, 0.24, 0.38, 0.62, 0.4, 0.62]);
            continue;
          }
          if (!waterOnly && definition?.model === 'sparkRelay') {
            const [fx, , fz] = definition.circuitFacing;
            appendBox(lx, y, lz, BLOCK.STONE, [0.08, 0, 0.08, 0.92, 0.08, 0.92]);
            const alongX = fx !== 0;
            appendBox(lx, y, lz, id, alongX ? [0.08, 0.08, 0.44, 0.92, 0.14, 0.56] : [0.44, 0.08, 0.08, 0.56, 0.14, 0.92]);
            const inputX = 0.5 - fx * 0.26;
            const inputZ = 0.5 - fz * 0.26;
            const outputX = 0.5 + fx * 0.26;
            const outputZ = 0.5 + fz * 0.26;
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [inputX - 0.09, 0.13, inputZ - 0.09, inputX + 0.09, 0.32, inputZ + 0.09]);
            appendBox(lx, y, lz, id, [outputX - 0.1, 0.13, outputZ - 0.1, outputX + 0.1, definition.powered ? 0.42 : 0.29, outputZ + 0.1]);
            continue;
          }
          if (!waterOnly && definition?.model === 'sparkInverter') {
            const [fx, , fz] = definition.circuitFacing; const alongX = fx !== 0;
            appendBox(lx, y, lz, BLOCK.STONE_SLAB, [0.08, 0, 0.08, 0.92, 0.09, 0.92]);
            appendBox(lx, y, lz, id, alongX ? [0.08, 0.09, 0.44, 0.92, 0.15, 0.56] : [0.44, 0.09, 0.08, 0.56, 0.15, 0.92]);
            const outputX = 0.5 + fx * 0.25; const outputZ = 0.5 + fz * 0.25;
            appendBox(lx, y, lz, BLOCK.WOOD, [outputX - 0.045, 0.14, outputZ - 0.045, outputX + 0.045, 0.4, outputZ + 0.045]);
            appendBox(lx, y, lz, id, [outputX - 0.12, 0.38, outputZ - 0.12, outputX + 0.12, definition.powered ? 0.58 : 0.46, outputZ + 0.12]);
            continue;
          }
          if (!waterOnly && definition?.model === 'sparkComparator') {
            const [fx, , fz] = definition.circuitFacing; const alongX = fx !== 0;
            appendBox(lx, y, lz, BLOCK.STONE_SLAB, [0.06, 0, 0.06, 0.94, 0.08, 0.94]);
            appendBox(lx, y, lz, id, alongX ? [0.07, 0.08, 0.44, 0.93, 0.14, 0.56] : [0.44, 0.08, 0.07, 0.56, 0.14, 0.93]);
            const sideX = -fz; const sideZ = fx;
            for (const offset of [-0.22, 0.22]) {
              const px = 0.5 - fx * 0.2 + sideX * offset; const pz = 0.5 - fz * 0.2 + sideZ * offset;
              appendBox(lx, y, lz, BLOCK.WOOD, [px - 0.04, 0.13, pz - 0.04, px + 0.04, 0.28, pz + 0.04]);
            }
            const outputX = 0.5 + fx * 0.24; const outputZ = 0.5 + fz * 0.24;
            appendBox(lx, y, lz, id, [outputX - 0.085, 0.13, outputZ - 0.085, outputX + 0.085, definition.powered ? 0.38 : 0.29, outputZ + 0.085]);
            if (definition.comparatorMode === 'subtract') {
              appendBox(lx, y, lz, id, alongX ? [0.44, 0.145, 0.23, 0.56, 0.2, 0.77] : [0.23, 0.145, 0.44, 0.77, 0.2, 0.56]);
            }
            continue;
          }
          if (!waterOnly && definition?.model === 'pulseSequencer') {
            const [fx, , fz] = definition.circuitFacing;
            appendBox(lx, y, lz, BLOCK.STONE, [0.06, 0, 0.06, 0.94, 0.08, 0.94]);
            const alongX = fx !== 0;
            appendBox(lx, y, lz, id, alongX ? [0.08, 0.08, 0.43, 0.92, 0.15, 0.57] : [0.43, 0.08, 0.08, 0.57, 0.15, 0.92]);
            for (const offset of [-0.24, 0, 0.24]) {
              const px = 0.5 + (alongX ? offset : 0);
              const pz = 0.5 + (alongX ? 0 : offset);
              appendBox(lx, y, lz, id, [px - 0.08, 0.14, pz - 0.08, px + 0.08, definition.powered ? 0.46 : 0.3, pz + 0.08]);
            }
            continue;
          }
          if (!waterOnly && definition?.model === 'forgeRail') {
            const connections = new Set(definition.railShape || '');
            if (definition.slopeDirection) {
              const alongX = ['E', 'W'].includes(definition.slopeDirection);
              const reverse = ['N', 'W'].includes(definition.slopeDirection);
              for (let step = 0; step < 5; step += 1) {
                const along = (reverse ? 4 - step : step) * 0.2;
                const height = step * 0.2;
                if (alongX) {
                  appendBox(lx, y, lz, BLOCK.PLANKS, [along, height + 0.01, 0.08, along + 0.2, height + 0.06, 0.92]);
                  appendBox(lx, y, lz, id, [along, height + 0.06, 0.25, along + 0.22, height + 0.13, 0.33]);
                  appendBox(lx, y, lz, id, [along, height + 0.06, 0.67, along + 0.22, height + 0.13, 0.75]);
                } else {
                  appendBox(lx, y, lz, BLOCK.PLANKS, [0.08, height + 0.01, along, 0.92, height + 0.06, along + 0.2]);
                  appendBox(lx, y, lz, id, [0.25, height + 0.06, along, 0.33, height + 0.13, along + 0.22]);
                  appendBox(lx, y, lz, id, [0.67, height + 0.06, along, 0.75, height + 0.13, along + 0.22]);
                }
              }
              continue;
            }
            const ns = connections.has('N') || connections.has('S');
            const ew = connections.has('E') || connections.has('W');
            if (ns) for (const z0 of [0.08, 0.43, 0.78]) appendBox(lx, y, lz, BLOCK.PLANKS, [0.08, 0.01, z0, 0.92, 0.055, z0 + 0.14]);
            if (ew) for (const x0 of [0.08, 0.43, 0.78]) appendBox(lx, y, lz, BLOCK.PLANKS, [x0, 0.01, 0.08, x0 + 0.14, 0.055, 0.92]);
            const arms = {
              N: [[0.25, 0.055, 0, 0.33, 0.12, 0.54], [0.67, 0.055, 0, 0.75, 0.12, 0.54]],
              S: [[0.25, 0.055, 0.46, 0.33, 0.12, 1], [0.67, 0.055, 0.46, 0.75, 0.12, 1]],
              W: [[0, 0.055, 0.25, 0.54, 0.12, 0.33], [0, 0.055, 0.67, 0.54, 0.12, 0.75]],
              E: [[0.46, 0.055, 0.25, 1, 0.12, 0.33], [0.46, 0.055, 0.67, 1, 0.12, 0.75]],
            };
            for (const direction of connections) for (const bounds of arms[direction] || []) appendBox(lx, y, lz, id, bounds);
            appendBox(lx, y, lz, id, [0.25, 0.055, 0.25, 0.75, 0.115, 0.75]);
            if (definition.junctionExit) {
              const indicators = {
                N: [0.43, 0.12, 0.08, 0.57, 0.2, 0.42], E: [0.58, 0.12, 0.43, 0.92, 0.2, 0.57],
                S: [0.43, 0.12, 0.58, 0.57, 0.2, 0.92], W: [0.08, 0.12, 0.43, 0.42, 0.2, 0.57],
              };
              appendBox(lx, y, lz, BLOCK.POWER_RAIL_NS_ON, indicators[definition.junctionExit]);
            }
            continue;
          }
          if (!waterOnly && definition?.model === 'freightStation') {
            const [fx, , fz] = definition.circuitFacing;
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.04, 0, 0.04, 0.96, 0.18, 0.96]);
            appendBox(lx, y, lz, id, [0.12, 0.18, 0.12, 0.88, 0.75, 0.88]);
            appendBox(lx, y, lz, BLOCK.CHEST, [0.23, 0.75, 0.23, 0.77, 0.92, 0.77]);
            const frontX = 0.5 + fx * 0.4;
            const frontZ = 0.5 + fz * 0.4;
            const nozzle = fx !== 0
              ? [frontX - 0.18, 0.35, 0.3, frontX + 0.18, 0.62, 0.7]
              : [0.3, 0.35, frontZ - 0.18, 0.7, 0.62, frontZ + 0.18];
            appendBox(lx, y, lz, id, nozzle);
            const glowX = 0.5 + fx * 0.46;
            const glowZ = 0.5 + fz * 0.46;
            appendBox(lx, y, lz, definition.powered ? BLOCK.POWER_RAIL_NS_ON : BLOCK.POWER_RAIL_NS_OFF,
              [glowX - 0.09, 0.64, glowZ - 0.09, glowX + 0.09, 0.82, glowZ + 0.09]);
            continue;
          }
          if (!waterOnly && definition?.model === 'charterPost') {
            appendBox(lx, y, lz, BLOCK.MOSSY_STONE, [0.22, 0, 0.22, 0.78, 0.16, 0.78]);
            appendBox(lx, y, lz, BLOCK.WOOD, [0.4, 0.16, 0.4, 0.6, 1.35, 0.6]);
            appendBox(lx, y, lz, id, [0.08, 0.72, 0.18, 0.92, 1.18, 0.82]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.03, 0.68, 0.43, 0.97, 0.76, 0.57]);
            if (definition.outpostTier >= 1) appendBox(lx, y, lz, id, [0.3, 1.18, 0.3, 0.7, 1.42, 0.7]);
            if (definition.outpostTier >= 2) {
              appendBox(lx, y, lz, BLOCK.POWER_RAIL_NS_ON, [0.2, 0.46, 0.43, 0.8, 0.6, 0.57]);
              appendBox(lx, y, lz, BLOCK.POWER_RAIL_NS_ON, [0.43, 0.46, 0.2, 0.57, 0.6, 0.8]);
            }
            if (definition.outpostTier >= 3) appendBox(lx, y, lz, BLOCK.LUMEN_LANTERN, [0.36, 1.4, 0.36, 0.64, 1.7, 0.64]);
            continue;
          }
          if (!waterOnly && definition?.model === 'forgeRam') {
            const [fx, , fz] = definition.circuitFacing;
            appendBox(lx, y, lz, id, [0.04, 0.04, 0.04, 0.96, 0.96, 0.96]);
            const headCenterX = 0.5 + fx * (definition.powered ? 0.72 : 0.48);
            const headCenterZ = 0.5 + fz * (definition.powered ? 0.72 : 0.48);
            const head = fx !== 0
              ? [headCenterX - 0.2, 0.18, 0.12, headCenterX + 0.2, 0.82, 0.88]
              : [0.12, 0.18, headCenterZ - 0.2, 0.88, 0.82, headCenterZ + 0.2];
            appendBox(lx, y, lz, BLOCK.IRON_ORE, head);
            const shaft = fx > 0 ? [0.5, 0.36, 0.36, definition.powered ? 1.22 : 0.9, 0.64, 0.64]
              : fx < 0 ? [definition.powered ? -0.22 : 0.1, 0.36, 0.36, 0.5, 0.64, 0.64]
                : fz > 0 ? [0.36, 0.36, 0.5, 0.64, 0.64, definition.powered ? 1.22 : 0.9]
                  : [0.36, 0.36, definition.powered ? -0.22 : 0.1, 0.64, 0.64, 0.5];
            appendBox(lx, y, lz, id, shaft);
            if (definition.bindingRam) {
              const padX = 0.5 + fx * (definition.powered ? 0.94 : 0.72);
              const padZ = 0.5 + fz * (definition.powered ? 0.94 : 0.72);
              const pad = fx !== 0 ? [padX - 0.035, 0.22, 0.12, padX + 0.035, 0.78, 0.88] : [0.12, 0.22, padZ - 0.035, 0.88, 0.78, padZ + 0.035];
              appendBox(lx, y, lz, BLOCK.LUMEN_ORE, pad);
            }
            continue;
          }
          if (!waterOnly && definition?.model === 'sunstepGate') {
            // One authored voxel represents a two-block portcullis. Powered bars lift
            // into the lintel while the block's collision state opens completely.
            appendBox(lx, y, lz, BLOCK.SHRINE_STONE, [0.03, 0, 0.34, 0.17, 2.1, 0.66]);
            appendBox(lx, y, lz, BLOCK.SHRINE_STONE, [0.83, 0, 0.34, 0.97, 2.1, 0.66]);
            const baseY = definition.powered ? 1.7 : 0.03;
            for (const x0 of [0.22, 0.38, 0.54, 0.7]) appendBox(lx, y, lz, id, [x0, baseY, 0.42, x0 + 0.08, baseY + 1.95, 0.58]);
            for (const z0 of [0.22, 0.38, 0.54, 0.7]) appendBox(lx, y, lz, id, [0.42, baseY, z0, 0.58, baseY + 1.95, z0 + 0.08]);
            appendBox(lx, y, lz, id, [0.17, baseY + 0.35, 0.39, 0.83, baseY + 0.49, 0.61]);
            appendBox(lx, y, lz, id, [0.17, baseY + 1.38, 0.39, 0.83, baseY + 1.52, 0.61]);
            appendBox(lx, y, lz, id, [0.39, baseY + 0.35, 0.17, 0.61, baseY + 0.49, 0.83]);
            appendBox(lx, y, lz, id, [0.39, baseY + 1.38, 0.17, 0.61, baseY + 1.52, 0.83]);
            continue;
          }
          if (!waterOnly && definition?.model === 'sunwire') {
            const connects = (dx, dy, dz) => Boolean(BLOCKS[this.getBlock(wx + dx, y + dy, wz + dz)]?.circuitRole);
            appendBox(lx, y, lz, id, [0.39, 0.01, 0.39, 0.61, 0.065, 0.61]);
            if (connects(-1, 0, 0)) appendBox(lx, y, lz, id, [0, 0.01, 0.43, 0.5, 0.055, 0.57]);
            if (connects(1, 0, 0)) appendBox(lx, y, lz, id, [0.5, 0.01, 0.43, 1, 0.055, 0.57]);
            if (connects(0, 0, -1)) appendBox(lx, y, lz, id, [0.43, 0.01, 0, 0.57, 0.055, 0.5]);
            if (connects(0, 0, 1)) appendBox(lx, y, lz, id, [0.43, 0.01, 0.5, 0.57, 0.055, 1]);
            continue;
          }
          if (!waterOnly && definition?.model === 'cinderGate') {
            appendBox(lx, y, lz, BLOCK.ASHSTONE, [0.07, 0, 0.07, 0.93, 0.18, 0.93]);
            appendBox(lx, y, lz, BLOCK.EMBER_SOIL, [0.16, 0.18, 0.16, 0.84, 0.3, 0.84]);
            appendBox(lx, y, lz, BLOCK.CINDER_GATE, [0.24, 0.3, 0.24, 0.4, 1.16, 0.76]);
            appendBox(lx, y, lz, BLOCK.CINDER_GATE, [0.6, 0.3, 0.24, 0.76, 1.16, 0.76]);
            appendBox(lx, y, lz, BLOCK.CINDER_GATE, [0.24, 1.04, 0.24, 0.76, 1.24, 0.76]);
            appendBox(lx, y, lz, BLOCK.CINDER_CRYSTAL_ORE, [0.41, 0.32, 0.38, 0.59, 0.95, 0.62]);
            continue;
          }
          if (!waterOnly && definition?.model === 'cinderRift') {
            appendBox(lx, y, lz, BLOCK.ASHSTONE, [0.06, 0, 0.06, 0.94, 0.14, 0.94]);
            appendBox(lx, y, lz, BLOCK.CINDER_GATE, [0.17, 0.12, 0.17, 0.83, 0.24, 0.83]);
            appendBox(lx, y, lz, BLOCK.CINDER_RIFT, [0.39, 0.18, 0.18, 0.61, 1.08, 0.82]);
            appendBox(lx, y, lz, BLOCK.CINDER_RIFT, [0.18, 0.24, 0.39, 0.82, 0.92, 0.61]);
            continue;
          }
          if (!waterOnly && definition?.model === 'hearthfire') {
            for (const [x0, z0, x1, z1] of [[0.08, 0.16, 0.92, 0.34], [0.08, 0.66, 0.92, 0.84], [0.16, 0.08, 0.34, 0.92], [0.66, 0.08, 0.84, 0.92]]) {
              appendBox(lx, y, lz, BLOCK.WOOD, [x0, 0.04, z0, x1, 0.24, z1]);
            }
            for (const [x0, z0] of [[0.06, 0.06], [0.76, 0.06], [0.06, 0.76], [0.76, 0.76]]) appendBox(lx, y, lz, BLOCK.STONE, [x0, 0, z0, x0 + 0.18, 0.18, z0 + 0.18]);
            if (definition.lit) {
              appendBox(lx, y, lz, id, [0.32, 0.18, 0.37, 0.68, 0.68, 0.63]);
              appendBox(lx, y, lz, id, [0.4, 0.2, 0.29, 0.6, 0.54, 0.71]);
            } else appendBox(lx, y, lz, id, [0.34, 0.18, 0.34, 0.66, 0.28, 0.66]);
            continue;
          }
          if (!waterOnly && definition?.model === 'dryingRack') {
            for (const [x0, z0] of [[0.07, 0.09], [0.81, 0.09], [0.07, 0.77], [0.81, 0.77]]) {
              appendBox(lx, y, lz, BLOCK.WOOD, [x0, 0, z0, x0 + 0.12, 1.38, z0 + 0.14]);
            }
            appendBox(lx, y, lz, BLOCK.PLANKS, [0.04, 1.3, 0.06, 0.96, 1.45, 0.24]);
            appendBox(lx, y, lz, BLOCK.PLANKS, [0.04, 1.3, 0.76, 0.96, 1.45, 0.94]);
            appendBox(lx, y, lz, BLOCK.WOOD, [0.45, 1.28, 0.16, 0.55, 1.4, 0.84]);
            for (const [z0, material] of [[0.22, BLOCK.DIRT], [0.38, BLOCK.SAND], [0.54, BLOCK.MOSSY_STONE], [0.7, BLOCK.ROOTSTONE]]) {
              appendBox(lx, y, lz, material, [0.39, 0.62, z0, 0.61, 1.25, z0 + 0.08]);
            }
            continue;
          }
          if (!waterOnly && definition?.model === 'echoSpikes') {
            const height = definition.echoTrap === 'armed' ? 0.62 : 0.09;
            for (const [x0, z0] of [[0.12, 0.12], [0.62, 0.12], [0.12, 0.62], [0.62, 0.62]]) {
              appendBox(lx, y, lz, id, [x0, 0, z0, x0 + 0.26, height, z0 + 0.26]);
            }
            continue;
          }
          if (!waterOnly && definition?.model === 'lantern') {
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.2, 0, 0.2, 0.8, 0.1, 0.8]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.18, 0.1, 0.18, 0.28, 0.52, 0.28]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.72, 0.1, 0.18, 0.82, 0.52, 0.28]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.18, 0.1, 0.72, 0.28, 0.52, 0.82]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.72, 0.1, 0.72, 0.82, 0.52, 0.82]);
            appendBox(lx, y, lz, BLOCK.LUMEN_LANTERN, [0.28, 0.12, 0.28, 0.72, 0.48, 0.72]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.2, 0.48, 0.2, 0.8, 0.56, 0.8]);
            continue;
          }
          if (!waterOnly && definition?.model === 'craftingTable') {
            appendBox(lx, y, lz, id, [0.08, 0.68, 0.08, 0.92, 0.88, 0.92]);
            for (const [x0, z0] of [[0.12, 0.12], [0.72, 0.12], [0.12, 0.72], [0.72, 0.72]]) appendBox(lx, y, lz, BLOCK.WOOD, [x0, 0, z0, x0 + 0.16, 0.7, z0 + 0.16]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.18, 0.865, 0.46, 0.82, 0.9, 0.54]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.46, 0.865, 0.18, 0.54, 0.9, 0.82]);
            continue;
          }
          if (!waterOnly && ['furnace', 'forgeKiln', 'hearthSmoker'].includes(definition?.model)) {
            const smoker = definition.model === 'hearthSmoker';
            const kiln = definition.model === 'forgeKiln';
            appendBox(lx, y, lz, id, smoker ? [0.08, 0, 0.08, 0.92, 0.74, 0.92] : [0.06, 0, 0.06, 0.94, kiln ? 0.82 : 0.78, 0.94]);
            appendBox(lx, y, lz, kiln ? BLOCK.FORGED_IRON_BLOCK : (smoker ? BLOCK.WOOD : BLOCK.STONE), smoker ? [0.16, 0.72, 0.16, 0.84, 0.84, 0.84] : [0.13, kiln ? 0.8 : 0.76, 0.13, 0.87, kiln ? 0.96 : 0.9, 0.87]);
            appendBox(lx, y, lz, BLOCK.COAL, kiln ? [0.23, 0.14, 0.02, 0.77, 0.57, 0.14] : [0.25, 0.16, 0.015, 0.75, 0.52, 0.12]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.18, 0.08, 0.01, 0.82, 0.16, 0.15]);
            if (smoker) appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.38, 0.82, 0.38, 0.62, 1.08, 0.62]);
            if (kiln) appendBox(lx, y, lz, BLOCK.EMBERITE_ORE, [0.39, 0.22, 0.005, 0.61, 0.45, 0.16]);
            continue;
          }
          if (!waterOnly && definition?.model === 'blastKeg') {
            appendBox(lx, y, lz, id, [0.14, 0.04, 0.14, 0.86, 0.86, 0.86]);
            appendBox(lx, y, lz, BLOCK.WOOD, [0.08, 0, 0.08, 0.92, 0.13, 0.92]);
            appendBox(lx, y, lz, BLOCK.WOOD, [0.08, 0.77, 0.08, 0.92, 0.9, 0.92]);
            for (const y0 of [0.24, 0.64]) appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.1, y0, 0.1, 0.9, y0 + 0.07, 0.9]);
            appendBox(lx, y, lz, BLOCK.COAL, [0.44, 0.86, 0.44, 0.56, 1.02, 0.56]);
            continue;
          }
          if (!waterOnly && definition?.model === 'hearthguardCore') {
            appendBox(lx, y, lz, BLOCK.STONE_SLAB, [0.08, 0, 0.08, 0.92, 0.14, 0.92]);
            appendBox(lx, y, lz, BLOCK.FORGED_IRON_BLOCK, [0.26, 0.12, 0.26, 0.74, 0.3, 0.74]);
            appendBox(lx, y, lz, id, [0.34, 0.28, 0.34, 0.66, 0.86, 0.66]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.22, 0.48, 0.44, 0.78, 0.58, 0.56]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.44, 0.48, 0.22, 0.56, 0.58, 0.78]);
            continue;
          }
          if (!waterOnly && definition?.model === 'forgeLamp') {
            appendBox(lx, y, lz, BLOCK.FORGED_IRON_BLOCK, [0.12, 0, 0.12, 0.88, 0.12, 0.88]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.42, 0.1, 0.42, 0.58, 0.7, 0.58]);
            appendBox(lx, y, lz, id, [0.26, 0.3, 0.26, 0.74, 0.66, 0.74]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.2, 0.42, 0.2, 0.8, 0.52, 0.8]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.2, 0.7, 0.2, 0.8, 0.82, 0.8]);
            continue;
          }
          if (!waterOnly && definition?.repairBench) {
            appendBox(lx, y, lz, BLOCK.STONE, [0.14, 0, 0.2, 0.86, 0.18, 0.8]);
            appendBox(lx, y, lz, BLOCK.STONE, [0.33, 0.18, 0.32, 0.67, 0.62, 0.68]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.08, 0.62, 0.18, 0.9, 0.84, 0.82]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.78, 0.68, 0.28, 1, 0.79, 0.72]);
            continue;
          }
          if (!waterOnly && definition?.model === 'runeforge') {
            appendBox(lx, y, lz, BLOCK.ROOTSTONE, [0.08, 0, 0.08, 0.92, 0.18, 0.92]);
            appendBox(lx, y, lz, BLOCK.VOIDGLASS_ORE, [0.18, 0.18, 0.18, 0.82, 0.66, 0.82]);
            appendBox(lx, y, lz, BLOCK.RUNEFORGE, [0.07, 0.66, 0.07, 0.93, 0.82, 0.93]);
            appendBox(lx, y, lz, BLOCK.LUMEN_LANTERN, [0.35, 0.82, 0.35, 0.65, 1.05, 0.65]);
            continue;
          }
          if (!waterOnly && definition?.model === 'shadowDen') {
            appendBox(lx, y, lz, BLOCK.ROOTSTONE, [0.05, 0, 0.08, 0.95, 0.16, 0.92]);
            appendBox(lx, y, lz, BLOCK.SHADOW_DEN, [0.12, 0.14, 0.12, 0.88, 0.38, 0.88]);
            appendBox(lx, y, lz, BLOCK.SHADOW_DEN, [0.22, 0.36, 0.2, 0.78, 0.56, 0.8]);
            appendBox(lx, y, lz, BLOCK.SHADOW_DEN, [0.34, 0.54, 0.3, 0.66, 0.68, 0.7]);
            continue;
          }
          if (!waterOnly && definition?.composter) {
            appendBox(lx, y, lz, id, [0, 0, 0, 1, 0.16, 1]);
            appendBox(lx, y, lz, id, [0, 0.14, 0, 0.18, 1, 1]);
            appendBox(lx, y, lz, id, [0.82, 0.14, 0, 1, 1, 1]);
            appendBox(lx, y, lz, id, [0.18, 0.14, 0, 0.82, 1, 0.18]);
            appendBox(lx, y, lz, id, [0.18, 0.14, 0.82, 0.82, 1, 1]);
            if (definition.compostLevel > 0) {
              const fillHeight = 0.16 + (definition.compostLevel / 7) * 0.68;
              appendBox(lx, y, lz, definition.compostLevel === 7 ? BLOCK.HYDRATED_FARMLAND : BLOCK.DIRT, [0.18, 0.14, 0.18, 0.82, fillHeight, 0.82]);
            }
            continue;
          }
          if (!waterOnly && definition?.sign) {
            appendBox(lx, y, lz, id, [0.45, 0, 0.45, 0.55, 0.5, 0.55]);
            const alongX = definition.signOrientation === 'n' || definition.signOrientation === 's';
            appendBox(lx, y, lz, id, alongX
              ? [0.06, 0.48, 0.44, 0.94, 0.98, 0.56]
              : [0.44, 0.48, 0.06, 0.56, 0.98, 0.94]);
            continue;
          }
          if (!waterOnly && definition?.ladder) {
            const facing = definition.ladderFacing;
            const alongX = facing === 'n' || facing === 's';
            const edge = facing === 'n' || facing === 'w' ? 0.03 : 0.89;
            if (alongX) {
              appendBox(lx, y, lz, id, [0.14, 0.02, edge, 0.24, 0.98, edge + 0.08]);
              appendBox(lx, y, lz, id, [0.76, 0.02, edge, 0.86, 0.98, edge + 0.08]);
              for (const rungY of [0.12, 0.34, 0.56, 0.78]) appendBox(lx, y, lz, id, [0.2, rungY, edge - 0.01, 0.8, rungY + 0.09, edge + 0.09]);
            } else {
              appendBox(lx, y, lz, id, [edge, 0.02, 0.14, edge + 0.08, 0.98, 0.24]);
              appendBox(lx, y, lz, id, [edge, 0.02, 0.76, edge + 0.08, 0.98, 0.86]);
              for (const rungY of [0.12, 0.34, 0.56, 0.78]) appendBox(lx, y, lz, id, [edge - 0.01, rungY, 0.2, edge + 0.09, rungY + 0.09, 0.8]);
            }
            continue;
          }
          if (!waterOnly && definition?.scaffold) {
            for (const [x0, z0] of [[0.06, 0.06], [0.82, 0.06], [0.06, 0.82], [0.82, 0.82]]) {
              appendBox(lx, y, lz, BLOCK.WOOD, [x0, 0, z0, x0 + 0.12, 0.94, z0 + 0.12]);
            }
            for (const bounds of [
              [0.04, 0.86, 0.04, 0.96, 0.94, 0.16], [0.04, 0.86, 0.84, 0.96, 0.94, 0.96],
              [0.04, 0.86, 0.16, 0.16, 0.94, 0.84], [0.84, 0.86, 0.16, 0.96, 0.94, 0.84],
              [0.16, 0.88, 0.22, 0.84, 0.94, 0.32], [0.16, 0.88, 0.45, 0.84, 0.94, 0.55],
              [0.16, 0.88, 0.68, 0.84, 0.94, 0.78],
            ]) appendBox(lx, y, lz, id, bounds);
            for (const railY of [0.28, 0.57]) {
              appendBox(lx, y, lz, id, [0.12, railY, 0.08, 0.88, railY + 0.055, 0.13]);
              appendBox(lx, y, lz, id, [0.12, railY, 0.87, 0.88, railY + 0.055, 0.92]);
            }
            continue;
          }
          if (!waterOnly && definition?.sunhive) {
            appendBox(lx, y, lz, BLOCK.WOOD, [0.08, 0.08, 0.08, 0.92, 0.72, 0.92]);
            appendBox(lx, y, lz, id, [0.03, 0.7, 0.03, 0.97, 0.86, 0.97]);
            appendBox(lx, y, lz, id, [0.14, 0, 0.14, 0.28, 0.12, 0.28]);
            appendBox(lx, y, lz, id, [0.72, 0, 0.14, 0.86, 0.12, 0.28]);
            appendBox(lx, y, lz, id, [0.14, 0, 0.72, 0.28, 0.12, 0.86]);
            appendBox(lx, y, lz, id, [0.72, 0, 0.72, 0.86, 0.12, 0.86]);
            appendBox(lx, y, lz, BLOCK.COAL, [0.34, 0.27, 0.055, 0.66, 0.48, 0.09]);
            for (let band = 0; band < definition.hiveLevel; band += 1) {
              appendBox(lx, y, lz, id, [0.14, 0.16 + band * 0.16, 0.045, 0.86, 0.22 + band * 0.16, 0.075]);
            }
            continue;
          }
          if (!waterOnly && definition?.keepsakeFrame) {
            const facing = definition.frameFacing;
            const alongX = facing === 'n' || facing === 's';
            const near = facing === 'n' || facing === 'w' ? 0.025 : 0.895;
            const far = near + 0.08;
            if (alongX) {
              appendBox(lx, y, lz, BLOCK.DIRT, [0.14, 0.14, near, 0.86, 0.86, far]);
              appendBox(lx, y, lz, id, [0.08, 0.08, near - 0.015, 0.92, 0.18, far + 0.015]);
              appendBox(lx, y, lz, id, [0.08, 0.82, near - 0.015, 0.92, 0.92, far + 0.015]);
              appendBox(lx, y, lz, id, [0.08, 0.18, near - 0.015, 0.18, 0.82, far + 0.015]);
              appendBox(lx, y, lz, id, [0.82, 0.18, near - 0.015, 0.92, 0.82, far + 0.015]);
            } else {
              appendBox(lx, y, lz, BLOCK.DIRT, [near, 0.14, 0.14, far, 0.86, 0.86]);
              appendBox(lx, y, lz, id, [near - 0.015, 0.08, 0.08, far + 0.015, 0.18, 0.92]);
              appendBox(lx, y, lz, id, [near - 0.015, 0.82, 0.08, far + 0.015, 0.92, 0.92]);
              appendBox(lx, y, lz, id, [near - 0.015, 0.18, 0.08, far + 0.015, 0.82, 0.18]);
              appendBox(lx, y, lz, id, [near - 0.015, 0.18, 0.82, far + 0.015, 0.82, 0.92]);
            }
            continue;
          }
          if (!waterOnly && definition?.outfitterStand) {
            appendBox(lx, y, lz, BLOCK.STONE_SLAB, [0.12, 0, 0.12, 0.88, 0.12, 0.88]);
            appendBox(lx, y, lz, id, [0.44, 0.1, 0.44, 0.56, 1.58, 0.56]);
            appendBox(lx, y, lz, id, [0.18, 1.18, 0.44, 0.82, 1.3, 0.56]);
            appendBox(lx, y, lz, id, [0.34, 1.52, 0.34, 0.66, 1.82, 0.66]);
            continue;
          }
          if (!waterOnly && definition?.hearthpot) {
            appendBox(lx, y, lz, id, [0.28, 0, 0.28, 0.72, 0.12, 0.72]);
            appendBox(lx, y, lz, id, [0.22, 0.1, 0.22, 0.78, 0.38, 0.78]);
            appendBox(lx, y, lz, BLOCK.COAL, [0.28, 0.3, 0.28, 0.72, 0.4, 0.72]);
            appendBox(lx, y, lz, id, [0.18, 0.36, 0.18, 0.82, 0.44, 0.82]);
            continue;
          }
          if (!waterOnly && definition?.trailBanner) {
            appendBox(lx, y, lz, BLOCK.WOOD, [0.47, 0, 0.47, 0.53, 1.82, 0.53]);
            appendBox(lx, y, lz, BLOCK.WOOD, [0.46, 1.58, 0.46, 0.94, 1.65, 0.54]);
            continue;
          }
          if (!waterOnly && definition?.raincatchBasin) {
            appendBox(lx, y, lz, id, [0.08, 0, 0.08, 0.92, 0.14, 0.92]);
            appendBox(lx, y, lz, id, [0.05, 0.12, 0.05, 0.2, 0.82, 0.95]);
            appendBox(lx, y, lz, id, [0.8, 0.12, 0.05, 0.95, 0.82, 0.95]);
            appendBox(lx, y, lz, id, [0.2, 0.12, 0.05, 0.8, 0.82, 0.2]);
            appendBox(lx, y, lz, id, [0.2, 0.12, 0.8, 0.8, 0.82, 0.95]);
            if (definition.basinLevel > 0) {
              const surface = 0.26 + definition.basinLevel * 0.15;
              appendBox(lx, y, lz, BLOCK.WATER, [0.2, surface - 0.025, 0.2, 0.8, surface, 0.8]);
            }
            continue;
          }
          if (!waterOnly && definition?.archiveShelf) {
            appendBox(lx, y, lz, BLOCK.PLANKS, [0.04, 0, 0.08, 0.96, 1, 0.96]);
            appendBox(lx, y, lz, id, [0, 0, 0.02, 1, 0.1, 0.18]);
            appendBox(lx, y, lz, id, [0, 0.45, 0.02, 1, 0.55, 0.18]);
            appendBox(lx, y, lz, id, [0, 0.9, 0.02, 1, 1, 0.18]);
            const colors = [BLOCK.TIDEBRICK, BLOCK.LUMEN_BLOOM, BLOCK.SUNPETAL, BLOCK.ROOTSTONE];
            for (let book = 0; book < 9; book += 1) {
              const row = book < 5 ? 0 : 1; const index = row === 0 ? book : book - 5;
              const x0 = 0.09 + index * (row === 0 ? 0.17 : 0.2);
              const y0 = row === 0 ? 0.11 : 0.56;
              appendBox(lx, y, lz, colors[book % colors.length], [x0, y0, 0.015, x0 + 0.12, y0 + 0.31 + (book % 2) * 0.04, 0.16]);
            }
            continue;
          }
          if (!waterOnly && definition?.infusionStill) {
            appendBox(lx, y, lz, BLOCK.TIDEBRICK, [0.08, 0, 0.08, 0.92, 0.16, 0.92]);
            appendBox(lx, y, lz, id, [0.42, 0.14, 0.42, 0.58, 0.76, 0.58]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.12, 0.72, 0.12, 0.88, 0.84, 0.88]);
            for (const x0 of [0.18, 0.42, 0.66]) {
              appendBox(lx, y, lz, BLOCK.GLASS, [x0, 0.16, 0.58, x0 + 0.16, 0.56, 0.76]);
              appendBox(lx, y, lz, BLOCK.LUMEN_BLOOM, [x0 + 0.025, 0.18, 0.605, x0 + 0.135, 0.36, 0.735]);
            }
            continue;
          }
          if (!waterOnly && definition?.forgeheartAnvil) {
            appendBox(lx, y, lz, BLOCK.STONE_SLAB, [0.12, 0, 0.12, 0.88, 0.14, 0.88]);
            appendBox(lx, y, lz, id, [0.38, 0.12, 0.3, 0.62, 0.68, 0.7]);
            appendBox(lx, y, lz, id, [0.08, 0.64, 0.24, 0.92, 0.86, 0.76]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.78, 0.58, 0.28, 0.98, 0.78, 0.72]);
            appendBox(lx, y, lz, BLOCK.EMBERITE_ORE, [0.44, 0.28, 0.62, 0.56, 0.5, 0.74]);
            continue;
          }
          if (!waterOnly && definition?.runegrindWheel) {
            appendBox(lx, y, lz, BLOCK.PLANKS, [0.08, 0, 0.18, 0.92, 0.12, 0.82]);
            appendBox(lx, y, lz, BLOCK.WOOD, [0.12, 0.1, 0.3, 0.26, 0.92, 0.7]);
            appendBox(lx, y, lz, BLOCK.WOOD, [0.74, 0.1, 0.3, 0.88, 0.92, 0.7]);
            appendBox(lx, y, lz, BLOCK.STONE_SLAB, [0.18, 0.78, 0.34, 0.82, 0.9, 0.66]);
            appendBox(lx, y, lz, id, [0.3, 0.28, 0.38, 0.7, 0.78, 0.62]);
            appendBox(lx, y, lz, BLOCK.LUMEN_BLOOM, [0.43, 0.4, 0.34, 0.57, 0.57, 0.66]);
            continue;
          }
          if (!waterOnly && definition?.stonewrightCutter) {
            appendBox(lx, y, lz, BLOCK.PLANKS, [0.08, 0, 0.08, 0.92, 0.18, 0.92]);
            appendBox(lx, y, lz, BLOCK.POLISHED_STONE, [0.12, 0.16, 0.12, 0.88, 0.34, 0.88]);
            appendBox(lx, y, lz, id, [0.44, 0.32, 0.42, 0.56, 0.78, 0.58]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.12, 0.72, 0.36, 0.88, 0.82, 0.64]);
            appendBox(lx, y, lz, BLOCK.GLASS, [0.46, 0.72, 0.28, 0.54, 0.94, 0.72]);
            continue;
          }
          if (!waterOnly && definition?.wayvault) {
            appendBox(lx, y, lz, id, [0.08, 0, 0.08, 0.92, 0.12, 0.92]);
            appendBox(lx, y, lz, id, [0.1, 0.1, 0.1, 0.9, 0.68, 0.9]);
            appendBox(lx, y, lz, id, [0.06, 0.68, 0.06, 0.94, 0.88, 0.94]);
            appendBox(lx, y, lz, BLOCK.LUMEN_BLOOM, [0.42, 0.42, 0.035, 0.58, 0.62, 0.12]);
            continue;
          }
          if (!waterOnly && definition?.hearthcake) {
            const [left, , z0, right, , z1] = hearthcakeBounds(id);
            appendBox(lx, y, lz, id, [left, 0, z0, right, 0.4, z1]);
            appendBox(lx, y, lz, BLOCK.SNOW, [left, 0.38, z0 - 0.02, right, 0.5, z1 + 0.02]);
            for (const x0 of [0.27, 0.5, 0.73]) if (x0 > left + 0.04) {
              appendBox(lx, y, lz, BLOCK.SUNPETAL, [x0 - 0.045, 0.49, 0.34, x0 + 0.045, 0.56, 0.43]);
              appendBox(lx, y, lz, BLOCK.SUNPETAL, [x0 - 0.045, 0.49, 0.57, x0 + 0.045, 0.56, 0.66]);
            }
            continue;
          }
          if (!waterOnly && definition?.storageContainer === 'barrel') {
            appendBox(lx, y, lz, id, [0.08, 0.02, 0.08, 0.92, 0.92, 0.92]);
            appendBox(lx, y, lz, BLOCK.WOOD, [0.05, 0, 0.05, 0.95, 0.12, 0.95]);
            appendBox(lx, y, lz, BLOCK.WOOD, [0.05, 0.84, 0.05, 0.95, 0.94, 0.95]);
            for (const y0 of [0.18, 0.7]) appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.04, y0, 0.035, 0.96, y0 + 0.07, 0.965]);
            appendBox(lx, y, lz, id, [0.31, 0.91, 0.31, 0.69, 0.97, 0.69]);
            continue;
          }
          if (!waterOnly && definition?.model === 'chest') {
            // An inset body, raised lid, wooden bands, and forward-facing latch keep
            // storage readable at a glance instead of rendering as a terrain cube.
            appendBox(lx, y, lz, id, [0.08, 0.04, 0.08, 0.92, 0.64, 0.92]);
            appendBox(lx, y, lz, id, [0.04, 0.62, 0.04, 0.96, 0.86, 0.96]);
            appendBox(lx, y, lz, BLOCK.WOOD, [0.03, 0.04, 0.03, 0.97, 0.13, 0.97]);
            appendBox(lx, y, lz, BLOCK.WOOD, [0.03, 0.57, 0.03, 0.97, 0.67, 0.97]);
            appendBox(lx, y, lz, BLOCK.WOOD, [0.03, 0.78, 0.03, 0.97, 0.87, 0.97]);
            appendBox(lx, y, lz, BLOCK.IRON_ORE, [0.42, 0.45, 0.015, 0.58, 0.69, 0.1]);
            continue;
          }
          if (!waterOnly && definition?.torch) {
            torchGeometry(id).forEach((part) => appendBox(lx, y, lz, part.material, part.bounds));
            continue;
          }
          if (!waterOnly && definition?.resonanceBox) {
            appendBox(lx, y, lz, id, [0.04, 0, 0.04, 0.96, 0.82, 0.96]);
            appendBox(lx, y, lz, BLOCK.PLANKS, [0, 0.12, 0, 1, 0.22, 1]);
            appendBox(lx, y, lz, BLOCK.PLANKS, [0, 0.7, 0, 1, 0.82, 1]);
            appendBox(lx, y, lz, BLOCK.LUMEN_BLOOM, [0.36, 0.8, 0.36, 0.64, 0.94, 0.64]);
            continue;
          }
          if (!waterOnly && definition?.waystar) {
            appendBox(lx, y, lz, BLOCK.FORGED_IRON_BLOCK, [0.06, 0, 0.06, 0.94, 0.14, 0.94]);
            appendBox(lx, y, lz, BLOCK.GLASS, [0.12, 0.14, 0.12, 0.88, 0.82, 0.88]);
            appendBox(lx, y, lz, id, [0.3, 0.28, 0.3, 0.7, 0.7, 0.7]);
            appendBox(lx, y, lz, BLOCK.LUMEN_BLOOM, [0.42, 0.78, 0.42, 0.58, 0.94, 0.58]);
            continue;
          }
          if (!waterOnly && definition?.hearthsongPlayer) {
            appendBox(lx, y, lz, BLOCK.PLANKS, [0.04, 0, 0.04, 0.96, 0.18, 0.96]);
            appendBox(lx, y, lz, id, [0.08, 0.18, 0.08, 0.92, 0.8, 0.92]);
            appendBox(lx, y, lz, BLOCK.WOOD, [0.18, 0.78, 0.18, 0.82, 0.9, 0.82]);
            appendBox(lx, y, lz, id, [0.34, 0.8, 0.34, 0.66, 0.86, 0.66]);
            continue;
          }
          if (!waterOnly && definition?.forgeFunnel) {
            funnelBounds(id).forEach((bounds, index) => appendBox(lx, y, lz, index < 4 ? BLOCK.IRON_ORE : id, bounds));
            continue;
          }
          if (!waterOnly && definition?.forgeEjector) {
            ejectorBounds(id).forEach((bounds, index) => appendBox(lx, y, lz, index === 1 ? BLOCK.IRON_ORE : id, bounds));
            continue;
          }
          if (!waterOnly && definition?.runeDispenser) {
            dispenserBounds(id).forEach((bounds, index) => appendBox(lx, y, lz, index === 1 || index === 2 ? BLOCK.LUMEN_ORE : id, bounds));
            continue;
          }
          if (!waterOnly && definition?.changeSentry) {
            sentryBounds(id).forEach((bounds, index) => appendBox(lx, y, lz, index === 2 ? BLOCK.CHISELED_STONE : index === 3 ? BLOCK.LUMEN_ORE : id, bounds));
            continue;
          }
          if (!waterOnly && definition?.mossweaveCarpet) {
            appendBox(lx, y, lz, id, [0, 0, 0, 1, 0.0625, 1]);
            continue;
          }
          if (!waterOnly && definition?.bed) {
            const frameId = BLOCK.PLANKS;
            appendBox(lx, y, lz, frameId, [0.05, 0.12, 0.05, 0.95, 0.28, 0.95]);
            appendBox(lx, y, lz, frameId, [0.08, 0, 0.08, 0.22, 0.18, 0.22]);
            appendBox(lx, y, lz, frameId, [0.78, 0, 0.08, 0.92, 0.18, 0.22]);
            appendBox(lx, y, lz, frameId, [0.08, 0, 0.78, 0.22, 0.18, 0.92]);
            appendBox(lx, y, lz, frameId, [0.78, 0, 0.78, 0.92, 0.18, 0.92]);
            appendBox(lx, y, lz, id, [0.04, 0.27, 0.04, 0.96, 0.48, 0.96]);
            if (definition.bedPart === 'head') {
              const pillow = definition.bedOrientation === 'n' ? [0.12, 0.44, 0.08, 0.88, 0.5, 0.36]
                : definition.bedOrientation === 's' ? [0.12, 0.44, 0.64, 0.88, 0.5, 0.92]
                  : definition.bedOrientation === 'e' ? [0.64, 0.44, 0.12, 0.92, 0.5, 0.88]
                    : [0.08, 0.44, 0.12, 0.36, 0.5, 0.88];
              appendBox(lx, y, lz, id, pillow);
            }
            continue;
          }
          if (!waterOnly && definition?.model === 'snowLayer') {
            appendBox(lx, y, lz, id, [0, 0, 0, 1, definition.collisionHeight, 1]);
            continue;
          }
          if (!waterOnly && definition?.model?.startsWith('trap')) {
            this.collisionBoxes(wx, y, wz).forEach((bounds) => appendBox(lx, y, lz, id, bounds));
            continue;
          }
          if (!waterOnly && definition?.model?.startsWith('stair')) {
            appendBox(lx, y, lz, id, [0, 0, 0, 1, 0.5, 1]);
            const upper = definition.model.endsWith('N') ? [0, 0.5, 0, 1, 1, 0.5]
              : definition.model.endsWith('S') ? [0, 0.5, 0.5, 1, 1, 1]
                : definition.model.endsWith('E') ? [0.5, 0.5, 0, 1, 1, 1]
                  : [0, 0.5, 0, 0.5, 1, 1];
            appendBox(lx, y, lz, id, upper);
            continue;
          }
          if (!waterOnly && definition?.model?.startsWith('gate')) {
            const alongX = definition.model.endsWith('X');
            const open = definition.model.startsWith('gateOpen');
            const postBoxes = alongX
              ? [[0, 0, 0.36, 0.18, 1.35, 0.64], [0.82, 0, 0.36, 1, 1.35, 0.64]]
              : [[0.36, 0, 0, 0.64, 1.35, 0.18], [0.36, 0, 0.82, 0.64, 1.35, 1]];
            postBoxes.forEach((bounds) => appendBox(lx, y, lz, id, bounds));
            if (!open && alongX) {
              appendBox(lx, y, lz, id, [0.16, 0.43, 0.41, 0.84, 0.65, 0.59]);
              appendBox(lx, y, lz, id, [0.16, 0.93, 0.41, 0.84, 1.15, 0.59]);
            } else if (!open) {
              appendBox(lx, y, lz, id, [0.41, 0.43, 0.16, 0.59, 0.65, 0.84]);
              appendBox(lx, y, lz, id, [0.41, 0.93, 0.16, 0.59, 1.15, 0.84]);
            } else if (alongX) {
              appendBox(lx, y, lz, id, [0.12, 0.43, 0.5, 0.3, 0.65, 1]);
              appendBox(lx, y, lz, id, [0.12, 0.93, 0.5, 0.3, 1.15, 1]);
              appendBox(lx, y, lz, id, [0.7, 0.43, 0, 0.88, 0.65, 0.5]);
              appendBox(lx, y, lz, id, [0.7, 0.93, 0, 0.88, 1.15, 0.5]);
            } else {
              appendBox(lx, y, lz, id, [0.5, 0.43, 0.12, 1, 0.65, 0.3]);
              appendBox(lx, y, lz, id, [0.5, 0.93, 0.12, 1, 1.15, 0.3]);
              appendBox(lx, y, lz, id, [0, 0.43, 0.7, 0.5, 0.65, 0.88]);
              appendBox(lx, y, lz, id, [0, 0.93, 0.7, 0.5, 1.15, 0.88]);
            }
            continue;
          }
          if (!waterOnly && definition?.model === 'fence') {
            const width = definition.wall ? 0.34 : 0.25;
            const half = width / 2;
            const railHalf = definition.wall ? 0.17 : 0.105;
            const connects = (dx, dz) => {
              const neighbor = BLOCKS[this.getBlock(wx + dx, y, wz + dz)];
              return neighbor?.model === 'fence' || neighbor?.model?.startsWith('gate')
                || Boolean(neighbor?.solid && neighbor.model !== 'slab' && !neighbor.transparent && !neighbor.door && !neighbor.trapdoor && !neighbor.bed && !neighbor.mossweaveCarpet);
            };
            appendBox(lx, y, lz, id, [0.5 - half, 0, 0.5 - half, 0.5 + half, 1.45, 0.5 + half]);
            const addRails = (boundsA, boundsB) => {
              appendBox(lx, y, lz, id, boundsA);
              appendBox(lx, y, lz, id, boundsB);
            };
            if (connects(-1, 0)) addRails([0, 0.42, 0.5 - railHalf, 0.5, 0.65, 0.5 + railHalf], [0, 0.92, 0.5 - railHalf, 0.5, 1.15, 0.5 + railHalf]);
            if (connects(1, 0)) addRails([0.5, 0.42, 0.5 - railHalf, 1, 0.65, 0.5 + railHalf], [0.5, 0.92, 0.5 - railHalf, 1, 1.15, 0.5 + railHalf]);
            if (connects(0, -1)) addRails([0.5 - railHalf, 0.42, 0, 0.5 + railHalf, 0.65, 0.5], [0.5 - railHalf, 0.92, 0, 0.5 + railHalf, 1.15, 0.5]);
            if (connects(0, 1)) addRails([0.5 - railHalf, 0.42, 0.5, 0.5 + railHalf, 0.65, 1], [0.5 - railHalf, 0.92, 0.5, 0.5 + railHalf, 1.15, 1]);
            continue;
          }
          if (!waterOnly && definition?.pane) {
            paneBoxes(this, wx, y, wz).forEach((bounds) => appendBox(lx, y, lz, id, bounds));
            continue;
          }
          if (!waterOnly && definition?.model?.startsWith('panel')) {
            const alongX = definition.model === 'panelX' || definition.model === 'panelOpenZ';
            const offset = definition.model.startsWith('panelOpen') ? 0.1 : 0.5;
            const corners = alongX
              ? [[offset, 0, 0], [offset, 1, 0], [offset, 1, 1], [offset, 0, 1]]
              : [[0, 0, offset], [0, 1, offset], [1, 1, offset], [1, 0, offset]];
            const normal = alongX ? [1, 0, 0] : [0, 0, 1];
            const base = positions.length / 3;
            const faceUVs = tileUVs(blockTexture(id, 0));
            const color = litColor(id, 0, wx, y, wz);
            corners.forEach((corner, cornerIndex) => {
              positions.push(lx + corner[0], y + corner[1], lz + corner[2]);
              normals.push(...normal);
              colors.push(...color);
              uvs.push(...faceUVs[cornerIndex]);
            });
            indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
            indices.push(base + 2, base + 1, base, base + 3, base + 2, base);
            continue;
          }
          if (!waterOnly && definition?.model === 'cross') {
            const cropHeight = definition.cropHeight || 1;
            const inset = definition.crossInset || 0;
            const far = 1 - inset;
            const faceUVs = tileUVs(blockTexture(id, 0));
            const color = litColor(id, 0, wx, y, wz);
            const quads = [
              { normal: [-0.707, 0, 0.707], corners: [[inset, 0, inset], [inset, cropHeight, inset], [far, cropHeight, far], [far, 0, far]] },
              { normal: [-0.707, 0, -0.707], corners: [[far, 0, inset], [far, cropHeight, inset], [inset, cropHeight, far], [inset, 0, far]] },
            ];
            for (const quad of quads) {
              const base = positions.length / 3;
              quad.corners.forEach((corner, cornerIndex) => {
                positions.push(lx + corner[0], y + corner[1], lz + corner[2]);
                normals.push(...quad.normal);
                colors.push(...color);
                uvs.push(...faceUVs[cornerIndex]);
              });
              indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
              indices.push(base + 2, base + 1, base, base + 3, base + 2, base);
            }
            continue;
          }
          for (const face of FACES) {
            const neighbor = this.getBlock(wx + face.dir[0], y + face.dir[1], wz + face.dir[2]);
            const neighborDefinition = BLOCKS[neighbor];
            const slab = definition?.model === 'slab';
            const sameLiquid = isLiquid && fluidKind(neighbor) === fluidKind(id);
            const visible = isLiquid
              ? sameLiquid
                ? face.dir[1] === 0 && fluidSurfaceHeight(neighbor) + 0.001 < fluidSurfaceHeight(id)
                : !neighborDefinition?.solid
              : slab
                ? face.dir[1] > 0 || neighbor === BLOCK.AIR || isLiquidBlock(neighbor) || !neighborDefinition?.solid
                : neighbor === BLOCK.AIR || isLiquidBlock(neighbor) || !neighborDefinition?.solid
                  || neighborDefinition?.model === 'slab' || neighborDefinition?.model?.startsWith('stair')
                  || neighborDefinition?.trapdoor || neighborDefinition?.bed || neighborDefinition?.scaffold || neighborDefinition?.sunhive || neighborDefinition?.wayvault || neighborDefinition?.storageContainer || neighborDefinition?.forgeFunnel || neighborDefinition?.forgeEjector || neighborDefinition?.runeDispenser || neighborDefinition?.changeSentry || neighborDefinition?.pane || neighborDefinition?.hearthcake || neighborDefinition?.mossweaveCarpet;
            if (!visible) continue;
            const base = positions.length / 3;
            const color = litColor(id, face.dir[1], wx + face.dir[0], y + face.dir[1], wz + face.dir[2]);
            const faceUVs = tileUVs(blockTexture(id, face.dir[1]));
            face.corners.forEach((corner, cornerIndex) => {
              const cornerY = isLiquid && corner[1] > 0 ? fluidSurfaceHeight(id)
                : slab && corner[1] > 0 ? 0.5 : corner[1];
              positions.push(lx + corner[0], y + cornerY, lz + corner[2]);
              normals.push(...face.dir);
              colors.push(...color);
              uvs.push(...faceUVs[cornerIndex]);
            });
            indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
          }
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    return geometry;
  }

  rebuildChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    // Rendering owns the responsibility for loading voxel data. Previously this
    // returned early for untouched chunks, leaving permanent holes until another
    // system happened to query their blocks.
    const data = this.getChunk(cx, cz);
    if (!this.chunkDataIsHealthy(data)) return false;
    const lightField = new VoxelLightField(this, cx * CHUNK_SIZE, cz * CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE, WORLD_DEPTH, 8, WORLD_MIN_Y);
    const solidGeometry = this.buildGeometry(cx, cz, false, false, false, lightField);
    const waterGeometry = this.buildGeometry(cx, cz, true, false, false, lightField);
    const lavaGeometry = this.buildGeometry(cx, cz, false, false, true, lightField);
    const transparentGeometry = this.buildGeometry(cx, cz, false, true, false, lightField);
    if (!this.geometryIsHealthy(solidGeometry)
      || !this.geometryIsHealthy(waterGeometry, true)
      || !this.geometryIsHealthy(lavaGeometry, true)
      || !this.geometryIsHealthy(transparentGeometry, true)) {
      for (const geometry of [solidGeometry, waterGeometry, lavaGeometry, transparentGeometry]) geometry.dispose();
      return false;
    }

    // Publish a complete replacement atomically. Keeping the old render meshes
    // alive until every new geometry has passed validation prevents a failed or
    // partial rebuild from punching a visible window through the world.
    this.removeMeshes(key);
    this.lightFields.set(key, lightField);
    const passCounts = {
      solid: solidGeometry.getAttribute('position').count,
      water: waterGeometry.getAttribute('position').count,
      lava: lavaGeometry.getAttribute('position').count,
      transparent: transparentGeometry.getAttribute('position').count,
    };
    const markChunkMesh = (mesh, pass) => {
      mesh.userData.chunk = { cx, cz };
      mesh.userData.chunkData = data;
      mesh.userData.renderPass = pass;
      mesh.userData.expectedPositions = passCounts[pass];
      mesh.geometry.addEventListener('dispose', () => { mesh.userData.geometryDisposed = true; });
    };
    const solid = new THREE.Mesh(solidGeometry, this.solidMaterial);
    solid.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
    markChunkMesh(solid, 'solid');
    solid.userData.passCounts = passCounts;
    this.scene.add(solid);
    this.meshes.set(key, solid);

    if (waterGeometry.getAttribute('position').count > 0) {
      const water = new THREE.Mesh(waterGeometry, this.waterMaterial);
      water.position.copy(solid.position);
      markChunkMesh(water, 'water');
      this.scene.add(water);
      this.waterMeshes.set(key, water);
    } else {
      waterGeometry.dispose();
    }
    if (lavaGeometry.getAttribute('position').count > 0) {
      const lava = new THREE.Mesh(lavaGeometry, this.lavaMaterial);
      lava.position.copy(solid.position);
      markChunkMesh(lava, 'lava');
      this.scene.add(lava);
      this.lavaMeshes.set(key, lava);
    } else {
      lavaGeometry.dispose();
    }
    if (transparentGeometry.getAttribute('position').count > 0) {
      const transparent = new THREE.Mesh(transparentGeometry, this.transparentMaterial);
      transparent.position.copy(solid.position);
      markChunkMesh(transparent, 'transparent');
      transparent.renderOrder = 1;
      this.scene.add(transparent);
      this.transparentMeshes.set(key, transparent);
    } else {
      transparentGeometry.dispose();
    }
    return solid.geometry.getAttribute('position').count > 0;
  }

  removeMeshes(key) {
    for (const map of [this.meshes, this.waterMeshes, this.lavaMeshes, this.transparentMeshes]) {
      const mesh = map.get(key);
      if (mesh) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        map.delete(key);
      }
    }
    this.lightFields.delete(key);
  }

  update(playerPosition) {
    const cx = floorDiv(playerPosition.x, CHUNK_SIZE);
    const cz = floorDiv(playerPosition.z, CHUNK_SIZE);
    const center = chunkKey(cx, cz);
    if (center !== this.lastCenter) {
      this.lastCenter = center;
      const wanted = [];
      for (let dz = -this.renderRadius; dz <= this.renderRadius; dz += 1) {
        for (let dx = -this.renderRadius; dx <= this.renderRadius; dx += 1) {
          wanted.push({ cx: cx + dx, cz: cz + dz, distance: dx * dx + dz * dz });
        }
      }
      wanted.sort((a, b) => a.distance - b.distance);
      this.buildQueue = wanted.filter(({ cx: x, cz: z }) => Math.abs(x - cx) > 1 || Math.abs(z - cz) > 1)
        .filter(({ cx: x, cz: z }) => !this.chunkMeshIsHealthy(x, z));
      for (const key of [...this.meshes.keys()]) {
        const [x, z] = key.split(',').map(Number);
        if (Math.abs(x - cx) > this.renderRadius + 1 || Math.abs(z - cz) > this.renderRadius + 1) {
          this.removeMeshes(key);
          this.chunks.delete(key);
          this.generatedCaveLights.delete(key);
        }
      }
    }
    // The player must never be rendered beside an absent chunk. A 3x3 safety
    // ring is small enough to build synchronously on first load, and crossing a
    // chunk boundary normally adds only three new chunks. Outer view-distance
    // chunks continue to stream one per frame.
    this.ensureSafetyRing(playerPosition);
    this.buildQueue = this.buildQueue.filter(({ cx: x, cz: z }) => !this.chunkMeshIsHealthy(x, z));
    // Repair a missing/disposed/empty active mesh even if the player remains in
    // the same center chunk. This turns transient renderer loss into a bounded
    // rebuild instead of a permanent window through the world.
    if (!this.buildQueue.length) {
      const missing = this.activeChunkIntegrity(playerPosition).missing;
      if (missing.length) this.buildQueue.push(...missing);
    }
    const next = this.buildQueue.shift();
    if (next) this.rebuildChunk(next.cx, next.cz);
  }

  chunkMeshIsHealthy(cx, cz) {
    const key = chunkKey(cx, cz);
    const mesh = this.meshes.get(key);
    const data = this.chunks.get(key);
    const passCounts = mesh?.userData?.passCounts;
    if (!(data instanceof VOXEL_ARRAY_TYPE) || !passCounts) return false;
    const passIsHealthy = (candidate, pass, expectedPositions) => {
      if (expectedPositions === 0) return !candidate;
      const positions = candidate?.geometry?.getAttribute?.('position');
      const index = candidate?.geometry?.getIndex?.();
      return Boolean(candidate
        && candidate.parent === this.scene
        && !candidate.userData.geometryDisposed
        && candidate.userData.chunk?.cx === cx
        && candidate.userData.chunk?.cz === cz
        && candidate.userData.chunkData === data
        && candidate.userData.renderPass === pass
        && candidate.userData.expectedPositions === expectedPositions
        && positions?.count === expectedPositions
        && index?.count > 0
        && Number.isFinite(candidate.geometry.boundingSphere?.radius));
    };
    return Boolean(mesh
      && mesh.parent === this.scene
      && !mesh.userData.geometryDisposed
      && mesh.userData.chunk?.cx === cx
      && mesh.userData.chunk?.cz === cz
      && mesh.userData.chunkData === data
      && passIsHealthy(mesh, 'solid', passCounts.solid)
      && passIsHealthy(this.waterMeshes.get(key), 'water', passCounts.water)
      && passIsHealthy(this.lavaMeshes.get(key), 'lava', passCounts.lava)
      && passIsHealthy(this.transparentMeshes.get(key), 'transparent', passCounts.transparent));
  }

  chunkDataIsHealthy(data) {
    if (!(data instanceof VOXEL_ARRAY_TYPE) || data.length !== CHUNK_SIZE * WORLD_DEPTH * CHUNK_SIZE) return false;
    let occupied = 0;
    for (const id of data) {
      if (!BLOCKS[id]) return false;
      if (id !== BLOCK.AIR) occupied += 1;
    }
    return occupied > 0;
  }

  geometryIsHealthy(geometry, allowEmpty = false) {
    const positions = geometry?.getAttribute?.('position');
    const index = geometry?.getIndex?.();
    if (allowEmpty && positions?.count === 0 && index?.count === 0) return true;
    return Boolean(positions?.count > 0
      && index?.count > 0
      && positions.count % 4 === 0
      && index.count % 6 === 0
      && Number.isFinite(geometry.boundingSphere?.radius));
  }

  ensureSafetyRing(playerPosition, radius = 1) {
    const cx = floorDiv(playerPosition.x, CHUNK_SIZE);
    const cz = floorDiv(playerPosition.z, CHUNK_SIZE);
    const missing = [];
    for (let dz = -radius; dz <= radius; dz += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (!this.chunkMeshIsHealthy(cx + dx, cz + dz)) missing.push({ cx: cx + dx, cz: cz + dz, distance: dx * dx + dz * dz });
      }
    }
    missing.sort((a, b) => a.distance - b.distance);
    for (const chunk of missing) this.rebuildChunk(chunk.cx, chunk.cz);
    return missing.length;
  }

  activeChunkIntegrity(playerPosition) {
    const cx = floorDiv(playerPosition.x, CHUNK_SIZE);
    const cz = floorDiv(playerPosition.z, CHUNK_SIZE);
    const missing = [];
    let valid = 0;
    for (let dz = -this.renderRadius; dz <= this.renderRadius; dz += 1) {
      for (let dx = -this.renderRadius; dx <= this.renderRadius; dx += 1) {
        const x = cx + dx;
        const z = cz + dz;
        if (!this.chunkMeshIsHealthy(x, z)) missing.push({ cx: x, cz: z, distance: dx * dx + dz * dz });
        else valid += 1;
      }
    }
    missing.sort((a, b) => a.distance - b.distance);
    return { valid, expected: (this.renderRadius * 2 + 1) ** 2, missing };
  }

  setRenderRadius(value) {
    if (!Number.isFinite(value)) return false;
    const next = Math.max(1, Math.min(4, Math.round(value)));
    if (next !== this.renderRadius) {
      this.renderRadius = next;
      this.lastCenter = '';
      this.buildQueue.length = 0;
    }
    return true;
  }

  raycastLiquid(camera, distance = 10, liquidId = BLOCK.WATER, sourceOnly = false) {
    const origin = camera.getWorldPosition(new THREE.Vector3());
    const direction = camera.getWorldDirection(new THREE.Vector3()).normalize();
    const point = new THREE.Vector3();
    for (let traveled = 0.2; traveled <= distance; traveled += 0.15) {
      point.copy(origin).addScaledVector(direction, traveled);
      const x = Math.floor(point.x);
      const y = Math.floor(point.y);
      const z = Math.floor(point.z);
      const id = this.getBlock(x, y, z);
      const requestedKind = fluidKind(liquidId);
      if ((requestedKind ? fluidKind(id) !== requestedKind : id !== liquidId) || (sourceOnly && id !== liquidId)) {
        if (BLOCKS[id]?.solid) return null;
        continue;
      }
      let surfaceY = y;
      while (surfaceY + 1 < WORLD_HEIGHT && fluidKind(this.getBlock(x, surfaceY + 1, z)) === requestedKind) surfaceY += 1;
      const surfaceId = this.getBlock(x, surfaceY, z);
      return { x, y: surfaceY, z, distance: traveled, id: surfaceId, surface: surfaceY + fluidSurfaceHeight(surfaceId) };
    }
    return null;
  }

  raycast(camera, distance = 6) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = distance;
    const hit = raycaster.intersectObjects([...this.meshes.values(), ...this.transparentMeshes.values()], false)[0];
    if (!hit?.face) return null;
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const breakVoxel = this.resolveBreakVoxel(hit.point, normal);
    const placePoint = hit.point.clone().addScaledVector(normal, 0.01);
    return {
      break: breakVoxel,
      place: placePoint.floor(),
      point: hit.point,
      normal,
      distance: hit.distance,
    };
  }

  resolveBreakVoxel(point, normal) {
    const voxel = point.clone().addScaledVector(normal, -0.01).floor();
    if (this.getBlock(voxel.x, voxel.y, voxel.z) !== BLOCK.AIR || voxel.y <= WORLD_MIN_Y) return voxel;
    const belowY = voxel.y - 1;
    const height = this.collisionHeight(voxel.x, belowY, voxel.z);
    if (height > 1 && point.y <= belowY + height + 0.01) voxel.y = belowY;
    return voxel;
  }

  loadEdits() {
    const loaded = loadWorldEdits(globalThis.localStorage, this.editsKey);
    this.editsStatus = loaded.status;
    return new Map(loaded.edits);
  }

  saveEdits() {
    return writeWorldEdits(globalThis.localStorage, this.editsKey, [...this.edits]).ok;
  }
}
