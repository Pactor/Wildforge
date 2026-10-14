import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { ambientEnvironment, AMBIENT_SOUND_PRESETS, AmbientSoundscape, AudioManager, CREATURE_SOUND_PRESETS, creatureSoundMix, FOOTSTEP_PRESETS, footstepSurface, SOUND_PRESETS } from '../src/audio.js';

test('procedural sound presets are complete and safe without browser audio', () => {
  for (const event of ['break', 'place', 'pickup', 'craft', 'eat', 'attack', 'hurt', 'plant', 'open', 'thunder', 'bow']) {
    const preset = SOUND_PRESETS[event];
    assert.ok(preset.frequency > 0);
    assert.ok(preset.duration > 0);
    assert.ok(preset.gain > 0 && preset.gain < 1);
  }
  const audio = new AudioManager();
  assert.equal(audio.play('missing'), false);
  assert.equal(audio.play('pickup'), false);
  assert.equal(audio.setMusicVolume(2), true);
  assert.equal(audio.musicVolume, 1);
  assert.equal(audio.playMusic({ frequencies: [220, 330], duration: 2 }), false);
});

test('footstep surfaces classify voxel materials and remain safe without browser audio', () => {
  assert.equal(footstepSurface(BLOCK.GRASS), 'grass');
  assert.equal(footstepSurface(BLOCK.FARMLAND), 'soil');
  assert.equal(footstepSurface(BLOCK.STONE), 'stone');
  assert.equal(footstepSurface(BLOCK.PLANKS), 'wood');
  assert.equal(footstepSurface(BLOCK.SAND), 'sand');
  assert.equal(footstepSurface(BLOCK.SNOW), 'snow');
  assert.equal(footstepSurface(BLOCK.LEAVES), 'foliage');
  assert.equal(footstepSurface(BLOCK.STONE, true), 'water');
  for (const preset of Object.values(FOOTSTEP_PRESETS)) {
    assert.ok(preset.frequency > 0 && preset.duration > 0 && preset.gain > 0);
  }
  assert.equal(new AudioManager().playFootstep(BLOCK.GRASS, { sprinting: true }), false);
});

test('creature voices are complete, spatially attenuated, and safe without browser audio', () => {
  for (const [type, profile] of Object.entries(CREATURE_SOUND_PRESETS)) {
    for (const event of ['ambient', 'hurt', 'death']) {
      assert.ok(profile[event]?.frequency > 0, `${type} needs ${event} audio`);
      assert.ok(profile[event].duration > 0 && profile[event].gain > 0);
    }
  }
  assert.deepEqual(creatureSoundMix(0, 3), { gain: 1, pan: 1 });
  assert.deepEqual(creatureSoundMix(28, -3), { gain: 0, pan: -1 });
  assert.ok(creatureSoundMix(14, 0).gain < 1);
  const audio = new AudioManager();
  assert.equal(audio.playCreature('grazer', 'ambient', { distance: 2 }), false);
  assert.equal(audio.playCreature('missing', 'ambient', { distance: 2 }), false);
});

test('ambient environments prioritize immersion and have complete procedural profiles', () => {
  assert.equal(ambientEnvironment({ biome: 'desert' }), 'desert');
  assert.equal(ambientEnvironment({ biome: 'cinderreach' }), 'cinderreach');
  assert.equal(ambientEnvironment({ biome: 'cinderreach', underground: true, undergroundBiome: 'cinder_hollows' }), 'cinder_hollows');
  assert.equal(ambientEnvironment({ biome: 'forest', weather: 'rain' }), 'rain');
  assert.equal(ambientEnvironment({ biome: 'forest', weather: 'storm' }), 'storm');
  assert.equal(ambientEnvironment({ biome: 'forest', weather: 'storm', underground: true }), 'cave');
  assert.equal(ambientEnvironment({ biome: 'forest', underground: true, undergroundBiome: 'lumen_grotto' }), 'lumen_grotto');
  assert.equal(ambientEnvironment({ biome: 'forest', weather: 'storm', underground: true, submerged: true }), 'water');
  for (const [name, preset] of Object.entries(AMBIENT_SOUND_PRESETS)) {
    assert.ok(preset.frequency > 0 && preset.duration > 0 && preset.gain > 0, `${name} ambience is incomplete`);
    assert.ok(preset.maxDelay > preset.minDelay && preset.minDelay > 0);
  }
});

test('ambient scheduling is deterministic, bounded, and reacts quickly to environment changes', () => {
  const first = new AmbientSoundscape(8128);
  const second = new AmbientSoundscape(8128);
  const sample = (soundscape) => Array.from({ length: 30 }, (_, index) => soundscape.update(0.5, {
    biome: index < 15 ? 'plains' : 'snowy_highlands',
    daylight: 0.6,
  })).filter(Boolean);
  assert.deepEqual(sample(first), sample(second));
  const cave = new AmbientSoundscape(44);
  assert.equal(cave.update(0.01, { biome: 'forest' }).environment, 'forest');
  assert.equal(cave.update(0.2, { biome: 'forest', underground: true }).environment, 'cave');
  assert.equal(new AudioManager().playAmbience({ environment: 'forest', gain: 1 }), false);
});
