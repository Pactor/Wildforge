const DIRECTIONS = Object.freeze(['ahead', 'front-right', 'right', 'behind-right', 'behind', 'behind-left', 'left', 'front-left']);

export function spatialCaptionDirection(listener, source, forward = { x: 0, z: -1 }) {
  const dx = Number(source?.x) - Number(listener?.x);
  const dz = Number(source?.z) - Number(listener?.z);
  if (!Number.isFinite(dx) || !Number.isFinite(dz) || Math.hypot(dx, dz) < 0.5) return 'nearby';
  const forwardLength = Math.hypot(Number(forward?.x) || 0, Number(forward?.z) || 0) || 1;
  const fx = (Number(forward?.x) || 0) / forwardLength;
  const fz = (Number(forward?.z) || -1) / forwardLength;
  const rightX = -fz;
  const rightZ = fx;
  const sourceLength = Math.hypot(dx, dz);
  const sx = dx / sourceLength;
  const sz = dz / sourceLength;
  const angle = Math.atan2(sx * rightX + sz * rightZ, sx * fx + sz * fz);
  const sector = Math.round(angle / (Math.PI / 4));
  return DIRECTIONS[(sector + 8) % 8];
}

export function soundCaptionText(label, event, listener, source, forward) {
  const verbs = { ambient: 'calls', attack: 'attacks', hurt: 'is hurt', death: 'falls silent', thunder: 'thunder rolls' };
  const safeLabel = typeof label === 'string' && label.trim() ? label.trim().slice(0, 48) : 'Sound';
  const direction = spatialCaptionDirection(listener, source, forward);
  const distance = Math.max(0, Math.round(Math.hypot((source?.x || 0) - (listener?.x || 0), (source?.z || 0) - (listener?.z || 0))));
  return `${safeLabel} ${verbs[event] || 'sounds'} · ${direction}${distance > 1 ? ` · ${distance}m` : ''}`;
}
