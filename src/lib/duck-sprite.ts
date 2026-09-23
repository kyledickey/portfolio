import { Pen } from "#/lib/pixels";

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
