import * as THREE from 'three';

const TAU = Math.PI * 2;
const normalizeAngle = (value) => ((value % TAU) + TAU) % TAU;

export function windDirectionName(angle) {
  const names = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'];
  return names[Math.round(normalizeAngle(Number(angle) || 0) / (TAU / 8)) % 8];
}

export function weatherGrowthMultiplier(kind, windStrength = 0) {
  const wind = Math.max(0, Math.min(1, Number(windStrength) || 0));
  if (kind === 'storm') return Math.max(0.5, 0.82 - wind * 0.22);
  if (kind === 'rain') return 1.16;
  return 1;
}

export function weatherFogFactor(kind) {
  return kind === 'storm' ? 0.58 : kind === 'rain' ? 0.78 : 1;
}

export class WeatherState {
  constructor(seed, serialized = null) {
    this.randomState = (serialized?.randomState ?? (seed ^ 0x9e3779b9)) >>> 0 || 1;
    this.kind = ['clear', 'rain', 'storm'].includes(serialized?.kind) ? serialized.kind : 'clear';
    this.remaining = Math.max(1, Number(serialized?.remaining) || 75 + this.random() * 90);
    this.lightningRemaining = Math.max(0.1, Number(serialized?.lightningRemaining) || 4 + this.random() * 8);
    this.pendingLightning = null;
    const seededAngle = normalizeAngle((seed >>> 0) * 0.000173 + 0.7);
    this.windAngle = Number.isFinite(serialized?.windAngle) ? serialized.windAngle : seededAngle;
    this.windStrength = Math.max(0.08, Math.min(1, Number(serialized?.windStrength) || 0.24));
    this.targetWindAngle = Number.isFinite(serialized?.targetWindAngle) ? serialized.targetWindAngle : this.windAngle;
    this.targetWindStrength = Math.max(0.08, Math.min(1, Number(serialized?.targetWindStrength) || this.windStrength));
  }

  random() {
    let x = this.randomState;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.randomState = x >>> 0;
    return this.randomState / 4294967296;
  }

  update(dt) {
    this.remaining -= dt;
    let transitioned = false;
    if (this.remaining <= 0) {
      if (this.kind === 'clear') {
        this.kind = this.random() < 0.72 ? 'rain' : 'storm';
        this.remaining = 70 + this.random() * 100;
        if (this.kind === 'storm') this.lightningRemaining = 2 + this.random() * 5;
      } else {
        this.kind = 'clear';
        this.remaining = 110 + this.random() * 190;
      }
      this.targetWindAngle = this.random() * TAU;
      this.targetWindStrength = this.kind === 'storm' ? 0.72 + this.random() * 0.28
        : this.kind === 'rain' ? 0.42 + this.random() * 0.35
          : 0.12 + this.random() * 0.35;
      transitioned = true;
    }
    const windBlend = Math.min(1, Math.max(0, Number(dt) || 0) * 0.035);
    const angleDelta = Math.atan2(Math.sin(this.targetWindAngle - this.windAngle), Math.cos(this.targetWindAngle - this.windAngle));
    this.windAngle = normalizeAngle(this.windAngle + angleDelta * windBlend);
    this.windStrength += (this.targetWindStrength - this.windStrength) * windBlend;
    if (this.kind === 'storm') {
      this.lightningRemaining -= dt;
      if (this.lightningRemaining <= 0) {
        this.pendingLightning = {
          angle: this.random() * Math.PI * 2,
          distance: 7 + this.random() * 22,
          shapeSeed: Math.floor(this.random() * 0xffffffff) >>> 0,
        };
        this.lightningRemaining = 4 + this.random() * 9;
      }
    }
    return transitioned;
  }

  takeLightning() {
    const strike = this.pendingLightning;
    this.pendingLightning = null;
    return strike;
  }

  intensity() {
    return this.kind === 'storm' ? 1 : this.kind === 'rain' ? 0.62 : 0;
  }

  daylightFactor() {
    return this.kind === 'storm' ? 0.48 : this.kind === 'rain' ? 0.72 : 1;
  }

  windVector() {
    return { x: Math.cos(this.windAngle) * this.windStrength, z: Math.sin(this.windAngle) * this.windStrength };
  }

  forecast() {
    const clone = new WeatherState(1, this.serialize());
    clone.remaining = 0.0001;
    clone.update(0.01);
    return {
      kind: clone.kind,
      duration: clone.remaining,
      windAngle: clone.targetWindAngle,
      windStrength: clone.targetWindStrength,
      windDirection: windDirectionName(clone.targetWindAngle),
    };
  }

  serialize() {
    return {
      kind: this.kind,
      remaining: this.remaining,
      randomState: this.randomState,
      lightningRemaining: this.lightningRemaining,
      windAngle: this.windAngle,
      windStrength: this.windStrength,
      targetWindAngle: this.targetWindAngle,
      targetWindStrength: this.targetWindStrength,
    };
  }
}

