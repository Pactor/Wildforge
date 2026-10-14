import { BLOCKS } from './blocks.js';

export function itemIconKind(id, definition = null) {
  const numeric = Number(id);
  if (Number.isInteger(numeric) && BLOCKS[numeric]) return 'block';
  const key = String(id).toLowerCase();
  const category = definition?.category || '';
  if (key.includes('bow')) return 'bow';
  if (key === 'arrow') return 'arrow';
  if (key.includes('sword')) return 'sword';
  if (key.includes('maul')) return 'hammer';
  if (definition?.miningKind === 'pickaxe') return 'pickaxe';
  if (definition?.miningKind === 'axe') return 'axe';
  if (definition?.miningKind === 'shovel') return 'shovel';
  if (definition?.miningKind === 'shears') return 'shears';
  if (definition?.hoe) return 'hoe';
  if (category === 'armor') return definition.slot || 'armor';
  if (category === 'shield') return 'shield';
  if (category === 'tonic') return 'tonic';
  if (category === 'pail') return 'pail';
  if (category === 'food') return 'food';
  if (category === 'seed' || category === 'farming') return 'plant';
  if (category === 'navigation') return 'compass';
  if (category === 'map') return 'map';
  if (category === 'ammunition') return 'arrow';
  if (key.includes('ingot')) return 'ingot';
  if (key.includes('shard') || key.includes('fang') || key.includes('core')) return 'crystal';
  if (key.includes('flask')) return 'flask';
  if (key.includes('stick') || key.includes('rod')) return 'rod';
  if (category === 'material') return 'material';
  if (['vehicle', 'transport'].includes(category)) return 'vehicle';
  if (['cosmetic', 'treasure', 'ritual'].includes(category)) return 'relic';
  return 'item';
}

export function itemIconMarkup(id, definition, extraClass = '') {
  const kind = itemIconKind(id, definition);
  const base = Number(definition?.color) || 0x8f9a90;
  const main = color(base);
  const light = color(mix(base, 0xffffff, 0.34));
  const dark = color(mix(base, 0x000000, 0.38));
  const accent = color(mix(base, 0xf3d77b, 0.42));
  const body = iconBody(kind, { main, light, dark, accent });
  return `<svg class="item-icon ${extraClass}" data-icon-kind="${kind}" viewBox="0 0 32 32" aria-hidden="true" focusable="false" shape-rendering="crispEdges">${body}</svg>`;
}

