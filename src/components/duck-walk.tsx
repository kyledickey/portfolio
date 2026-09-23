import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { hash, INK, PAPER, Pen, threshold } from "#/lib/pixels";

// The world, in pixels; the canvas is shown at four times this.
const W = 200;
const H = 80;
const GROUND = 68;
const GRAVITY = 420;
const JUMP = 165;
const SPEED = 48;

// The 404 itself is the obstacle course, 3×3 blocks per font pixel.
const DIGITS: Record<string, string[]> = {
    "4": ["#...#", "#...#", "#...#", "#####", "....#", "....#", "....#"],
    "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
};
const BLOCK = 3;
const BLOCKS = [
    ["4", 52],
    ["0", 94],
    ["4", 136],
].flatMap(([digit, left]) =>
    DIGITS[digit as string].flatMap((row, j) =>
        [...row].flatMap((cell, i) =>
            cell === "#"
                ? [
                      {
                          x: (left as number) + i * BLOCK,
                          y: GROUND - 7 * BLOCK + j * BLOCK,
                      },
                  ]
                : [],
        ),
    ),
);
const HOME = { x: 176, width: 18 };

/** The duck's box, relative to where it's drawn. */
const BOX = { dx: 4, dy: 3, w: 18, h: 20 };

export function drawDuck(frame: number, quacking: boolean) {
    const pen = new Pen(24);
    pen.blob(11, 16, 8, 4.5, (_, y) => (y >= 18 ? 0.3 : 0.03));
    pen.path([
        [4, 15],
        [2, 10],
        [6, 12],
    ]);
    pen.rect(3, 12, 3, 2, 1);
    pen.path([
        [6, 15],
        [9, 17],
        [14, 17],
        [16, 14],
    ]);
    pen.blob(17, 7, 4.5, 4.5, 0.03);
    pen.ellipse(16, 12, 2.3, 2.3, 0.03);
    pen.rect(18, 5, 2, 2, 1);
    if (quacking) {
        pen.rect(21, 6, 3, 1, 1);
        pen.rect(21, 9, 3, 1, 1);
    } else {
        pen.rect(21, 7, 3, 2, 1);
    }
    // Two-frame waddle.
    const step = frame % 2 === 0 ? 1 : -1;
    pen.line(9, 20, 9 - step, 23);
    pen.line(13, 20, 13 + step, 23);
    pen.line(9 - step, 23, 11 - step, 23);
    pen.line(13 + step, 23, 15 + step, 23);
    return pen;
}

/**
 * The 404 page is a tiny game: walk Quack over the 404 and back home.
 * Arrow keys or A/D to walk, space or up to jump; buttons on touch screens.
 */
