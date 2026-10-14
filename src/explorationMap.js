export const MAP_CELL_SIZE = 16;
export const MAX_EXPLORED_CELLS = 8192;
const VALID_BIOMES = new Set(['plains', 'forest', 'desert', 'snowy_highlands', 'cinderreach']);
const keyFor = (x, z) => `${Math.floor(x)},${Math.floor(z)}`;

function sanitizeCell(value) {
  const x = Math.floor(Number(value?.x));
  const z = Math.floor(Number(value?.z));
  const elevation = Math.floor(Number(value?.elevation));
  if (![x, z, elevation].every(Number.isFinite) || Math.abs(x) > 62500 || Math.abs(z) > 62500) return null;
  return {
    x,
    z,
    biome: VALID_BIOMES.has(value.biome) ? value.biome : 'plains',
    elevation: Math.max(0, Math.min(63, elevation)),
    water: Boolean(value.water),
  };
}

export class ExplorationMapState {
  constructor(serialized = null) {
    this.cells = new Map();
    for (const value of serialized?.cells || []) {
      const cell = sanitizeCell(value);
      const key = cell ? keyFor(cell.x, cell.z) : null;
      if (!cell || this.cells.has(key) || this.cells.size >= MAX_EXPLORED_CELLS) continue;
      this.cells.set(key, cell);
    }
  }

  reveal(world, worldX, worldZ, radius = 1) {
    if (!world || !Number.isFinite(worldX) || !Number.isFinite(worldZ)) return 0;
    const centerX = Math.floor(worldX / MAP_CELL_SIZE);
    const centerZ = Math.floor(worldZ / MAP_CELL_SIZE);
    radius = Math.max(0, Math.min(3, Math.floor(Number(radius) || 0)));
    let added = 0;
    for (let dz = -radius; dz <= radius; dz += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (dx * dx + dz * dz > (radius + 0.35) ** 2 || this.cells.size >= MAX_EXPLORED_CELLS) continue;
        const x = centerX + dx;
        const z = centerZ + dz;
        const key = keyFor(x, z);
        if (this.cells.has(key)) continue;
        const sampleX = x * MAP_CELL_SIZE + MAP_CELL_SIZE / 2;
        const sampleZ = z * MAP_CELL_SIZE + MAP_CELL_SIZE / 2;
        const elevation = Math.floor(world.terrainHeight(sampleX, sampleZ));
        const biome = world.biomeAt(sampleX, sampleZ, elevation)?.id;
        const cell = sanitizeCell({ x, z, elevation, biome, water: elevation <= 17 });
        if (!cell) continue;
        this.cells.set(key, cell);
        added += 1;
      }
    }
    return added;
  }

  get(cellX, cellZ) {
    const value = this.cells.get(keyFor(cellX, cellZ));
    return value ? { ...value } : null;
  }

  entries() {
    return [...this.cells.values()].map((cell) => ({ ...cell }));
  }

  bounds() {
    if (!this.cells.size) return null;
    const values = [...this.cells.values()];
    return {
      minX: Math.min(...values.map((cell) => cell.x)),
      maxX: Math.max(...values.map((cell) => cell.x)),
      minZ: Math.min(...values.map((cell) => cell.z)),
      maxZ: Math.max(...values.map((cell) => cell.z)),
    };
  }

  serialize() {
    return { cells: this.entries() };
  }
}
