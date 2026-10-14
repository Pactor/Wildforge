import assert from 'node:assert/strict';
import test from 'node:test';
import { MUSIC_THEMES, musicMode, ProceduralScore } from '../src/music.js';

test('adaptive score priorities move from exploration through weather, caves, danger, and bosses', () => {
  assert.equal(musicMode({ biome: 'forest', daylight: 1 }), 'forest');
  assert.equal(musicMode({ biome: 'snowy_highlands', daylight: 1 }), 'frostveil');
  assert.equal(musicMode({ biome: 'forest', daylight: 0.1 }), 'night');
  assert.equal(musicMode({ biome: 'forest', daylight: 1, weather: 'rain' }), 'rain');
  assert.equal(musicMode({ biome: 'forest', daylight: 1, weather: 'storm' }), 'storm');
  assert.equal(musicMode({ underground: true, undergroundBiome: 'lumen_grotto', weather: 'storm' }), 'lumen_grotto');
  assert.equal(musicMode({ submerged: true, danger: false }), 'tide');
  assert.equal(musicMode({ submerged: true, danger: true }), 'danger');
  assert.equal(musicMode({ boss: true, danger: true }), 'boss');
  assert.equal(musicMode({ boss: true, dead: true }), 'silence');
});

test('procedural phrases are deterministic per seed and contain bounded original voices', () => {
  const sample = (score) => Array.from({ length: 80 }, (_, index) => score.update(0.5, {
    biome: index < 40 ? 'plains' : 'desert',
    daylight: 1,
  })).filter(Boolean);
  const first = sample(new ProceduralScore(8128));
  const second = sample(new ProceduralScore(8128));
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, sample(new ProceduralScore(8129)));
  assert.ok(first.length > 4);
  assert.ok(first.every((event) => event.frequencies.every((frequency) => frequency >= 30 && frequency <= 4000)));
});

test('theme changes react promptly and silence suppresses new phrases', () => {
  const score = new ProceduralScore(44);
  const exploration = score.update(0.2, { biome: 'plains', daylight: 1 });
  assert.equal(exploration.mode, 'plains');
  assert.equal(score.update(0.01, { danger: true, daylight: 1 }), null);
  const danger = score.update(0.18, { danger: true, daylight: 1 });
  assert.equal(danger.mode, 'danger');
  assert.equal(danger.frequencies.length, MUSIC_THEMES.danger.voices);
  assert.equal(score.update(10, { dead: true }), null);
});
