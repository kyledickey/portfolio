import { coloradoHour, darkness } from "#/lib/colorado-time";
import { hash } from "#/lib/pixels";

/** Fills `tone` (0 is paper, 1 is ink) for time `t` in seconds. */
export type Painter = (t: number, tone: Float32Array) => void;

type Pattern = {
    label: string;
    caption: string;
    create: (width: number, height: number) => Painter;
};

// Smooth value noise over a fixed random lattice, for the marble.
const LATTICE = 128;
const lattice = Float32Array.from({ length: LATTICE * LATTICE }, (_, i) =>
    hash(i % LATTICE, Math.floor(i / LATTICE), 3),
);
function noise(x: number, y: number) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const at = (i: number, j: number) =>
        lattice[
            (((j % LATTICE) + LATTICE) % LATTICE) * LATTICE +
                (((i % LATTICE) + LATTICE) % LATTICE)
        ];
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return top + (bottom - top) * sy;
}
function fbm(x: number, y: number) {
    return (
        noise(x, y) * 0.5 +
        noise(x * 2.03, y * 2.03) * 0.3 +
        noise(x * 4.1, y * 4.1) * 0.2
    );
}

const marble: Pattern = {
    label: "marble",
    caption: "ink dropped in water",
    create: (width, height) => {
        const scale = 3.2 / height;
        return (t, tone) => {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const px = x * scale;
                    const py = y * scale;
                    // Warp the noise by itself, twice, for the swirl.
                    const qx = fbm(px + t * 0.05, py);
                    const qy = fbm(px + 5.2, py + 1.3 - t * 0.04);
                    const rx = fbm(
                        px + 3 * qx + 1.7,
                        py + 3 * qy + 9.2 + t * 0.06,
                    );
                    const ry = fbm(px + 3 * qx + 8.3, py + 3 * qy + 2.8);
                    const v = fbm(px + 3 * rx, py + 3 * ry);
                    // Banding turns the soft noise into veins.
                    const vein = Math.abs(Math.sin(v * 14));
                    tone[y * width + x] = 1.05 - vein * 0.9;
                }
            }
        };
    },
};

const moire: Pattern = {
    label: "moiré",
    caption: "two sets of rings, overlapping",
    create: (width, height) => (t, tone) => {
        const a = {
            x: width * (0.35 + Math.sin(t * 0.23) * 0.2),
            y: height * (0.5 + Math.cos(t * 0.31) * 0.4),
        };
        const b = {
            x: width * (0.65 + Math.cos(t * 0.19) * 0.2),
            y: height * (0.5 + Math.sin(t * 0.27) * 0.4),
        };
        const spacing = Math.max(3, height / 18);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const ringA = Math.hypot(x - a.x, y - a.y) / spacing;
                const ringB = Math.hypot(x - b.x, y - b.y) / spacing;
                // Where the two sets of rings disagree, there's ink.
                const on = Math.floor(ringA) % 2 !== Math.floor(ringB) % 2;
                tone[y * width + x] = on ? 0.95 : 0.12;
            }
        }
    },
};

const tiles: Pattern = {
    label: "tiles",
    caption: "truchet tiles, flipping",
    create: (width, height) => {
        const cell = Math.max(6, Math.round(height / 7));
        return (t, tone) => {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const cx = Math.floor(x / cell);
                    const cy = Math.floor(y / cell);
                    // A slow wave sweeps across, flipping tiles as it passes.
                    const flips = Math.floor(
                        t * 0.6 - (cx + cy) * 0.12 + hash(cx, cy, 5) * 1.5,
                    );
                    const flipped = hash(cx, cy, 6) < 0.5 !== (flips % 2 === 0);
                    let u = (x - cx * cell) / cell;
                    const v = (y - cy * cell) / cell;
                    if (flipped) u = 1 - u;
                    // Two quarter-circle arcs from opposite corners.
                    const near = Math.hypot(u, v);
                    const far = Math.hypot(1 - u, 1 - v);
                    const arc = Math.min(
                        Math.abs(near - 0.5),
                        Math.abs(far - 0.5),
                    );
                    const inside = near < 0.5 || far < 0.5;
                    tone[y * width + x] = arc < 0.13 ? 1 : inside ? 0.35 : 0.12;
                }
            }
        };
    },
};