export class WeatherSystem {
  constructor(scene, seed, count = 700) {
    this.count = count;
    this.offsets = new Float32Array(count * 3);
    this.speeds = new Float32Array(count);
    let state = (seed ^ 0x85ebca6b) >>> 0 || 1;
    const random = () => {
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
    for (let index = 0; index < count; index += 1) {
      this.offsets[index * 3] = (random() - 0.5) * 42;
      this.offsets[index * 3 + 1] = random() * 30 - 5;
      this.offsets[index * 3 + 2] = (random() - 0.5) * 42;
      this.speeds[index] = 0.7 + random() * 0.8;
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.offsets, 3));
    this.material = new THREE.PointsMaterial({
      color: 0x9fcce5,
      size: 0.18,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      fog: true,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.name = 'Voxel Precipitation';
    this.points.visible = false;
    scene.add(this.points);

    this.lightningGeometry = new THREE.BufferGeometry();
    this.lightningGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(30), 3));
    this.lightningMaterial = new THREE.LineBasicMaterial({
      color: 0xdff6ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    this.lightning = new THREE.Line(this.lightningGeometry, this.lightningMaterial);
    this.lightning.name = 'Voxel Lightning';
    this.lightning.visible = false;
    scene.add(this.lightning);
    this.flashLight = new THREE.PointLight(0xd7eeff, 0, 85, 1.4);
    this.flashLight.name = 'Lightning Flash';
    scene.add(this.flashLight);
    this.flash = 0;
    this.reducedMotion = false;
    this.reduceFlashes = false;
  }

  setAccessibility(options = {}) {
    this.reducedMotion = Boolean(options.reducedMotion);
    this.reduceFlashes = Boolean(options.reduceFlashes);
    this.geometry.setDrawRange(0, this.reducedMotion ? Math.min(140, this.count) : this.count);
    if (this.reduceFlashes) {
      this.flash = 0;
      this.lightning.visible = false;
      this.flashLight.intensity = 0;
    }
    return { reducedMotion: this.reducedMotion, reduceFlashes: this.reduceFlashes };
  }

  update(dt, weather, playerPosition, biomeId, submerged = false) {
    const strike = weather.takeLightning();
    if (strike && biomeId !== 'desert' && !submerged && !this.reduceFlashes) this.triggerLightning(playerPosition, strike);
    this.flash = Math.max(0, this.flash - dt * 5.5);
    this.lightningMaterial.opacity = Math.min(1, this.flash * 1.8);
    this.flashLight.intensity = this.flash * 18;
    this.lightning.visible = this.flash > 0;
    const intensity = weather.intensity();
    const suppressed = biomeId === 'desert' || submerged;
    this.points.visible = intensity > 0 && !suppressed;
    if (!this.points.visible) return strike && !suppressed ? strike : null;
    const snow = biomeId === 'snowy_highlands';
    const wind = weather.windVector();
    this.material.color.setHex(snow ? 0xf1f7f8 : 0x8fc5df);
    this.material.size = snow ? 0.7 : weather.kind === 'storm' ? 0.22 : 0.16;
    this.material.opacity = snow ? 0.85 : 0.55 + intensity * 0.28;
    this.points.position.copy(playerPosition);
    const positions = this.geometry.getAttribute('position');
    for (let index = 0; index < this.count; index += 1) {
      const offset = index * 3;
      const motionScale = this.reducedMotion ? 0.32 : 1;
      positions.array[offset + 1] -= dt * this.speeds[index] * (snow ? 3.2 : 18 + intensity * 7) * motionScale;
      positions.array[offset] += wind.x * dt * this.speeds[index] * (snow ? 2.4 : 8) * motionScale;
      positions.array[offset + 2] += wind.z * dt * this.speeds[index] * (snow ? 2.4 : 8) * motionScale;
      if (snow) {
        positions.array[offset] += Math.sin(index * 1.7 + weather.remaining) * dt * 0.45;
        if (positions.array[offset] > 21) positions.array[offset] -= 42;
        if (positions.array[offset] < -21) positions.array[offset] += 42;
      }
      if (positions.array[offset] > 21) positions.array[offset] -= 42;
      if (positions.array[offset] < -21) positions.array[offset] += 42;
      if (positions.array[offset + 2] > 21) positions.array[offset + 2] -= 42;
      if (positions.array[offset + 2] < -21) positions.array[offset + 2] += 42;
      if (positions.array[offset + 1] < -4) positions.array[offset + 1] += 30;
    }
    positions.needsUpdate = true;
    return strike && !suppressed ? strike : null;
  }

  triggerLightning(playerPosition, strike) {
    const endX = playerPosition.x + Math.cos(strike.angle) * strike.distance;
    const endZ = playerPosition.z + Math.sin(strike.angle) * strike.distance;
    const endY = Math.max(2, playerPosition.y - 1.6);
    let state = strike.shapeSeed || 1;
    const random = () => {
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
    const positions = this.lightningGeometry.getAttribute('position');
    for (let index = 0; index < 10; index += 1) {
      const t = index / 9;
      const wander = Math.sin(t * Math.PI) * 1.7;
      positions.array[index * 3] = endX + (random() - 0.5) * wander;
      positions.array[index * 3 + 1] = endY + (1 - t) * 34;
      positions.array[index * 3 + 2] = endZ + (random() - 0.5) * wander;
    }
    positions.needsUpdate = true;
    this.flashLight.position.set(endX, endY + 8, endZ);
    this.flash = 1;
    this.lightning.visible = true;
  }
}
