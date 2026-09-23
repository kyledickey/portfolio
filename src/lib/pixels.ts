/**
 * A tiny pixel drawing kit. Shapes are painted as tones between 0 (paper) and
 * 1 (solid ink), then an ordered dither turns every tone into on/off pixels,
 * so a 0.3 fill comes out as a scatter of dots and a gradient comes out as
 * the dot pattern thinning out.
 */

export const INK = [49, 61, 238] as const;
// Matches --paper, so paper pixels disappear into the page.
export const PAPER = [247, 247, 242] as const;

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
    (value) => (value + 0.5) / 16,
);

export function threshold(x: number, y: number) {
    return BAYER4[(y & 3) * 4 + (x & 3)];
}

/** Cheap, stable per-pixel noise in [0, 1). */
export function hash(x: number, y: number, seed = 0) {
    let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export type Tone = number | ((x: number, y: number) => number);

export class Pen {
    readonly tones: Float32Array;
    constructor(
        readonly size: number,
        /** Seconds since the drawing started moving. */
        readonly t = 0,
    ) {
        this.tones = new Float32Array(size * size);
    }

    set(x: number, y: number, tone: Tone) {
        x = Math.round(x);
        y = Math.round(y);
        if (x < 0 || y < 0 || x >= this.size || y >= this.size) return;
        this.tones[y * this.size + x] =
            typeof tone === "function" ? tone(x, y) : tone;
    }

    get(x: number, y: number) {
        if (x < 0 || y < 0 || x >= this.size || y >= this.size) return 0;
        return this.tones[y * this.size + x];
    }

    rect(x: number, y: number, w: number, h: number, tone: Tone) {
        for (let j = Math.round(y); j < Math.round(y + h); j++) {
            for (let i = Math.round(x); i < Math.round(x + w); i++) {
                this.set(i, j, tone);
            }
        }
    }

    /** An outlined box: ink edge, `fill` inside. */
    box(x: number, y: number, w: number, h: number, fill: Tone = 0) {
        this.rect(x, y, w, h, 1);
        this.rect(x + 1, y + 1, w - 2, h - 2, fill);
    }

    ellipse(cx: number, cy: number, rx: number, ry: number, tone: Tone) {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
            for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
                const dx = (x - cx) / rx;
                const dy = (y - cy) / ry;
                if (dx * dx + dy * dy <= 1) this.set(x, y, tone);
            }
        }
    }

    /** An ellipse with a one pixel ink edge. */
    blob(cx: number, cy: number, rx: number, ry: number, fill: Tone) {
        this.ellipse(cx, cy, rx, ry, 1);
        this.ellipse(cx, cy, rx - 1, ry - 1, fill);
    }

    line(x0: number, y0: number, x1: number, y1: number, tone: Tone = 1) {
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        for (let i = 0; i <= steps; i++) {
            this.set(
                x0 + ((x1 - x0) * i) / steps,
                y0 + ((y1 - y0) * i) / steps,
                tone,
            );
        }
    }

    /** Joined line segments through a list of [x, y] points. */
    path(points: [number, number][], tone: Tone = 1) {
        for (let i = 1; i < points.length; i++) {
            const [x0, y0] = points[i - 1];
            const [x1, y1] = points[i];
            this.line(x0, y0, x1, y1, tone);
        }
    }

    /** A little bitmap, `#` for ink, anything else left alone. */
    glyph(rows: string[], x: number, y: number, tone: Tone = 1) {
        rows.forEach((row, j) => {
            for (let i = 0; i < row.length; i++) {
                if (row[i] === "#") this.set(x + i, y + j, tone);
            }
        });
    }
}

