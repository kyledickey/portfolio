import { useEffect, useRef } from "react";
import { coloradoHour, darkness } from "#/lib/colorado-time";
import { drawDuck } from "#/lib/duck-sprite";
import { hash, INK, PAPER, threshold } from "#/lib/pixels";
import { drawRam } from "#/lib/ram-sprite";

/** Pond pixels are this many CSS pixels wide. */
const GRAIN = 3;
// Enough sky above the water for the ram to jump and cheer.
const H = 90;
const WATER = 44;
const SPEED = 10;

type Ripple = { x: number; y: number; age: number };

// Little glyphs, drawn facing right.
const FISH = [".###.#", "######", ".###.#"];
const DUCKLING = [
    "....###..",
    "...#####.",
    "...##.###",
    "...#####.",
    "#..####..",
    "########.",
    ".######..",
];
// "GO RAMS!" in a 3×5 pixel face, for when someone clicks the ram.
const CHEER_FONT: Record<string, string[]> = {
    G: ["###", "#..", "#.#", "#.#", "###"],
    O: ["###", "#.#", "#.#", "#.#", "###"],
    R: ["##.", "#.#", "##.", "#.#", "#.#"],
    A: [".#.", "#.#", "###", "#.#", "#.#"],
    M: ["#.#", "###", "###", "#.#", "#.#"],
    S: ["###", "#..", "###", "..#", "###"],
    "!": ["#", "#", "#", ".", "#"],
    " ": ["."],
};
const CHEER = "GO RAMS!";
const CHEER_TIME = 1.8;

/** The grassy bank on the right, where the ram stands. */
const BANK = 70;
const JUMP_EVERY = 6;
const JUMP_TIME = 1.1;

function stamp(
    tone: Float32Array,
    W: number,
    glyph: string[],
    x: number,
    y: number,
    flip = false,
    scale = 2,
) {
    glyph.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
            if (row[flip ? row.length - 1 - i : i] !== "#") continue;
            for (let k = 0; k < scale * scale; k++) {
                const px = Math.round(x) + i * scale + (k % scale);
                const py = Math.round(y) + j * scale + Math.floor(k / scale);
                if (px >= 0 && px < W && py >= 0 && py < H) {
                    tone[py * W + px] = 1;
                }
            }
        }
    });
}

/**
 * The bottom of the page: a pond the full width of the window, deepening
 * to solid ink. Quack paddles along it. Click the water to make ripples;
 * click Quack and it quacks.
 */
