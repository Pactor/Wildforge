import { BLOCK, BLOCKS, isSnowLayer, isWaterBlock } from './blocks.js';

export const SOUND_PRESETS = Object.freeze({
  break: { frequency: 105, duration: 0.09, type: 'square', gain: 0.045, noise: 0.055 },
  place: { frequency: 145, duration: 0.07, type: 'square', gain: 0.035, noise: 0.025 },
  pickup: { frequency: 720, endFrequency: 1080, duration: 0.09, type: 'sine', gain: 0.045 },
  craft: { frequency: 420, endFrequency: 680, duration: 0.13, type: 'triangle', gain: 0.045 },
  eat: { frequency: 180, duration: 0.1, type: 'square', gain: 0.03, noise: 0.04 },
  attack: { frequency: 125, endFrequency: 70, duration: 0.08, type: 'sawtooth', gain: 0.05 },
  hurt: { frequency: 95, endFrequency: 55, duration: 0.15, type: 'square', gain: 0.055 },
  plant: { frequency: 255, duration: 0.06, type: 'triangle', gain: 0.03, noise: 0.02 },
  open: { frequency: 310, endFrequency: 390, duration: 0.08, type: 'triangle', gain: 0.035 },
  thunder: { frequency: 62, endFrequency: 34, duration: 0.7, type: 'sawtooth', gain: 0.06, noise: 0.085 },
  bow: { frequency: 240, endFrequency: 95, duration: 0.16, type: 'triangle', gain: 0.045, noise: 0.018 },
  shield: { frequency: 118, endFrequency: 82, duration: 0.12, type: 'square', gain: 0.05, noise: 0.035 },
  splash: { frequency: 82, endFrequency: 48, duration: 0.16, type: 'sine', gain: 0.035, noise: 0.065 },
  experience: { frequency: 620, endFrequency: 1240, duration: 0.12, type: 'sine', gain: 0.04 },
  ignite: { frequency: 180, endFrequency: 420, duration: 0.2, type: 'sawtooth', gain: 0.035, noise: 0.052 },
  blast: { frequency: 74, endFrequency: 28, duration: 0.82, type: 'sawtooth', gain: 0.075, noise: 0.11 },
  extinguish: { frequency: 155, endFrequency: 62, duration: 0.25, type: 'sine', gain: 0.03, noise: 0.075 },
  sizzle: { frequency: 260, endFrequency: 145, duration: 0.18, type: 'square', gain: 0.026, noise: 0.062 },
  tonic: { frequency: 390, endFrequency: 680, duration: 0.24, type: 'sine', gain: 0.035, noise: 0.028 },
  cart_roll: { frequency: 112, endFrequency: 96, duration: 0.055, type: 'square', gain: 0.018, noise: 0.022 },
});

export const FOOTSTEP_PRESETS = Object.freeze({
  grass: { frequency: 126, duration: 0.075, type: 'triangle', gain: 0.021, noise: 0.035 },
  soil: { frequency: 94, duration: 0.082, type: 'square', gain: 0.018, noise: 0.043 },
  stone: { frequency: 178, duration: 0.06, type: 'square', gain: 0.022, noise: 0.018 },
  wood: { frequency: 148, duration: 0.068, type: 'triangle', gain: 0.024, noise: 0.014 },
  sand: { frequency: 78, duration: 0.09, type: 'sine', gain: 0.014, noise: 0.052 },
  snow: { frequency: 104, duration: 0.085, type: 'triangle', gain: 0.014, noise: 0.038 },
  water: { frequency: 68, endFrequency: 45, duration: 0.11, type: 'sine', gain: 0.018, noise: 0.048 },
  foliage: { frequency: 116, duration: 0.075, type: 'triangle', gain: 0.016, noise: 0.047 },
  cloth: { frequency: 88, duration: 0.09, type: 'sine', gain: 0.012, noise: 0.032 },
  generic: { frequency: 122, duration: 0.07, type: 'square', gain: 0.019, noise: 0.025 },
});