/** Dithers a pen's tones into RGBA pixels. Paper can be left see-through. */
export function dither(pen: Pen, target: ImageData, transparentPaper = true) {
    const { size, tones } = pen;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const index = y * size + x;
            const ink = tones[index] > threshold(x, y);
            const color = ink ? INK : PAPER;
            target.data[index * 4] = color[0];
            target.data[index * 4 + 1] = color[1];
            target.data[index * 4 + 2] = color[2];
            target.data[index * 4 + 3] = ink || !transparentPaper ? 255 : 0;
        }
    }
}

const tonesCache = new Map<string, Promise<Float32Array>>();

/**
 * Loads an image as a width×height grid of darkness (0 is white, 1 is black),
 * contrast-stretched so murky pictures still come out with some shape.
 * Remote images need CORS; Discogs covers go through `/cover` for that.
 */
export function loadTones(src: string, width: number, height: number) {
    const key = `${src}@${width}x${height}`;
    let pending = tonesCache.get(key);
    if (!pending) {
        pending = new Promise<Float32Array>((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext("2d");
                if (!context) return reject(new Error("no canvas"));
                context.drawImage(image, 0, 0, width, height);
                let data: Uint8ClampedArray;
                try {
                    data = context.getImageData(0, 0, width, height).data;
                } catch (error) {
                    return reject(error);
                }
                const tones = new Float32Array(width * height);
                let low = 1;
                let high = 0;
                for (let i = 0; i < tones.length; i++) {
                    tones[i] =
                        1 -
                        (data[i * 4] * 0.299 +
                            data[i * 4 + 1] * 0.587 +
                            data[i * 4 + 2] * 0.114) /
                            255;
                    low = Math.min(low, tones[i]);
                    high = Math.max(high, tones[i]);
                }
                const range = Math.max(high - low, 0.1);
                for (let i = 0; i < tones.length; i++) {
                    tones[i] = (tones[i] - low) / range;
                }
                resolve(tones);
            };
            image.onerror = () => reject(new Error(`couldn't load ${src}`));
            image.src = src;
        });
        // Let a failed load be retried later instead of caching the failure.
        pending.catch(() => tonesCache.delete(key));
        tonesCache.set(key, pending);
    }
    return pending;
}

/**
 * Floyd–Steinberg dithering: each pixel's rounding error is pushed onto its
 * neighbors. Much better than the ordered pattern at keeping photos
 * recognizable, at the cost of a less regular texture. Returns 1 for ink.
 */
export function diffuse(tones: Float32Array, width: number, height: number) {
    const ink = new Uint8Array(width * height);
    const error = Float32Array.from(tones);
    for (let y = 0; y < height; y++) {
        // Snake back and forth so the error doesn't streak one way.
        const reverse = y % 2 === 1;
        for (let i = 0; i < width; i++) {
            const x = reverse ? width - 1 - i : i;
            const index = y * width + x;
            ink[index] = error[index] > 0.5 ? 1 : 0;
            const miss = error[index] - ink[index];
            const ahead = reverse ? -1 : 1;
            if (x + ahead >= 0 && x + ahead < width) {
                error[index + ahead] += (miss * 7) / 16;
            }
            if (y + 1 < height) {
                const below = index + width;
                if (x - ahead >= 0 && x - ahead < width) {
                    error[below - ahead] += (miss * 3) / 16;
                }
                error[below] += (miss * 5) / 16;
                if (x + ahead >= 0 && x + ahead < width) {
                    error[below + ahead] += miss / 16;
                }
            }
        }
    }
    return ink;
}

/** Floyd–Steinberg dithers a grid of tones straight into a canvas. */
export function paintDiffused(
    context: CanvasRenderingContext2D,
    tones: Float32Array,
    width: number,
    height: number,
) {
    const pixels = context.createImageData(width, height);
    const ink = diffuse(tones, width, height);
    for (let index = 0; index < ink.length; index++) {
        const color = ink[index] ? INK : PAPER;
        pixels.data[index * 4] = color[0];
        pixels.data[index * 4 + 1] = color[1];
        pixels.data[index * 4 + 2] = color[2];
        pixels.data[index * 4 + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
}
