import { Inventory, itemDefinition, itemStackSize } from './inventory.js';
import { BLOCK } from './blocks.js';

export const CHEST_CAPACITY = 27;
export const DOUBLE_CHEST_CAPACITY = CHEST_CAPACITY * 2;
export const STORAGE_SORT_MODES = Object.freeze(['name', 'category', 'count']);

export function sanitizeContainerLabel(value) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 24);
}

export function slotsUsed(inventory) {
  return inventory.entries().reduce((total, [id, count]) => total + Math.ceil(count / itemStackSize(id)), 0);
}

export function inventorySignalStrength(inventory, capacity) {
  capacity = Math.max(1, Math.floor(Number(capacity) || 1));
  const fullness = inventory.entries().reduce((total, [id, count]) => total + Math.max(0, Number(count) || 0) / itemStackSize(id), 0) / capacity;
  return fullness > 0 ? Math.max(1, Math.min(15, Math.floor(1 + 14 * fullness))) : 0;
}

export function containerKey(x, y, z) {
  return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
}

export function barrelKey(x, y, z) {
  return `barrel:${containerKey(x, y, z)}`;
}

export function funnelKey(x, y, z) {
  return `funnel:${containerKey(x, y, z)}`;
}

export function ejectorKey(x, y, z) {
  return `ejector:${containerKey(x, y, z)}`;
}

export function dispenserKey(x, y, z) {
  return `dispenser:${containerKey(x, y, z)}`;
}

export const isBarrelKey = (key) => String(key).startsWith('barrel:');
export const isFunnelKey = (key) => String(key).startsWith('funnel:');
export const isEjectorKey = (key) => String(key).startsWith('ejector:');
export const isDispenserKey = (key) => String(key).startsWith('dispenser:');

const CARDINALS = Object.freeze([[1, 0], [-1, 0], [0, 1], [0, -1]]);

export function chestInfo(world, x, y, z) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  const current = { x, y, z };
  const neighbor = CARDINALS
    .map(([dx, dz]) => ({ x: x + dx, y, z: z + dz }))
    .find((position) => world.getBlock(position.x, position.y, position.z) === BLOCK.CHEST);
  if (!neighbor) return { key: containerKey(x, y, z), capacity: CHEST_CAPACITY, members: [current] };
  const members = [current, neighbor].sort((a, b) => a.x - b.x || a.z - b.z || a.y - b.y);
  return {
    key: `double:${members.map((position) => containerKey(position.x, position.y, position.z)).join('|')}`,
    capacity: DOUBLE_CHEST_CAPACITY,
    members,
  };
}

export function canPlaceChest(world, x, y, z) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  const adjacent = CARDINALS
    .map(([dx, dz]) => ({ x: x + dx, y, z: z + dz }))
    .filter((position) => world.getBlock(position.x, position.y, position.z) === BLOCK.CHEST);
  if (adjacent.length > 1) return false;
  if (!adjacent.length) return true;
  const neighbor = adjacent[0];
  return !CARDINALS.some(([dx, dz]) => {
    const nx = neighbor.x + dx;
    const nz = neighbor.z + dz;
    return (nx !== x || nz !== z) && world.getBlock(nx, y, nz) === BLOCK.CHEST;
  });
}

function spaceForInventory(inventory, id, capacity) {
  const stackSize = itemStackSize(id);
  const count = inventory.count(id);
  const remainder = count % stackSize;
  const openInTail = remainder === 0 ? 0 : stackSize - remainder;
  return openInTail + Math.max(0, capacity - slotsUsed(inventory)) * stackSize;
}

export class StorageState {
  constructor(serialized = null) {
    this.containers = new Map();
    this.labels = new Map();
    this.sortModes = new Map();
    this.generatedKeys = new Set();
    for (const [key, value] of serialized?.containers || []) {
      if (typeof key === 'string') this.containers.set(key, new Inventory(value));
    }
    for (const [key, value] of serialized?.labels || []) {
      const label = sanitizeContainerLabel(value);
      if (typeof key === 'string' && label) this.labels.set(key, label);
    }
    for (const [key, value] of serialized?.sortModes || []) {
      if (typeof key === 'string' && STORAGE_SORT_MODES.includes(value) && value !== 'name') this.sortModes.set(key, value);
    }
    for (const key of serialized?.generatedKeys || []) if (typeof key === 'string') this.generatedKeys.add(key);
  }

  get(key) {
    if (!this.containers.has(key)) this.containers.set(key, new Inventory());
    return this.containers.get(key);
  }

  capacityFor(key) {
    return isFunnelKey(key) ? 5 : isEjectorKey(key) || isDispenserKey(key) ? 9 : String(key).startsWith('double:') ? DOUBLE_CHEST_CAPACITY : CHEST_CAPACITY;
  }

  signalStrength(key) {
    return inventorySignalStrength(this.get(key), this.capacityFor(key));
  }

  label(key) {
    return this.labels.get(key) || '';
  }

  setLabel(key, value) {
    const label = sanitizeContainerLabel(value);
    if (label) this.labels.set(key, label);
    else this.labels.delete(key);
    return label;
  }

  sortMode(key) {
    return this.sortModes.get(key) || 'name';
  }

  setSortMode(key, mode) {
    if (!STORAGE_SORT_MODES.includes(mode)) return false;
    if (mode === 'name') this.sortModes.delete(key);
    else this.sortModes.set(key, mode);
    return true;
  }