export const CREATURE_SOUND_PRESETS = Object.freeze({
  bramblehen: Object.freeze({
    ambient: { frequency: 560, endFrequency: 730, duration: 0.16, type: 'triangle', gain: 0.029, noise: 0.022 },
    hurt: { frequency: 690, endFrequency: 210, duration: 0.13, type: 'square', gain: 0.041, noise: 0.031 },
    death: { frequency: 470, endFrequency: 88, duration: 0.29, type: 'triangle', gain: 0.047, noise: 0.038 },
  }),
  grazer: Object.freeze({
    ambient: { frequency: 138, endFrequency: 104, duration: 0.24, type: 'triangle', gain: 0.042, noise: 0.014 },
    hurt: { frequency: 210, endFrequency: 118, duration: 0.17, type: 'square', gain: 0.052, noise: 0.024 },
    death: { frequency: 154, endFrequency: 62, duration: 0.34, type: 'triangle', gain: 0.058, noise: 0.028 },
  }),
  duskling: Object.freeze({
    ambient: { frequency: 246, endFrequency: 174, duration: 0.28, type: 'sawtooth', gain: 0.027, noise: 0.026 },
    attack: { frequency: 315, endFrequency: 88, duration: 0.2, type: 'square', gain: 0.052, noise: 0.036 },
    hurt: { frequency: 360, endFrequency: 126, duration: 0.16, type: 'sawtooth', gain: 0.047, noise: 0.029 },
    death: { frequency: 225, endFrequency: 42, duration: 0.42, type: 'sawtooth', gain: 0.058, noise: 0.042 },
  }),
  hushpod: Object.freeze({
    ambient: { frequency: 92, endFrequency: 132, duration: 0.38, type: 'triangle', gain: 0.029, noise: 0.046 },
    attack: { frequency: 410, endFrequency: 720, duration: 0.28, type: 'sawtooth', gain: 0.047, noise: 0.038 },
    hurt: { frequency: 286, endFrequency: 96, duration: 0.17, type: 'square', gain: 0.048, noise: 0.047 },
    death: { frequency: 198, endFrequency: 42, duration: 0.43, type: 'triangle', gain: 0.057, noise: 0.061 },
  }),
  briarweaver: Object.freeze({
    ambient: { frequency: 142, endFrequency: 98, duration: 0.26, type: 'triangle', gain: 0.026, noise: 0.052 },
    attack: { frequency: 520, endFrequency: 122, duration: 0.21, type: 'sawtooth', gain: 0.052, noise: 0.057 },
    hurt: { frequency: 330, endFrequency: 104, duration: 0.16, type: 'square', gain: 0.047, noise: 0.05 },
    death: { frequency: 240, endFrequency: 38, duration: 0.44, type: 'triangle', gain: 0.058, noise: 0.068 },
  }),
  mireglob: Object.freeze({
    ambient: { frequency: 84, endFrequency: 116, duration: 0.3, type: 'sine', gain: 0.03, noise: 0.058 },
    attack: { frequency: 178, endFrequency: 72, duration: 0.18, type: 'square', gain: 0.048, noise: 0.07 },
    hurt: { frequency: 148, endFrequency: 64, duration: 0.17, type: 'triangle', gain: 0.045, noise: 0.065 },
    death: { frequency: 112, endFrequency: 34, duration: 0.4, type: 'sine', gain: 0.055, noise: 0.082 },
  }),
  sandstrider: Object.freeze({
    ambient: { frequency: 92, endFrequency: 124, duration: 0.19, type: 'square', gain: 0.032, noise: 0.032 },
    hurt: { frequency: 176, endFrequency: 82, duration: 0.15, type: 'square', gain: 0.048, noise: 0.04 },
    death: { frequency: 118, endFrequency: 48, duration: 0.3, type: 'triangle', gain: 0.054, noise: 0.052 },
  }),
  frostfang: Object.freeze({
    ambient: { frequency: 182, endFrequency: 116, duration: 0.31, type: 'sawtooth', gain: 0.036, noise: 0.034 },
    attack: { frequency: 265, endFrequency: 74, duration: 0.18, type: 'sawtooth', gain: 0.058, noise: 0.045 },
    hurt: { frequency: 292, endFrequency: 108, duration: 0.17, type: 'square', gain: 0.051, noise: 0.036 },
    death: { frequency: 205, endFrequency: 45, duration: 0.4, type: 'sawtooth', gain: 0.061, noise: 0.052 },
  }),
  reefglider: Object.freeze({
    ambient: { frequency: 330, endFrequency: 460, duration: 0.2, type: 'sine', gain: 0.025, noise: 0.025 },
    hurt: { frequency: 410, endFrequency: 205, duration: 0.14, type: 'triangle', gain: 0.039, noise: 0.03 },
    death: { frequency: 280, endFrequency: 96, duration: 0.28, type: 'sine', gain: 0.045, noise: 0.04 },
  }),
  gloomfin: Object.freeze({
    ambient: { frequency: 128, endFrequency: 84, duration: 0.3, type: 'sawtooth', gain: 0.028, noise: 0.038 },
    attack: { frequency: 205, endFrequency: 58, duration: 0.18, type: 'square', gain: 0.05, noise: 0.048 },
    hurt: { frequency: 250, endFrequency: 92, duration: 0.16, type: 'sawtooth', gain: 0.045, noise: 0.04 },
    death: { frequency: 174, endFrequency: 38, duration: 0.36, type: 'sawtooth', gain: 0.052, noise: 0.054 },
  }),
  thorncaster: Object.freeze({
    ambient: { frequency: 118, endFrequency: 156, duration: 0.34, type: 'triangle', gain: 0.027, noise: 0.042 },
    attack: { frequency: 330, endFrequency: 105, duration: 0.2, type: 'sawtooth', gain: 0.051, noise: 0.035 },
    hurt: { frequency: 190, endFrequency: 82, duration: 0.16, type: 'square', gain: 0.044, noise: 0.046 },
    death: { frequency: 142, endFrequency: 48, duration: 0.38, type: 'triangle', gain: 0.053, noise: 0.058 },
  }),
  hollow_warden: Object.freeze({
    ambient: { frequency: 72, endFrequency: 48, duration: 0.62, type: 'sawtooth', gain: 0.043, noise: 0.056 },
    attack: { frequency: 158, endFrequency: 42, duration: 0.3, type: 'square', gain: 0.066, noise: 0.062 },
    hurt: { frequency: 126, endFrequency: 58, duration: 0.24, type: 'sawtooth', gain: 0.058, noise: 0.052 },
    death: { frequency: 105, endFrequency: 28, duration: 0.9, type: 'sawtooth', gain: 0.071, noise: 0.076 },
  }),
  wayfarer: Object.freeze({
    ambient: { frequency: 178, endFrequency: 232, duration: 0.22, type: 'triangle', gain: 0.026, noise: 0.018 },
    hurt: { frequency: 244, endFrequency: 116, duration: 0.15, type: 'square', gain: 0.042, noise: 0.025 },
    death: { frequency: 184, endFrequency: 62, duration: 0.38, type: 'triangle', gain: 0.049, noise: 0.034 },
  }),
  emberfox: Object.freeze({
    ambient: { frequency: 420, endFrequency: 610, duration: 0.18, type: 'triangle', gain: 0.03, noise: 0.018 },
    attack: { frequency: 520, endFrequency: 170, duration: 0.14, type: 'square', gain: 0.045, noise: 0.028 },
    hurt: { frequency: 610, endFrequency: 240, duration: 0.15, type: 'triangle', gain: 0.043, noise: 0.025 },
    death: { frequency: 390, endFrequency: 82, duration: 0.36, type: 'triangle', gain: 0.05, noise: 0.034 },
  }),
  echo_sentinel: Object.freeze({
    ambient: { frequency: 420, endFrequency: 690, duration: 0.44, type: 'sine', gain: 0.032, noise: 0.018 },
    attack: { frequency: 760, endFrequency: 190, duration: 0.24, type: 'triangle', gain: 0.058, noise: 0.026 },
    hurt: { frequency: 530, endFrequency: 148, duration: 0.19, type: 'square', gain: 0.05, noise: 0.031 },
    death: { frequency: 620, endFrequency: 52, duration: 0.72, type: 'sine', gain: 0.064, noise: 0.047 },
  }),
  ashhopper: Object.freeze({
    ambient: { frequency: 108, endFrequency: 146, duration: 0.25, type: 'triangle', gain: 0.032, noise: 0.045 },
    hurt: { frequency: 232, endFrequency: 94, duration: 0.16, type: 'square', gain: 0.047, noise: 0.052 },
    death: { frequency: 162, endFrequency: 42, duration: 0.38, type: 'triangle', gain: 0.055, noise: 0.062 },
  }),
  riftstalker: Object.freeze({
    ambient: { frequency: 76, endFrequency: 112, duration: 0.42, type: 'sawtooth', gain: 0.036, noise: 0.058 },
    attack: { frequency: 268, endFrequency: 54, duration: 0.2, type: 'square', gain: 0.06, noise: 0.057 },
    hurt: { frequency: 318, endFrequency: 86, duration: 0.17, type: 'sawtooth', gain: 0.052, noise: 0.052 },
    death: { frequency: 214, endFrequency: 34, duration: 0.48, type: 'sawtooth', gain: 0.064, noise: 0.071 },
  }),
  emberwing: Object.freeze({
    ambient: { frequency: 510, endFrequency: 760, duration: 0.2, type: 'triangle', gain: 0.033, noise: 0.04 },
    attack: { frequency: 820, endFrequency: 128, duration: 0.24, type: 'sawtooth', gain: 0.058, noise: 0.049 },
    hurt: { frequency: 640, endFrequency: 186, duration: 0.17, type: 'square', gain: 0.049, noise: 0.044 },
    death: { frequency: 470, endFrequency: 48, duration: 0.46, type: 'triangle', gain: 0.061, noise: 0.064 },
  }),
  sunmoth: Object.freeze({
    ambient: { frequency: 740, endFrequency: 920, duration: 0.14, type: 'sine', gain: 0.022, noise: 0.028 },
    hurt: { frequency: 690, endFrequency: 210, duration: 0.12, type: 'triangle', gain: 0.038, noise: 0.034 },
    death: { frequency: 530, endFrequency: 94, duration: 0.3, type: 'sine', gain: 0.044, noise: 0.041 },
  }),
  hearthguard: Object.freeze({
    ambient: { frequency: 92, endFrequency: 118, duration: 0.36, type: 'square', gain: 0.031, noise: 0.026 },
    attack: { frequency: 176, endFrequency: 54, duration: 0.22, type: 'square', gain: 0.059, noise: 0.045 },
    hurt: { frequency: 138, endFrequency: 72, duration: 0.18, type: 'sawtooth', gain: 0.051, noise: 0.04 },
    death: { frequency: 104, endFrequency: 32, duration: 0.68, type: 'square', gain: 0.064, noise: 0.07 },
  }),
});

