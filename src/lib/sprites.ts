import { hash, type Pen, type Tone } from "#/lib/pixels";

/**
 * Little 32×32 pixel drawings, one per project. `pen.t` is 0 for the still
 * frame and counts up in seconds while the drawing is being hovered.
 *
 * Tones are kept to a few that dither cleanly: 0 (paper), 0.25 (a sparse dot
 * grid), 0.5 (a checkerboard) and 1 (ink). Anything in between comes out as
 * scattered specks.
 */
export type Sprite = (pen: Pen) => void;

const moving = (pen: Pen) => pen.t > 0;

/** A checkered drop shadow, drawn before the thing that casts it. */
function shadow(pen: Pen, x: number, y: number, w: number, h: number) {
    pen.rect(x + 3, y + 2, w - 2, h, 0.5);
    pen.rect(x + 2, y + 3, w, h - 2, 0.5);
}

/** A box with its corner pixels knocked off, so it reads as rounded. */
function card(
    pen: Pen,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: Tone = 0,
) {
    pen.rect(x + 1, y, w - 2, h, 1);
    pen.rect(x, y + 1, w, h - 2, 1);
    pen.rect(x + 1, y + 1, w - 2, h - 2, fill);
}

const DOT = [".##.", "####", "####", ".##."];

const quack: Sprite = (pen) => {
    const bob = moving(pen) ? Math.round(Math.sin(pen.t * 5) * 0.8) : 0;
    const quacking = moving(pen) && Math.sin(pen.t * 9) > 0.2;
    // Body, with a tail that comes to a point.
    pen.blob(15, 21 + bob, 10, 5.5, 0);
    for (let y = 14; y < 20; y++) pen.rect(5, y + bob, y - 13, 1, 0);
    pen.line(4, 13 + bob, 4, 20 + bob);
    pen.line(4, 13 + bob, 8, 17 + bob);
    pen.path([
        [10, 19 + bob],
        [12, 21 + bob],
        [17, 21 + bob],
        [19, 19 + bob],
    ]);
    // Head and neck.
    pen.blob(22, 10 + bob, 5.5, 5.5, 0);
    pen.ellipse(21.5, 15.5 + bob, 2.6, 2.6, 0);
    pen.rect(23, 8 + bob, 2, 2, 1);
    if (quacking) {
        pen.rect(27, 9 + bob, 4, 2, 1);
        pen.rect(27, 12 + bob, 3, 2, 1);
        pen.line(29, 6 + bob, 31, 4 + bob);
        pen.line(28, 4 + bob, 28, 2 + bob);
    } else {
        pen.rect(27, 11 + bob, 4, 2, 1);
    }
    // Water in front, so the duck sits in it rather than on it.
    for (let x = 0; x < 32; x++) {
        const y = 25 + Math.round(Math.sin(x * 0.6 + pen.t * 4) * 0.8);
        pen.rect(x, y, 1, 32 - y, 0);
        pen.set(x, y, 1);
        if ((x + Math.floor(pen.t * 6)) % 8 < 3) pen.set(x, 29, 1);
    }
};

const poof: Sprite = (pen) => {
    shadow(pen, 7, 5, 18, 22);
    pen.box(7, 5, 18, 22, 0);
    // Folded corner.
    pen.rect(20, 5, 5, 5, 0);
    pen.line(20, 5, 24, 9);
    pen.path([
        [20, 5],
        [20, 9],
        [24, 9],
    ]);
    pen.line(10, 12, 16, 12);
    for (const [y, end] of [
        [15, 21],
        [18, 20],
        [21, 17],
    ]) {
        pen.line(10, y, end, y);
    }
    if (!moving(pen)) return;
    // Read once, gone: the note breaks up into ink that drifts off.
    const amount = (1 - Math.cos(pen.t * 1.4)) / 2;
    const before = pen.tones.slice();
    pen.tones.fill(0);
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            const tone = before[y * 32 + x];
            if (tone <= 0) continue;
            const order = hash(x, y, 1) * 0.5 + ((31 - x + y) / 62) * 0.5;
            if (amount <= order) {
                pen.set(x, y, tone);
            } else if (hash(x, y, 2) < 0.3) {
                const drift = (amount - order) * 26;
                pen.set(x + drift * 0.7, y - drift, 1);
            }
        }
    }
};

