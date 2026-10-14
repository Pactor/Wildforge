import * as THREE from 'three';
import { BLOCKS, fluidSurfaceHeight, isLavaBlock, isWaterBlock } from './blocks.js';
import { fluidCurrentAt } from './fluids.js';
import { ladderAt } from './ladders.js';
import { scaffoldAt } from './scaffolds.js';
import { WORLD_MIN_Y } from './worldBounds.js';

const UP = new THREE.Vector3(0, 1, 0);

export function ladderVerticalSpeed(keys = new Set()) {
  const upward = keys.has('Space') || keys.has('KeyW');
  const downward = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyS');
  return upward ? 3.4 : downward ? -2.7 : -0.42;
}

export function movementSpeed(state = {}) {
  const multiplier = Math.max(0.25, Math.min(2, Number(state.speedMultiplier) || 1));
  if (state.climbing) return 2.5 * multiplier;
  if (state.inLava) return 1.65 * multiplier;
  if (state.inWater) return 3.1 * multiplier;
  if (state.blocking) return 1.95 * multiplier;
  if (state.crouching) return 2.25 * multiplier;
  if (state.sprinting) return 7.2 * multiplier;
  return 4.6 * multiplier;
}

export class PlayerController {
  constructor(camera, domElement, world) {
    this.camera = camera;
    this.domElement = domElement;
    this.world = world;
    this.position = new THREE.Vector3(0.5, world.terrainHeight(0, 0) + 2.01, 0.5);
    this.velocity = new THREE.Vector3();
    this.keys = new Set();
    this.yaw = 0;
    this.pitch = 0;
    this.standingHeight = 1.8;
    this.crouchedHeight = 1.5;
    this.height = this.standingHeight;
    this.radius = 0.3;
    this.standingEyeHeight = 1.62;
    this.crouchedEyeHeight = 1.28;
    this.eyeHeight = this.standingEyeHeight;
    this.grounded = false;
    this.moving = false;
    this.sprinting = false;
    this.crouching = false;
    this.canBlock = false;
    this.blocking = false;
    this.fallDistance = 0;
    this.inWater = false;
    this.inLava = false;
    this.inLiquid = false;
    this.submerged = false;
    this.submergedLava = false;
    this.climbing = false;
    this.ladder = null;
    this.scaffold = null;
    this.spawnPoint = null;
    this.onDamage = null;
    this.onLand = null;
    this.enabled = false;
    this.lookSensitivity = 1;
    this.speedMultiplier = 1;
    this.bindEvents();
    this.syncCamera();
  }

