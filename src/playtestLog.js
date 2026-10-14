const ENDPOINT = '/__wildforge_playtest_log';

export class PlaytestLog {
  constructor({ enabled = false, seed = 'unknown' } = {}) {
    this.enabled = Boolean(enabled);
    this.seed = String(seed);
    this.session = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    this.startedAt = performance.now();
    this.lastSnapshot = -Infinity;
    this.queue = [];
    this.flushTimer = null;
    this.context = null;
    this.installed = false;
  }

  start(contextProvider = null) {
    if (!this.enabled || this.installed) return false;
    this.context = typeof contextProvider === 'function' ? contextProvider : null;
    this.installed = true;
    this.log('session_start', {
      viewport: [globalThis.innerWidth || 0, globalThis.innerHeight || 0],
      devicePixelRatio: globalThis.devicePixelRatio || 1,
      userAgent: globalThis.navigator?.userAgent || 'unknown',
    });
    globalThis.addEventListener?.('error', (event) => this.log('runtime_error', {
      message: event.message,
      file: event.filename,
      line: event.lineno,
      column: event.colno,
    }, true));
    globalThis.addEventListener?.('unhandledrejection', (event) => this.log('unhandled_rejection', {
      reason: safeError(event.reason),
    }, true));
    globalThis.addEventListener?.('keydown', (event) => {
      if (event.repeat || isTextEntry(event.target)) return;
      this.log(event.code === 'F8' ? 'bug_marker' : 'input_key', { code: event.code }, event.code === 'F8');
    }, true);
    globalThis.addEventListener?.('pointerdown', (event) => {
      if (isTextEntry(event.target)) return;
      this.log('input_pointer', { button: event.button });
    }, true);
    globalThis.addEventListener?.('pagehide', () => {
      this.log('session_end', {}, true);
      this.flush(true);
    });
    return true;
  }

  maybeSnapshot(snapshotProvider, intervalMs = 5000) {
    if (!this.enabled) return false;
    const now = performance.now();
    if (now - this.lastSnapshot < intervalMs) return false;
    this.lastSnapshot = now;
    let snapshot = {};
    try { snapshot = snapshotProvider?.() || {}; }
    catch (error) { snapshot = { snapshotError: safeError(error) }; }
    this.log('snapshot', snapshot);
    return true;
  }

  mark(note = 'Player marked a visible problem') {
    return this.log('bug_marker', { note }, true);
  }

  log(type, data = {}, urgent = false) {
    if (!this.enabled) return false;
    let context = {};
    try { context = this.context?.() || {}; }
    catch (error) { context = { contextError: safeError(error) }; }
    this.queue.push({
      at: new Date().toISOString(),
      elapsedMs: Math.round(performance.now() - this.startedAt),
      session: this.session,
      seed: this.seed,
      type: String(type),
      ...context,
      data: sanitize(data),
    });
    if (this.queue.length > 200) this.queue.splice(0, this.queue.length - 200);
    if (urgent || this.queue.length >= 20) this.flush(urgent);
    else if (!this.flushTimer) this.flushTimer = setTimeout(() => this.flush(), 1000);
    return true;
  }

  flush(keepalive = false) {
    if (!this.enabled || !this.queue.length) return false;
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    const events = this.queue.splice(0, 100);
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive,
    }).catch(() => this.queue.unshift(...events.slice(-100)));
    return true;
  }
}

function isTextEntry(target) {
  return Boolean(target?.matches?.('input, textarea, select, [contenteditable="true"]'));
}

function safeError(error) {
  return String(error?.stack || error?.message || error || 'Unknown error').slice(0, 4000);
}

function sanitize(value) {
  try { return JSON.parse(JSON.stringify(value)); }
  catch { return { serializationError: true }; }
}