export function Pond() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ripples = useRef<Ripple[]>([]);
    const duck = useRef({ x: 40, facing: 1, quackUntil: 0 });
    // A duckling paddling along behind.
    const duckling = useRef({ x: 16, facing: 1 });
    // When the ram was last clicked: it hops and bleats.
    const ramHop = useRef(-10);
    const ramSpot = useRef({ x: -100, y: -100 });
    const width = useRef(300);
    const clock = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
        let pixels: ImageData;
        let tone: Float32Array;
        let W = 0;
        let frame = 0;
        let last = performance.now();
        let visible = true;
        const start = last;

        let splashed = -1;

        const draw = (t: number, dt: number) => {
            clock.current = t;
            const d = duck.current;
            if (!still) {
                d.x += d.facing * SPEED * dt;
                if (d.x > W - BANK - 30) d.facing = -1;
                if (d.x < 20) d.facing = 1;
            }
            for (const ripple of ripples.current) ripple.age += dt;
            ripples.current = ripples.current.filter((r) => r.age < 2.4);

            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    let value = 0;
                    if (y >= WATER) {
                        // Pale at the surface, solid ink by the bottom.
                        const depth = Math.min(
                            1,
                            (y - WATER) / (H - WATER - 6),
                        );
                        value = 0.08 + depth ** 1.4;
                        const glint = Math.sin(
                            x * 0.21 + t * 1.3 + Math.sin(y * 0.7) * 2,
                        );
                        if (
                            depth < 0.6 &&
                            glint > 0.93 &&
                            (y - WATER) % 3 === 0
                        ) {
                            value = 0;
                        }
                        for (const ripple of ripples.current) {
                            // Flattened rings, since we're looking across the water.
                            const r = Math.hypot(
                                x - ripple.x,
                                (y - ripple.y) * 2.4,
                            );
                            const ring = Math.abs(r - ripple.age * 26) < 1.2;
                            if (ring && ripple.age < 2)
                                value = value > 0.6 ? 0 : 1;
                        }
                        if (y === WATER) value = 1;
                    }
                    tone[y * W + x] = value;
                }
            }
            // Clumps of reeds along the bank, swaying a little.
            const open = W - BANK;
            const clumps = Math.max(2, Math.round(open / 90));
            for (let c = 0; c < clumps; c++) {
                const at =
                    (c + 0.5 + (hash(c, 9, 5) - 0.5) * 0.6) * (open / clumps);
                for (let i = 0; i < 6; i++) {
                    const side = at + i * 2.2;
                    const tall = 10 + hash(c * 7 + i, 1, 5) * 14;
                    const sway = still ? 0 : Math.sin(t * 1.4 + i + c) * 1.5;
                    for (let k = 0; k < tall; k++) {
                        const x = Math.round(side + (sway * k) / tall);
                        const y = WATER + 3 - k;
                        if (y >= 0 && x >= 0 && x < W) tone[y * W + x] = 1;
                    }
                    if (i % 3 === 0) {
                        const x = Math.round(side + sway);
                        const y = Math.round(WATER + 3 - tall);
                        for (let j = 0; j < 4; j++) {
                            if (y + j >= 0 && x >= 0 && x + 1 < W) {
                                tone[(y + j) * W + x] = 1;
                                tone[(y + j) * W + x + 1] = 1;
                            }
                        }
                    }
                }
            }
            // A fish that jumps every so often, splashing back in.
            if (!still) {
                const leap = Math.floor(t / JUMP_EVERY);
                const phase = t - leap * JUMP_EVERY;
                if (phase < JUMP_TIME) {
                    const dir = hash(leap, 2, 9) < 0.5 ? 1 : -1;
                    const x0 = 20 + hash(leap, 1, 9) * (W - BANK - 50);
                    const p = phase / JUMP_TIME;
                    const x = x0 + dir * p * 22;
                    const y = WATER + 2 - Math.sin(Math.PI * p) * 14;
                    stamp(tone, W, FISH, x - 6, y - 3, dir < 0);
                    if (p > 0.9 && splashed !== leap) {
                        splashed = leap;
                        ripples.current.push({ x, y: WATER + 2, age: 0 });
                    }
                }
            }

            // A dragonfly, darting about over the water.
            if (!still) {
                const bx =
                    W * (0.5 + 0.42 * Math.sin(t * 0.37) * Math.cos(t * 0.13));
                const by = WATER - 12 + Math.sin(t * 1.9) * 5;
                for (let k = -3; k <= 3; k++) {
                    const x = Math.round(bx + k);
                    const y = Math.round(by);
                    if (x >= 0 && x < W && y >= 0) tone[y * W + x] = 1;
                }
                const flap = Math.floor(t * 20) % 2 === 0 ? 1 : 2;
                for (const side of [-1, 1]) {
                    const y = Math.round(by + side * flap);
                    for (const dx of [-1, 0, 1]) {
                        const x = Math.round(bx) + dx;
                        if (x >= 0 && x < W && y >= 0) tone[y * W + x] = 1;
                    }
                }
            }

            // Fireflies once it's dark in Colorado.
            if (darkness(coloradoHour()) > 0.5) {
                for (let i = 0; i < Math.round(W / 25); i++) {
                    if (Math.sin(t * 2 + i * 7) < 0.3) continue;
                    const x = Math.round(
                        hash(i, 1, 11) * W + Math.sin(t * 0.5 + i) * 6,
                    );
                    const y = Math.round(
                        4 +
                            hash(i, 2, 11) * (WATER - 10) +
                            Math.cos(t * 0.7 + i) * 3,
                    );
                    if (x >= 0 && x < W) tone[y * W + x] = 1;
                }
            }

            // The duckling keeps a little way behind, catching up when Quack turns.
            const kid = duckling.current;
            const behind = d.x + 12 - d.facing * 26 - 4;
            kid.x += (behind - kid.x) * Math.min(1, dt * 1.6);
            if (Math.abs(behind - kid.x) > 3)
                kid.facing = behind > kid.x ? 1 : -1;
            else kid.facing = d.facing;
            const kidBob = still ? 0 : Math.round(Math.sin(t * 4 + 1));
            stamp(
                tone,
                W,
                DUCKLING,
                kid.x,
                WATER - 6 + kidBob,
                kid.facing < 0,
                1,
            );

            // A grassy bank at the right end, sloping down into the water.
            const bankTop = WATER - 7;
            for (let x = W - BANK; x < W; x++) {
                const rise = Math.min(1, (x - (W - BANK)) / 22);
                const top = Math.round(
                    WATER +
                        3 -
                        (WATER + 3 - bankTop) * rise * rise * (3 - 2 * rise),
                );
                for (let y = top; y < WATER + 8; y++) {
                    tone[y * W + x] = y === top ? 1 : 0.32;
                }
                // Tufts of grass.
                if (hash(x, 1, 13) < 0.3 && top > 1) {
                    tone[(top - 1) * W + x] = 1;
                    if (hash(x, 2, 13) < 0.5) tone[(top - 2) * W + x] = 1;
                }
            }
            // The ram, on the bank, looking out over the pond. It grazes for
            // a while, looks up for a while.
            const hopping = t - ramHop.current < 0.6;
            const cheering = t - ramHop.current < CHEER_TIME;
            const grazing = !still && !hopping && Math.sin(t * 0.55) > 0.1;
            const ram = drawRam(grazing, 0);
            const rx = W - BANK + 26;
            const lift = hopping
                ? Math.round(
                      Math.sin(((t - ramHop.current) / 0.6) * Math.PI) * 6,
                  )
                : 0;
            const ry = bankTop - 24 - lift;
            for (let j = 0; j < 32; j++) {
                for (let i = 0; i < 32; i++) {
                    const value = ram.tones[j * 32 + i];
                    const x = rx + i;
                    const y = ry + j;
                    if (x < 0 || x >= W || y < 0 || y >= H) continue;
                    if (value > 0) tone[y * W + x] = value;
                }
            }
            if (cheering) {
                // "GO RAMS!" above its head, so everyone gets the reference.
                const widths = [...CHEER].map((c) => CHEER_FONT[c][0].length);
                const total = widths.reduce((a, b) => a + b + 1, -1);
                let cx = Math.min(
                    W - total - 2,
                    rx + 16 - Math.round(total / 2),
                );
                const cy = bankTop - 24 - 9;
                [...CHEER].forEach((c, n) => {
                    CHEER_FONT[c].forEach((row, j) => {
                        for (let i = 0; i < row.length; i++) {
                            if (row[i] === "#" && cy + j >= 0) {
                                tone[(cy + j) * W + cx + i] = 1;
                            }
                        }
                    });
                    cx += widths[n] + 1;
                });
            }
            ramSpot.current = { x: rx, y: ry };

            // Quack, sitting in the water up to its belly.
            const quacking = performance.now() < d.quackUntil;
            const sprite = drawDuck(0, quacking);
            const bob = still ? 0 : Math.round(Math.sin(t * 3));
            const ox = Math.round(d.x);
            const oy = WATER - 18 + bob;
            for (let j = 0; j < 20; j++) {
                for (let i = 0; i < 24; i++) {
                    const value =
                        sprite.tones[j * 24 + (d.facing > 0 ? i : 23 - i)];
                    const x = ox + i;
                    const y = oy + j;
                    if (value > 0 && x >= 0 && x < W && y >= 0) {
                        tone[y * W + x] = value;
                    }
                }
            }
            // A wake behind it.
            for (let k = 0; k < 10; k += 2) {
                const x = Math.round(ox + 12 - d.facing * (10 + k * 2));
                const y = WATER + 2 + Math.floor(k / 3);
                if (x >= 0 && x < W) tone[y * W + x] = 0;
            }
            if (quacking) {
                const dir = d.facing > 0 ? 1 : -1;
                const x = ox + (d.facing > 0 ? 26 : -3);
                for (const [x0, y0, x1, y1] of [
                    [0, 0, 3, -2],
                    [0, 3, 4, 3],
                    [0, 6, 3, 8],
                ]) {
                    for (let s = 0; s <= 4; s++) {
                        const px = Math.round(
                            x + dir * (x0 + ((x1 - x0) * s) / 4),
                        );
                        const py = Math.round(
                            oy + 2 + y0 + ((y1 - y0) * s) / 4,
                        );
                        if (px >= 0 && px < W && py >= 0) tone[py * W + px] = 1;
                    }
                }
            }
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const index = y * W + x;
                    const ink = tone[index] > threshold(x, y);
                    const color = ink ? INK : PAPER;
                    pixels.data[index * 4] = color[0];
                    pixels.data[index * 4 + 1] = color[1];
                    pixels.data[index * 4 + 2] = color[2];
                    // Above the water the page shows through.
                    pixels.data[index * 4 + 3] = ink || y >= WATER ? 255 : 0;
                }
            }
            context.putImageData(pixels, 0, 0);
        };

        const resize = () => {
            W = Math.max(60, Math.round(canvas.clientWidth / GRAIN));
            width.current = W;
            canvas.width = W;
            canvas.height = H;
            pixels = context.createImageData(W, H);
            tone = new Float32Array(W * H);
            duck.current.x = Math.min(duck.current.x, W - BANK - 30);
            draw(0, 0);
        };
        const tick = (time: number) => {
            const dt = Math.min(0.1, (time - last) / 1000);
            if (dt >= 1 / 20) {
                last = time;
                draw((time - start) / 1000, dt);
            }
            if (visible) frame = requestAnimationFrame(tick);
        };
        resize();
        const sizer = new ResizeObserver(resize);
        sizer.observe(canvas);
        const observer = new IntersectionObserver((entries) => {
            visible = entries[0].isIntersecting && !still;
            cancelAnimationFrame(frame);
            if (visible) {
                last = performance.now();
                frame = requestAnimationFrame(tick);
            }
        });
        observer.observe(canvas);
        return () => {
            sizer.disconnect();
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="pond"
            role="img"
            aria-label="A pixel pond: a duck paddling back and forth, a jumping fish and a dragonfly. Click the water for ripples, the duck to make it quack, or the ram to make it cheer."
            onPointerDown={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const x =
                    ((event.clientX - rect.left) / rect.width) * width.current;
                const y = ((event.clientY - rect.top) / rect.height) * H;
                const spot = ramSpot.current;
                if (
                    x > spot.x &&
                    x < spot.x + 32 &&
                    y > spot.y &&
                    y < spot.y + 26
                ) {
                    ramHop.current = clock.current;
                    return;
                }
                const d = duck.current;
                if (
                    x > d.x &&
                    x < d.x + 24 &&
                    y > WATER - 18 &&
                    y < WATER + 4
                ) {
                    d.quackUntil = performance.now() + 700;
                    ripples.current.push({ x: d.x + 12, y: WATER + 1, age: 0 });
                } else if (y >= WATER - 2) {
                    ripples.current.push({
                        x,
                        y: Math.max(WATER + 2, y),
                        age: 0,
                    });
                }
            }}
        />
    );
}