export const AMBIENT_SOUND_PRESETS = Object.freeze({
  plains: Object.freeze({ frequency: 980, endFrequency: 760, duration: 0.16, type: 'sine', gain: 0.012, noise: 0.008, minDelay: 4.5, maxDelay: 9 }),
  forest: Object.freeze({ frequency: 540, endFrequency: 690, duration: 0.42, type: 'triangle', gain: 0.01, noise: 0.026, minDelay: 3.5, maxDelay: 7 }),
  desert: Object.freeze({ frequency: 74, endFrequency: 58, duration: 1.15, type: 'sine', gain: 0.008, noise: 0.035, minDelay: 4, maxDelay: 7.5 }),
  snowy_highlands: Object.freeze({ frequency: 410, endFrequency: 255, duration: 0.75, type: 'sine', gain: 0.009, noise: 0.027, minDelay: 4.5, maxDelay: 8 }),
  cinderreach: Object.freeze({ frequency: 86, endFrequency: 52, duration: 1.4, type: 'sawtooth', gain: 0.008, noise: 0.038, minDelay: 2.8, maxDelay: 5.5 }),
  cinder_hollows: Object.freeze({ frequency: 58, endFrequency: 92, duration: 1.7, type: 'triangle', gain: 0.008, noise: 0.031, minDelay: 3.2, maxDelay: 6.2 }),
  cave: Object.freeze({ frequency: 760, endFrequency: 420, duration: 0.32, type: 'sine', gain: 0.016, noise: 0.012, minDelay: 3, maxDelay: 6.5 }),
  lumen_grotto: Object.freeze({ frequency: 620, endFrequency: 930, duration: 0.58, type: 'sine', gain: 0.013, noise: 0.008, minDelay: 2.8, maxDelay: 5.8 }),
  rootbound_hollow: Object.freeze({ frequency: 108, endFrequency: 76, duration: 0.72, type: 'triangle', gain: 0.012, noise: 0.028, minDelay: 3.2, maxDelay: 6.2 }),
  water: Object.freeze({ frequency: 96, endFrequency: 138, duration: 0.55, type: 'sine', gain: 0.012, noise: 0.038, minDelay: 2.8, maxDelay: 5 }),
  rain: Object.freeze({ frequency: 88, endFrequency: 72, duration: 1.25, type: 'sine', gain: 0.006, noise: 0.042, minDelay: 1.4, maxDelay: 2.4 }),
  storm: Object.freeze({ frequency: 67, endFrequency: 48, duration: 1.45, type: 'sawtooth', gain: 0.009, noise: 0.058, minDelay: 1.2, maxDelay: 2.1 }),
});

