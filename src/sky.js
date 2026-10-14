import * as THREE from 'three';

const CLOUD_FIELD_SIZE = 240;
const AURORA_SEGMENTS = 18;

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const wrapUnit = (value) => ((value % 1) + 1) % 1;
const wrapNear = (value, center, size) => center + ((((value - center + size / 2) % size) + size) % size) - size / 2;

function seededRandom(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

export function nightVisibility(daylight) {
  return THREE.MathUtils.smoothstep(1 - daylight, 0.15, 0.82);
}

export function deterministicStarDirections(seed, count = 180) {
  const random = seededRandom((seed ^ 0x6d2b79f5) >>> 0);
  const values = [];
  for (let index = 0; index < count; index += 1) {
    const y = random() * 1.25 - 0.25;
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    values.push([Math.cos(angle) * radius, y, Math.sin(angle) * radius]);
  }
  return values;
}

export function deterministicCloudProfiles(seed, count = 28) {
  const random = seededRandom((seed ^ 0x85ebca77) >>> 0);
  return Array.from({ length: count }, (_, index) => {
    const pieceCount = 3 + Math.floor(random() * 5);
    const pieces = Array.from({ length: pieceCount }, (_, piece) => ({
      x: (piece - (pieceCount - 1) / 2) * (4.6 + random() * 2.1),
      y: random() * 1.7,
      z: (random() - 0.5) * 8.5,
      width: 5 + random() * 8,
      height: 1 + random() * 1.5,
      depth: 3 + random() * 6,
    }));
    return {
      index,
      x: (random() - 0.5) * CLOUD_FIELD_SIZE,
      z: (random() - 0.5) * CLOUD_FIELD_SIZE,
      y: 47 + random() * 10,
      phase: random() * Math.PI * 2,
      rank: random(),
      pieces,
    };
  });
}

export function cloudWeatherProfile(kind = 'clear', daylight = 1) {
  const light = clamp01(daylight);
  if (kind === 'storm') return { visibleFraction: 1, opacity: 0.82, speed: 3.1, color: 0x747c82, shadowStrength: 0.48 };
  if (kind === 'rain') return { visibleFraction: 0.84, opacity: 0.72, speed: 2.15, color: 0xaeb7bb, shadowStrength: 0.31 };
  return { visibleFraction: 0.58, opacity: 0.34 + light * 0.36, speed: 1.25, color: 0xf3f5ed, shadowStrength: 0.17 };
}

export function auroraVisibility(seed, worldTime, daylight, biomeId, weatherKind) {
  if (biomeId !== 'snowy_highlands' || weatherKind !== 'clear' || daylight >= 0.3) return 0;
  const peak = wrapUnit((((seed ^ 0xa53c9e17) >>> 0) % 1000) / 5000 - 0.1);
  const time = wrapUnit(worldTime);
  const distance = Math.min(Math.abs(time - peak), 1 - Math.abs(time - peak));
  const timeStrength = clamp01(1 - distance / 0.115);
  const darkness = clamp01((0.3 - daylight) / 0.24);
  return timeStrength * darkness;
}

export function eclipseVisibility(seed, worldTime, daylight, weatherKind = 'clear') {
  if (weatherKind !== 'clear' || daylight < 0.62) return 0;
  const peak = 0.42 + (((seed ^ 0x4f1bbcdc) >>> 0) % 1600) / 10000;
  const time = wrapUnit(worldTime);
  const distance = Math.min(Math.abs(time - peak), 1 - Math.abs(time - peak));
  const linear = clamp01(1 - distance / 0.042);
  const eased = linear * linear * (3 - 2 * linear);
  return eased * clamp01((daylight - 0.62) / 0.28);
}

const BIOME_ATMOSPHERES = Object.freeze({
  plains: { sky: 0x75b7e8, fog: 0x91c4e5, sun: 0xfff1c2, hemisphere: 0xc8e5ff, ground: 0x64704d, visibility: 1 },
  forest: { sky: 0x68a9cf, fog: 0x7faeaa, sun: 0xffedbd, hemisphere: 0xb8d9d8, ground: 0x405c3e, visibility: 0.91 },
  desert: { sky: 0x86c5e4, fog: 0xd7bd83, sun: 0xffdda0, hemisphere: 0xf0dbb0, ground: 0x8b7047, visibility: 0.76 },
  snowy_highlands: { sky: 0x9bc9e5, fog: 0xc9dce4, sun: 0xfff5df, hemisphere: 0xd9efff, ground: 0x78898d, visibility: 0.94 },
  cinderreach: { sky: 0x4a2526, fog: 0x6e3430, sun: 0xff8a52, hemisphere: 0x9b4c3d, ground: 0x2b2225, visibility: 0.62 },
});

export function biomeAtmosphere(biomeId = 'plains', daylight = 1) {
  const profile = BIOME_ATMOSPHERES[biomeId] || BIOME_ATMOSPHERES.plains;
  return {
    ...profile,
    blend: 0.12 + clamp01(daylight) * 0.58,
    fogBlend: 0.18 + clamp01(daylight) * 0.5,
  };
}

function makeDisc(size, color, opacity = 1) {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthTest: false,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
  mesh.renderOrder = -100;
  return mesh;
}

function makeAuroraRibbon(color, index) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(AURORA_SEGMENTS * 18), 3));
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -70;
  mesh.userData.ribbonIndex = index;
  return mesh;
}

