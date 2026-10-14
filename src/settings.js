import { inferPerformanceMode, PERFORMANCE_MODES } from './performance.js';

export const SETTINGS_KEY = 'wildforge:settings:v1';

export const DEFAULT_SETTINGS = Object.freeze({
  sensitivity: 1,
  fov: 72,
  viewDistance: 2,
  renderScale: 1,
  volume: 0.72,
  musicVolume: 0.42,
  brightness: 1,
  crosshairSize: 1,
  textScale: 1,
  reducedMotion: false,
  reduceFlashes: false,
  highContrast: false,
  soundCaptions: false,
  performanceMode: 'balanced',
});

const LIMITS = Object.freeze({
  sensitivity: [0.25, 2.5],
  fov: [55, 105],
  viewDistance: [1, 4],
  renderScale: [0.5, 1.5],
  volume: [0, 1],
  musicVolume: [0, 1],
  brightness: [0.7, 1.35],
  crosshairSize: [0.75, 2],
  textScale: [0.9, 1.35],
});

const BOOLEAN_SETTINGS = Object.freeze(['reducedMotion', 'reduceFlashes', 'highContrast', 'soundCaptions']);
const STRING_SETTINGS = Object.freeze({ performanceMode: PERFORMANCE_MODES });

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export function normalizeSettings(value = {}) {
  const normalized = {};
  for (const [key, fallback] of Object.entries(DEFAULT_SETTINGS)) {
    if (STRING_SETTINGS[key]) {
      normalized[key] = STRING_SETTINGS[key].includes(value?.[key]) ? value[key] : fallback;
      continue;
    }
    if (BOOLEAN_SETTINGS.includes(key)) {
      normalized[key] = typeof value?.[key] === 'boolean' ? value[key] : fallback;
      continue;
    }
    const numeric = Number(value?.[key]);
    const [minimum, maximum] = LIMITS[key];
    normalized[key] = Number.isFinite(numeric) ? clamp(numeric, minimum, maximum) : fallback;
  }
  normalized.viewDistance = Math.round(normalized.viewDistance);
  return normalized;
}

export function systemAccessibilityDefaults(matchMedia = globalThis.matchMedia) {
  if (typeof matchMedia !== 'function') return {};
  const matches = (query) => {
    try { return Boolean(matchMedia(query)?.matches); } catch { return false; }
  };
  return {
    reducedMotion: matches('(prefers-reduced-motion: reduce)'),
    reduceFlashes: matches('(prefers-reduced-motion: reduce)'),
    highContrast: matches('(prefers-contrast: more)'),
  };
}

export function loadSettings(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.performanceMode == null) parsed.performanceMode = inferPerformanceMode({ ...DEFAULT_SETTINGS, ...parsed });
    return normalizeSettings({ ...systemAccessibilityDefaults(), ...(parsed || {}) });
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings, storage = globalThis.localStorage) {
  const normalized = normalizeSettings(settings);
  storage?.setItem(SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}