  seedGenerated(key, items, markerKey = key) {
    if (this.generatedKeys.has(markerKey)) return false;
    this.generatedKeys.add(markerKey);
    const inventory = this.get(key);
    for (const item of Array.isArray(items) ? items : []) {
      const count = Math.max(0, Math.floor(Number(item?.count) || 0));
      if (count > 0 && itemDefinition(item.id)) inventory.add(item.id, count);
    }
    return true;
  }

  prepare(info) {
    if (!info || info.members?.length !== 2) return info?.key || null;
    const memberKeys = info.members.map((position) => containerKey(position.x, position.y, position.z));
    this.combine(memberKeys, info.key);
    return info.key;
  }

  combine(sourceKeys, targetKey) {
    const target = this.get(targetKey);
    for (const sourceKey of sourceKeys) {
      if (sourceKey === targetKey) continue;
      if (!this.label(targetKey) && this.label(sourceKey)) this.labels.set(targetKey, this.label(sourceKey));
      if (this.sortMode(targetKey) === 'name' && this.sortMode(sourceKey) !== 'name') this.sortModes.set(targetKey, this.sortMode(sourceKey));
      if (this.containers.has(sourceKey)) {
        for (const item of this.drainItems(sourceKey, true)) {
          if (item.durability != null) target.addInstance(item.id, item.durability, item.enchantments);
          else target.add(item.id, item.count);
        }
      }
      this.labels.delete(sourceKey);
      this.sortModes.delete(sourceKey);
    }
    return target;
  }

  deposit(key, source, id, count = 1) {
    const target = this.get(key);
    if (!Number.isFinite(count) || (count = Math.floor(count)) <= 0 || source.count(id) < count) return false;
    if (count > this.spaceFor(key, id)) return false;
    if (itemStackSize(id) === 1) {
      for (let moved = 0; moved < count; moved += 1) {
        const instance = source.takeInstance(id);
        target.addInstance(instance.id, instance.durability, instance.enchantments);
      }
      return true;
    }
    source.remove(id, count);
    target.add(id, count);
    return true;
  }

  withdraw(key, target, id, count = 1) {
    const source = this.get(key);
    if (!Number.isFinite(count) || (count = Math.floor(count)) <= 0 || source.count(id) < count) return false;
    if (itemStackSize(id) === 1) {
      for (let moved = 0; moved < count; moved += 1) {
        const instance = source.takeInstance(id);
        target.addInstance(instance.id, instance.durability, instance.enchantments);
      }
      return true;
    }
    source.remove(id, count);
    target.add(id, count);
    return true;
  }

  spaceFor(key, id) {
    const inventory = this.get(key);
    return spaceForInventory(inventory, id, this.capacityFor(key));
  }

  entries(key) {
    const entries = this.get(key).entries();
    const mode = this.sortMode(key);
    if (mode === 'count') return entries.sort((a, b) => b[1] - a[1] || itemDefinition(a[0]).name.localeCompare(itemDefinition(b[0]).name));
    if (mode === 'category') return entries.sort((a, b) => {
      const first = itemDefinition(a[0]);
      const second = itemDefinition(b[0]);
      return String(first.category || 'block').localeCompare(String(second.category || 'block')) || first.name.localeCompare(second.name);
    });
    return entries;
  }

  drain(key) {
    const container = this.containers.get(key);
    if (!container) return [];
    const entries = container.entries();
    this.containers.delete(key);
    this.labels.delete(key);
    this.sortModes.delete(key);
    return entries;
  }

  drainItems(key, preserveMetadata = false) {
    const container = this.containers.get(key);
    if (!container) return [];
    const items = [];
    for (const [id, count] of container.entries()) {
      if (itemStackSize(id) === 1) {
        for (let index = 0; index < count; index += 1) {
          const instance = container.takeInstance(id);
          const item = { id: instance.id, count: 1, durability: instance.durability };
          if (instance.enchantments?.length) item.enchantments = instance.enchantments;
          items.push(item);
        }
      } else {
        container.remove(id, count);
        items.push({ id, count, durability: null });
      }
    }
    this.containers.delete(key);
    if (!preserveMetadata) {
      this.labels.delete(key);
      this.sortModes.delete(key);
    }
    return items;
  }

  unpair(doubleKey, remainingKey) {
    const label = this.label(doubleKey);
    const sortMode = this.sortMode(doubleKey);
    const target = this.get(remainingKey);
    const overflow = [];
    for (const item of this.drainItems(doubleKey, true)) {
      const space = spaceForInventory(target, item.id, CHEST_CAPACITY);
      const moved = Math.min(item.count, space);
      if (moved > 0) {
        if (item.durability != null) target.addInstance(item.id, item.durability, item.enchantments);
        else target.add(item.id, moved);
      }
      if (moved < item.count) overflow.push({ ...item, count: item.count - moved });
    }
    this.labels.delete(doubleKey);
    this.sortModes.delete(doubleKey);
    if (label) this.labels.set(remainingKey, label);
    if (sortMode !== 'name') this.sortModes.set(remainingKey, sortMode);
    return overflow;
  }

  serialize() {
    return {
      containers: [...this.containers.entries()]
        .filter(([, inventory]) => inventory.entries().length > 0)
        .map(([key, inventory]) => [key, inventory.serialize()]),
      labels: [...this.labels.entries()],
      sortModes: [...this.sortModes.entries()],
      generatedKeys: [...this.generatedKeys],
    };
  }
}