  bindEvents() {
    window.addEventListener('keydown', (event) => {
      this.keys.add(event.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    document.addEventListener('pointerlockchange', () => {
      this.enabled = document.pointerLockElement === this.domElement;
    });
    document.addEventListener('mousemove', (event) => {
      if (!this.enabled) return;
      this.yaw -= event.movementX * 0.0022 * this.lookSensitivity;
      this.pitch -= event.movementY * 0.0022 * this.lookSensitivity;
      this.pitch = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, this.pitch));
    });
  }

  setLookSensitivity(value) {
    if (!Number.isFinite(value)) return false;
    this.lookSensitivity = Math.max(0.25, Math.min(2.5, value));
    return true;
  }

  setCrouching(wantsToCrouch, force = false) {
    if (wantsToCrouch) {
      this.crouching = true;
      this.height = this.crouchedHeight;
      this.eyeHeight = this.crouchedEyeHeight;
      this.syncCamera();
      return true;
    }
    if (!this.crouching) return true;
    const previousHeight = this.height;
    this.height = this.standingHeight;
    if (!force && this.collides(this.position)) {
      this.height = previousHeight;
      return false;
    }
    this.crouching = false;
    this.eyeHeight = this.standingEyeHeight;
    this.syncCamera();
    return true;
  }

  hasSupport(position = this.position, tolerance = 0.12) {
    const minX = Math.floor(position.x - this.radius);
    const maxX = Math.floor(position.x + this.radius);
    const maxY = Math.floor(position.y - 0.05);
    const minY = Math.floor(position.y - 1.55);
    const minZ = Math.floor(position.z - this.radius);
    const maxZ = Math.floor(position.z + this.radius);
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          for (const [x0, , z0, x1, y1, z1] of this.collisionBoxesAt(x, y, z)) {
            const top = y + y1;
            const overlaps = position.x + this.radius > x + x0 && position.x - this.radius < x + x1
              && position.z + this.radius > z + z0 && position.z - this.radius < z + z1;
            if (overlaps && Math.abs(position.y - top) <= tolerance) return true;
          }
        }
      }
    }
    return false;
  }

  intersectsBlock(x, y, z, position = this.position, blockHeight = 1) {
    return position.x + this.radius > x && position.x - this.radius < x + 1
      && position.y + this.height > y && position.y < y + blockHeight
      && position.z + this.radius > z && position.z - this.radius < z + 1;
  }

  collides(position) {
    const minX = Math.floor(position.x - this.radius);
    const maxX = Math.floor(position.x + this.radius);
    const minY = Math.floor(position.y - 0.51);
    const maxY = Math.floor(position.y + this.height - 0.001);
    const minZ = Math.floor(position.z - this.radius);
    const maxZ = Math.floor(position.z + this.radius);
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const boxes = this.collisionBoxesAt(x, y, z);
          for (const [x0, y0, z0, x1, y1, z1] of boxes) {
            if (position.x + this.radius > x + x0 && position.x - this.radius < x + x1
              && position.y + this.height > y + y0 && position.y < y + y1
              && position.z + this.radius > z + z0 && position.z - this.radius < z + z1) return true;
          }
        }
      }
    }
    return false;
  }

  moveAxis(axis, amount) {
    if (amount === 0) return;
    const next = this.position.clone();
    next[axis] += amount;
    if (!this.collides(next)) {
      if (axis !== 'y' && this.crouching && this.hasSupport(this.position) && !this.hasSupport(next)) {
        this.velocity[axis] = 0;
        return;
      }
      this.position.copy(next);
      return;
    }
    const swimmingUp = axis !== 'y' && this.inWater && this.keys?.has('Space');
    if (axis !== 'y' && (this.velocity.y <= 0 || swimmingUp)) {
      const stepHeight = this.stepHeight(next, swimmingUp ? 1.4 : 0.55);
      if (stepHeight == null) {
        this.velocity[axis] = 0;
        return;
      }
      const stepped = next.clone();
      stepped.y += stepHeight + 0.01;
      if (!this.collides(stepped)) {
        this.position.copy(stepped);
        return;
      }
    }
    if (axis === 'y') {
      if (amount < 0) {
        this.grounded = true;
        if (this.fallDistance > 3.4) this.onDamage?.(Math.ceil(this.fallDistance - 3.4), 'fall');
        if (this.fallDistance > 0.5) this.onLand?.(this.fallDistance);
        this.fallDistance = 0;
      }
      this.velocity.y = 0;
    } else {
      this.velocity[axis] = 0;
    }
  }

  stepHeight(position, maximum = 0.55) {
    let required = 0;
    const minX = Math.floor(position.x - this.radius);
    const maxX = Math.floor(position.x + this.radius);
    const minY = Math.floor(position.y - 0.51);
    const maxY = Math.floor(position.y + this.height - 0.001);
    const minZ = Math.floor(position.z - this.radius);
    const maxZ = Math.floor(position.z + this.radius);
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          for (const [x0, y0, z0, x1, y1, z1] of this.collisionBoxesAt(x, y, z)) {
            const top = y + y1;
            const intersects = position.x + this.radius > x + x0 && position.x - this.radius < x + x1
              && position.z + this.radius > z + z0 && position.z - this.radius < z + z1
              && position.y + this.height > y + y0 && position.y < top;
            if (!intersects) continue;
            const rise = top - position.y;
            if (rise <= 0 || rise > maximum) return null;
            required = Math.max(required, rise);
          }
        }
      }
    }
    return required || null;
  }

  collisionBoxesAt(x, y, z) {
    if (this.scaffold && BLOCKS[this.world.getBlock(x, y, z)]?.scaffold) return [];
    if (this.world.collisionBoxes) return this.world.collisionBoxes(x, y, z);
    const height = this.world.collisionHeight?.(x, y, z) ?? (this.world.isSolid(x, y, z) ? 1 : 0);
    return height > 0 ? [[0, 0, 0, 1, height, 1]] : [];
  }

  update(dt) {
    dt = Math.min(dt, 0.05);
    this.updateLiquidState();
    this.updateClimbingState();
    const crouchHeld = this.keys.has('ControlLeft') || this.keys.has('ControlRight') || this.keys.has('KeyC');
    this.setCrouching(crouchHeld);
    this.blocking = this.enabled && this.canBlock && this.keys.has('KeyF');
    if (this.enabled) {
      const input = new THREE.Vector3(
        Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')),
        0,
        Number(this.keys.has('KeyS')) - Number(this.keys.has('KeyW')),
      );
      if (input.lengthSq() > 0) input.normalize();
      this.moving = input.lengthSq() > 0;
      const shiftHeld = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      this.sprinting = !this.inLiquid && !this.crouching && !this.blocking && this.moving && shiftHeld;
      input.applyAxisAngle(UP, this.yaw);
      const speed = movementSpeed(this);
      const responsiveness = this.inLiquid ? 5 : this.grounded ? 18 : 7;
      this.velocity.x += (input.x * speed - this.velocity.x) * Math.min(1, responsiveness * dt);
      this.velocity.z += (input.z * speed - this.velocity.z) * Math.min(1, responsiveness * dt);
      if (this.inWater) {
        const current = fluidCurrentAt(this.world, this.position.x, this.position.y + 0.35, this.position.z);
        this.velocity.x += current.x * current.strength * dt * 2.8;
        this.velocity.z += current.z * current.strength * dt * 2.8;
      }
      if (this.inLiquid) {
        const verticalTarget = this.keys.has('Space') ? (this.inLava ? 1.65 : 5.6) : shiftHeld ? -2.2 : -0.15;
        this.velocity.y += (verticalTarget - this.velocity.y) * Math.min(1, dt * 5);
      } else if (this.climbing) {
        const verticalTarget = ladderVerticalSpeed(this.keys);
        this.velocity.y += (verticalTarget - this.velocity.y) * Math.min(1, dt * 10);
      } else if (this.keys.has('Space') && this.grounded) {
        this.velocity.y = 7.7;
        this.grounded = false;
      }
    } else {
      this.moving = false;
      this.sprinting = false;
      this.blocking = false;
      this.velocity.x *= Math.max(0, 1 - dt * 10);
      this.velocity.z *= Math.max(0, 1 - dt * 10);
    }
    this.velocity.y -= (this.inLiquid ? 2.1 : this.climbing ? 0 : 22) * dt;
    if (this.inLiquid || this.climbing) this.fallDistance = 0;
    else if (this.velocity.y < 0 && !this.grounded) this.fallDistance += -this.velocity.y * dt;
    this.grounded = false;
    const steps = Math.max(1, Math.ceil(this.velocity.length() * dt / 0.25));
    for (let i = 0; i < steps; i += 1) {
      this.moveAxis('x', this.velocity.x * dt / steps);
      this.moveAxis('z', this.velocity.z * dt / steps);
      this.moveAxis('y', this.velocity.y * dt / steps);
    }
    if (this.position.y < WORLD_MIN_Y - 10) {
      this.respawn();
    }
    this.updateLiquidState();
    this.updateClimbingState();
    this.syncCamera();
  }

  updateClimbingState() {
    this.ladder = this.inLiquid ? null : ladderAt(this.world, this.position, this.radius, this.height);
    const descending = this.keys?.has('ShiftLeft') || this.keys?.has('ShiftRight') || this.keys?.has('KeyS');
    this.scaffold = this.inLiquid || this.ladder ? null : scaffoldAt(this.world, this.position, this.radius, this.height, descending);
    this.climbing = Boolean(this.ladder || this.scaffold);
    return this.ladder || this.scaffold;
  }

  updateLiquidState() {
    const bodyY = this.position.y + 0.75;
    const eyeY = this.position.y + this.eyeHeight;
    const body = this.world.getBlock(this.position.x, bodyY, this.position.z);
    const eyes = this.world.getBlock(this.position.x, eyeY, this.position.z);
    const bodyCovered = bodyY - Math.floor(bodyY) <= fluidSurfaceHeight(body) + 0.001;
    const eyesCovered = eyeY - Math.floor(eyeY) <= fluidSurfaceHeight(eyes) + 0.001;
    this.inWater = isWaterBlock(body) && bodyCovered;
    this.inLava = isLavaBlock(body) && bodyCovered;
    this.inLiquid = this.inWater || this.inLava;
    this.submerged = isWaterBlock(eyes) && eyesCovered;
    this.submergedLava = isLavaBlock(eyes) && eyesCovered;
  }

  setSpawn(position) {
    if (!position || ![position.x, position.y, position.z].every(Number.isFinite)) return false;
    this.spawnPoint = new THREE.Vector3(position.x, position.y, position.z);
    return true;
  }

  respawn() {
    const fallback = new THREE.Vector3(0.5, this.world.terrainHeight(0, 0) + 3, 0.5);
    this.position.copy(this.spawnPoint || fallback);
    if (this.collides(this.position)) this.position.copy(fallback);
    this.velocity.set(0, 0, 0);
    this.fallDistance = 0;
    this.syncCamera();
  }

  syncCamera() {
    this.camera.position.set(this.position.x, this.position.y + this.eyeHeight, this.position.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
