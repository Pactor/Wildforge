import * as THREE from 'three';
import { BLOCK, BLOCKS } from './blocks.js';
import { WORLD_HEIGHT, WORLD_MIN_Y } from './worldBounds.js';

const FALL_GEOMETRY = new THREE.BoxGeometry(0.96, 0.96, 0.96);

export function isFallingBlock(id) {
  return Boolean(BLOCKS[id]?.falls);
}

export function fallingDestination(world, x, y, z) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  for (let targetY = y; targetY >= WORLD_MIN_Y; targetY -= 1) {
    if (world.getBlock(x, targetY, z) !== BLOCK.AIR) continue;
    if (targetY === WORLD_MIN_Y || world.getBlock(x, targetY - 1, z) !== BLOCK.AIR) return targetY;
  }
  return null;
}

export class FallingBlockSystem {
  constructor(scene, world, callbacks = {}) {
    this.scene = scene;
    this.world = world;
    this.onLand = callbacks.onLand || (() => {});
    this.onDrop = callbacks.onDrop || (() => {});
    this.canSettle = callbacks.canSettle || (() => true);
    this.root = new THREE.Group();
    this.root.name = 'Falling Blocks';
    this.scene.add(this.root);
    this.entities = [];
    this.maximum = 128;
    this.scanTimer = 0;
  }

  wake(x, y, z) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    const id = this.world.getBlock(x, y, z);
    if (!isFallingBlock(id) || y <= WORLD_MIN_Y || this.world.getBlock(x, y - 1, z) !== BLOCK.AIR || this.entities.length >= this.maximum) return null;
    this.world.setBlock(x, y, z, BLOCK.AIR);
    const mesh = new THREE.Mesh(FALL_GEOMETRY, new THREE.MeshLambertMaterial({ color: BLOCKS[id].color, flatShading: true }));
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    mesh.rotation.y = ((x * 17 + y * 11 + z * 23) & 7) * Math.PI / 16;
    this.root.add(mesh);
    const entity = { id, x, z, mesh, velocityY: 0, age: 0 };
    this.entities.push(entity);
    return entity;
  }

  blockChanged(x, y, z) {
    let started = 0;
    if (this.wake(x, y, z)) started += 1;
    if (this.wake(x, y + 1, z)) started += 1;
    return started;
  }

  scanAround(position, radius = 4, verticalRadius = 10) {
    if (!position) return 0;
    let started = 0;
    const centerX = Math.floor(position.x);
    const centerY = Math.floor(position.y);
    const centerZ = Math.floor(position.z);
    const minimumY = Math.max(WORLD_MIN_Y + 1, centerY - verticalRadius);
    const maximumY = Math.min(WORLD_HEIGHT - 1, centerY + verticalRadius);
    for (let y = minimumY; y <= maximumY && this.entities.length < this.maximum; y += 1) {
      for (let z = centerZ - radius; z <= centerZ + radius && this.entities.length < this.maximum; z += 1) {
        for (let x = centerX - radius; x <= centerX + radius && this.entities.length < this.maximum; x += 1) {
          if (this.wake(x, y, z)) started += 1;
        }
      }
    }
    return started;
  }

  settle(entity, y) {
    const position = new THREE.Vector3(entity.x + 0.5, y + 0.5, entity.z + 0.5);
    if (this.world.getBlock(entity.x, y, entity.z) === BLOCK.AIR && this.canSettle(entity.x, y, entity.z)) {
      this.world.setBlock(entity.x, y, entity.z, entity.id);
      this.onLand(entity.id, position);
    } else this.onDrop(entity.id, position);
    this.remove(entity);
  }

  remove(entity) {
    this.root.remove(entity.mesh);
    entity.mesh.material.dispose();
    const index = this.entities.indexOf(entity);
    if (index >= 0) this.entities.splice(index, 1);
  }

  update(dt, focusPosition = null) {
    dt = Math.max(0, Math.min(0.05, Number(dt) || 0));
    this.scanTimer -= dt;
    if (focusPosition && this.scanTimer <= 0) {
      this.scanTimer = 0.75;
      this.scanAround(focusPosition);
    }
    for (const entity of [...this.entities]) {
      entity.age += dt;
      entity.velocityY = Math.max(-28, entity.velocityY - 18 * dt);
      const distance = Math.max(0, -entity.velocityY * dt);
      const steps = Math.max(1, Math.ceil(distance / 0.22));
      let settled = false;
      for (let step = 0; step < steps; step += 1) {
        const nextY = entity.mesh.position.y + entity.velocityY * dt / steps;
        const belowY = Math.floor(nextY - 0.49);
        if (belowY < 0) {
          this.onDrop(entity.id, entity.mesh.position.clone());
          this.remove(entity);
          settled = true;
          break;
        }
        if (this.world.getBlock(entity.x, belowY, entity.z) !== BLOCK.AIR) {
          const landingY = belowY + 1;
          this.settle(entity, landingY);
          settled = true;
          break;
        }
        entity.mesh.position.y = nextY;
      }
      if (!settled) {
        entity.mesh.rotation.x += dt * 0.7;
        entity.mesh.rotation.z += dt * 0.45;
      }
    }
    return this.entities.length;
  }

  clear() {
    const count = this.entities.length;
    for (const entity of [...this.entities]) this.remove(entity);
    return count;
  }
}
