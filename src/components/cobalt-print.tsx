import { useEffect, useRef, useState } from "react";
import { INK, PAPER, threshold } from "#/lib/pixels";
import { PATTERNS, type Painter } from "#/lib/print-patterns";

/** Pattern pixels are this many CSS pixels wide; finer on small screens. */
const grain = (width: number) => (width < 600 ? 2 : 3);
const FPS = 18;

const STORAGE_KEY = "print-pattern";

export function CobaltPrint() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [choice, setChoice] = useState(0);
    const pattern = PATTERNS[choice];

    useEffect(() => {
        try {
            const saved = PATTERNS.findIndex(
                (item) => item.label === localStorage.getItem(STORAGE_KEY),
            );
            if (saved > 0) setChoice(saved);
        } catch {}
    }, []);
    const choose = (index: number) => {
        setChoice(index);
        try {
            localStorage.setItem(STORAGE_KEY, PATTERNS[index].label);
        } catch {}
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        const still = matchMedia("(prefers-reduced-motion: reduce)");
        let frame = 0;
        let visible = true;
        let pixels: ImageData;
        let tone: Float32Array;
        let paint: Painter;
        // Reduced motion gets one settled frame instead of a loop.
        let clock = still.matches ? 8 : 0;
        let last = 0;

        const draw = () => {
            const { width, height } = canvas;
            paint(clock, tone);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const index = y * width + x;
                    const ink = tone[index] > threshold(x, y);
                    const color = ink ? INK : PAPER;
                    pixels.data[index * 4] = color[0];
                    pixels.data[index * 4 + 1] = color[1];
                    pixels.data[index * 4 + 2] = color[2];
                    pixels.data[index * 4 + 3] = 255;
                }
            }
            context.putImageData(pixels, 0, 0);
        };
        const resize = () => {
            const cell = grain(canvas.clientWidth);
            canvas.width = Math.max(1, Math.round(canvas.clientWidth / cell));
            canvas.height = Math.max(1, Math.round(canvas.clientHeight / cell));
            pixels = context.createImageData(canvas.width, canvas.height);
            tone = new Float32Array(canvas.width * canvas.height);
            paint = pattern.create(canvas.width, canvas.height);
            draw();
        };
        const tick = (time: number) => {
            if (time - last >= 1000 / FPS) {
                clock += Math.min(time - last, 200) / 1000;
                last = time;
                draw();
            }
            frame = requestAnimationFrame(tick);
        };
        const sync = () => {
            cancelAnimationFrame(frame);
            if (!still.matches && visible && !document.hidden) {
                last = performance.now();
                frame = requestAnimationFrame(tick);
            }
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);
        const intersection = new IntersectionObserver((entries) => {
            visible = entries[0].isIntersecting;
            sync();
        });
        intersection.observe(canvas);
        still.addEventListener("change", sync);
        document.addEventListener("visibilitychange", sync);
        sync();
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            intersection.disconnect();
            still.removeEventListener("change", sync);
            document.removeEventListener("visibilitychange", sync);
        };
    }, [pattern]);

    return (
        <figure className="print">
            <div className="print-stage">
                <canvas ref={canvasRef} />
            </div>
            <figcaption className="print-caption">
                <div className="print-patterns">
                    {PATTERNS.map((item, index) => (
                        <button
                            key={item.label}
                            type="button"
                            aria-pressed={index === choice}
                            onClick={() => choose(index)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </figcaption>
        </figure>
    );
}
