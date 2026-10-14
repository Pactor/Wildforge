import * as THREE from 'three';
import { WORLD_MIN_Y } from './worldBounds.js';
import { BLOCK } from './blocks.js';

export function experienceForNextLevel(level) {
  const safeLevel = Math.max(0, Math.floor(Number(level) || 0));
  return 8 + safeLevel * 3 + Math.floor(Math.pow(safeLevel, 1.18));
}

export function blockExperience(blockId) {
  return ({
    [BLOCK.COAL]: 1,
    [BLOCK.IRON_ORE]: 2,
    [BLOCK.LUMEN_ORE]: 4,
    [BLOCK.EMBERITE_ORE]: 5,
    [BLOCK.VOIDGLASS_ORE]: 8,
    [BLOCK.CINDER_CRYSTAL_ORE]: 10,
    [BLOCK.SHADOW_DEN]: 6,
  })[blockId] || 0;
}

export function smeltingExperience(recipeId) {
  return ({
    iron_ingot: 2,
    emberite_ingot: 4,
    glass: 1,
    cooked_meat: 1,
    roasted_glowkelp: 1,
    cooked_silverfin: 2,
    seared_ashcap: 1,
    roasted_rimepod: 1,
  })[recipeId] || 0;
}

export class ExperienceState {
  constructor(serialized = null) {
    this.level = Math.max(0, Math.min(9999, Math.floor(Number(serialized?.level) || 0)));
    this.progress = Math.max(0, Math.floor(Number(serialized?.progress) || 0));
    this.progress = Math.min(this.progress, experienceForNextLevel(this.level) - 1);
    this.totalCollected = Math.max(0, Math.floor(Number(serialized?.totalCollected) || 0));
  }

  add(amount) {
    let remaining = Math.max(0, Math.min(1000000, Math.floor(Number(amount) || 0)));
    const added = remaining;
    const before = this.level;
    while (remaining > 0 && this.level < 9999) {
      const needed = experienceForNextLevel(this.level) - this.progress;
      const step = Math.min(needed, remaining);
      this.progress += step;
      remaining -= step;
      if (this.progress >= experienceForNextLevel(this.level)) {
        this.level += 1;
        this.progress = 0;
      }
    }
    this.totalCollected += added - remaining;
    return { added: added - remaining, levelsGained: this.level - before, level: this.level, progress: this.progress };
  }

  ratio() {
    return this.progress / experienceForNextLevel(this.level);
  }

  currentPoints() {
    let points = this.progress;
    for (let level = 0; level < this.level; level += 1) points += experienceForNextLevel(level);
    return points;
  }

  spendLevels(count) {
    const levels = Math.max(0, Math.floor(Number(count) || 0));
    if (levels <= 0 || levels > this.level) return false;
    this.level -= levels;
    this.progress = Math.min(this.progress, experienceForNextLevel(this.level) - 1);
    return true;
  }

  dropOnDeath(fraction = 0.65, maximum = 100) {
    const current = this.currentPoints();
    const lost = Math.min(Math.max(0, Math.floor(Number(maximum) || 0)), Math.floor(current * Math.max(0, Math.min(1, Number(fraction) || 0))));
    const retained = current - lost;
    this.level = 0;
    this.progress = 0;
    let remaining = retained;
    while (remaining >= experienceForNextLevel(this.level) && this.level < 9999) {
      remaining -= experienceForNextLevel(this.level);
      this.level += 1;
    }
    this.progress = remaining;
    return lost;
  }

  serialize() {
    return { level: this.level, progress: this.progress, totalCollected: this.totalCollected };
  }
}

const WISP_GEOMETRY = new THREE.OctahedronGeometry(0.17, 0);

export class ExperienceWispManager {
  constructor(scene, world, player, onPickup = () => {}) {
    this.world = world;
    this.player = player;
    this.onPickup = onPickup;
    this.root = new THREE.Group();
    this.root.name = 'Experience Wisps';
    scene.add(this.root);
    this.wisps = [];
  }

  spawn(amount, position) {
    let remaining = Math.max(0, Math.min(256, Math.floor(Number(amount) || 0)));
    if (!position || remaining <= 0) return 0;
    let spawned = 0;
    for (const denomination of [11, 7, 3, 1]) {
      while (remaining >= denomination && spawned < 48) {
        this.spawnOne(denomination, position);
        remaining -= denomination;
        spawned += 1;
      }
    }
    if (remaining > 0) {
      if (this.wisps.length) this.wisps.at(-1).value += remaining;
      else {
        this.spawnOne(remaining, position);
        spawned += 1;
      }
    }
    while (this.wisps.length > 96) this.remove(this.wisps[0]);
    return spawned;
  }

  spawnOne(value, position) {
    const mesh = new THREE.Mesh(
      WISP_GEOMETRY,
      new THREE.MeshLambertMaterial({ color: 0xa8f05a, emissive: 0x3d8f45, emissiveIntensity: 0.72, flatShading: true }),
    );
    mesh.position.copy(position).add(new THREE.Vector3(0, 0.4, 0));
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.55 + Math.random() * 0.5;
    const wisp = {
      value,
      mesh,
      age: 0,
      velocity: new THREE.Vector3(Math.cos(angle) * speed, 1.8 + Math.random() * 0.9, Math.sin(angle) * speed),
    };
    this.root.add(mesh);
    this.wisps.push(wisp);
    return wisp;
  }

  remove(wisp) {
    this.root.remove(wisp.mesh);
    wisp.mesh.material.dispose();
    const index = this.wisps.indexOf(wisp);
    if (index >= 0) this.wisps.splice(index, 1);
  }

  update(dt) {
    dt = Math.max(0, Math.min(0.05, Number(dt) || 0));
    const target = this.player.position.clone().add(new THREE.Vector3(0, 0.8, 0));
    for (const wisp of [...this.wisps]) {
      wisp.age += dt;
      const offset = target.clone().sub(wisp.mesh.position);
      const distance = offset.length();
      if (wisp.age > 0.35 && distance < 7) {
        wisp.velocity.addScaledVector(offset.normalize(), dt * (18 - distance * 1.2));
        if (wisp.velocity.length() > 10) wisp.velocity.setLength(10);
      } else wisp.velocity.y -= 9.8 * dt;
      const next = wisp.mesh.position.clone().addScaledVector(wisp.velocity, dt);
      const blockY = Math.floor(next.y - 0.12);
      if (wisp.velocity.y < 0 && this.world.isSolid(next.x, blockY, next.z)) {
        next.y = blockY + 1.2;
        wisp.velocity.y = 0.75;
        wisp.velocity.x *= 0.72;
        wisp.velocity.z *= 0.72;
      }
      wisp.mesh.position.copy(next);
      const pulse = 0.82 + Math.sin(wisp.age * 8 + wisp.value) * 0.16;
      wisp.mesh.scale.setScalar(pulse);
      wisp.mesh.rotation.y += dt * 3.5;
      if (wisp.age > 0.4 && wisp.mesh.position.distanceTo(target) < 0.62) {
        this.onPickup(wisp.value);
        this.remove(wisp);
      } else if (wisp.age > 180 || wisp.mesh.position.y < WORLD_MIN_Y - 8) this.remove(wisp);
    }
  }
}
