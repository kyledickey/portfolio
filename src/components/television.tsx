import { useEffect, useRef, useState } from "react";
import type { Film } from "#/lib/films";
import { diffuse, hash, INK, loadTones, PAPER } from "#/lib/pixels";

// Print pixels; the canvas is shown at twice this size.
const WIDTH = 140;
const HEIGHT = 156;
const BODY = { x: 4, y: 40, w: 128, h: 90 };
const SCREEN = { x: 12, y: 48, w: 94, h: 74 };
const VCR = { x: 10, y: 134, w: 118, h: 18 };
const DISPLAY = { x: 88, y: 138, w: 34, h: 10 };
/** The poster, as wide as the screen; the screen pans down it. */
const POSTER_H = Math.round((SCREEN.w * 3) / 2);
const STATIC_MS = 450;

const GLYPHS: Record<string, string[]> = {
    "0": ["###", "#.#", "#.#", "#.#", "###"],
    "1": [".#.", "##.", ".#.", ".#.", "###"],
    "2": ["###", "..#", "###", "#..", "###"],
    "3": ["###", "..#", "###", "..#", "###"],
    "4": ["#.#", "#.#", "###", "..#", "..#"],
    "5": ["###", "#..", "###", "..#", "###"],
    "6": ["###", "#..", "###", "#.#", "###"],
    "7": ["###", "..#", "..#", "..#", "..#"],
    "8": ["###", "#.#", "###", "#.#", "###"],
    "9": ["###", "#.#", "###", "..#", "###"],
    ":": [".", "#", ".", "#", "."],
    " ": ["."],
    C: ["###", "#..", "#..", "#..", "###"],
    H: ["#.#", "#.#", "###", "#.#", "#.#"],
    ">": ["#..", "##.", "###", "##.", "#.."],
};

function rounded(
    x: number,
    y: number,
    box: { x: number; y: number; w: number; h: number },
    r: number,
) {
    const dx = Math.max(box.x + r - x, 0, x - (box.x + box.w - 1 - r));
    const dy = Math.max(box.y + r - y, 0, y - (box.y + box.h - 1 - r));
    if (x < box.x || y < box.y || x >= box.x + box.w || y >= box.y + box.h) {
        return false;
    }
    return dx * dx + dy * dy <= r * r + r;
}

