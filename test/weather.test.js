import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { weatherFogFactor, weatherGrowthMultiplier, WeatherState, WeatherSystem, windDirectionName } from '../src/weather.js';

test('weather transitions deterministically and persists exactly', () => {
  const first = new WeatherState(123, { kind: 'clear', remaining: 0.1, randomState: 99 });
  const second = new WeatherState(123, { kind: 'clear', remaining: 0.1, randomState: 99 });
  first.update(1);
  second.update(1);
  assert.equal(first.kind, second.kind);
  assert.equal(first.remaining, second.remaining);
  const restored = new WeatherState(123, first.serialize());
  assert.deepEqual(restored.serialize(), first.serialize());
});

test('storm light attenuation is stronger than rain', () => {
  const weather = new WeatherState(1);
  weather.kind = 'clear';
  const clear = weather.daylightFactor();
  weather.kind = 'rain';
  const rain = weather.daylightFactor();
  weather.kind = 'storm';
  assert.ok(clear > rain && rain > weather.daylightFactor());
});

test('storms schedule deterministic lightning strikes that are consumed once', () => {
  const saved = { kind: 'storm', remaining: 30, randomState: 12345, lightningRemaining: 0.1 };
  const first = new WeatherState(1, saved);
  const second = new WeatherState(1, saved);
  first.update(0.2);
  second.update(0.2);
  assert.deepEqual(first.takeLightning(), second.takeLightning());
  assert.equal(first.takeLightning(), null);
  assert.ok(first.lightningRemaining >= 4 && first.lightningRemaining <= 13);
});

test('seeded wind persists exactly and forecasts do not mutate the active front', () => {
  const weather = new WeatherState(991, { kind: 'rain', remaining: 20, randomState: 44, windAngle: 1.2, windStrength: 0.6, targetWindAngle: 2, targetWindStrength: 0.8 });
  const before = weather.serialize();
  const first = weather.forecast();
  assert.deepEqual(weather.forecast(), first);
  assert.deepEqual(weather.serialize(), before);
  assert.ok(first.duration > 0);
  assert.ok(['clear', 'rain', 'storm'].includes(first.kind));
  const vector = weather.windVector();
  assert.ok(Math.abs(Math.hypot(vector.x, vector.z) - 0.6) < 1e-9);
});

test('wind names, storm crop stress, rain growth, and front fog are bounded', () => {
  assert.equal(windDirectionName(0), 'E');
  assert.equal(windDirectionName(Math.PI / 2), 'N');
  assert.ok(weatherGrowthMultiplier('rain', 1) > 1);
  assert.ok(weatherGrowthMultiplier('storm', 1) < weatherGrowthMultiplier('clear', 1));
  assert.ok(weatherFogFactor('storm') < weatherFogFactor('rain'));
  assert.ok(weatherFogFactor('rain') < weatherFogFactor('clear'));
});

test('weather accessibility reduces precipitation density and suppresses visual flashes without losing thunder events', () => {
  const weather = new WeatherSystem(new THREE.Scene(), 10, 200);
  assert.deepEqual(weather.setAccessibility({ reducedMotion: true, reduceFlashes: true }), { reducedMotion: true, reduceFlashes: true });
  assert.equal(weather.geometry.drawRange.count, 140);
  const strike = { angle: 0.5, distance: 12, shapeSeed: 4 };
  const state = {
    kind: 'storm', remaining: 8,
    takeLightning: () => strike,
    intensity: () => 1,
    windVector: () => ({ x: 0.5, z: 0.2 }),
  };
  assert.equal(weather.update(0.1, state, new THREE.Vector3(), 'plains'), strike);
  assert.equal(weather.flash, 0);
  assert.equal(weather.flashLight.intensity, 0);
  assert.equal(weather.lightning.visible, false);
});