export function ambientEnvironment(state = {}) {
  if (state.submerged) return 'water';
  if (state.underground) return AMBIENT_SOUND_PRESETS[state.undergroundBiome] ? state.undergroundBiome : 'cave';
  if (state.weather === 'storm') return 'storm';
  if (state.weather === 'rain') return 'rain';
  return AMBIENT_SOUND_PRESETS[state.biome] ? state.biome : 'plains';
}

export class AmbientSoundscape {
  constructor(seed = 1) {
    this.randomState = ((Number(seed) || 1) ^ 0x6d2b79f5) >>> 0 || 1;
    this.timer = 0;
    this.environment = null;
  }

  random() {
    let value = this.randomState;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.randomState = value >>> 0;
    return this.randomState / 4294967296;
  }

  update(dt, state = {}) {
    const environment = ambientEnvironment(state);
    if (environment !== this.environment) {
      this.environment = environment;
      this.timer = Math.min(this.timer, 0.12);
    }
    this.timer -= Math.max(0, Number(dt) || 0);
    if (this.timer > 0) return null;
    const profile = AMBIENT_SOUND_PRESETS[environment];
    this.timer = profile.minDelay + this.random() * (profile.maxDelay - profile.minDelay);
    const daylight = Math.max(0, Math.min(1, Number(state.daylight) || 0));
    const nightFactor = environment === 'plains' || environment === 'forest' ? 0.72 + daylight * 0.28 : 1;
    return {
      environment,
      pan: this.random() * 1.6 - 0.8,
      pitch: 0.93 + this.random() * 0.14,
      gain: nightFactor * (0.82 + this.random() * 0.24),
    };
  }
}

