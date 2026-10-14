import assert from 'node:assert/strict';
import test from 'node:test';
import { inferPerformanceMode, PERFORMANCE_PROFILES, PerformanceMonitor, performanceProfile } from '../src/performance.js';

function runUntilAdjustment(monitor, fps, settings, maximumFrames = 900) {
  const dt = 1 / fps;
  for (let frame = 0; frame < maximumFrames; frame += 1) {
    monitor.sample(dt);
    const result = monitor.update(dt, settings);
    if (result) return result;
  }
  return null;
}

test('performance tiers expose bounded profiles and legacy settings infer a truthful mode', () => {
  assert.deepEqual(performanceProfile('performance'), { viewDistance: 1, renderScale: 0.7 });
  assert.deepEqual(performanceProfile('balanced'), { viewDistance: 2, renderScale: 1 });
  assert.deepEqual(performanceProfile('quality'), { viewDistance: 3, renderScale: 1.25 });
  assert.equal(performanceProfile('adaptive'), null);
  assert.equal(inferPerformanceMode(PERFORMANCE_PROFILES.balanced), 'balanced');
  assert.equal(inferPerformanceMode({ viewDistance: 4, renderScale: 1.1 }), 'custom');
});

test('adaptive monitoring downshifts only after sustained slow frames', () => {
  const settings = { viewDistance: 2, renderScale: 1 };
  const monitor = new PerformanceMonitor(settings, { windowSize: 30, cooldownSeconds: 2 });
  for (let frame = 0; frame < 45; frame += 1) {
    monitor.sample(1 / 30);
    assert.equal(monitor.update(1 / 30, settings), null, 'one short slow interval must not alter quality');
  }
  const adjustment = runUntilAdjustment(monitor, 30, settings);
  assert.deepEqual({ viewDistance: adjustment.viewDistance, renderScale: adjustment.renderScale, step: adjustment.step }, { viewDistance: 1, renderScale: 0.8, step: 1 });
  assert.ok(adjustment.fps <= 31);
});

test('adaptive monitoring restores quality gradually after sustained headroom', () => {
  const settings = { viewDistance: 1, renderScale: 0.8 };
  const monitor = new PerformanceMonitor(settings, { windowSize: 30, cooldownSeconds: 2 });
  const adjustment = runUntilAdjustment(monitor, 60, settings);
  assert.deepEqual({ viewDistance: adjustment.viewDistance, renderScale: adjustment.renderScale, step: adjustment.step }, { viewDistance: 2, renderScale: 1, step: 2 });
  assert.ok(adjustment.fps >= 59);
  assert.deepEqual(monitor.metrics(), { fps: 60, frameTime: 16.7, step: 2 });
  assert.equal(monitor.sample(1), false, 'tab stalls must not poison the rolling frame profile');
});
