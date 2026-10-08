// The hero scene: a dithered planet, the consensus, ringed by the shares that
// built it. Fixed geometry; only the ring turns.

export const SATURN_WIDTH = 960;
export const SATURN_HEIGHT = 400;
export const PLANET_DIAMETER = 380;
export const ORBIT_PERIOD_MS = 40_000;
export const TILE_SIZE = 11;
/** One colour per share index: s1, s2, s3. */
export const SHARE_COLORS = ["#FF6B3D", "#8FB8FF", "#E9D27A"] as const;
const TAU = Math.PI * 2;
const TILT = -0.245;

export type OrbitTile = { phase: number; radius: number; spread: number; offset: number; share: number };

/** Fixed scatter travels with each tile; no per-frame noise or perspective scaling. */
export function orbitTiles(count = 480): OrbitTile[] {
  let seed = 17;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  return Array.from({ length: count }, (_, index) => ({
    phase: ((index + random()) / count) * TAU,
    radius: 452 + (random() - 0.5) * 60,
    spread: 76 + (random() - 0.5) * 80,
    offset: (random() - 0.5) * 40,
    share: index % SHARE_COLORS.length,
  }));
}

export function tilePosition(tile: OrbitTile, elapsedMs: number) {
  const angle = tile.phase + ((elapsedMs % ORBIT_PERIOD_MS) / ORBIT_PERIOD_MS) * TAU;
  const depth = Math.sin(angle);
  const x = Math.cos(angle) * tile.radius;
  const y = depth * tile.spread + tile.offset;
  return {
    x: SATURN_WIDTH / 2 + x * Math.cos(TILT) - y * Math.sin(TILT),
    y: SATURN_HEIGHT / 2 + x * Math.sin(TILT) + y * Math.cos(TILT),
    size: TILE_SIZE,
    front: depth >= 0,
    opacity: 0.7 + (depth + 1) * 0.15,
  };
}

/** Ordered square-cell dither, cached once: the planet never rotates. */
export function planetCells() {
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const cells: { x: number; y: number; opacity: number }[] = [];
  const radius = PLANET_DIAMETER / 2;
  for (let row = 0; row < 48; row++) {
    for (let column = 0; column < 48; column++) {
      const x = column * 8 + 2,
        y = row * 8 + 2;
      const nx = (x + 2.25 - radius) / radius,
        ny = (y + 2.25 - radius) / radius;
      const distance = nx * nx + ny * ny;
      if (distance > 0.985) continue;
      const shade = Math.max(0.04, Math.min(1, 0.2 + 0.9 * (-nx * 0.6 - ny * 0.48 + Math.sqrt(1 - distance) * 0.45)));
      const threshold = (bayer[(row % 4) * 4 + (column % 4)]! + 0.5) / 16;
      cells.push({
        x,
        y,
        opacity: shade > threshold ? 0.93 : 0.12 + shade * 0.18 + 0.24 * Math.sqrt(Math.max(0, nx) * Math.max(0, ny)),
      });
    }
  }
  return cells;
}