const life: Pattern = {
    label: "life",
    caption: "conway’s game of life",
    create: (width, height) => {
        // Cells are 2×2 print pixels, so they read as cells and not static.
        const w = Math.ceil(width / 2);
        const h = Math.ceil(height / 2);
        let cells = new Uint8Array(w * h);
        let next = new Uint8Array(w * h);
        const ghost = new Float32Array(w * h);
        const soup = (cx: number, cy: number, radius: number, seed: number) => {
            for (let y = cy - radius; y < cy + radius; y++) {
                for (let x = cx - radius; x < cx + radius; x++) {
                    if (x < 0 || y < 0 || x >= w || y >= h) continue;
                    if (hash(x, y, seed) < 0.35) cells[y * w + x] = 1;
                }
            }
        };
        for (let i = 0; i < cells.length; i++) {
            cells[i] = hash(i, 0, 7) < 0.3 ? 1 : 0;
        }
        let generation = 0;
        const step = () => {
            let alive = 0;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const index = y * w + x;
                    let n = 0;
                    for (let j = -1; j <= 1; j++) {
                        const row = ((y + j + h) % h) * w;
                        for (let i = -1; i <= 1; i++) {
                            if (i || j) n += cells[row + ((x + i + w) % w)];
                        }
                    }
                    const on = n === 3 || (n === 2 && cells[index] === 1);
                    next[index] = on ? 1 : 0;
                    alive += next[index];
                    ghost[index] = on ? 0.45 : ghost[index] * 0.75;
                }
            }
            [cells, next] = [next, cells];
            generation++;
            // Keep it from settling into still life.
            if (generation % 30 === 0 || alive < cells.length * 0.06) {
                soup(
                    Math.floor(hash(generation, 3) * w),
                    Math.floor(hash(generation, 4) * h),
                    Math.round(h * 0.3),
                    generation,
                );
            }
        };
        return (t, tone) => {
            const target = Math.floor(t * 9);
            // Catch up, but don't grind through a long hidden stretch.
            generation = Math.max(generation, target - 60);
            while (generation < target) step();
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const cell = (y >> 1) * w + (x >> 1);
                    tone[y * width + x] = cells[cell] ? 1 : ghost[cell];
                }
            }
        };
    },
};

type Range = {
    /** Where the range sits and how tall its peaks get, as parts of the height. */
    base: number;
    tall: [number, number];
    wide: [number, number];
    count: number;
    /** Day and night tone for the lit face; the shaded face is darker. */
    day: number;
    night: number;
    /** Peaks taller than this (part of the height) get snow. */
    snowAbove: number;
    trees: boolean;
    drift: number;
    seed: number;
};

const RANGES: Range[] = [
    {
        base: 0.66,
        tall: [0.3, 0.52],
        wide: [0.16, 0.26],
        count: 5,
        day: 0.3,
        night: 0.78,
        snowAbove: 0.36,
        trees: false,
        drift: 0.5,
        seed: 1,
    },
    {
        base: 0.8,
        tall: [0.16, 0.3],
        wide: [0.12, 0.2],
        count: 7,
        day: 0.55,
        night: 0.9,
        snowAbove: 0.26,
        trees: false,
        drift: 1.2,
        seed: 2,
    },
    {
        base: 0.97,
        tall: [0.06, 0.13],
        wide: [0.1, 0.18],
        count: 9,
        day: 0.9,
        night: 1,
        snowAbove: 1,
        trees: true,
        drift: 2.6,
        seed: 3,
    },
];

