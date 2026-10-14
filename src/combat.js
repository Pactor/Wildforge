export class CombatState {
  constructor() {
    this.remaining = 0;
    this.recovery = 0.5;
  }

  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.remaining = Math.max(0, this.remaining - dt);
  }

  readiness() {
    return this.recovery > 0 ? Math.max(0, Math.min(1, 1 - this.remaining / this.recovery)) : 1;
  }

  tryAttack(tool) {
    if (this.remaining > 0 || !tool || tool.damage <= 0) return null;
    this.recovery = Math.max(0.1, Number(tool.recovery) || 0.5);
    this.remaining = this.recovery;
    return {
      damage: tool.damage,
      knockback: Math.max(0, Number(tool.knockback) || 2),
      recovery: this.recovery,
    };
  }
}
