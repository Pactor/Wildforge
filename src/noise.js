function hash2(x, z, seed) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function hash3(x, y, z, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 1442695041) ^ Math.imul(z | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 2246822519);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

export function valueNoise2(x, z, seed) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const tx = smooth(x - xi);
  const tz = smooth(z - zi);
  const a = hash2(xi, zi, seed);
  const b = hash2(xi + 1, zi, seed);
  const c = hash2(xi, zi + 1, seed);
  const d = hash2(xi + 1, zi + 1, seed);
  const ab = a + (b - a) * tx;
  const cd = c + (d - c) * tx;
  return ab + (cd - ab) * tz;
}

export function fbm2(x, z, seed, octaves = 4) {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let normalization = 0;
  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise2(x * frequency, z * frequency, seed + i * 1013) * amplitude;
    normalization += amplitude;
    frequency *= 2;
    amplitude *= 0.5;
  }
  return sum / normalization;
}

export function valueNoise3(x, y, z, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const tx = smooth(x - xi);
  const ty = smooth(y - yi);
  const tz = smooth(z - zi);
  const sample = (ox, oy, oz) => hash3(xi + ox, yi + oy, zi + oz, seed);
  const x00 = sample(0, 0, 0) + (sample(1, 0, 0) - sample(0, 0, 0)) * tx;
  const x10 = sample(0, 1, 0) + (sample(1, 1, 0) - sample(0, 1, 0)) * tx;
  const x01 = sample(0, 0, 1) + (sample(1, 0, 1) - sample(0, 0, 1)) * tx;
  const x11 = sample(0, 1, 1) + (sample(1, 1, 1) - sample(0, 1, 1)) * tx;
  const y0 = x00 + (x10 - x00) * ty;
  const y1 = x01 + (x11 - x01) * ty;
  return y0 + (y1 - y0) * tz;
}

export function fbm3(x, y, z, seed, octaves = 3) {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let normalization = 0;
  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise3(x * frequency, y * frequency, z * frequency, seed + i * 1013) * amplitude;
    normalization += amplitude;
    frequency *= 2;
    amplitude *= 0.5;
  }
  return sum / normalization;
}

export function coordinateRandom(x, z, seed, salt = 0) {
  return hash2(x + salt * 31, z - salt * 17, seed + salt * 7919);
}

export function seedFromString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
