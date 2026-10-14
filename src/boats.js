import * as THREE from 'three';
import { fluidLevel, fluidSurfaceHeight, isWaterBlock } from './blocks.js';

const HULL_COLOR = 0x8f5f35;
const TRIM_COLOR = 0xb9804a;

function boatPart(root, geometry, color, position, rotation = null) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  root.add(mesh);
  return mesh;
}

function createBoatModel() {
  const root = new THREE.Group();
  root.name = 'Oak Skiff';
  boatPart(root, new THREE.BoxGeometry(1.35, 0.18, 2.25), HULL_COLOR, [0, -0.08, 0]);
  boatPart(root, new THREE.BoxGeometry(0.16, 0.48, 2.05), TRIM_COLOR, [-0.67, 0.15, 0]);
  boatPart(root, new THREE.BoxGeometry(0.16, 0.48, 2.05), TRIM_COLOR, [0.67, 0.15, 0]);
  boatPart(root, new THREE.BoxGeometry(1.18, 0.42, 0.16), TRIM_COLOR, [0, 0.12, 1.04]);
  boatPart(root, new THREE.BoxGeometry(1.18, 0.42, 0.16), TRIM_COLOR, [0, 0.12, -1.04]);
  boatPart(root, new THREE.BoxGeometry(1.08, 0.12, 0.32), 0x6f482b, [0, 0.27, 0.12]);
  const leftOar = boatPart(root, new THREE.BoxGeometry(0.1, 0.08, 1.9), 0xb7864f, [-0.88, 0.3, 0], [0, 0.35, -0.12]);
  const rightOar = boatPart(root, new THREE.BoxGeometry(0.1, 0.08, 1.9), 0xb7864f, [0.88, 0.3, 0], [0, -0.35, 0.12]);
  root.userData.oars = [leftOar, rightOar];
  return root;
}

export function boatSurfaceY(world, x, z, aroundY) {
  const center = Math.floor(Number(aroundY) || 0);
  for (let y = center + 2; y >= center - 3; y -= 1) {
    const id = world.getBlock(x, y, z);
    if (isWaterBlock(id) && fluidLevel(id) <= 1 && !isWaterBlock(world.getBlock(x, y + 1, z))) return y + fluidSurfaceHeight(id) - 0.06;
  }
  return null;
}

export class BoatManager {
  constructor(scene, world, serialized = null, callbacks = {}) {
    this.scene = scene;
    this.world = world;
    this.onPaddle = callbacks.onPaddle || (() => {});
    this.root = new THREE.Group();
    this.root.name = 'Wildforge Boats';
    scene.add(this.root);
    this.boats = [];
    this.byId = new Map();
    this.nextId = 1;
    this.mounted = null;
    for (const record of serialized?.boats || []) this.restore(record);
  }

  restore(record) {
    if (!record || ![record.x, record.y, record.z, record.yaw].every(Number.isFinite) || this.boats.length >= 24) return null;
    return this.create(record.x, record.y, record.z, record.yaw, record.velocity);
  }

  create(x, y, z, yaw = 0, velocity = 0) {
    const model = createBoatModel();
    const id = this.nextId++;
    model.position.set(x, y, z);
    model.rotation.y = yaw;
    model.traverse((object) => { object.userData.boatId = id; });
    this.root.add(model);
    const boat = {
      id,
      model,
      yaw,
      velocity: Math.max(-2, Math.min(6.5, Number(velocity) || 0)),
      age: 0,
      paddleTimer: 0,
    };
    this.boats.push(boat);
    this.byId.set(id, boat);
    return boat;
  }

  place(x, waterY, z, yaw = 0) {
    const centerX = Math.floor(x) + 0.5;
    const centerZ = Math.floor(z) + 0.5;
    const surfaceY = boatSurfaceY(this.world, centerX, centerZ, waterY);
    const floatY = surfaceY == null ? null : this.canFloatAt(centerX, centerZ, surfaceY);
    if (floatY == null || this.boats.some((boat) => boat.model.position.distanceTo(new THREE.Vector3(centerX, floatY, centerZ)) < 1.8)) return null;
    return this.create(centerX, floatY, centerZ, yaw);
  }

  canFloatAt(x, z, aroundY) {
    const samples = [[0, 0], [-0.58, -0.72], [0.58, -0.72], [-0.58, 0.72], [0.58, 0.72]];
    const surfaces = samples.map(([ox, oz]) => boatSurfaceY(this.world, x + ox, z + oz, aroundY));
    if (surfaces.some((height) => height == null)) return null;
    const average = surfaces.reduce((sum, height) => sum + height, 0) / surfaces.length;
    return surfaces.every((height) => Math.abs(height - average) < 0.65) ? average : null;
  }