export function creatureSoundMix(distance, pan = 0, maximumDistance = 28) {
  const safeDistance = Math.max(0, Number(distance) || 0);
  const range = Math.max(1, Number(maximumDistance) || 28);
  const proximity = Math.max(0, 1 - safeDistance / range);
  return { gain: proximity * proximity, pan: Math.max(-1, Math.min(1, Number(pan) || 0)) };
}

export function footstepSurface(blockId, inWater = false) {
  if (inWater || isWaterBlock(blockId)) return 'water';
  if (blockId === BLOCK.SAND) return 'sand';
  if (blockId === BLOCK.SNOW || blockId === BLOCK.SNOWY_GRASS || isSnowLayer(blockId)) return 'snow';
  if ([BLOCK.GRASS, BLOCK.WHEAT_0, BLOCK.WHEAT_1, BLOCK.WHEAT_2, BLOCK.WHEAT_3,
    BLOCK.AMBERROOT_0, BLOCK.AMBERROOT_1, BLOCK.AMBERROOT_2, BLOCK.AMBERROOT_3].includes(blockId)) return 'grass';
  if ([BLOCK.DIRT, BLOCK.FARMLAND, BLOCK.HYDRATED_FARMLAND].includes(blockId)) return 'soil';
  if (blockId === BLOCK.LEAVES || blockId === BLOCK.FROSTPINE_NEEDLES || BLOCKS[blockId]?.model === 'cross') return 'foliage';
  const definition = BLOCKS[blockId];
  if (definition?.material === 'cloth') return 'cloth';
  if (definition?.tool === 'axe' || definition?.door || definition?.bed || definition?.sign || definition?.composter) return 'wood';
  if (definition?.tool === 'pickaxe' || definition?.wall) return 'stone';
  return 'generic';
}

export class AudioManager {
  constructor() {
    this.context = null;
    this.master = null;
    this.musicBus = null;
    this.volume = 0.72;
    this.musicVolume = 0.42;
  }