export function Television({ film }: { film: Film | null }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const glassRef = useRef<HTMLImageElement>(null);
    const [poster, setPoster] = useState<Uint8Array | null>(null);
    const src = film?.poster;

    // When the current tape went in, for the snow and the tape counter.
    const inserted = useRef(0);

    useEffect(() => {
        inserted.current = performance.now();
        setPoster(null);
        if (!src) return;
        let cancelled = false;
        loadTones(src, SCREEN.w, POSTER_H).then(
            (tones) =>
                !cancelled && setPoster(diffuse(tones, SCREEN.w, POSTER_H)),
            () => {},
        );
        return () => {
            cancelled = true;
        };
    }, [src]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        const pixels = context.createImageData(WIDTH, HEIGHT);
        // 0 see-through, 1 paper, 2 ink.
        const bits = new Uint8Array(WIDTH * HEIGHT);
        const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
        const set = (x: number, y: number, value: number) => {
            x = Math.round(x);
            y = Math.round(y);
            if (x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT) {
                bits[y * WIDTH + x] = value;
            }
        };
        const line = (x0: number, y0: number, x1: number, y1: number) => {
            const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
            for (let i = 0; i <= steps; i++) {
                set(
                    x0 + ((x1 - x0) * i) / steps,
                    y0 + ((y1 - y0) * i) / steps,
                    2,
                );
            }
        };
        const box = (
            b: { x: number; y: number; w: number; h: number },
            r: number,
            fill: number,
        ) => {
            for (let y = b.y; y < b.y + b.h; y++) {
                for (let x = b.x; x < b.x + b.w; x++) {
                    if (!rounded(x, y, b, r)) continue;
                    const edge = !rounded(
                        x,
                        y,
                        inset(b, 1),
                        Math.max(r - 1, 0),
                    );
                    set(x, y, edge ? 2 : fill);
                }
            }
        };
        const write = (text: string, x: number, y: number, value: number) => {
            for (const char of text) {
                const glyph = GLYPHS[char] ?? GLYPHS[" "];
                glyph.forEach((row, j) => {
                    for (let i = 0; i < row.length; i++) {
                        if (row[i] === "#") set(x + i, y + j, value);
                    }
                });
                x += glyph[0].length + 1;
            }
        };
        const shadow = (b: { x: number; y: number; w: number; h: number }) => {
            for (let y = b.y + 4; y < b.y + b.h + 4; y++) {
                for (let x = b.x + 4; x < b.x + b.w + 4; x++) {
                    if ((x + y) % 2 === 0) set(x, y, 2);
                }
            }
        };

        const draw = (t: number, now: number) => {
            bits.fill(0);
            const since = now - inserted.current;

            // Rabbit ears.
            line(68, BODY.y, 44, 6);
            line(69, BODY.y, 45, 6);
            line(70, BODY.y, 98, 10);
            line(71, BODY.y, 99, 10);
            for (const [cx, cy] of [
                [44, 5],
                [99, 9],
            ]) {
                for (let j = -2; j <= 2; j++) {
                    for (let i = -2; i <= 2; i++) {
                        if (i * i + j * j <= 5) set(cx + i, cy + j, 2);
                    }
                }
            }
            for (let x = 62; x <= 77; x++) {
                for (let y = BODY.y - 5; y < BODY.y; y++) {
                    const edge = y === BODY.y - 5 || x === 62 || x === 77;
                    set(x, y, edge ? 2 : 1);
                }
            }

            shadow(BODY);
            shadow(VCR);
            box(BODY, 7, 1);
            // A second line inside the cabinet, for a bit of bevel.
            for (let y = BODY.y + 3; y < BODY.y + BODY.h - 3; y++) {
                for (let x = BODY.x + 3; x < BODY.x + BODY.w - 3; x++) {
                    const b = inset(BODY, 3);
                    if (rounded(x, y, b, 4) && !rounded(x, y, inset(b, 1), 3)) {
                        if ((x + y) % 2 === 0) set(x, y, 2);
                    }
                }
            }
            // Knobs, and a speaker grille under them.
            const panel = SCREEN.x + SCREEN.w + 6;
            for (const cy of [58, 76]) {
                for (let j = -5; j <= 5; j++) {
                    for (let i = -5; i <= 5; i++) {
                        const d = i * i + j * j;
                        if (d <= 25)
                            set(panel + 8 + i, cy + j, d >= 13 ? 2 : 1);
                    }
                }
                line(panel + 8, cy - 3, panel + 8, cy);
            }
            for (let y = 90; y <= 118; y += 3)
                line(panel + 2, y, panel + 14, y);
            // Little feet.
            for (const fx of [BODY.x + 14, BODY.x + BODY.w - 22]) {
                for (let y = BODY.y + BODY.h; y < VCR.y; y++) {
                    line(fx, y, fx + 8, y);
                }
            }

            // The screen.
            box(inset(SCREEN, -1), 8, 2);
            const pan =
                still || !poster
                    ? 0
                    : (1 - Math.cos((t / 16) * Math.PI * 2)) / 2;
            const top = Math.round(pan * (POSTER_H - SCREEN.h));
            // The real poster under the glass follows the same pan.
            glassRef.current?.style.setProperty("translate", `0 ${-top * 2}px`);
            const snowing =
                !still && film !== null && (!poster || since < STATIC_MS);
            // A tracking band that rolls down the picture now and then.
            const band = ((t * 9) % (SCREEN.h * 3)) - 6;
            const frame = Math.floor(t * 20);
            for (let y = SCREEN.y; y < SCREEN.y + SCREEN.h; y++) {
                const row = y - SCREEN.y;
                const inBand = row >= band && row < band + 4;
                for (let x = SCREEN.x; x < SCREEN.x + SCREEN.w; x++) {
                    if (!rounded(x, y, SCREEN, 7)) continue;
                    const col = x - SCREEN.x;
                    let ink: boolean;
                    if (film === null) {
                        ink = true;
                    } else if (snowing) {
                        ink = hash(col, row + frame * 7, frame) > 0.52;
                    } else if (poster) {
                        const shift = inBand ? 3 : 0;
                        const source = Math.min(SCREEN.w - 1, col + shift);
                        ink = poster[(row + top) * SCREEN.w + source] === 1;
                        if (inBand && hash(col, row, frame) < 0.25) ink = !ink;
                    } else {
                        ink = hash(col, row) > 0.5;
                    }
                    // A glint on the glass.
                    const d = col + row;
                    if (d >= 9 && d <= 10 && col < 12 && col > 1) ink = false;
                    set(x, y, ink ? 2 : 1);
                }
            }
            if (film === null) write("CH 3", SCREEN.x + 8, SCREEN.y + 7, 1);

            // The VCR, with the slot and the clock.
            box(VCR, 2, 1);
            line(VCR.x + 10, VCR.y + 6, VCR.x + 60, VCR.y + 6);
            line(VCR.x + 10, VCR.y + 7, VCR.x + 60, VCR.y + 7);
            line(VCR.x + 10, VCR.y + 11, VCR.x + 60, VCR.y + 11);
            for (let y = DISPLAY.y; y < DISPLAY.y + DISPLAY.h; y++) {
                for (let x = DISPLAY.x; x < DISPLAY.x + DISPLAY.w; x++) {
                    set(x, y, 2);
                }
            }
            if (film) {
                const seconds = Math.floor(still ? 0 : since / 1000);
                const clock = `${Math.floor(seconds / 3600)}:${String(
                    Math.floor(seconds / 60) % 60,
                ).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
                write(">", DISPLAY.x - 6, DISPLAY.y + 3, 2);
                write(clock, DISPLAY.x + 3, DISPLAY.y + 3, 1);
            } else if (still || Math.floor(t * 1.5) % 2 === 0) {
                write("12:00", DISPLAY.x + 7, DISPLAY.y + 3, 1);
            }

            for (let i = 0; i < bits.length; i++) {
                const value = bits[i];
                const color = value === 2 ? INK : PAPER;
                pixels.data[i * 4] = color[0];
                pixels.data[i * 4 + 1] = color[1];
                pixels.data[i * 4 + 2] = color[2];
                pixels.data[i * 4 + 3] = value ? 255 : 0;
            }
            context.putImageData(pixels, 0, 0);
        };

        const start = performance.now();
        draw(0, start);
        if (still) return;
        let frame = 0;
        let last = 0;
        const tick = (time: number) => {
            if (time - last >= 1000 / 20) {
                last = time;
                draw((time - start) / 1000, time);
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [film, poster]);

    return (
        <span className="television">
            <canvas
                ref={canvasRef}
                width={WIDTH}
                height={HEIGHT}
                role="img"
                aria-label={
                    film
                        ? `A little TV playing ${film.title}`
                        : "A little TV showing a blue screen"
                }
            />
            {film && (
                <span className="tv-glass">
                    <img ref={glassRef} src={film.poster} alt="" />
                </span>
            )}
        </span>
    );
}

function inset(b: { x: number; y: number; w: number; h: number }, by: number) {
    return { x: b.x + by, y: b.y + by, w: b.w - by * 2, h: b.h - by * 2 };
}
