export class SurvivalState {
  constructor(data = null) {
    this.maxHealth = 20;
    this.maxHunger = 20;
    this.maxAir = 20;
    this.health = clamp(data?.health ?? this.maxHealth, 0, this.maxHealth);
    this.hunger = clamp(data?.hunger ?? this.maxHunger, 0, this.maxHunger);
    this.saturation = clamp(data?.saturation ?? 5, 0, 20);
    this.exhaustion = Math.max(0, data?.exhaustion ?? 0);
    this.air = clamp(data?.air ?? this.maxAir, 0, this.maxAir);
    this.regenTimer = 0;
    this.starveTimer = 0;
    this.drownTimer = 0;
    this.lavaTimer = 0;
    this.dead = this.health <= 0;
    this.damageScale = 1;
    this.exhaustionScale = 1;
  }

  setModifiers({ damageScale = 1, exhaustionScale = 1 } = {}) {
    this.damageScale = clampScale(damageScale);
    this.exhaustionScale = clampScale(exhaustionScale);
    return this;
  }

  addExhaustion(amount) {
    this.exhaustion += Math.max(0, amount) * this.exhaustionScale;
  }

  damage(amount) {
    if (this.dead || amount <= 0) return false;
    this.health = Math.max(0, this.health - amount * this.damageScale);
    this.dead = this.health === 0;
    return true;
  }

  heal(amount) {
    if (this.dead || amount <= 0) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  eat(food, saturation = 0) {
    if (this.dead || food <= 0 || this.hunger >= this.maxHunger) return false;
    this.hunger = Math.min(this.maxHunger, this.hunger + food);
    this.saturation = Math.min(this.hunger, this.saturation + Math.max(0, saturation));
    return true;
  }

  update(dt, moving = false, sprinting = false) {
    this.addExhaustion(dt * (sprinting && moving ? 0.075 : moving ? 0.012 : 0.003));
    while (this.exhaustion >= 4) {
      this.exhaustion -= 4;
      if (this.saturation > 0) this.saturation = Math.max(0, this.saturation - 1);
      else this.hunger = Math.max(0, this.hunger - 1);
    }
    if (this.hunger >= 18 && this.health < this.maxHealth) {
      this.regenTimer += dt;
      if (this.regenTimer >= 4) {
        this.regenTimer = 0;
        this.heal(1);
        this.addExhaustion(1.5);
      }
    } else this.regenTimer = 0;
    if (this.hunger === 0) {
      this.starveTimer += dt;
      if (this.starveTimer >= 4) {
        this.starveTimer = 0;
        this.damage(1);
      }
    } else this.starveTimer = 0;
  }

  updateBreathing(dt, submerged) {
    if (this.dead) return false;
    if (submerged) this.air = Math.max(0, this.air - dt);
    else {
      this.air = Math.min(this.maxAir, this.air + dt * 5);
      this.drownTimer = 0;
    }
    if (this.air > 0) return false;
    this.drownTimer += dt;
    if (this.drownTimer < 1) return false;
    this.drownTimer -= 1;
    return this.damage(2);
  }

  updateLava(dt, immersed) {
    if (this.dead || !immersed) {
      this.lavaTimer = 0;
      return false;
    }
    this.lavaTimer += Math.max(0, dt);
    if (this.lavaTimer < 0.5) return false;
    this.lavaTimer %= 0.5;
    return this.damage(2);
  }

  respawn() {
    this.health = this.maxHealth;
    this.hunger = this.maxHunger;
    this.saturation = 5;
    this.exhaustion = 0;
    this.air = this.maxAir;
    this.drownTimer = 0;
    this.lavaTimer = 0;
    this.dead = false;
  }

  serialize() {
    return {
      health: this.health,
      hunger: this.hunger,
      saturation: this.saturation,
      exhaustion: this.exhaustion,
      air: this.air,
    };
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function clampScale(value) {
  return Math.max(0, Math.min(1, Number.isFinite(Number(value)) ? Number(value) : 1));
}
