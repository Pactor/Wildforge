import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  auroraVisibility,
  biomeAtmosphere,
  cloudWeatherProfile,
  deterministicCloudProfiles,
  deterministicStarDirections,
  eclipseVisibility,
  nightVisibility,
  SkySystem,
} from '../src/sky.js';

test('stars are deterministic and normalized', () => {
  const first = deterministicStarDirections(88, 40);
  assert.deepEqual(first, deterministicStarDirections(88, 40));
  assert.notDeepEqual(first, deterministicStarDirections(89, 40));
  assert.ok(first.every(([x, y, z]) => Math.abs(Math.hypot(x, y, z) - 1) < 0.00001));
});

test('stars fade in as daylight fades', () => {
  assert.equal(nightVisibility(1), 0);
  assert.ok(nightVisibility(0.1) > 0.9);
});

test('block-cloud fronts are seeded, bounded, and built from varied voxel pieces', () => {
  const first = deterministicCloudProfiles(8128, 12);
  assert.deepEqual(first, deterministicCloudProfiles(8128, 12));
  assert.notDeepEqual(first, deterministicCloudProfiles(8129, 12));
  assert.equal(first.length, 12);
  assert.ok(first.every((cloud) => cloud.pieces.length >= 3 && cloud.pieces.length <= 7));
  assert.ok(first.every((cloud) => Math.abs(cloud.x) <= 120 && Math.abs(cloud.z) <= 120));
});

test('rain and storms form denser, faster, darker cloud fronts with stronger shadows', () => {
  const clear = cloudWeatherProfile('clear', 1);
  const rain = cloudWeatherProfile('rain', 1);
  const storm = cloudWeatherProfile('storm', 1);
  assert.ok(clear.visibleFraction < rain.visibleFraction && rain.visibleFraction < storm.visibleFraction);
  assert.ok(clear.speed < rain.speed && rain.speed < storm.speed);
  assert.ok(clear.shadowStrength < rain.shadowStrength && rain.shadowStrength < storm.shadowStrength);
  assert.ok(cloudWeatherProfile('clear', 0.1).opacity < clear.opacity);
});

test('Frostveil auroras require their seeded clear, dark, snowy window', () => {
  const seed = 9917;
  const samples = Array.from({ length: 1000 }, (_, index) => auroraVisibility(seed, index / 1000, 0.04, 'snowy_highlands', 'clear'));
  assert.ok(Math.max(...samples) > 0.9);
  const peakTime = samples.indexOf(Math.max(...samples)) / 1000;
  assert.equal(auroraVisibility(seed, peakTime, 0.04, 'plains', 'clear'), 0);
  assert.equal(auroraVisibility(seed, peakTime, 0.04, 'snowy_highlands', 'rain'), 0);
  assert.equal(auroraVisibility(seed, peakTime, 0.5, 'snowy_highlands', 'clear'), 0);
});

test('solar eclipses have a deterministic clear daytime window', () => {
  const seed = 6412;
  const samples = Array.from({ length: 1000 }, (_, index) => eclipseVisibility(seed, index / 1000, 1, 'clear'));
  const peak = Math.max(...samples);
  const peakTime = samples.indexOf(peak) / 1000;
  const otherSamples = Array.from({ length: 1000 }, (_, index) => eclipseVisibility(seed + 1, index / 1000, 1, 'clear'));
  assert.ok(peak > 0.98);
  assert.equal(eclipseVisibility(seed, peakTime, 0.2, 'clear'), 0);
  assert.equal(eclipseVisibility(seed, peakTime, 1, 'storm'), 0);
  assert.notDeepEqual(samples, otherSamples);
});

test('surface biomes expose distinct bounded atmosphere profiles', () => {
  const plains = biomeAtmosphere('plains', 1);
  const forest = biomeAtmosphere('forest', 1);
  const desert = biomeAtmosphere('desert', 1);
  const frostveil = biomeAtmosphere('snowy_highlands', 1);
  assert.notEqual(plains.sky, forest.sky);
  assert.notEqual(desert.fog, frostveil.fog);
  assert.ok(desert.visibility < plains.visibility);
  assert.ok([plains, forest, desert, frostveil].every((profile) => profile.visibility > 0 && profile.visibility <= 1));
  assert.ok(biomeAtmosphere('unknown', 0.2).blend < plains.blend);
});

test('sky runtime densifies fronts and exposes bounded lighting state', () => {
  const sky = new SkySystem(new THREE.Scene(), 443);
  const player = new THREE.Vector3(20, 18, -30);
  sky.update(1, 0.5, 1, player, 'clear', 'plains');
  const clearCount = sky.clouds.filter((cloud) => cloud.visible).length;
  const state = sky.update(1, 0, 0.04, player, 'storm', 'snowy_highlands');
  assert.equal(sky.clouds.filter((cloud) => cloud.visible).length, sky.clouds.length);
  assert.ok(clearCount < sky.clouds.length);
  assert.ok(state.cloudShadow >= 0 && state.cloudShadow <= 0.48);
  assert.equal(state.auroraIntensity, 0, 'storms suppress the aurora');
  assert.equal(state.eclipseIntensity, 0, 'storms suppress visible eclipses');
  assert.ok(state.eclipseShadow >= 0 && state.eclipseShadow <= 0.72);
});

test('sky runtime renders and cleanly resets the moving eclipse mask', () => {
  const seed = 443;
  const sky = new SkySystem(new THREE.Scene(), seed);
  const player = new THREE.Vector3(0, 20, 0);
  const samples = Array.from({ length: 1000 }, (_, index) => eclipseVisibility(seed, index / 1000, 1, 'clear'));
  const peakTime = samples.indexOf(Math.max(...samples)) / 1000;
  const eclipsed = sky.update(0.1, peakTime, 1, player, 'clear', 'plains');
  assert.ok(eclipsed.eclipseIntensity > 0.98);
  assert.equal(sky.eclipseMask.visible, true);
  assert.ok(sky.sunHalo.material.opacity > 0.4);
  sky.update(0.1, 0.25, 0.2, player, 'clear', 'plains');
  assert.equal(sky.eclipseMask.visible, false);
  assert.equal(sky.sunHalo.material.opacity, 0.14);
});