function updateAuroraRibbon(mesh, worldTime) {
  const positions = mesh.geometry.getAttribute('position');
  const ribbon = mesh.userData.ribbonIndex;
  for (let segment = 0; segment < AURORA_SEGMENTS; segment += 1) {
    const x0 = -82 + segment * (164 / AURORA_SEGMENTS);
    const x1 = -82 + (segment + 1) * (164 / AURORA_SEGMENTS);
    const wave0 = Math.sin(segment * 0.72 + ribbon * 1.8 + worldTime * Math.PI * 8);
    const wave1 = Math.sin((segment + 1) * 0.72 + ribbon * 1.8 + worldTime * Math.PI * 8);
    const z0 = (ribbon - 1) * 13 + wave0 * 7;
    const z1 = (ribbon - 1) * 13 + wave1 * 7;
    const bottom0 = 55 + wave0 * 1.5 + ribbon * 1.5;
    const bottom1 = 55 + wave1 * 1.5 + ribbon * 1.5;
    const top0 = bottom0 + 12 + (wave0 + 1) * 4;
    const top1 = bottom1 + 12 + (wave1 + 1) * 4;
    positions.array.set([
      x0, bottom0, z0, x1, bottom1, z1, x1, top1, z1,
      x0, bottom0, z0, x1, top1, z1, x0, top0, z0,
    ], segment * 18);
  }
  positions.needsUpdate = true;
  mesh.geometry.computeBoundingSphere();
}

export class SkySystem {
  constructor(scene, seed) {
    this.scene = scene;
    this.seed = seed;
    this.root = new THREE.Group();
    this.root.name = 'Voxel Sky';
    this.scene.add(this.root);

    this.sunHalo = makeDisc(15, 0xffdc78, 0.14);
    this.sun = makeDisc(8, 0xffefb0);
    this.moon = makeDisc(7, 0xc7d7df);
    this.eclipseCorona = makeDisc(13, 0xffa94f, 0);
    this.eclipseMask = makeDisc(7.7, 0x060914, 0);
    this.eclipseCorona.renderOrder = -98;
    this.eclipseMask.renderOrder = -97;
    this.root.add(this.sunHalo, this.sun, this.moon, this.eclipseCorona, this.eclipseMask);

    const starDirections = deterministicStarDirections(seed);
    const positions = new Float32Array(starDirections.length * 3);
    starDirections.forEach((direction, index) => {
      positions[index * 3] = direction[0] * 105;
      positions[index * 3 + 1] = direction[1] * 105;
      positions[index * 3 + 2] = direction[2] * 105;
    });
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starMaterial = new THREE.PointsMaterial({
      color: 0xe8f2ff,
      size: 0.85,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      fog: false,
    });
    this.stars = new THREE.Points(starGeometry, this.starMaterial);
    this.stars.renderOrder = -101;
    this.root.add(this.stars);

    this.cloudRoot = new THREE.Group();
    this.cloudRoot.name = 'Block Cloud Fronts';
    this.cloudMaterial = new THREE.MeshLambertMaterial({ color: 0xf3f5ed, transparent: true, opacity: 0.7, fog: true, depthWrite: false });
    this.cloudGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.clouds = [];
    this.buildClouds();
    this.scene.add(this.cloudRoot);
    this.cloudOffset = 0;
    this.cloudWindX = 0;
    this.cloudWindZ = 0;

    this.auroraRoot = new THREE.Group();
    this.auroraRoot.name = 'Frostveil Aurora';
    this.auroraRibbons = [0x73f0c2, 0x68bfe8, 0xa680e8].map((color, index) => makeAuroraRibbon(color, index));
    this.auroraRoot.add(...this.auroraRibbons);
    this.auroraRoot.visible = false;
    this.scene.add(this.auroraRoot);
    this.cloudShadow = 0;
    this.auroraIntensity = 0;
    this.eclipseIntensity = 0;
  }

  buildClouds() {
    for (const profile of deterministicCloudProfiles(this.seed)) {
      const cloud = new THREE.Group();
      for (const piece of profile.pieces) {
        const cube = new THREE.Mesh(this.cloudGeometry, this.cloudMaterial);
        cube.scale.set(piece.width, piece.height, piece.depth);
        cube.position.set(piece.x, piece.y, piece.z);
        cloud.add(cube);
      }
      const radiusX = profile.pieces.reduce((value, piece) => Math.max(value, Math.abs(piece.x) + piece.width / 2), 1);
      const radiusZ = profile.pieces.reduce((value, piece) => Math.max(value, Math.abs(piece.z) + piece.depth / 2), 1);
      cloud.userData = { ...profile, radiusX, radiusZ };
      cloud.position.y = profile.y;
      this.cloudRoot.add(cloud);
      this.clouds.push(cloud);
    }
  }

