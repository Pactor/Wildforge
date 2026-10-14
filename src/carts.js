import * as THREE from 'three';
import { BLOCKS } from './blocks.js';
import { isRail, railConnections, RAIL_DIRECTIONS } from './rails.js';

const OPPOSITE = Object.freeze({ N: 'S', E: 'W', S: 'N', W: 'E' });
const CART_COLOR = 0x75675d;
const CART_TRIM = 0xb78a50;

function cartPart(root, geometry, color, position, rotation = null) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  root.add(mesh);
  return mesh;
}

function createCartModel(type = 'ride') {
  const root = new THREE.Group();
  root.name = 'Forge Cart';
  cartPart(root, new THREE.BoxGeometry(1.05, 0.14, 1.38), CART_COLOR, [0, 0.24, 0]);
  cartPart(root, new THREE.BoxGeometry(0.13, 0.58, 1.32), CART_TRIM, [-0.52, 0.54, 0]);
  cartPart(root, new THREE.BoxGeometry(0.13, 0.58, 1.32), CART_TRIM, [0.52, 0.54, 0]);
  cartPart(root, new THREE.BoxGeometry(0.92, 0.58, 0.13), CART_TRIM, [0, 0.54, -0.63]);
  cartPart(root, new THREE.BoxGeometry(0.92, 0.58, 0.13), CART_TRIM, [0, 0.54, 0.63]);
  const wheels = [];
  for (const x of [-0.54, 0.54]) for (const z of [-0.42, 0.42]) {
    wheels.push(cartPart(root, new THREE.CylinderGeometry(0.18, 0.18, 0.12, 8), 0x35383a, [x, 0.08, z], [0, 0, Math.PI / 2]));
  }
  root.userData.wheels = wheels;
  if (type === 'cargo') {
    cartPart(root, new THREE.BoxGeometry(0.82, 0.56, 0.84), 0x8e6039, [0, 0.57, 0]);
    cartPart(root, new THREE.BoxGeometry(0.88, 0.12, 0.9), 0xb1844d, [0, 0.9, 0]);
    cartPart(root, new THREE.BoxGeometry(0.13, 0.18, 0.08), 0xe0b757, [0, 0.66, -0.46]);
  }
  return root;
}

function directionYaw(direction) {
  return direction === 'E' ? -Math.PI / 2 : direction === 'S' ? Math.PI : direction === 'W' ? Math.PI / 2 : 0;
}

function directionForYaw(yaw) {
  const x = -Math.sin(Number(yaw) || 0);
  const z = -Math.cos(Number(yaw) || 0);
  return Math.abs(x) > Math.abs(z) ? (x > 0 ? 'E' : 'W') : (z > 0 ? 'S' : 'N');
}

export function railAt(world, x, y, z) {
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  const centerY = Math.floor(Number(y) || 0);
  for (let by = centerY + 1; by >= centerY - 1; by -= 1) {
    const id = world.getBlock(bx, by, bz);
    if (isRail(id)) return { x: bx, y: by, z: bz, id, connections: railConnections(id), junctionExit: BLOCKS[id]?.junctionExit || null, slopeDirection: BLOCKS[id]?.slopeDirection || null };
  }
  return null;
}

export function railSurfaceY(rail, x = rail.x + 0.5, z = rail.z + 0.5) {
  if (!rail?.slopeDirection) return rail.y + 0.13;
  const localX = Math.max(0, Math.min(1, Number(x) - rail.x));
  const localZ = Math.max(0, Math.min(1, Number(z) - rail.z));
  const rise = rail.slopeDirection === 'N' ? 1 - localZ : rail.slopeDirection === 'E' ? localX
    : rail.slopeDirection === 'S' ? localZ : 1 - localX;
  return rail.y + 0.13 + rise;
}

function routedDirection(rail, travel) {
  const connections = rail.connections;
  const entry = OPPOSITE[travel];
  if (rail.junctionExit && rail.junctionExit !== entry && connections.includes(rail.junctionExit)) return rail.junctionExit;
  if (connections.includes(travel)) return travel;
  if (connections.includes(entry)) return connections.find((direction) => direction !== entry) || travel;
  return connections[0] || travel;
}

