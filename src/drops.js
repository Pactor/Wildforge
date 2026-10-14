import * as THREE from 'three';
import { itemDefinition } from './inventory.js';
import { WORLD_MIN_Y } from './worldBounds.js';

const DROP_GEOMETRY = new THREE.BoxGeometry(0.28, 0.28, 0.28);
export const MAX_WORLD_DROPS = 2048;
export const DROP_LIFETIME = 300;

const finiteVector = (value) => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
const bounded = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Number(value) || 0));
const safeEnchantments = (entries) => Array.isArray(entries) ? entries
  .filter((entry) => typeof entry?.id === 'string' && Number.isFinite(entry.level) && entry.level > 0)
  .slice(0, 8)
  .map((entry) => ({ id: entry.id.slice(0, 32), level: Math.max(1, Math.min(3, Math.floor(entry.level))) })) : [];

export class DroppedItemManager {
  constructor(scene, world, player, onPickup = () => {}, serialized = null) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.onPickup = onPickup;
    this.root = new THREE.Group();
    this.root.name = 'Dropped Items';
    this.scene.add(this.root);
    this.items = [];
    this.restore(serialized);
  }

  spawn(id, count, position, durability = null, enchantments = [], state = null) {
    const definition = itemDefinition(id);
    if (!definition || !position || this.items.length >= MAX_WORLD_DROPS || !Number.isFinite(count) || count <= 0) return null;
    count = Math.max(1, Math.min(1_000_000, Math.floor(count)));
    const maximum = definition.durability;
    if (maximum) count = 1;
    durability = maximum && Number.isFinite(durability) ? Math.max(1, Math.min(maximum, Math.floor(durability))) : null;
    enchantments = maximum ? safeEnchantments(enchantments) : [];
    const mesh = new THREE.Mesh(
      DROP_GEOMETRY,
      new THREE.MeshLambertMaterial({ color: definition.color, flatShading: true }),
    );
    mesh.position.copy(position);
    if (!state) mesh.position.y += 0.25;
    mesh.rotation.set(Math.PI / 8, Math.PI / 4, 0);
    this.root.add(mesh);
    const angle = Math.random() * Math.PI * 2;
    const restoredVelocity = finiteVector(state?.velocity) ? state.velocity.map((value) => bounded(value, -24, 24)) : null;
    const item = {
      id,
      count,
      durability,
      enchantments,
      mesh,
      age: bounded(state?.age, 0, DROP_LIFETIME - 0.01),
      velocity: restoredVelocity
        ? new THREE.Vector3().fromArray(restoredVelocity)
        : new THREE.Vector3(Math.cos(angle) * 0.7, 2.1, Math.sin(angle) * 0.7),
      baseY: Number.isFinite(state?.baseY) ? bounded(state.baseY, WORLD_MIN_Y - 16, 128) : mesh.position.y,
    };
    this.items.push(item);
    return item;
  }

  restore(serialized) {
    if (!Array.isArray(serialized)) return 0;
    let restored = 0;
    for (const record of serialized.slice(0, MAX_WORLD_DROPS)) {
      if (!itemDefinition(record?.id) || !finiteVector(record?.position) || record.position.some((value) => Math.abs(value) > 10_000_000)) continue;
      const age = Number(record.age);
      if (!Number.isFinite(age) || age < 0 || age >= DROP_LIFETIME) continue;
      const position = new THREE.Vector3().fromArray(record.position);
      if (position.y < WORLD_MIN_Y - 5 || position.y > 128) continue;
      if (this.spawn(record.id, record.count, position, record.durability, record.enchantments, record)) restored += 1;
    }
    return restored;
  }

  serialize() {
    return this.items.slice(0, MAX_WORLD_DROPS).map((item) => ({
      id: item.id,
      count: item.count,
      durability: item.durability,
      enchantments: safeEnchantments(item.enchantments),
      position: item.mesh.position.toArray(),
      velocity: item.velocity.toArray(),
      baseY: item.baseY,
      age: item.age,
    }));
  }

  remove(item) {
    this.root.remove(item.mesh);
    item.mesh.material.dispose();
    const index = this.items.indexOf(item);
    if (index >= 0) this.items.splice(index, 1);
  }

  update(dt, canPickup = true) {
    for (const item of [...this.items]) {
      item.age += dt;
      item.velocity.y -= 9.8 * dt;
      const next = item.mesh.position.clone().addScaledVector(item.velocity, dt);
      const blockY = Math.floor(next.y - 0.15);
      if (item.velocity.y < 0 && this.world.isSolid(next.x, blockY, next.z)) {
        next.y = blockY + 1.16;
        item.velocity.y = 0;
        item.velocity.x *= 0.78;
        item.velocity.z *= 0.78;
      }
      item.mesh.position.copy(next);
      item.baseY = item.velocity.y === 0 ? item.baseY + (next.y - item.baseY) * Math.min(1, dt * 8) : next.y;
      if (item.velocity.y === 0) item.mesh.position.y = item.baseY + Math.sin(item.age * 3.2) * 0.08;
      item.mesh.rotation.y += dt * 2.2;
      item.mesh.rotation.x += dt * 0.45;
      const playerCenterY = this.player.position.y + 0.8;
      const distance = Math.hypot(
        item.mesh.position.x - this.player.position.x,
        item.mesh.position.y - playerCenterY,
        item.mesh.position.z - this.player.position.z,
      );
      if (canPickup && item.age > 0.3 && distance < 1.65) {
        this.onPickup(item.id, item.count, item.durability, item.enchantments);
        this.remove(item);
      } else if (item.age > DROP_LIFETIME || item.mesh.position.y < WORLD_MIN_Y - 5) this.remove(item);
    }
  }
}

export function scatterDeathInventory(inventory, equipment, manager, position) {
  if (!inventory?.drainAll || !equipment?.drainAll || !manager?.spawn || !position) return { dropped: 0, retained: 0, stacks: 0 };
  const items = [...inventory.drainAll(), ...equipment.drainAll()];
  let dropped = 0;
  let retained = 0;
  let stacks = 0;
  for (const item of items) {
    const count = item.count || 1;
    if (manager.spawn(item.id, count, position, item.durability, item.enchantments)) {
      dropped += count;
      stacks += 1;
    } else {
      retained += count;
      if (Number.isFinite(item.durability)) inventory.addInstance(item.id, item.durability, item.enchantments);
      else inventory.add(item.id, count);
    }
  }
  return { dropped, retained, stacks };
}
