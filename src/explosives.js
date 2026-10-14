import * as THREE from 'three';
import { BLOCK, BLOCKS, isLiquidBlock } from './blocks.js';
import { WORLD_HEIGHT, WORLD_MIN_Y } from './worldBounds.js';

export const BLAST_RADIUS = 4;
export const BLAST_FUSE = 3.2;
const MAX_PRIMED_KEGS = 64;
const KEG_HALF_HEIGHT = 0.46;

const statefulBlock = (id, definition = BLOCKS[id]) => id === BLOCK.CHEST || id === BLOCK.FURNACE
  || definition?.door || definition?.bed || definition?.sign || definition?.composter
  || definition?.campfire || definition?.dryingRack || definition?.charterPost || definition?.realmGate
  || definition?.infusionStill || definition?.furnaceMode || definition?.wayvault || definition?.storageContainer || definition?.resonanceBox || definition?.waystar || definition?.forgeEjector || definition?.runeDispenser || definition?.changeSentry || definition?.bindingRam;

export function blastProtected(id) {
  const definition = BLOCKS[id];
  return Boolean(!definition || definition.breakable === false || statefulBlock(id, definition));
}

function coordinateRoll(x, y, z) {
  let value = Math.imul(Math.floor(x) + 31, 73856093) ^ Math.imul(Math.floor(y) + 17, 19349663) ^ Math.imul(Math.floor(z) - 11, 83492791);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return (value ^ (value >>> 16)) >>> 0;
}

export function blastDamage(distance, radius = BLAST_RADIUS, maximum = 12) {
  distance = Math.max(0, Number(distance) || 0);
  radius = Math.max(0.5, Number(radius) || BLAST_RADIUS);
  if (distance >= radius * 1.65) return 0;
  const exposure = 1 - distance / (radius * 1.65);
  return Math.max(1, Math.round(Math.max(1, Number(maximum) || 12) * exposure * exposure));
}

export function blastPlan(world, center, radius = BLAST_RADIUS) {
  radius = Math.max(1, Math.min(8, Number(radius) || BLAST_RADIUS));
  const cx = Number(center?.x) || 0;
  const cy = Number(center?.y) || 0;
  const cz = Number(center?.z) || 0;
  const changes = new Map();
  const destroyed = [];
  const chain = [];
  const minX = Math.floor(cx - radius); const maxX = Math.ceil(cx + radius);
  const minY = Math.max(WORLD_MIN_Y + 1, Math.floor(cy - radius)); const maxY = Math.min(WORLD_HEIGHT - 1, Math.ceil(cy + radius));
  const minZ = Math.floor(cz - radius); const maxZ = Math.ceil(cz + radius);
  for (let y = minY; y <= maxY; y += 1) for (let z = minZ; z <= maxZ; z += 1) for (let x = minX; x <= maxX; x += 1) {
    const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy, z + 0.5 - cz);
    if (distance > radius + 0.35) continue;
    const id = world.getBlock(x, y, z);
    if (id === BLOCK.AIR || isLiquidBlock(id) || blastProtected(id)) continue;
    if (id === BLOCK.BLAST_KEG) {
      changes.set(`${x},${y},${z}`, { x, y, z, id: BLOCK.AIR });
      chain.push({ x, y, z, fuse: 0.35 + (coordinateRoll(x, y, z) % 650) / 1000 });
      continue;
    }
    const strength = Math.max(0, radius + 0.6 - distance) * 1.65;
    const hardness = Math.max(0.05, Number(BLOCKS[id]?.hardness) || 0.8);
    const variation = 0.82 + (coordinateRoll(x, y, z) % 37) / 100;
    if (hardness * variation > strength) continue;
    const drop = coordinateRoll(x + 101, y - 53, z + 211) % 100 < 32;
    changes.set(`${x},${y},${z}`, { x, y, z, id: BLOCK.AIR });
    destroyed.push({ x, y, z, id, drop });
  }

  // A blast that removes managed soil must not leave a floating crop or stale
  // farming record just outside the spherical edge.
  for (const change of [...changes.values()]) {
    const aboveId = world.getBlock(change.x, change.y + 1, change.z);
    const key = `${change.x},${change.y + 1},${change.z}`;
    if (BLOCKS[aboveId]?.crop && !changes.has(key)) {
      changes.set(key, { x: change.x, y: change.y + 1, z: change.z, id: BLOCK.AIR });
      destroyed.push({ x: change.x, y: change.y + 1, z: change.z, id: aboveId, drop: true });
    }
  }
  return { changes: [...changes.values()], destroyed, chain, radius };
}

function createPrimedKeg(scene, position) {
  const root = new THREE.Group();
  root.name = 'Primed Blast Keg';
  const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xa3503d, flatShading: true, emissive: 0x000000 });
  const bandMaterial = new THREE.MeshLambertMaterial({ color: 0x3d3433, flatShading: true, emissive: 0x000000 });
  const sparkMaterial = new THREE.MeshLambertMaterial({ color: 0xffd26a, emissive: 0xff8a32, emissiveIntensity: 1.1, flatShading: true });
  const part = (size, offset, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...offset);
    root.add(mesh);
    return mesh;
  };
  part([0.86, 0.84, 0.86], [0, 0, 0], bodyMaterial);
  part([0.94, 0.11, 0.94], [0, -0.29, 0], bandMaterial);
  part([0.94, 0.11, 0.94], [0, 0.29, 0], bandMaterial);
  part([0.12, 0.26, 0.12], [0, 0.53, 0], bandMaterial);
  const spark = part([0.13, 0.13, 0.13], [0, 0.7, 0], sparkMaterial);
  root.position.copy(position);
  root.userData.bodyMaterial = bodyMaterial;
  root.userData.bandMaterial = bandMaterial;
  root.userData.spark = spark;
  scene.add(root);
  return root;
}