export function DuckWalk() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const keys = useRef({ left: false, right: false, jump: false });
    // When jump was last pressed, so a quick tap between frames still counts.
    const jumpAt = useRef(0);
    const navigate = useNavigate();

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        const pixels = context.createImageData(W, H);
        const tone = new Float32Array(W * H);
        const duck = {
            x: 8,
            y: GROUND - BOX.h - BOX.dy,
            vx: 0,
            vy: 0,
            facing: 1,
            grounded: true,
        };
        let frame = 0;
        let last = performance.now();
        let walked = 0;
        let home = false;
        const start = last;

        const hits = (x: number, y: number) => {
            const left = x + BOX.dx;
            const top = y + BOX.dy;
            return BLOCKS.filter(
                (block) =>
                    left < block.x + BLOCK &&
                    left + BOX.w > block.x &&
                    top < block.y + BLOCK &&
                    top + BOX.h > block.y,
            );
        };

        const step = (dt: number) => {
            const { left, right, jump } = keys.current;
            duck.vx = (right ? SPEED : 0) - (left ? SPEED : 0);
            if (duck.vx) duck.facing = Math.sign(duck.vx);
            const tapped = performance.now() - jumpAt.current < 150;
            if ((jump || tapped) && duck.grounded) {
                jumpAt.current = 0;
                duck.vy = -JUMP;
                duck.grounded = false;
            }
            duck.vy += GRAVITY * dt;

            // Move one axis at a time, backing out of any block we hit.
            const nextX = Math.max(
                -BOX.dx,
                Math.min(W - BOX.w - BOX.dx, duck.x + duck.vx * dt),
            );
            if (hits(nextX, duck.y).length === 0) {
                walked += Math.abs(nextX - duck.x);
                duck.x = nextX;
            }
            const nextY = duck.y + duck.vy * dt;
            const blockedY = hits(duck.x, nextY);
            const floor = GROUND - BOX.h - BOX.dy;
            if (blockedY.length > 0) {
                // Land on the highest block touched, or bump the lowest.
                const ys = blockedY.map((block) => block.y);
                if (duck.vy > 0) {
                    duck.y = Math.min(...ys) - BOX.h - BOX.dy;
                    duck.grounded = true;
                } else {
                    duck.y = Math.max(...ys) + BLOCK - BOX.dy;
                }
                duck.vy = 0;
            } else if (nextY >= floor) {
                duck.y = floor;
                duck.vy = 0;
                duck.grounded = true;
            } else {
                duck.y = nextY;
                duck.grounded = false;
            }

            if (!home && duck.x + BOX.dx + BOX.w / 2 > HOME.x + 4) {
                home = true;
                window.setTimeout(() => navigate({ to: "/" }), 500);
            }
        };

        const draw = (t: number) => {
            // Sky, a couple of drifting clouds, and dithered ground.
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    let value = y >= GROUND ? (y === GROUND ? 1 : 0.28) : 0.04;
                    for (let c = 0; c < 3; c++) {
                        const cx =
                            ((hash(c, 1, 2) * W + t * (3 + c * 2)) % (W + 40)) -
                            20;
                        const cy = 10 + hash(c, 2, 2) * 18;
                        const dx = (x - cx) / (12 + c * 4);
                        const dy = (y - cy) / 4;
                        if (dx * dx + dy * dy < 1) value = 0.18;
                    }
                    tone[y * W + x] = value;
                }
            }
            for (const block of BLOCKS) {
                for (let j = 0; j < BLOCK; j++) {
                    for (let i = 0; i < BLOCK; i++) {
                        tone[(block.y + j) * W + block.x + i] = 1;
                    }
                }
            }
            // A little house to walk into.
            const hx = HOME.x;
            for (let y = GROUND - 18; y < GROUND; y++) {
                for (let x = hx; x < hx + HOME.width; x++) {
                    const roof = y < GROUND - 11;
                    const inRoof =
                        roof &&
                        Math.abs(x - (hx + HOME.width / 2)) <
                            y - (GROUND - 18) + 2;
                    const wall = !roof;
                    const door =
                        wall && x > hx + 6 && x < hx + 11 && y > GROUND - 8;
                    const edge =
                        wall &&
                        (x === hx + 1 ||
                            x === hx + HOME.width - 2 ||
                            y === GROUND - 11);
                    if (inRoof) tone[y * W + x] = 1;
                    else if (door) tone[y * W + x] = 1;
                    else if (edge) tone[y * W + x] = 1;
                    else if (wall && x > hx && x < hx + HOME.width - 1)
                        tone[y * W + x] = 0.04;
                }
            }
            // The duck, flipped to face where it's going.
            const moving = duck.vx !== 0 && duck.grounded;
            const sprite = drawDuck(
                moving ? Math.floor(walked / 4) : 0,
                home || Math.sin(t * 2) > 0.97,
            );
            const ox = Math.round(duck.x);
            const oy = Math.round(duck.y);
            for (let j = 0; j < 24; j++) {
                for (let i = 0; i < 24; i++) {
                    const value =
                        sprite.tones[j * 24 + (duck.facing > 0 ? i : 23 - i)];
                    const x = ox + i;
                    const y = oy + j;
                    if (x < 0 || y < 0 || x >= W || y >= H) continue;
                    // Anything the duck covers, even its pale body, hides the sky.
                    if (value > 0) tone[y * W + x] = value;
                }
            }
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const index = y * W + x;
                    const color = tone[index] > threshold(x, y) ? INK : PAPER;
                    pixels.data[index * 4] = color[0];
                    pixels.data[index * 4 + 1] = color[1];
                    pixels.data[index * 4 + 2] = color[2];
                    pixels.data[index * 4 + 3] = 255;
                }
            }
            context.putImageData(pixels, 0, 0);
        };

        const tick = (time: number) => {
            const dt = Math.min(0.05, (time - last) / 1000);
            last = time;
            step(dt);
            draw((time - start) / 1000);
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);

        const bind = (event: KeyboardEvent, down: boolean) => {
            const key = event.key.toLowerCase();
            if (key === "arrowleft" || key === "a") keys.current.left = down;
            else if (key === "arrowright" || key === "d")
                keys.current.right = down;
            else if (key === " " || key === "arrowup" || key === "w") {
                keys.current.jump = down;
                if (down) jumpAt.current = performance.now();
            } else return;
            event.preventDefault();
        };
        const onDown = (event: KeyboardEvent) => bind(event, true);
        const onUp = (event: KeyboardEvent) => bind(event, false);
        window.addEventListener("keydown", onDown);
        window.addEventListener("keyup", onUp);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("keydown", onDown);
            window.removeEventListener("keyup", onUp);
        };
    }, [navigate]);

    const hold = (key: "left" | "right" | "jump") => ({
        onPointerDown: (event: React.PointerEvent) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            keys.current[key] = true;
            if (key === "jump") jumpAt.current = performance.now();
        },
        onPointerUp: () => {
            keys.current[key] = false;
        },
        onPointerCancel: () => {
            keys.current[key] = false;
        },
    });

    return (
        <div className="duck-walk">
            <canvas
                ref={canvasRef}
                width={W}
                height={H}
                role="img"
                aria-label="A pixel duck, a 404 made of blocks, and a little house. Walk the duck home."
            />
            <div className="duck-controls">
                <button type="button" aria-label="Walk left" {...hold("left")}>
                    ←
                </button>
                <button type="button" aria-label="Jump" {...hold("jump")}>
                    jump
                </button>
                <button
                    type="button"
                    aria-label="Walk right"
                    {...hold("right")}
                >
                    →
                </button>
            </div>
        </div>
    );
}
