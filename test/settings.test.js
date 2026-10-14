import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_SETTINGS, loadSettings, normalizeSettings, saveSettings, SETTINGS_KEY, systemAccessibilityDefaults } from '../src/settings.js';

test('settings normalize invalid values, clamp ranges, and round view distance', () => {
  assert.deepEqual(normalizeSettings({
    sensitivity: 99,
    fov: 20,
    viewDistance: 3.6,
    renderScale: '1.25',
    volume: -2,
    musicVolume: 4,
  }), {
    ...DEFAULT_SETTINGS,
    sensitivity: 2.5,
    fov: 55,
    viewDistance: 4,
    renderScale: 1.25,
    volume: 0,
    musicVolume: 1,
  });
  assert.equal(normalizeSettings({ fov: 'nope' }).fov, DEFAULT_SETTINGS.fov);
  assert.equal(normalizeSettings({ performanceMode: 'turbo' }).performanceMode, 'balanced');
  assert.equal(normalizeSettings({ performanceMode: 'adaptive' }).performanceMode, 'adaptive');
});

test('boolean accessibility settings are strict and system preferences seed only new profiles', () => {
  const media = (query) => ({ matches: query.includes('reduced-motion') || query.includes('prefers-contrast') });
  assert.deepEqual(systemAccessibilityDefaults(media), { reducedMotion: true, reduceFlashes: true, highContrast: true });
  assert.equal(normalizeSettings({ reducedMotion: 'false' }).reducedMotion, false);
  const emptyStorage = { getItem: () => null };
  const previous = globalThis.matchMedia;
  globalThis.matchMedia = media;
  try {
    const settings = loadSettings(emptyStorage);
    assert.equal(settings.reducedMotion, true);
    assert.equal(settings.reduceFlashes, true);
    assert.equal(settings.highContrast, true);
    const legacyStorage = { getItem: () => JSON.stringify({ fov: 88 }) };
    const legacy = loadSettings(legacyStorage);
    assert.equal(legacy.fov, 88);
    assert.equal(legacy.performanceMode, 'balanced');
    assert.equal(legacy.reducedMotion, true, 'older settings inherit missing accessibility preferences');
    const explicitStorage = { getItem: () => JSON.stringify({ reducedMotion: false, reduceFlashes: false, highContrast: false }) };
    assert.equal(loadSettings(explicitStorage).reducedMotion, false, 'saved user choices override system defaults');
    const customLegacy = { getItem: () => JSON.stringify({ viewDistance: 4, renderScale: 1.1 }) };
    assert.equal(loadSettings(customLegacy).performanceMode, 'custom');
  } finally {
    globalThis.matchMedia = previous;
  }
});

test('settings load safely and save only normalized data', () => {
  const values = new Map([[SETTINGS_KEY, '{broken']]);
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  assert.deepEqual(loadSettings(storage), { ...DEFAULT_SETTINGS });
  saveSettings({ fov: 90, viewDistance: 3, volume: 0.4 }, storage);
  assert.deepEqual(loadSettings(storage), {
    ...DEFAULT_SETTINGS,
    fov: 90,
    viewDistance: 3,
    volume: 0.4,
  });
});
