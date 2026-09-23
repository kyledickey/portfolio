import { useEffect, useRef } from "react";
import { dither, Pen } from "#/lib/pixels";
import type { Sprite } from "#/lib/sprites";

const SIZE = 32;

/** Draws a sprite still, and lets it move while `playing` is true. */
export function PixelSprite({
    sprite,
    playing,
    className,
}: {
    sprite: Sprite;
    playing: boolean;
    className?: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        const pixels = context.createImageData(SIZE, SIZE);
        const draw = (t: number) => {
            const pen = new Pen(SIZE, t);
            sprite(pen);
            dither(pen, pixels);
            context.putImageData(pixels, 0, 0);
        };
        draw(0);
        if (!playing || matchMedia("(prefers-reduced-motion: reduce)").matches)
            return;
        let frame = 0;
        let last = 0;
        const start = performance.now();
        // Twelve frames a second is plenty for pixel art, and looks the part.
        const tick = (time: number) => {
            if (time - last > 1000 / 12) {
                last = time;
                draw(0.001 + (time - start) / 1000);
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [sprite, playing]);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            width={SIZE}
            height={SIZE}
        />
    );
}