function disposeKeg(scene, root) {
  scene.remove(root);
  const materials = new Set();
  root.traverse((child) => {
    child.geometry?.dispose?.();
    if (child.material) materials.add(child.material);
  });
  for (const material of materials) material.dispose?.();
}

export class PrimedBlastSystem {
  constructor(scene, world, serialized = null, options = {}) {
    this.scene = scene;
    this.world = world;
    this.entities = [];
    this.onDetonate = options.onDetonate || null;
    this.onBlockDestroyed = options.onBlockDestroyed || null;
    for (const record of serialized?.primed || []) {
      if (this.entities.length >= MAX_PRIMED_KEGS || !Array.isArray(record?.position) || record.position.length !== 3) break;
      const [x, y, z] = record.position.map(Number);
      if (![x, y, z].every(Number.isFinite) || Math.abs(x) > 1e6 || Math.abs(z) > 1e6 || y < WORLD_MIN_Y || y >= WORLD_HEIGHT) continue;
      this.add(new THREE.Vector3(x, y, z), Math.max(0.05, Math.min(10, Number(record.fuse) || BLAST_FUSE)), Number(record.velocityY) || 0);
    }
  }

  add(position, fuse = BLAST_FUSE, velocityY = 0) {
    if (this.entities.length >= MAX_PRIMED_KEGS) return null;
    const root = createPrimedKeg(this.scene, position);
    const entity = { root, fuse: Math.max(0.05, Math.min(10, Number(fuse) || BLAST_FUSE)), velocityY: Math.max(-28, Math.min(12, Number(velocityY) || 0)), age: 0 };
    this.entities.push(entity);
    return entity;
  }

  prime(x, y, z, fuse = BLAST_FUSE, removeBlock = true) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (this.entities.length >= MAX_PRIMED_KEGS || (removeBlock && this.world.getBlock(x, y, z) !== BLOCK.BLAST_KEG)) return null;
    if (removeBlock) this.world.setBlock(x, y, z, BLOCK.AIR);
    return this.add(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), fuse, 1.25);
  }

  remove(entity) {
    const index = this.entities.indexOf(entity);
    if (index < 0) return false;
    disposeKeg(this.scene, entity.root);
    this.entities.splice(index, 1);
    return true;
  }

  detonate(entity) {
    const center = entity.root.position.clone();
    this.remove(entity);
    return this.explodeAt(center, BLAST_RADIUS, { source: 'Blast Keg', maximumDamage: 12 });
  }

  explodeAt(center, radius = BLAST_RADIUS, context = {}) {
    center = center?.clone?.() || new THREE.Vector3(Number(center?.x) || 0, Number(center?.y) || 0, Number(center?.z) || 0);
    const plan = blastPlan(this.world, center, radius);
    this.world.setBlocks(plan.changes);
    for (const block of plan.destroyed) this.onBlockDestroyed?.(block, center);
    for (const chained of plan.chain) this.prime(chained.x, chained.y, chained.z, chained.fuse, false);
    this.onDetonate?.(center, plan.radius, plan.destroyed.length, plan.chain.length, {
      source: typeof context.source === 'string' && context.source ? context.source : 'Blast Keg',
      maximumDamage: Math.max(1, Math.min(32, Number(context.maximumDamage) || 12)),
    });
    return plan;
  }

  update(dt) {
    dt = Math.max(0, Math.min(0.1, Number(dt) || 0));
    for (const entity of [...this.entities]) {
      entity.age += dt;
      entity.fuse -= dt;
      entity.velocityY = Math.max(-28, entity.velocityY - 18 * dt);
      const movement = entity.velocityY * dt;
      const steps = Math.max(1, Math.ceil(Math.abs(movement) / 0.2));
      for (let step = 0; step < steps; step += 1) {
        const nextY = entity.root.position.y + movement / steps;
        const bottom = nextY - KEG_HALF_HEIGHT;
        const blockY = Math.floor(bottom);
        const groundId = this.world.getBlock(Math.floor(entity.root.position.x), blockY, Math.floor(entity.root.position.z));
        if (entity.velocityY < 0 && BLOCKS[groundId]?.solid && bottom < blockY + 1) {
          entity.root.position.y = blockY + 1 + KEG_HALF_HEIGHT;
          entity.velocityY = 0;
          break;
        }
        entity.root.position.y = nextY;
      }
      const rapid = entity.fuse < 1 ? 14 : 6;
      const flash = Math.sin(entity.age * rapid * Math.PI) > 0.25;
      entity.root.userData.bodyMaterial.emissive.setHex(flash ? 0x9b5c4e : 0x000000);
      entity.root.userData.bandMaterial.emissive.setHex(flash ? 0x4b3a36 : 0x000000);
      entity.root.userData.spark.scale.setScalar(0.7 + Math.abs(Math.sin(entity.age * 23)) * 0.65);
      entity.root.scale.setScalar(1 + (entity.fuse < 0.35 ? 0.08 : 0) * Math.abs(Math.sin(entity.age * 30)));
      if (entity.fuse <= 0) this.detonate(entity);
    }
  }

  serialize() {
    return {
      primed: this.entities.slice(0, MAX_PRIMED_KEGS).map((entity) => ({
        position: entity.root.position.toArray(),
        fuse: entity.fuse,
        velocityY: entity.velocityY,
      })),
    };
  }

  clear() {
    for (const entity of [...this.entities]) this.remove(entity);
  }
}