export class CartManager {
  constructor(scene, world, serialized = null, callbacks = {}) {
    this.scene = scene;
    this.world = world;
    this.onRoll = callbacks.onRoll || (() => {});
    this.root = new THREE.Group();
    this.root.name = 'Wildforge Carts';
    scene.add(this.root);
    this.couplerRoot = new THREE.Group();
    this.couplerRoot.name = 'Forge Cart Couplers';
    this.root.add(this.couplerRoot);
    this.couplerModels = new Map();
    this.carts = [];
    this.byId = new Map();
    this.byKey = new Map();
    this.links = new Set();
    this.nextId = 1;
    this.mounted = null;
    for (const record of serialized?.carts || []) this.restore(record);
    for (const pair of serialized?.links || []) {
      if (!Array.isArray(pair) || pair.length !== 2) continue;
      const first = this.byKey.get(pair[0]);
      const second = this.byKey.get(pair[1]);
      if (first && second) this.link(first, second, false);
    }
    this.nextId = Math.max(this.nextId, Math.floor(Number(serialized?.nextId) || 1));
  }

  restore(record) {
    if (!record || ![record.x, record.y, record.z, record.velocity].every(Number.isFinite) || this.carts.length >= 32) return null;
    const rail = railAt(this.world, record.x, record.y, record.z);
    if (!rail) return null;
    return this.create(record.x, railSurfaceY(rail, record.x, record.z), record.z, ['N', 'E', 'S', 'W'].includes(record.direction) ? record.direction : 'N', record.velocity, record.type, record.key);
  }

  create(x, y, z, direction = 'N', velocity = 0, type = 'ride', key = null) {
    type = type === 'cargo' ? 'cargo' : 'ride';
    const model = createCartModel(type);
    const id = this.nextId++;
    let stableKey = typeof key === 'string' && key && !this.byKey.has(key) ? key : `cart-${id}`;
    while (this.byKey.has(stableKey)) stableKey = `cart-${this.nextId++}`;
    model.position.set(x, y, z);
    model.rotation.y = directionYaw(direction);
    model.traverse((object) => { object.userData.cartId = id; });
    this.root.add(model);
    const cart = { id, key: stableKey, storageKey: `cargo:${stableKey}`, type, model, direction, velocity: Math.max(-8, Math.min(8, Number(velocity) || 0)), age: 0, rollTimer: 0 };
    this.carts.push(cart);
    this.byId.set(id, cart);
    this.byKey.set(stableKey, cart);
    return cart;
  }

  linkKey(first, second) {
    return [first.key, second.key].sort().join('|');
  }

  linkedCarts(cart) {
    if (!cart) return [];
    const result = [];
    for (const key of this.links) {
      const [a, b] = key.split('|');
      if (a === cart.key && this.byKey.has(b)) result.push(this.byKey.get(b));
      else if (b === cart.key && this.byKey.has(a)) result.push(this.byKey.get(a));
    }
    return result;
  }

  coupledComponent(cart) {
    if (!cart || !this.byKey.has(cart.key)) return [];
    const visited = new Set([cart.key]);
    const queue = [cart];
    const result = [];
    while (queue.length) {
      const current = queue.shift();
      result.push(current);
      for (const neighbor of this.linkedCarts(current)) if (!visited.has(neighbor.key)) {
        visited.add(neighbor.key);
        queue.push(neighbor);
      }
    }
    return result;
  }

  sameConsist(first, second) {
    return first === second || this.coupledComponent(first).includes(second);
  }

  link(first, second, checkDistance = true) {
    if (!first || !second || first === second || !this.byId.has(first.id) || !this.byId.has(second.id)) return false;
    const key = this.linkKey(first, second);
    if (this.links.has(key) || this.linkedCarts(first).length >= 2 || this.linkedCarts(second).length >= 2) return false;
    if (this.sameConsist(first, second)) return false;
    if (checkDistance && first.model.position.distanceTo(second.model.position) > 2.25) return false;
    if (checkDistance) {
      second.direction = first.direction;
      second.velocity = first.velocity;
    }
    this.links.add(key);
    this.updateCouplerModels();
    return true;
  }

