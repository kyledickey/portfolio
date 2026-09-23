import { useEffect, useRef, useState } from "react";
import { INK } from "#/lib/pixels";

const SIZE = 16;
const STORAGE_KEY = "drawn-cursor";
const STYLE_ID = "drawn-cursor";

const ARROW = [
    "................",
    ".#..............",
    ".##.............",
    ".###............",
    ".####...........",
    ".#####..........",
    ".######.........",
    ".#######........",
    ".########.......",
    ".#########......",
    ".######.........",
    ".##.####........",
    ".#...###........",
    ".....####.......",
    "......###.......",
    "................",
];

const arrow = () =>
    Uint8Array.from(ARROW.join(""), (cell) => (cell === "#" ? 1 : 0));

/**
 * Renders the drawing at 2× as a cursor image, with a white outline so it
 * shows up on the blue parts of the page too.
 */
function cursorUrl(cells: Uint8Array) {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE * 2;
    canvas.height = SIZE * 2;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const on = (x: number, y: number) =>
        x >= 0 && y >= 0 && x < SIZE && y < SIZE && cells[y * SIZE + x] === 1;
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (on(x, y)) {
                context.fillStyle = `rgb(${INK.join(",")})`;
            } else if (
                on(x - 1, y) ||
                on(x + 1, y) ||
                on(x, y - 1) ||
                on(x, y + 1)
            ) {
                context.fillStyle = "#fff";
            } else {
                continue;
            }
            context.fillRect(x * 2, y * 2, 2, 2);
        }
    }
    return canvas.toDataURL("image/png");
}

function applyCursor(cells: Uint8Array | null) {
    document.getElementById(STYLE_ID)?.remove();
    // An empty drawing would make the cursor vanish; keep the normal one.
    if (!cells?.some(Boolean)) return;
    const url = cursorUrl(cells);
    if (!url) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `html, html * { cursor: url(${url}) 2 2, auto !important; }`;
    document.head.append(style);
}

export function CursorMaker() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cells = useRef(arrow());
    const last = useRef<{ x: number; y: number } | null>(null);
    const painting = useRef(1);
    const [using, setUsing] = useState(false);
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const away = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node))
                setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("pointerdown", away);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", away);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const paint = () => {
        const context = canvasRef.current?.getContext("2d");
        if (!context) return;
        const pixels = context.createImageData(SIZE, SIZE);
        cells.current.forEach((on, index) => {
            pixels.data[index * 4] = INK[0];
            pixels.data[index * 4 + 1] = INK[1];
            pixels.data[index * 4 + 2] = INK[2];
            pixels.data[index * 4 + 3] = on ? 255 : 0;
        });
        context.putImageData(pixels, 0, 0);
    };

    const save = (active: boolean) => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ cells: cells.current.join(""), active }),
            );
        } catch {}
    };

    // biome-ignore lint/correctness/useExhaustiveDependencies: restore once
    useEffect(() => {
        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY) ?? "null",
            );
            if (saved?.cells?.length === SIZE * SIZE) {
                cells.current = Uint8Array.from(saved.cells as string, (bit) =>
                    bit === "1" ? 1 : 0,
                );
                if (saved.active) {
                    setUsing(true);
                    applyCursor(cells.current);
                }
            }
        } catch {}
        paint();
    }, []);

    const cell = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        return {
            x: Math.floor(((event.clientX - rect.left) / rect.width) * SIZE),
            y: Math.floor(((event.clientY - rect.top) / rect.height) * SIZE),
        };
    };

    const stroke = (to: { x: number; y: number }) => {
        const from = last.current ?? to;
        const steps = Math.max(
            Math.abs(to.x - from.x),
            Math.abs(to.y - from.y),
            1,
        );
        for (let i = 0; i <= steps; i++) {
            const x = Math.round(from.x + ((to.x - from.x) * i) / steps);
            const y = Math.round(from.y + ((to.y - from.y) * i) / steps);
            if (x >= 0 && y >= 0 && x < SIZE && y < SIZE) {
                cells.current[y * SIZE + x] = painting.current;
            }
        }
        last.current = to;
        paint();
    };

    const finish = () => {
        last.current = null;
        if (using) applyCursor(cells.current);
        save(using);
    };

    return (
        <div ref={rootRef} className="cursor-maker">
            <button
                type="button"
                className="cursor-toggle"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
            >
                draw a cursor
            </button>
            <div className="cursor-panel" hidden={!open}>
                <div className="cursor-pad">
                    <canvas
                        ref={canvasRef}
                        width={SIZE}
                        height={SIZE}
                        aria-label="A 16 by 16 pixel grid for drawing your own cursor"
                        onPointerDown={(event) => {
                            event.currentTarget.setPointerCapture(
                                event.pointerId,
                            );
                            const at = cell(event);
                            // Starting on an inked pixel erases, like most pixel editors.
                            painting.current = cells.current[at.y * SIZE + at.x]
                                ? 0
                                : 1;
                            last.current = null;
                            stroke(at);
                        }}
                        onPointerMove={(event) => {
                            if (event.buttons & 1) stroke(cell(event));
                        }}
                        onPointerUp={finish}
                    />
                </div>
                <div className="cursor-maker-side">
                    <span className="cursor-maker-note">
                        click a pixel to add it, again to erase
                    </span>
                    <div className="cursor-maker-tools">
                        <button
                            type="button"
                            aria-pressed={using}
                            onClick={() => {
                                const next = !using;
                                setUsing(next);
                                applyCursor(next ? cells.current : null);
                                save(next);
                            }}
                        >
                            {using ? "using it ✓" : "use it"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                cells.current.fill(0);
                                paint();
                                if (using) applyCursor(cells.current);
                                save(using);
                            }}
                        >
                            clear
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                cells.current = arrow();
                                paint();
                                if (using) applyCursor(cells.current);
                                save(using);
                            }}
                        >
                            reset
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