  mount(boat, player) {
    if (!boat || !this.byId.has(boat.id) || this.mounted) return false;
    this.mounted = boat;
    boat.velocity = 0;
    this.syncRider(player);
    return true;
  }

  unmount(player, reposition = true) {
    const boat = this.mounted;
    if (!boat) return false;
    this.mounted = null;
    if (reposition && player) {
      const side = new THREE.Vector3(Math.cos(boat.yaw), 0, -Math.sin(boat.yaw)).multiplyScalar(1.25);
      const candidate = boat.model.position.clone().add(side);
      candidate.y += 0.08;
      if (player.collides(candidate)) candidate.copy(boat.model.position).add(new THREE.Vector3(0, 1.15, 0));
      player.position.copy(candidate);
      player.velocity.set(0, 0, 0);
      player.syncCamera();
    }
    return true;
  }

  syncRider(player) {
    player.position.set(this.mounted.model.position.x, this.mounted.model.position.y + 0.08, this.mounted.model.position.z);
    player.velocity.set(0, 0, 0);
    player.grounded = false;
    player.moving = Math.abs(this.mounted.velocity) > 0.12;
    player.sprinting = false;
    player.blocking = false;
    player.inWater = false;
    player.inLava = false;
    player.inLiquid = false;
    player.submerged = false;
    player.submergedLava = false;
    player.syncCamera();
  }

  update(dt, keys = new Set(), player = null) {
    dt = Math.max(0, Math.min(0.05, Number(dt) || 0));
    for (const boat of this.boats) {
      boat.age += dt;
      boat.paddleTimer -= dt;
      const controlled = boat === this.mounted;
      const throttle = controlled ? Number(keys.has('KeyW')) - Number(keys.has('KeyS')) : 0;
      const steering = controlled ? Number(keys.has('KeyA')) - Number(keys.has('KeyD')) : 0;
      if (throttle) boat.velocity += throttle * dt * (throttle > 0 ? 4.8 : 3.2);
      boat.velocity *= Math.max(0, 1 - dt * (throttle ? 0.42 : 1.15));
      boat.velocity = Math.max(-2, Math.min(6.5, boat.velocity));
      if (steering) boat.yaw += steering * dt * (0.75 + Math.min(1, Math.abs(boat.velocity) / 2.5));
      const distance = boat.velocity * dt;
      const nextX = boat.model.position.x - Math.sin(boat.yaw) * distance;
      const nextZ = boat.model.position.z - Math.cos(boat.yaw) * distance;
      const surfaceY = this.canFloatAt(nextX, nextZ, boat.model.position.y);
      if (surfaceY == null) boat.velocity *= -0.18;
      else {
        boat.model.position.x = nextX;
        boat.model.position.z = nextZ;
        boat.model.position.y += (surfaceY - boat.model.position.y) * Math.min(1, dt * 5);
      }
      boat.model.rotation.y = boat.yaw;
      boat.model.rotation.z = Math.sin(boat.age * 2.1) * 0.018;
      const rowing = Math.min(0.7, Math.abs(boat.velocity) * 0.13) * Math.sin(boat.age * 7.5);
      boat.model.userData.oars[0].rotation.x = rowing;
      boat.model.userData.oars[1].rotation.x = -rowing;
      if (controlled && throttle && Math.abs(boat.velocity) > 0.5 && boat.paddleTimer <= 0) {
        boat.paddleTimer = 0.48;
        this.onPaddle(boat.model.position.clone());
      }
    }
    if (this.mounted && player) this.syncRider(player);
  }

  raycast(camera, distance = 6) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = distance;
    const hit = raycaster.intersectObject(this.root, true)[0];
    if (!hit) return null;
    let object = hit.object;
    while (object && object.userData.boatId == null) object = object.parent;
    const boat = this.byId.get(object?.userData.boatId);
    return boat ? { boat, distance: hit.distance, point: hit.point } : null;
  }

  remove(boat) {
    if (!boat || !this.byId.has(boat.id) || boat === this.mounted) return null;
    const position = boat.model.position.clone();
    const materials = new Set();
    const geometries = new Set();
    boat.model.traverse((object) => {
      if (object.material) materials.add(object.material);
      if (object.geometry) geometries.add(object.geometry);
    });
    for (const material of materials) material.dispose();
    for (const geometry of geometries) geometry.dispose();
    this.root.remove(boat.model);
    this.byId.delete(boat.id);
    this.boats = this.boats.filter((candidate) => candidate !== boat);
    return position;
  }

  serialize() {
    return { boats: this.boats.map((boat) => ({
      x: boat.model.position.x,
      y: boat.model.position.y,
      z: boat.model.position.z,
      yaw: boat.yaw,
      velocity: boat.velocity,
    })) };
  }
}