  updateCouplerModels() {
    for (const [key, model] of [...this.couplerModels]) if (!this.links.has(key)) {
      model.geometry.dispose();
      model.material.dispose();
      this.couplerRoot.remove(model);
      this.couplerModels.delete(key);
    }
    for (const key of this.links) {
      const [firstKey, secondKey] = key.split('|');
      const first = this.byKey.get(firstKey);
      const second = this.byKey.get(secondKey);
      if (!first || !second) continue;
      let model = this.couplerModels.get(key);
      if (!model) {
        model = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 6), new THREE.MeshLambertMaterial({ color: 0x9b805e, flatShading: true }));
        model.raycast = () => {};
        this.couplerRoot.add(model);
        this.couplerModels.set(key, model);
      }
      const start = first.model.position.clone().add(new THREE.Vector3(0, 0.3, 0));
      const end = second.model.position.clone().add(new THREE.Vector3(0, 0.3, 0));
      const delta = end.clone().sub(start);
      model.position.copy(start).add(end).multiplyScalar(0.5);
      model.scale.set(1, Math.max(0.1, delta.length()), 1);
      model.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    }
  }

  disconnect(cart) {
    if (!cart) return 0;
    let removed = 0;
    for (const key of [...this.links]) if (key.split('|').includes(cart.key)) {
      this.links.delete(key);
      removed += 1;
    }
    this.updateCouplerModels();
    return removed;
  }

  synchronizeConsists() {
    const visited = new Set();
    for (const cart of this.carts) {
      if (visited.has(cart.key)) continue;
      const component = this.coupledComponent(cart);
      for (const member of component) visited.add(member.key);
      if (component.length < 2) continue;
      const authority = component.includes(this.mounted) ? this.mounted
        : component.reduce((best, candidate) => Math.abs(candidate.velocity) > Math.abs(best.velocity) ? candidate : best, component[0]);
      for (const member of component) member.velocity = authority.velocity;
    }
  }

  place(x, y, z, yaw = 0, type = 'ride') {
    const rail = railAt(this.world, x, y, z);
    if (!rail || BLOCKS[this.world.getBlock(rail.x, rail.y + 1, rail.z)]?.solid) return null;
    const center = new THREE.Vector3(rail.x + 0.5, railSurfaceY(rail), rail.z + 0.5);
    if (this.carts.some((cart) => cart.model.position.distanceTo(center) < 1.1)) return null;
    let direction = directionForYaw(yaw);
    if (!rail.connections.includes(direction) && !rail.connections.includes(OPPOSITE[direction])) direction = rail.connections[0] || direction;
    return this.create(center.x, center.y, center.z, direction, 0, type);
  }

  mount(cart, player) {
    if (!cart || cart.type !== 'ride' || !this.byId.has(cart.id) || this.mounted) return false;
    this.mounted = cart;
    this.syncRider(player);
    return true;
  }

  unmount(player, reposition = true) {
    const cart = this.mounted;
    if (!cart) return false;
    this.mounted = null;
    if (reposition && player) {
      const [dx, , dz] = RAIL_DIRECTIONS[cart.direction];
      const candidate = cart.model.position.clone().add(new THREE.Vector3(-dz * 1.05, 0.15, dx * 1.05));
      if (player.collides(candidate)) candidate.copy(cart.model.position).add(new THREE.Vector3(0, 1.15, 0));
      player.position.copy(candidate);
      player.velocity.set(0, 0, 0);
      player.syncCamera();
    }
    return true;
  }

  syncRider(player) {
    const position = this.mounted.model.position;
    player.position.set(position.x, position.y + 0.12, position.z);
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
    this.synchronizeConsists();
    for (const cart of this.carts) {
      cart.age += dt;
      cart.rollTimer -= dt;
      const controlled = cart === this.mounted;
      const throttle = controlled ? Number(keys.has('KeyW')) - Number(keys.has('KeyS')) : 0;
      if (throttle) cart.velocity += throttle * dt * 4.5;
      const currentRail = railAt(this.world, cart.model.position.x, cart.model.position.y, cart.model.position.z);
      if (!currentRail) {
        cart.velocity = 0;
        continue;
      }
      if (BLOCKS[currentRail.id]?.powered) {
        const sign = Math.abs(cart.velocity) < 0.05 ? 1 : Math.sign(cart.velocity);
        cart.velocity += sign * dt * 6.2;
      }
      cart.velocity *= Math.max(0, 1 - dt * (throttle ? 0.12 : 0.38));
      cart.velocity = Math.max(-8, Math.min(8, cart.velocity));
      const travel = cart.velocity >= 0 ? cart.direction : OPPOSITE[cart.direction];
      const [dx, , dz] = RAIL_DIRECTIONS[travel];
      const distance = Math.abs(cart.velocity) * dt;
      const nextX = cart.model.position.x + dx * distance;
      const nextZ = cart.model.position.z + dz * distance;
      const nextRail = railAt(this.world, nextX, cart.model.position.y, nextZ);
      if (!nextRail || BLOCKS[this.world.getBlock(nextRail.x, nextRail.y + 1, nextRail.z)]?.solid) {
        cart.velocity = 0;
      } else {
        const collision = this.carts.find((other) => other !== cart && !this.sameConsist(cart, other)
          && Math.abs(other.model.position.y - cart.model.position.y) < 0.75
          && Math.hypot(other.model.position.x - nextX, other.model.position.z - nextZ) < 0.82);
        if (collision) {
          cart.velocity = 0;
          collision.velocity = 0;
          continue;
        }
        const nextTravel = routedDirection(nextRail, travel);
        if (nextTravel !== travel) {
          cart.model.position.x = nextRail.x + 0.5;
          cart.model.position.z = nextRail.z + 0.5;
          cart.direction = cart.velocity >= 0 ? nextTravel : OPPOSITE[nextTravel];
        } else {
          cart.model.position.x = nextX;
          cart.model.position.z = nextZ;
        }
        cart.model.position.y += (railSurfaceY(nextRail, cart.model.position.x, cart.model.position.z) - cart.model.position.y) * Math.min(1, dt * 18);
      }
      cart.model.rotation.y = directionYaw(cart.direction);
      for (const wheel of cart.model.userData.wheels) wheel.rotation.x += cart.velocity * dt * 4.2;
      if (Math.abs(cart.velocity) > 0.7 && cart.rollTimer <= 0) {
        cart.rollTimer = Math.max(0.16, 0.48 - Math.abs(cart.velocity) * 0.035);
        this.onRoll(cart.model.position.clone(), Math.abs(cart.velocity));
      }
    }
    this.synchronizeConsists();
    this.updateCouplerModels();
    if (this.mounted && player) this.syncRider(player);
  }

  raycast(camera, distance = 6) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = distance;
    const hit = raycaster.intersectObject(this.root, true)[0];
    if (!hit) return null;
    let object = hit.object;
    while (object && object.userData.cartId == null) object = object.parent;
    const cart = this.byId.get(object?.userData.cartId);
    return cart ? { cart, distance: hit.distance, point: hit.point } : null;
  }

  cargoAt(x, y, z, tolerance = 0.82) {
    const centerX = Math.floor(x) + 0.5;
    const centerZ = Math.floor(z) + 0.5;
    return this.carts.find((cart) => cart.type === 'cargo'
      && Math.abs(cart.model.position.y - (Number(y) + 0.13)) < 1
      && Math.hypot(cart.model.position.x - centerX, cart.model.position.z - centerZ) <= tolerance) || null;
  }

  remove(cart) {
    if (!cart || !this.byId.has(cart.id) || cart === this.mounted) return null;
    const position = cart.model.position.clone();
    const materials = new Set();
    const geometries = new Set();
    cart.model.traverse((object) => {
      if (object.material) materials.add(object.material);
      if (object.geometry) geometries.add(object.geometry);
    });
    for (const material of materials) material.dispose();
    for (const geometry of geometries) geometry.dispose();
    this.root.remove(cart.model);
    this.disconnect(cart);
    this.byId.delete(cart.id);
    this.byKey.delete(cart.key);
    this.carts = this.carts.filter((candidate) => candidate !== cart);
    return position;
  }

  serialize() {
    return { nextId: this.nextId, links: [...this.links].map((key) => key.split('|')), carts: this.carts.map((cart) => ({
      key: cart.key,
      type: cart.type,
      x: cart.model.position.x,
      y: cart.model.position.y,
      z: cart.model.position.z,
      direction: cart.direction,
      velocity: cart.velocity,
    })) };
  }
}