function iconBody(kind, palette) {
  const { main, light, dark, accent } = palette;
  if (kind === 'block') return `<polygon points="16,2 29,8 16,14 3,8" fill="${light}"/><polygon points="3,8 16,14 16,29 3,22" fill="${main}"/><polygon points="16,14 29,8 29,22 16,29" fill="${dark}"/><path d="M7 10h4v3H7zm12 2h5v3h-5zM6 18h5v4H6zm14 1h5v4h-5z" fill="${accent}" opacity=".38"/>`;
  if (['pickaxe', 'axe', 'shovel', 'hoe', 'hammer'].includes(kind)) {
    const heads = {
      pickaxe: `<path d="M3 7l4-4h14l8 6-3 3-7-4h-5l-8 5z" fill="${light}"/><path d="M5 9l3-3 3 3-4 5z" fill="${dark}"/>`,
      axe: `<path d="M13 3h10l6 6-8 8-8-4z" fill="${main}"/><path d="M17 5h5l4 4-5 5-5-3z" fill="${light}"/>`,
      shovel: `<path d="M20 2l8 7-6 8-8-3-1-5z" fill="${main}"/><path d="M21 5l4 4-4 5-4-2z" fill="${light}"/>`,
      hoe: `<path d="M11 4h16v5H15l-4 4-4-4z" fill="${main}"/>`,
      hammer: `<path d="M8 3h18l4 6-6 7H9L3 10z" fill="${main}"/><path d="M10 5h13l3 4-4 4H10z" fill="${light}"/>`,
    };
    return `${heads[kind]}<path d="M17 11l4 4L8 29H3z" fill="#80552f"/><path d="M18 13l2 2L7 28H5z" fill="#bd8650"/>`;
  }
  if (kind === 'sword') return `<path d="M24 2h6v6L13 25l-6-6z" fill="${light}"/><path d="M26 5L11 20l2 2L28 7z" fill="${main}"/><path d="M6 16l10 10-3 3L3 19z" fill="${accent}"/><path d="M4 24l4 4-3 3-4-4z" fill="#80552f"/>`;
  if (kind === 'bow') return `<path d="M24 2c7 8 7 20 0 28l-3-3c5-7 5-17 0-22z" fill="${main}"/><path d="M24 3L9 16l15 13" fill="none" stroke="#e8dbc0" stroke-width="1.5"/><path d="M7 15h18v3H7z" fill="${accent}"/>`;
  if (kind === 'arrow') return `<path d="M3 25L25 3l3 3L6 28z" fill="#b88a55"/><path d="M21 2h9v9l-4-4z" fill="${light}"/><path d="M2 21l8 8H3z" fill="${main}"/>`;
  if (kind === 'shield') return `<path d="M4 4l12-3 12 3v11c0 8-5 13-12 16C9 28 4 23 4 15z" fill="${dark}"/><path d="M7 6l9-2 9 2v9c0 6-4 10-9 13-5-3-9-7-9-13z" fill="${main}"/><path d="M14 5h4v21h-4zM7 11h18v4H7z" fill="${light}" opacity=".65"/>`;
  if (['head', 'chest', 'legs', 'feet', 'armor'].includes(kind)) {
    if (kind === 'head') return `<path d="M6 5l10-4 10 4 3 10-5 4v-6H8v6l-5-4z" fill="${main}"/><path d="M8 6l8-3 8 3 1 4H7z" fill="${light}"/>`;
    if (kind === 'legs') return `<path d="M7 3h18l2 10-6 3v14h-7V17l-4-1v14H3V16l2-3z" fill="${main}"/><path d="M8 5h16l1 5H7z" fill="${light}"/>`;
    if (kind === 'feet') return `<path d="M5 4h8v15l-3 4h7v7H2v-9l3-5zm14 0h8v12l3 5v9H15v-7h7l-3-4z" fill="${main}"/><path d="M3 25h12v3H3zm14 0h12v3H17z" fill="${light}"/>`;
    return `<path d="M9 2l7 4 7-4 7 7-5 6v15H7V15L2 9z" fill="${main}"/><path d="M10 5l6 4 6-4 4 4-4 5H10L6 9z" fill="${light}"/><path d="M14 14h4v14h-4z" fill="${dark}"/>`;
  }
  if (kind === 'tonic' || kind === 'flask') return `<path d="M12 2h8v4l-2 3v3l8 10-3 8H9l-3-8 8-10V9l-2-3z" fill="#d9f4ee" opacity=".8"/><path d="M9 21h14l-2 6H11z" fill="${main}"/><path d="M13 3h6v3h-6z" fill="${dark}"/><path d="M12 18h3v3h-3z" fill="${light}"/>`;
  if (kind === 'pail') return `<path d="M5 9h22l-3 20H8z" fill="${main}"/><path d="M8 12h16l-1 5H9z" fill="${light}"/><path d="M8 10C8 0 24 0 24 10" fill="none" stroke="#d9dfdc" stroke-width="2"/>`;
  if (kind === 'food') return `<path d="M5 14l6-8 13 2 5 9-5 10-14 2-7-7z" fill="${main}"/><path d="M9 13l4-4 9 2 3 5-4 2-8-2z" fill="${light}"/><path d="M8 22h5v4H8zm13-1h4v3h-4z" fill="${dark}"/>`;
  if (kind === 'plant') return `<path d="M15 13h3v18h-3z" fill="#6f9144"/><path d="M16 16C6 16 4 9 5 5c7 0 11 3 11 11zm1 5c10 0 12-7 11-11-7 0-11 3-11 11z" fill="${main}"/><path d="M14 29h5v3h-5z" fill="#785132"/>`;
  if (kind === 'compass') return `<circle cx="16" cy="16" r="14" fill="${dark}"/><circle cx="16" cy="16" r="11" fill="${light}"/><path d="M19 13L25 5l-6 14-12 7 6-12z" fill="${main}"/><path d="M19 13l6-8-6 14z" fill="#df554e"/><circle cx="16" cy="16" r="2" fill="#f4e7bd"/>`;
  if (kind === 'map') return `<path d="M2 5l9-3 10 4 9-3v24l-9 3-10-4-9 3z" fill="#d7c68c"/><path d="M11 2v24m10-20v24" stroke="#806f45" stroke-width="2"/><path d="M5 12l5-3 5 5 4-2 7 7" fill="none" stroke="${main}" stroke-width="2"/>`;
  if (kind === 'ingot') return `<path d="M6 11l5-7h12l5 7-5 14H9z" fill="${main}"/><path d="M11 7h11l3 4H8z" fill="${light}"/><path d="M10 22h12l3-9H8z" fill="${dark}"/>`;
  if (kind === 'crystal') return `<path d="M16 1l8 8 4 12-12 10L4 22 8 8z" fill="${main}"/><path d="M16 3v24L9 9z" fill="${light}"/><path d="M16 3l6 7 4 11-10 6z" fill="${dark}"/><path d="M10 12l6 6-5 5-4-3z" fill="${accent}" opacity=".7"/>`;
  if (kind === 'shears') return `<circle cx="9" cy="23" r="5" fill="none" stroke="${main}" stroke-width="3"/><circle cx="22" cy="23" r="5" fill="none" stroke="${main}" stroke-width="3"/><path d="M12 20L28 3 16 18 5 3l13 17" fill="${light}"/>`;
  if (kind === 'rod') return `<path d="M4 27L25 3l4 3L8 30z" fill="${main}"/><path d="M6 26L25 5l2 1L8 28z" fill="${light}"/>`;
  if (kind === 'vehicle') return `<path d="M4 12h24l-3 11H7z" fill="${main}"/><path d="M8 9h16l4 5H4z" fill="${light}"/><circle cx="10" cy="26" r="4" fill="${dark}"/><circle cx="23" cy="26" r="4" fill="${dark}"/>`;
  if (kind === 'relic') return `<path d="M16 1l5 9 10 3-7 7 2 11-10-5-10 5 2-11-7-7 10-3z" fill="${main}"/><path d="M16 6l3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1z" fill="${light}"/>`;
  return `<path d="M7 5h18l5 9-5 13H7L2 14z" fill="${main}"/><path d="M9 7h14l3 6H6z" fill="${light}"/><path d="M8 17h16v7H8z" fill="${dark}"/><path d="M14 11h4v9h-4z" fill="${accent}"/>`;
}

function mix(a, b, amount) {
  const channel = (shift) => Math.round((((a >> shift) & 255) * (1 - amount)) + (((b >> shift) & 255) * amount));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

function color(value) {
  return `#${(value >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
}