  setVolume(value) {
    if (!Number.isFinite(value)) return false;
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master) this.master.gain.value = this.volume;
    return true;
  }

  setMusicVolume(value) {
    if (!Number.isFinite(value)) return false;
    this.musicVolume = Math.max(0, Math.min(1, value));
    if (this.musicBus) this.musicBus.gain.value = this.musicVolume;
    return true;
  }

  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return true;
    }
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) return false;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.context.destination);
    this.musicBus = this.context.createGain();
    this.musicBus.gain.value = this.musicVolume;
    this.musicBus.connect(this.master);
    return true;
  }

  play(name) {
    const preset = SOUND_PRESETS[name];
    if (!preset || !this.unlock()) return false;
    return this.playPreset(preset);
  }

  playFootstep(blockId, options = {}) {
    const surface = footstepSurface(blockId, options.inWater);
    const preset = FOOTSTEP_PRESETS[surface];
    if (!preset || !this.unlock()) return false;
    const variant = Number(options.variant) || 0;
    const pitch = 1 + ((variant % 5) - 2) * 0.025;
    const gainMultiplier = options.landing ? Math.min(2.1, 1.15 + (Number(options.intensity) || 0) * 0.12)
      : options.crouching ? 0.48
        : options.sprinting ? 1.28
          : 1;
    return this.playPreset(preset, pitch, gainMultiplier);
  }

  playCreature(type, event, options = {}) {
    const preset = CREATURE_SOUND_PRESETS[type]?.[event];
    const mix = creatureSoundMix(options.distance, options.pan, options.maximumDistance);
    if (!preset || mix.gain <= 0 || !this.unlock()) return false;
    const variant = Number(options.variant) || 0;
    const pitch = 1 + ((variant % 7) - 3) * 0.018;
    return this.playPreset(preset, pitch, mix.gain, mix.pan);
  }

  playAmbience(event) {
    const preset = AMBIENT_SOUND_PRESETS[event?.environment];
    if (!preset || !this.unlock()) return false;
    return this.playPreset(preset, Number(event.pitch) || 1, Math.max(0, Number(event.gain) || 0), Number(event.pan) || 0);
  }

  playMusic(event) {
    if (!event || !Array.isArray(event.frequencies) || !event.frequencies.length || !this.unlock()) return false;
    const frequencies = event.frequencies.map(Number).filter((frequency) => Number.isFinite(frequency) && frequency >= 30 && frequency <= 4000);
    if (!frequencies.length) return false;
    const now = this.context.currentTime;
    const duration = Math.max(0.4, Math.min(8, Number(event.duration) || 2));
    const voiceGain = Math.max(0.001, Math.min(0.05, Number(event.gain) || 0.012)) / Math.sqrt(frequencies.length);
    const waveform = ['sine', 'triangle', 'square', 'sawtooth'].includes(event.waveform) ? event.waveform : 'sine';
    const stagger = Math.max(0, Math.min(0.3, Number(event.stagger) || 0));
    frequencies.forEach((frequency, index) => {
      const start = now + index * stagger;
      const end = start + duration;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = waveform;
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.detune.setValueAtTime((index - (frequencies.length - 1) / 2) * 2.5, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(voiceGain, start + Math.min(0.22, duration * 0.18));
      gain.gain.setValueAtTime(voiceGain * 0.72, Math.max(start + 0.23, end - 0.75));
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain);
      this.connectOutput(gain, frequencies.length === 1 ? 0 : index / (frequencies.length - 1) * 0.7 - 0.35, this.musicBus);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
    });
    return true;
  }

  playResonance(frequency, options = {}) {
    frequency = Number(frequency);
    if (!Number.isFinite(frequency) || frequency < 30 || frequency > 4000 || !this.unlock()) return false;
    return this.playPreset({
      frequency,
      endFrequency: frequency * (options.waveform === 'square' ? 0.985 : 0.998),
      duration: Math.max(0.08, Math.min(1.5, Number(options.duration) || 0.4)),
      type: ['sine', 'triangle', 'square', 'sawtooth'].includes(options.waveform) ? options.waveform : 'triangle',
      gain: Math.max(0.006, Math.min(0.055, Number(options.gain) || 0.032)),
    }, 1, Math.max(0, Math.min(1, Number(options.volume) || 1)), Number(options.pan) || 0, options.music ? this.musicBus : this.master);
  }

  connectOutput(node, pan = 0, output = this.master) {
    if (this.context.createStereoPanner) {
      const panner = this.context.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      node.connect(panner).connect(output);
      return;
    }
    node.connect(output);
  }

  playPreset(preset, pitch = 1, gainMultiplier = 1, pan = 0, output = this.master) {
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = preset.type;
    oscillator.frequency.setValueAtTime(preset.frequency * pitch, now);
    oscillator.frequency.exponentialRampToValueAtTime((preset.endFrequency || preset.frequency * 0.82) * pitch, now + preset.duration);
    gain.gain.setValueAtTime(preset.gain * gainMultiplier, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + preset.duration);
    oscillator.connect(gain);
    this.connectOutput(gain, pan, output);
    oscillator.start(now);
    oscillator.stop(now + preset.duration);
    if (preset.noise) this.playNoise(now, preset.duration, preset.noise * gainMultiplier, pan);
    return true;
  }

  playNoise(now, duration, volume, pan = 0) {
    const frames = Math.max(1, Math.floor(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, frames, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frames; index += 1) data[index] = Math.random() * 2 - 1;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.buffer = buffer;
    source.connect(filter).connect(gain);
    this.connectOutput(gain, pan);
    source.start(now);
  }
}
