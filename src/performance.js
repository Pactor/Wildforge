export const PERFORMANCE_MODES = Object.freeze(['adaptive', 'performance', 'balanced', 'quality', 'custom']);

export const PERFORMANCE_PROFILES = Object.freeze({
  performance: Object.freeze({ viewDistance: 1, renderScale: 0.7 }),
  balanced: Object.freeze({ viewDistance: 2, renderScale: 1 }),
  quality: Object.freeze({ viewDistance: 3, renderScale: 1.25 }),
});

const ADAPTIVE_STEPS = Object.freeze([
  Object.freeze({ viewDistance: 1, renderScale: 0.6 }),
  Object.freeze({ viewDistance: 1, renderScale: 0.8 }),
  Object.freeze({ viewDistance: 2, renderScale: 1 }),
  Object.freeze({ viewDistance: 2, renderScale: 1.15 }),
  Object.freeze({ viewDistance: 3, renderScale: 1.25 }),
]);

const close = (a, b, epsilon = 0.025) => Math.abs(Number(a) - Number(b)) <= epsilon;

export function performanceProfile(mode) {
  const profile = PERFORMANCE_PROFILES[mode];
  return profile ? { ...profile } : null;
}

export function inferPerformanceMode(settings = {}) {
  for (const [mode, profile] of Object.entries(PERFORMANCE_PROFILES)) {
    if (Math.round(Number(settings.viewDistance)) === profile.viewDistance && close(settings.renderScale, profile.renderScale)) return mode;
  }
  return 'custom';
}

function closestAdaptiveStep(settings = {}) {
  let best = 2;
  let bestDistance = Infinity;
  for (let index = 0; index < ADAPTIVE_STEPS.length; index += 1) {
    const step = ADAPTIVE_STEPS[index];
    const distance = Math.abs((Number(settings.viewDistance) || 2) - step.viewDistance) * 1.5
      + Math.abs((Number(settings.renderScale) || 1) - step.renderScale) * 4;
    if (distance < bestDistance) { best = index; bestDistance = distance; }
  }
  return best;
}

export class PerformanceMonitor {
  constructor(settings = {}, options = {}) {
    this.windowSize = Math.max(30, Math.min(240, Math.floor(Number(options.windowSize) || 120)));
    this.cooldownSeconds = Math.max(2, Math.min(30, Number(options.cooldownSeconds) || 10));
    this.samples = [];
    this.elapsed = 0;
    this.cooldown = 0;
    this.badWindows = 0;
    this.goodWindows = 0;
    this.step = closestAdaptiveStep(settings);
    this.fps = 60;
    this.frameTime = 16.7;
  }

  reset(settings = {}) {
    this.samples.length = 0;
    this.elapsed = 0;
    this.cooldown = 0;
    this.badWindows = 0;
    this.goodWindows = 0;
    this.step = closestAdaptiveStep(settings);
  }

  sample(dt) {
    dt = Number(dt);
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.25) return false;
    this.samples.push(dt);
    if (this.samples.length > this.windowSize) this.samples.shift();
    const average = this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length;
    this.fps = Math.max(1, Math.min(240, 1 / average));
    this.frameTime = average * 1000;
    return true;
  }

  update(dt, settings = {}) {
    dt = Math.max(0, Math.min(0.25, Number(dt) || 0));
    this.elapsed += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.samples.length < this.windowSize || this.elapsed < 2) return null;
    this.elapsed = 0;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const p90 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))] * 1000;
    const struggling = this.fps < 48 || p90 > 24;
    const comfortable = this.fps > 58 && p90 < 18.5;
    this.badWindows = struggling ? this.badWindows + 1 : 0;
    this.goodWindows = comfortable ? this.goodWindows + 1 : 0;
    if (this.cooldown > 0) return null;
    let next = this.step;
    if (this.badWindows >= 2 && this.step > 0) next -= 1;
    else if (this.goodWindows >= 3 && this.step < ADAPTIVE_STEPS.length - 1) next += 1;
    if (next === this.step) return null;
    this.step = next;
    this.cooldown = this.cooldownSeconds;
    this.badWindows = 0;
    this.goodWindows = 0;
    const profile = ADAPTIVE_STEPS[this.step];
    if (Math.round(Number(settings.viewDistance)) === profile.viewDistance && close(settings.renderScale, profile.renderScale)) return null;
    return { ...profile, step: this.step, fps: Math.round(this.fps) };
  }

  metrics() {
    return { fps: Math.round(this.fps), frameTime: Number(this.frameTime.toFixed(1)), step: this.step };
  }
}
