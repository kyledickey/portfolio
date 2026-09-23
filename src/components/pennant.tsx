import { useEffect, useRef, useState } from "react";
import { INK, PAPER } from "#/lib/pixels";

const W = 30;
const H = 16;
// "CSU" in a 3×5 pixel face.
const LETTERS = [
    ["###", "#..", "#..", "#..", "###"],
    ["###", "#..", "###", "..#", "###"],
    ["#.#", "#.#", "#.#", "#.#", "###"],
];

/** A tiny CSU pennant that flaps in the breeze, harder when hovered. */
export function Pennant() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [windy, setWindy] = useState(false);

    useEffect(() => {
        const context = canvasRef.current?.getContext("2d");
        if (!context) return;
        const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
        const pixels = context.createImageData(W, H);
        const draw = (t: number) => {
            pixels.data.fill(0);
            const set = (x: number, y: number, ink: boolean) => {
                if (x < 0 || y < 0 || x >= W || y >= H) return;
                const color = ink ? INK : PAPER;
                const index = (y * W + x) * 4;
                pixels.data[index] = color[0];
                pixels.data[index + 1] = color[1];
                pixels.data[index + 2] = color[2];
                pixels.data[index + 3] = 255;
            };
            const speed = windy ? 14 : 5;
            for (let x = 2; x < W; x++) {
                // Narrowing to a point; the letters stay flat and the tail ripples.
                const reach = (x - 2) / (W - 3);
                const half = 6 * (1 - reach ** 1.6);
                const wave = still
                    ? 0
                    : Math.round(
                          Math.sin(x * 0.45 - t * speed) *
                              Math.max(0, reach - 0.45) *
                              3.2,
                      );
                const center = 7 + wave;
                for (
                    let y = Math.round(center - half);
                    y <= Math.round(center + half);
                    y++
                ) {
                    // The letters ride along with the cloth.
                    const lx = x - 3;
                    const ly = y - wave - 5;
                    const letter = LETTERS[Math.floor(lx / 4)];
                    const inLetter =
                        letter !== undefined &&
                        lx % 4 < 3 &&
                        ly >= 0 &&
                        ly < 5 &&
                        letter[ly][lx % 4] === "#";
                    // Solid cloth with the letters left in paper.
                    set(x, y, !inLetter);
                }
            }
            // The stick.
            for (let y = 0; y < H; y++) set(1, y, true);
            context.putImageData(pixels, 0, 0);
        };
        draw(0);
        if (still) return;
        let frame = 0;
        let last = 0;
        const start = performance.now();
        const tick = (time: number) => {
            if (time - last > 1000 / 15) {
                last = time;
                draw((time - start) / 1000);
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [windy]);

    return (
        <canvas
            ref={canvasRef}
            className="pennant"
            width={W}
            height={H}
            role="img"
            aria-label="A little CSU pennant"
            onPointerEnter={() => setWindy(true)}
            onPointerLeave={() => setWindy(false)}
        />
    );
}
