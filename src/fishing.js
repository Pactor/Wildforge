import * as THREE from 'three';

export const FISHING_LOOT = Object.freeze([
  { id: 'raw_silverfin', weight: 0.72, min: 1, max: 1 },
  { id: 'tidefiber', weight: 0.16, min: 1, max: 2 },
  { id: 'raw_glowkelp', weight: 0.08, min: 1, max: 2 },
  { id: 'lumen_shard', weight: 0.04, min: 1, max: 1 },
]);

export function fishingLoot(random = Math.random) {
  let roll = random();
  let selected = FISHING_LOOT.at(-1);
  for (const entry of FISHING_LOOT) {
    roll -= entry.weight;
    if (roll <= 0) {
      selected = entry;
      break;
    }
  }
  const count = selected.min + Math.floor(random() * (selected.max - selected.min + 1));
  return { id: selected.id, count };
}

export class FishingSystem {
  constructor(scene = null, random = Math.random) {
    this.random = random;
    this.active = false;
    this.phase = 'idle';
    this.waitRemaining = 0;
    this.biteRemaining = 0;
    this.age = 0;
    this.basePosition = new THREE.Vector3();
    this.root = new THREE.Group();
    this.root.name = 'Fishing Cast';
    this.root.visible = false;
    const lower = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.12, 0.18),
      new THREE.MeshLambertMaterial({ color: 0xe7e2c9, flatShading: true }),
    );
    const upper = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.11, 0.14),
      new THREE.MeshLambertMaterial({ color: 0xd85c4f, flatShading: true }),
    );
    lower.position.y = -0.04;
    upper.position.y = 0.075;
    this.root.add(lower, upper);
    this.line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: 0xd7ddd4 }),
    );
    this.line.visible = false;
    scene?.add(this.root, this.line);
  }

  cast(position) {
    if (this.active || !position) return false;
    this.active = true;
    this.phase = 'waiting';
    this.waitRemaining = 3 + this.random() * 5;
    this.biteRemaining = 0;
    this.age = 0;
    this.basePosition.copy(position);
    this.root.position.copy(position);
    this.root.visible = true;
    this.line.visible = true;
    return true;
  }

  cancel() {
    const wasActive = this.active;
    this.active = false;
    this.phase = 'idle';
    this.root.visible = false;
    this.line.visible = false;
    return wasActive;
  }

  reel() {
    if (!this.active) return { status: 'idle' };
    if (this.phase !== 'bite') {
      this.cancel();
      return { status: 'early' };
    }
    const loot = fishingLoot(this.random);
    this.cancel();
    return { status: 'caught', loot };
  }

  update(dt, lineOrigin = null) {
    if (!this.active || !Number.isFinite(dt) || dt <= 0) return null;
    this.age += dt;
    this.root.position.copy(this.basePosition);
    const bob = this.phase === 'bite' ? -0.09 + Math.sin(this.age * 18) * 0.045 : Math.sin(this.age * 2.8) * 0.035;
    this.root.position.y += bob;
    if (lineOrigin) this.line.geometry.setFromPoints([lineOrigin, this.root.position]);
    if (this.phase === 'waiting') {
      this.waitRemaining -= dt;
      if (this.waitRemaining > 0) return null;
      this.phase = 'bite';
      this.biteRemaining = 1.65;
      return { type: 'bite' };
    }
    this.biteRemaining -= dt;
    if (this.biteRemaining > 0) return null;
    this.cancel();
    return { type: 'escaped' };
  }
}