const diary: Sprite = (pen) => {
    // The cover, peeking out under the pages.
    pen.path([
        [2, 24],
        [2, 27],
        [30, 27],
        [30, 24],
    ]);
    pen.box(3, 7, 14, 19, 0);
    pen.box(16, 7, 14, 19, 0);
    for (let row = 0; row < 4; row++) {
        const y = 11 + row * 3;
        pen.line(5, y, row === 3 ? 10 : 14, y);
        pen.line(18, y, row === 2 ? 23 : 27, y);
    }
    if (!moving(pen)) return;
    // A page turning over, right to left, hinged on the spine and lifting
    // at its free edge.
    const phase = (pen.t * 0.7) % 1;
    const tip = 16 + Math.round(Math.cos(phase * Math.PI) * 13);
    const lift = Math.sin(phase * Math.PI) * 4;
    const span = Math.abs(tip - 16);
    const side = tip < 16 ? -1 : 1;
    for (let i = 0; i <= span; i++) {
        const rise = Math.round((lift * i) / Math.max(span, 1));
        const x = 16 + side * i;
        pen.rect(x, 7 - rise, 1, 19, i === span ? 1 : 0);
        pen.set(x, 7 - rise, 1);
        pen.set(x, 25 - rise, 1);
    }
};

const aretheyup: Sprite = (pen) => {
    shadow(pen, 3, 4, 26, 19);
    card(pen, 3, 4, 26, 19);
    for (let y = 8; y < 21; y += 4) {
        for (let x = 7; x < 27; x += 4) pen.set(x, y, 1);
    }
    pen.rect(14, 23, 4, 3, 1);
    pen.rect(10, 26, 12, 2, 1);
    // A heartbeat scrolling across the screen.
    const beat = [0, 0, -1, 0, 0, -6, 4, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const offset = Math.floor(pen.t * 16);
    const points: [number, number][] = [];
    for (let x = 5; x <= 26; x++) {
        points.push([x, 14 + beat[(x + offset + 10) % beat.length]]);
    }
    // Clear a lane so the line doesn't tangle with the grid behind it.
    for (const [x, y] of points)
        pen.rect(x, Math.min(y, 14) - 1, 1, 3 + Math.abs(y - 14), 0);
    pen.path(points);
};

const nosystem: Sprite = (pen) => {
    shadow(pen, 3, 5, 26, 16);
    card(pen, 3, 5, 26, 16);
    // The tail: straight down, then back up at 45°.
    pen.rect(9, 20, 4, 1, 0);
    pen.path([
        [8, 20],
        [8, 25],
        [13, 20],
    ]);
    pen.rect(9, 21, 1, 3, 0);
    for (let i = 0; i < 3; i++) {
        const hop = moving(pen)
            ? Math.round(Math.max(0, Math.sin(pen.t * 6 - i * 0.9)) * 3)
            : 0;
        pen.glyph(DOT, 7 + i * 7, 11 - hop);
    }
};

const stocktoys: Sprite = (pen) => {
    pen.line(3, 3, 3, 28);
    pen.line(3, 28, 30, 28);
    for (let y = 7; y < 28; y += 5) pen.set(2, y, 1);
    let last = 0;
    for (let x = 4; x <= 28; x++) {
        const y = Math.round(
            23 -
                (x - 4) * 0.5 +
                Math.sin(x * 0.9 + pen.t * 3) * 1.6 +
                Math.sin(x * 0.37 - pen.t * 2) * 1.4,
        );
        // A gap under the line keeps it crisp against the fill.
        pen.rect(x, y + 2, 1, 26 - y, 0.25);
        if (x > 4) pen.line(x - 1, last, x, y);
        last = y;
    }
    pen.glyph([".#.", "###", ".#."], 27, last - 1);
};

const txto: Sprite = (pen) => {
    shadow(pen, 2, 4, 28, 23);
    card(pen, 2, 4, 28, 23, 1);
    pen.rect(3, 5, 26, 3, 0);
    for (const x of [5, 7, 9]) pen.set(x, 6, 1);
    const prompt = ["#..", ".#.", "#.."];
    // Text in paper on an ink screen. Each line types out in turn.
    const typed = moving(pen) ? (pen.t * 14) % 44 : 44;
    const lines = [
        [11, 15],
        [16, 11],
        [21, 0],
    ];
    let budget = typed;
    for (const [y, length] of lines) {
        pen.glyph(prompt, 5, y - 1, 0);
        const shown = Math.max(0, Math.min(length, budget));
        if (shown > 0) pen.line(10, y, 9 + shown, y, 0);
        budget -= length;
        if (budget < 0 || length === 0) {
            const blink = !moving(pen) || Math.floor(pen.t * 3) % 2 === 0;
            if (blink) pen.rect(10 + shown, y - 1, 2, 3, 0);
            break;
        }
    }
};

const LEAF_LEFT = ["##..", "####", ".###"];
const LEAF_RIGHT = ["..##", "####", "###."];

const moss: Sprite = (pen) => {
    // A soft mound with a tufted top edge, getting denser toward the ground.
    const top = (x: number) => {
        const dx = (x - 15.5) / 17;
        return Math.round(31 - 11 * Math.sqrt(1 - dx * dx) + hash(x, 0, 5));
    };
    const stems = [
        [9, 6, 0.4],
        [16, 10, 1.3],
        [23, 7, 2.1],
    ];
    for (const [x, height, seed] of stems) {
        const sway = moving(pen)
            ? Math.round(Math.sin(pen.t * 2.4 + seed) * 1.6)
            : 0;
        const tipX = x + sway;
        const tipY = top(x) - height;
        pen.line(x, top(x), tipX, tipY);
        pen.glyph(LEAF_LEFT, tipX - 4, tipY - 1);
        pen.glyph(LEAF_RIGHT, tipX + 1, tipY);
    }
    for (let x = 0; x < 32; x++) {
        const y = top(x);
        pen.set(x, y, 1);
        if (hash(x, 1, 5) < 0.25) pen.set(x, y - 1, 1);
        pen.rect(x, y + 1, 1, 31 - y, (_, yy) => (yy - y < 4 ? 0.25 : 0.5));
    }
    if (moving(pen)) {
        for (let i = 0; i < 4; i++) {
            const rise = (pen.t * 5 + i * 7) % 18;
            pen.set(6 + i * 7 + Math.sin(rise) * 1.5, 19 - rise, 1);
        }
    }
};

const QUESTION = [
    ".####.",
    "##..##",
    "....##",
    "...##.",
    "..##..",
    "......",
    "..##..",
];
const BANG = [
    "..##..",
    "..##..",
    "..##..",
    "..##..",
    "..##..",
    "......",
    "..##..",
];

const alias: Sprite = (pen) => {
    const slide = moving(pen) ? Math.round((1 - Math.cos(pen.t * 3)) * 2) : 0;
    shadow(pen, 4 - slide, 4, 15, 21);
    card(pen, 4 - slide, 4, 15, 21, (x, y) => ((x + y) % 4 === 0 ? 1 : 0));
    shadow(pen, 13, 8, 15, 21);
    card(pen, 13, 8, 15, 21);
    const reveal = moving(pen) && Math.sin(pen.t * 3) > 0.4;
    pen.glyph(reveal ? BANG : QUESTION, 17, 15);
};

const PICKAXE = [
    "......####........",
    "....#####.........",
    "...####...........",
    "..####............",
    ".#####............",
    ".######...........",
    "###...##..........",
    "##.....##.........",
    "##......##........",
    "#........##.......",
    "..........##......",
    "...........##.....",
    "............##....",
    ".............##...",
    "..............##..",
    "...............##.",
    "................##",
    ".................#",
];

const mines: Sprite = (pen) => {
    // A block of stone: blocky patches of grey, and a few chunks of ore.
    pen.box(3, 16, 14, 14, (x, y) =>
        hash(Math.floor(x / 3), Math.floor(y / 2), 3) < 0.4 ? 0.5 : 0,
    );
    for (const [x, y] of [
        [6, 21],
        [11, 24],
        [7, 26],
    ]) {
        pen.rect(x, y, 2, 2, 1);
    }
    // Pixels only come out clean at right angles and diagonals, so rather
    // than turning, the pickaxe stays at 45° and chops along its handle.
    const lift = moving(pen) ? Math.round(1 + Math.cos(pen.t * 7)) : 1;
    const [px, py] = [11 + lift * 2, 7 - lift * 2];
    pen.glyph(PICKAXE, px, py);
    if (lift === 0 && moving(pen)) {
        for (const [x, y] of [
            [9, 13],
            [7, 15],
            [14, 12],
            [8, 11],
        ]) {
            pen.set(x, y, 1);
        }
    }
};

export const sprites = {
    quack,
    poof,
    diary,
    aretheyup,
    nosystem,
    stocktoys,
    txto,
    moss,
    alias,
    mines,
} satisfies Record<string, Sprite>;

export type SpriteName = keyof typeof sprites;
