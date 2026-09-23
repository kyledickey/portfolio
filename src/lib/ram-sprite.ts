import { hash, Pen } from "#/lib/pixels";

const inside = (x: number, y: number, circles: number[][]) =>
    circles.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r);

/**
 * A ram standing side-on, facing left: a fluffy white body, a dark face,
 * and a big curled horn. `grazing` drops its head to the grass; `step`
 * lifts two feet.
 */
export function drawRam(grazing: boolean, step = 0) {
    const pen = new Pen(32);
    const drop = grazing ? 5 : 0;
    // Legs, under the body.
    for (const [x, lift] of [
        [13, step],
        [17, 0],
        [23, step],
        [27, 0],
    ]) {
        pen.rect(x, 17, 2, 7 - lift, 1);
    }
    // The fleece: a cloud of overlapping circles, outlined, with a few curls.
    const fleece = [
        [13, 12, 4],
        [17, 9, 4.5],
        [22, 8.5, 4.5],
        [27, 11, 4],
        [20, 13, 6],
        [14, 15, 3.5],
        [26, 15, 3.5],
    ];
    for (let y = 2; y < 22; y++) {
        for (let x = 8; x < 32; x++) {
            if (!inside(x, y, fleece)) continue;
            const edge =
                !inside(x - 1, y, fleece) ||
                !inside(x + 1, y, fleece) ||
                !inside(x, y - 1, fleece) ||
                !inside(x, y + 1, fleece);
            pen.set(x, y, edge ? 1 : hash(x, y, 31) < 0.07 ? 1 : 0);
        }
    }
    // A dark face with a paper eye, set a little apart from the fleece.
    const hy = 11 + drop;
    pen.ellipse(8, hy, 5, 4.2, 0);
    pen.ellipse(7.5, hy, 4, 3.2, 1);
    pen.ellipse(4, hy + 2.2, 2.8, 2.2, 1);
    pen.set(6, hy - 1, 0);
    // The horn: a thin spiral, curling back from the brow and down around
    // the ear, with a paper edge so it stands off the dark face.
    const spiral = (tone: number, grow: number) => {
        for (let a = 0; a < Math.PI * 2.2; a += 0.02) {
            const r = 4.4 - a * 0.52 + grow;
            if (r < 0.5) break;
            const angle = a - Math.PI * 0.65;
            pen.set(
                10.5 + Math.cos(angle) * r,
                hy + 0.5 + Math.sin(angle) * r,
                tone,
            );
        }
    };
    spiral(0, 1);
    spiral(0, -1);
    spiral(1, 0);
    spiral(1, 0.45);
    // A stubby tail.
    pen.rect(31, 10, 1, 3, 1);
    return pen;
}
