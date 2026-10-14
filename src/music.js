const SEMITONE = 2 ** (1 / 12);

const theme = (base, scale, motif, options = {}) => Object.freeze({
  base,
  scale: Object.freeze(scale),
  motif: Object.freeze(motif),
  interval: options.interval ?? 4.8,
  duration: options.duration ?? 3.4,
  gain: options.gain ?? 0.018,
  waveform: options.waveform ?? 'sine',
  voices: options.voices ?? 3,
  stagger: options.stagger ?? 0.08,
});

export const MUSIC_THEMES = Object.freeze({
  plains: theme(196, [0, 2, 4, 7, 9], [0, 2, 1, 4, 2, 3], { interval: 5.4, waveform: 'triangle' }),
  forest: theme(174.61, [0, 3, 5, 7, 10], [0, 1, 3, 2, 4, 1], { interval: 5.8, duration: 4.1, waveform: 'triangle' }),
  desert: theme(146.83, [0, 2, 5, 7, 10], [0, 3, 1, 4, 2, 1], { interval: 6.1, duration: 4.4, voices: 2 }),
  frostveil: theme(220, [0, 2, 3, 7, 9], [0, 4, 2, 3, 1, 4], { interval: 6.2, duration: 4.8, gain: 0.016 }),
  night: theme(164.81, [0, 3, 5, 7, 10], [0, 2, 4, 1, 3, 2], { interval: 6.4, duration: 5, gain: 0.014 }),
  cave: theme(110, [0, 3, 5, 6, 10], [0, 1, 3, 2, 1, 4], { interval: 6.3, duration: 4.6, gain: 0.014, voices: 2 }),
  rootbound_hollow: theme(98, [0, 3, 5, 8, 10], [0, 3, 1, 4, 2, 1], { interval: 5.8, duration: 4.5, waveform: 'triangle' }),
  lumen_grotto: theme(207.65, [0, 2, 5, 7, 11], [0, 2, 4, 3, 1, 4], { interval: 4.9, duration: 4, gain: 0.016 }),
  tide: theme(130.81, [0, 2, 5, 7, 9], [0, 3, 2, 4, 1, 2], { interval: 5.5, duration: 4.3 }),
  rain: theme(146.83, [0, 2, 3, 7, 9], [0, 2, 1, 3, 4, 2], { interval: 5, duration: 3.8, gain: 0.013 }),
  storm: theme(98, [0, 1, 5, 7, 10], [0, 1, 3, 2, 4, 1], { interval: 3.9, duration: 3.2, gain: 0.019, waveform: 'sawtooth', voices: 2 }),
  danger: theme(110, [0, 1, 5, 6, 10], [0, 3, 1, 4, 2, 3], { interval: 2.5, duration: 2, gain: 0.024, waveform: 'triangle', stagger: 0.04 }),
  boss: theme(82.41, [0, 1, 5, 6, 8], [0, 3, 1, 4, 2, 3, 4, 1], { interval: 1.9, duration: 1.6, gain: 0.028, waveform: 'sawtooth', voices: 4, stagger: 0.035 }),
});

export function musicMode(state = {}) {
  if (state.dead) return 'silence';
  if (state.boss) return 'boss';
  if (state.danger) return 'danger';
  if (state.submerged) return 'tide';
  if (state.underground) return MUSIC_THEMES[state.undergroundBiome] ? state.undergroundBiome : 'cave';
  if (state.weather === 'storm') return 'storm';
  if (state.weather === 'rain') return 'rain';
  const daylight = Number.isFinite(Number(state.daylight)) ? Number(state.daylight) : 1;
  if (daylight < 0.24) return 'night';
  if (state.biome === 'snowy_highlands') return 'frostveil';
  return MUSIC_THEMES[state.biome] ? state.biome : 'plains';
}

function noteAt(themeDefinition, index) {
  const length = themeDefinition.scale.length;
  const octave = Math.floor(index / length);
  const scaleIndex = ((index % length) + length) % length;
  return themeDefinition.base * SEMITONE ** (themeDefinition.scale[scaleIndex] + octave * 12);
}

export class ProceduralScore {
  constructor(seed = 1) {
    this.randomState = ((Number(seed) || 1) ^ 0xc2b2ae35) >>> 0 || 1;
    this.mode = null;
    this.timer = 0;
    this.step = 0;
  }

  random() {
    let value = this.randomState;
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    this.randomState = value >>> 0;
    return this.randomState / 4294967296;
  }

  update(dt, state = {}) {
    const nextMode = musicMode(state);
    if (nextMode !== this.mode) {
      this.mode = nextMode;
      this.timer = Math.min(this.timer, 0.18);
      this.step = 0;
    }
    this.timer -= Math.max(0, Math.min(1, Number(dt) || 0));
    if (this.mode === 'silence' || this.timer > 0) return null;
    const definition = MUSIC_THEMES[this.mode];
    if (!definition) return null;
    const degree = definition.motif[this.step % definition.motif.length];
    const variation = this.random() < 0.24 ? 1 : 0;
    const frequencies = Array.from({ length: definition.voices }, (_, voice) => noteAt(definition, degree + voice * 2 + variation));
    const event = {
      mode: this.mode,
      frequencies,
      duration: definition.duration,
      gain: definition.gain,
      waveform: definition.waveform,
      stagger: definition.stagger,
      step: this.step,
    };
    this.step += 1;
    this.timer = definition.interval * (0.9 + this.random() * 0.22);
    return event;
  }
}