  updateClouds(dt, daylight, playerPosition, weatherKind, wind = { x: 1, z: 0 }) {
    const profile = cloudWeatherProfile(weatherKind, daylight);
    this.cloudOffset = (this.cloudOffset + dt * profile.speed) % CLOUD_FIELD_SIZE;
    const windLength = Math.hypot(Number(wind.x) || 0, Number(wind.z) || 0) || 1;
    this.cloudWindX = (this.cloudWindX + (Number(wind.x) || 0) / windLength * dt * profile.speed) % CLOUD_FIELD_SIZE;
    this.cloudWindZ = (this.cloudWindZ + (Number(wind.z) || 0) / windLength * dt * profile.speed) % CLOUD_FIELD_SIZE;
    this.cloudMaterial.opacity = profile.opacity;
    this.cloudMaterial.color.setHex(profile.color);
    let shadow = 0;
    for (const cloud of this.clouds) {
      cloud.visible = cloud.userData.rank <= profile.visibleFraction;
      if (!cloud.visible) continue;
      const worldX = cloud.userData.x + this.cloudWindX;
      cloud.position.x = wrapNear(worldX, playerPosition.x, CLOUD_FIELD_SIZE);
      cloud.position.z = wrapNear(cloud.userData.z + this.cloudWindZ + Math.sin(this.cloudOffset * 0.012 + cloud.userData.phase) * 8, playerPosition.z, CLOUD_FIELD_SIZE);
      const xCoverage = clamp01(1 - Math.abs(cloud.position.x - playerPosition.x) / (cloud.userData.radiusX + 7));
      const zCoverage = clamp01(1 - Math.abs(cloud.position.z - playerPosition.z) / (cloud.userData.radiusZ + 7));
      shadow = Math.max(shadow, xCoverage * zCoverage * profile.shadowStrength);
    }
    this.cloudShadow = shadow;
  }

  updateAurora(worldTime, daylight, playerPosition, biomeId, weatherKind) {
    this.auroraIntensity = auroraVisibility(this.seed, worldTime, daylight, biomeId, weatherKind);
    this.auroraRoot.visible = this.auroraIntensity > 0.01;
    if (!this.auroraRoot.visible) return;
    this.auroraRoot.position.set(playerPosition.x, 0, playerPosition.z);
    this.auroraRoot.rotation.y = -0.28;
    this.auroraRibbons.forEach((ribbon, index) => {
      updateAuroraRibbon(ribbon, worldTime);
      ribbon.material.opacity = this.auroraIntensity * (0.18 + index * 0.035);
    });
  }

  updateEclipse(worldTime, daylight, weatherKind, center) {
    this.eclipseIntensity = eclipseVisibility(this.seed, worldTime, daylight, weatherKind);
    this.sunHalo.material.opacity = 0.14;
    const visible = this.eclipseIntensity > 0.002;
    this.eclipseMask.visible = visible;
    this.eclipseCorona.visible = visible;
    if (!visible) return;
    const offset = (1 - this.eclipseIntensity) * 8.4;
    this.eclipseMask.position.copy(this.sun.position).add(new THREE.Vector3(offset, offset * 0.12, 0));
    this.eclipseCorona.position.copy(this.sun.position);
    this.eclipseMask.lookAt(center);
    this.eclipseCorona.lookAt(center);
    this.eclipseMask.material.opacity = 0.3 + this.eclipseIntensity * 0.7;
    this.eclipseCorona.material.opacity = this.eclipseIntensity * 0.32;
    this.sunHalo.material.opacity = 0.14 + this.eclipseIntensity * 0.3;
  }

  update(dt, worldTime, daylight, playerPosition, weatherKind = 'clear', biomeId = 'plains', wind = { x: 1, z: 0 }) {
    const angle = worldTime * Math.PI * 2 - Math.PI / 2;
    const center = new THREE.Vector3(playerPosition.x, playerPosition.y + 12, playerPosition.z);
    const sunVector = new THREE.Vector3(Math.cos(angle) * 86, Math.sin(angle) * 86, -38);
    this.sun.position.copy(center).add(sunVector);
    this.sunHalo.position.copy(this.sun.position);
    this.moon.position.copy(center).sub(sunVector);
    this.sun.lookAt(center);
    this.sunHalo.lookAt(center);
    this.moon.lookAt(center);
    this.sun.visible = Math.sin(angle) > -0.18;
    this.sunHalo.visible = this.sun.visible;
    this.moon.visible = Math.sin(angle) < 0.25;
    this.starMaterial.opacity = nightVisibility(daylight);
    this.stars.position.copy(center);
    this.stars.rotation.y = worldTime * Math.PI * 2;
    this.updateClouds(dt, daylight, playerPosition, weatherKind, wind);
    this.updateAurora(worldTime, daylight, playerPosition, biomeId, weatherKind);
    this.updateEclipse(worldTime, daylight, weatherKind, center);
    return {
      cloudShadow: this.cloudShadow,
      auroraIntensity: this.auroraIntensity,
      eclipseIntensity: this.eclipseIntensity,
      eclipseShadow: this.eclipseIntensity * 0.72,
    };
  }
}
