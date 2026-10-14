import { BLOCK } from './blocks.js';

const validKeys = (values) => Array.isArray(values) ? values.filter((value) => typeof value === 'string').slice(0, 128) : [];

export class EchoVaultState {
  constructor(world, saved = null, callbacks = {}) {
    this.world = world;
    this.cleared = new Set(validKeys(saved?.cleared));
    this.triggered = new Set(validKeys(saved?.triggered));
    this.onTrap = callbacks.onTrap || (() => {});
    this.onClear = callbacks.onClear || (() => {});
    this.timer = 0;
  }

  isCleared(key) {
    return typeof key === 'string' && this.cleared.has(key);
  }

  isTriggered(key) {
    return typeof key === 'string' && this.triggered.has(key);
  }

  sync(vault) {
    if (!vault?.key) return 0;
    const features = this.world.echoVaultFeatures(vault);
    const changes = [];
    if (this.cleared.has(vault.key)) {
      for (const seal of features.seal) {
        if (this.world.getBlock(seal.x, seal.y, seal.z) === BLOCK.VAULT_SEAL) changes.push({ ...seal, id: BLOCK.AIR });
      }
    }
    if (this.triggered.has(vault.key) && this.world.getBlock(features.trap.x, features.trap.y, features.trap.z) === BLOCK.ECHO_SPIKES_ARMED) {
      changes.push({ ...features.trap, id: BLOCK.ECHO_SPIKES_SPENT });
    }
    return changes.length ? this.world.setBlocks(changes) : 0;
  }

  clear(vault) {
    if (!vault?.key || this.cleared.has(vault.key)) return false;
    this.cleared.add(vault.key);
    this.sync(vault);
    this.onClear(vault, this.world.echoVaultFeatures(vault));
    return true;
  }

  update(dt, position) {
    this.timer -= Math.max(0, Number(dt) || 0);
    if (this.timer > 0 || !position) return null;
    this.timer = 0.18;
    const vaults = this.world.echoVaultsNear?.(position.x, position.z, 24) || [];
    for (const vault of vaults) {
      this.sync(vault);
      if (this.cleared.has(vault.key) || this.triggered.has(vault.key)) continue;
      const trap = this.world.echoVaultFeatures(vault).trap;
      if (this.world.getBlock(trap.x, trap.y, trap.z) !== BLOCK.ECHO_SPIKES_ARMED) continue;
      const dx = position.x - (trap.x + 0.5);
      const dy = position.y - trap.y;
      const dz = position.z - (trap.z + 0.5);
      if (Math.hypot(dx, dz) > 0.82 || dy < -0.2 || dy > 1.8) continue;
      this.triggered.add(vault.key);
      this.sync(vault);
      const event = { vault, trap, damage: 4 };
      this.onTrap(event);
      return event;
    }
    return null;
  }

  serialize() {
    return {
      cleared: [...this.cleared].sort(),
      triggered: [...this.triggered].sort(),
    };
  }
}