export const peaks: Pattern = {
    label: "peaks",
    caption: "the mountains, on Colorado time",
    create: (width, height) => {
        // Each range is a loop of distinct peaks, a bit wider than the print
        // so it can drift past forever.
        const period = width * 1.6;
        const built = RANGES.map((range) => ({
            range,
            peaks: Array.from({ length: range.count }, (_, i) => ({
                at:
                    ((i + 0.2 + hash(i, 1, range.seed) * 0.6) / range.count) *
                    period,
                tall:
                    height *
                    (range.tall[0] +
                        hash(i, 2, range.seed) *
                            (range.tall[1] - range.tall[0])),
                wide:
                    width *
                    (range.wide[0] +
                        hash(i, 3, range.seed) *
                            (range.wide[1] - range.wide[0])),
            })),
        }));
        const horizon = height * 0.8;
        return (t, tone) => {
            const hour = coloradoHour();
            const night = darkness(hour);
            const dusk = Math.max(0, 1 - Math.abs(night - 0.5) * 2);
            // Sky: nearly white by day, mid-tone at night so the mountains
            // stay darker than it, with a glow low down at dusk.
            for (let y = 0; y < height; y++) {
                const v = Math.min(1, y / horizon);
                const day = 0.16 * (1 - v) ** 1.5;
                const dark = 0.7 - 0.2 * v;
                const glow = dusk * 0.35 * v ** 2;
                tone.fill(
                    Math.max(0, day + (dark - day) * night - glow),
                    y * width,
                    (y + 1) * width,
                );
            }
            if (night > 0.5) {
                for (let i = 0; i < 140; i++) {
                    if (hash(i, Math.floor(t * 1.5 + i), 4) < 0.15) continue;
                    const x = Math.floor(hash(i, 1, 8) * width);
                    const y = Math.floor(hash(i, 2, 8) * height * 0.5);
                    tone[y * width + x] = 0;
                }
            }
            // The sun arcs across by day; the moon takes the night shift.
            const up = night < 0.5;
            const arc = Math.min(
                1,
                Math.max(
                    0,
                    up
                        ? (hour - 6) / 14
                        : ((hour < 12 ? hour + 24 : hour) - 20) / 10,
                ),
            );
            const body = {
                x: width * (0.1 + 0.8 * arc),
                y: height * (0.62 - Math.sin(Math.PI * arc) * 0.45),
                r: height * (up ? 0.08 : 0.065),
            };
            for (
                let y = Math.max(0, Math.floor(body.y - body.r * 2));
                y < Math.min(height, body.y + body.r * 2);
                y++
            ) {
                for (
                    let x = Math.max(0, Math.floor(body.x - body.r * 2));
                    x < Math.min(width, body.x + body.r * 2);
                    x++
                ) {
                    const d = Math.hypot(x - body.x, y - body.y);
                    const index = y * width + x;
                    if (up) {
                        if (d < body.r) tone[index] = 0;
                        else if (d < body.r * 1.8)
                            tone[index] *= (d - body.r) / (body.r * 0.8);
                    } else {
                        const bite = Math.hypot(
                            x - body.x - body.r * 0.5,
                            y - body.y + body.r * 0.2,
                        );
                        if (d < body.r && bite > body.r * 0.85) tone[index] = 0;
                    }
                }
            }
            for (const { range, peaks: list } of built) {
                const shift = t * range.drift;
                const base = height * range.base;
                for (let x = 0; x < width; x++) {
                    const along = (((x + shift) % period) + period) % period;
                    // The tallest peak over this column decides the shape.
                    let top = base;
                    let owner = list[0];
                    for (const peak of list) {
                        for (const offset of [-period, 0, period]) {
                            const d =
                                Math.abs(along - peak.at - offset) / peak.wide;
                            if (d >= 1) continue;
                            const y = base - peak.tall * (1 - d) ** 1.25;
                            if (y < top) {
                                top = y;
                                owner = { ...peak, at: peak.at + offset };
                            }
                        }
                    }
                    // Rocky detail along the ridge.
                    top +=
                        (noise(along * 0.25, range.seed * 9) - 0.5) *
                        height *
                        0.03;
                    // Pines along the foothills: little triangles on the ridge.
                    if (range.trees) {
                        const slot = Math.floor(along / 4);
                        const cx = slot * 4 + 2;
                        if (hash(slot, 7, range.seed) < 0.6) {
                            const h =
                                height *
                                (0.03 + hash(slot, 8, range.seed) * 0.04);
                            const spike = h * (1 - Math.abs(along - cx) / 2.6);
                            if (spike > 0) top -= spike;
                        }
                    }
                    const shaded = along > owner.at;
                    const snowy = owner.tall > height * range.snowAbove;
                    const snowline =
                        base -
                        owner.tall * 0.62 +
                        (noise(along * 0.6, 40 + range.seed) - 0.5) *
                            height *
                            0.08;
                    const lit = range.day + (range.night - range.day) * night;
                    for (
                        let y = Math.max(0, Math.floor(top));
                        y < height;
                        y++
                    ) {
                        const index = y * width + x;
                        let value = shaded ? Math.min(1, lit + 0.22) : lit;
                        if (snowy && y < snowline)
                            value = shaded ? 0.22 + night * 0.25 : night * 0.25;
                        // A crisp outline: ink by day, moonlight on the far range.
                        if (y - top < 1)
                            value = night > 0.5 && range.seed === 1 ? 0 : 1;
                        tone[index] = value;
                    }
                }
            }
        };
    },
};

export const PATTERNS = [peaks, marble, moire, tiles, life];
