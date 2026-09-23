import { hash, type Pen } from "#/lib/pixels";

/**
 * Little 32×32 pixel drawings, one per project. `pen.t` is 0 for the still
 * frame and counts up in seconds while the drawing is being hovered.
 */
export type Sprite = (pen: Pen) => void;

const moving = (pen: Pen) => pen.t > 0;

/** A dithered drop shadow, drawn before the thing that casts it. */
function shadow(pen: Pen, x: number, y: number, w: number, h: number) {
    pen.rect(x + 2, y + 2, w, h, 0.3);
}

const quack: Sprite = (pen) => {
    const bob = moving(pen) ? Math.round(Math.sin(pen.t * 5) * 0.8) : 0;
    const quacking = moving(pen) && Math.sin(pen.t * 9) > 0.2;
    // Water.
    for (let x = 0; x < 32; x++) {
        const y = 27 + Math.round(Math.sin(x * 0.7 + pen.t * 4));
        pen.set(x, y, 1);
        pen.rect(x, y + 1, 1, 6, (_, yy) => 0.35 - (yy - y) * 0.05);
    }
    // Body, shaded where it sits in the water.
    pen.blob(14, 21 + bob, 10, 5.5, (_, y) => (y >= 23 + bob ? 0.3 : 0.03));
    pen.path([
        [5, 19 + bob],
        [3, 14 + bob],
        [8, 16 + bob],
    ]);
    pen.rect(4, 16 + bob, 3, 2, 1);
    pen.path([
        [9, 19 + bob],
        [12, 21 + bob],
        [17, 21 + bob],
        [19, 18 + bob],
    ]);
    // Head and neck.
    pen.blob(22, 10 + bob, 5.5, 5.5, 0.03);
    pen.ellipse(21, 15.5 + bob, 2.6, 2.6, 0.03);
    pen.rect(23, 8 + bob, 2, 2, 1);
    if (quacking) {
        pen.rect(27, 9 + bob, 4, 2, 1);
        pen.rect(27, 13 + bob, 3, 1, 1);
        pen.glyph(["#.#", "...", "#.#"], 29, 3 + bob);
    } else {
        pen.rect(27, 11 + bob, 4, 2, 1);
    }
};

const poof: Sprite = (pen) => {
    shadow(pen, 7, 5, 18, 22);
    pen.box(7, 5, 18, 22, 0.05);
    // Folded corner.
    pen.rect(21, 5, 4, 4, 0);
    pen.path([
        [21, 5],
        [21, 9],
        [25, 9],
    ]);
    pen.line(21, 5, 25, 9);
    for (const [y, end] of [
        [12, 20],
        [15, 22],
        [18, 17],
        [21, 21],
    ]) {
        pen.line(10, y, end, y, 0.7);
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
            } else if (hash(x, y, 2) < 0.35) {
                const drift = (amount - order) * 26;
                pen.set(x + drift * 0.7, y - drift, 1);
            }
        }
    }
};

const diary: Sprite = (pen) => {
    pen.rect(2, 26, 29, 3, 0.45);
    pen.line(2, 26, 30, 26);
    pen.box(3, 8, 14, 18, 0.04);
    pen.box(16, 8, 14, 18, 0.04);
    for (let row = 0; row < 4; row++) {
        const y = 12 + row * 3;
        pen.line(5, y, row === 3 ? 10 : 14, y, 0.6);
        pen.line(18, y, row === 2 ? 23 : 27, y, 0.6);
    }
    if (!moving(pen)) return;
    // A page turning over, right to left.
    const phase = (pen.t * 0.7) % 1;
    const tip = 16 + Math.cos(phase * Math.PI) * 13;
    const lift = Math.round(Math.sin(phase * Math.PI) * 4);
    const left = Math.min(16, tip);
    const width = Math.max(2, Math.abs(tip - 16) + 1);
    pen.box(left, 8 - lift, width, 18 + lift, phase < 0.5 ? 0.04 : 0.2);
};

const aretheyup: Sprite = (pen) => {
    shadow(pen, 3, 4, 26, 19);
    pen.box(3, 4, 26, 19, 0.03);
    for (let y = 7; y < 21; y += 4) {
        for (let x = 6; x < 28; x += 4) pen.set(x, y, 0.6);
    }
    pen.rect(13, 23, 6, 3, 0.5);
    pen.rect(9, 26, 14, 2, 1);
    // A heartbeat scrolling across the screen.
    const beat = [0, 0, -1, 0, 0, -6, 4, -2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const offset = Math.floor(pen.t * 16);
    const points: [number, number][] = [];
    for (let x = 5; x <= 26; x++) {
        points.push([x, 14 + beat[(x + offset + 10) % beat.length]]);
    }
    pen.path(points);
};

const nosystem: Sprite = (pen) => {
    shadow(pen, 3, 5, 26, 16);
    pen.box(3, 5, 26, 16, 0.04);
    for (const [x, y, ix, iy] of [
        [3, 5, 4, 6],
        [28, 5, 27, 6],
        [3, 20, 4, 19],
        [28, 20, 27, 19],
    ]) {
        pen.set(x, y, 0);
        pen.set(ix, iy, 1);
    }
    pen.rect(8, 20, 5, 1, 0.04);
    pen.path([
        [7, 20],
        [6, 26],
        [13, 20],
    ]);
    for (let i = 0; i < 3; i++) {
        const hop = moving(pen)
            ? Math.max(0, Math.sin(pen.t * 6 - i * 0.9)) * 3
            : 0;
        pen.ellipse(10 + i * 6, 13 - hop, 1.6, 1.6, 1);
    }
};

const stocktoys: Sprite = (pen) => {
    pen.line(3, 3, 3, 28);
    pen.line(3, 28, 30, 28);
    for (let y = 6; y < 28; y += 5) pen.set(2, y, 1);
    let last = 0;
    for (let x = 4; x <= 29; x++) {
        const y = Math.round(
            23 -
                (x - 4) * 0.5 +
                Math.sin(x * 0.9 + pen.t * 3) * 1.6 +
                Math.sin(x * 0.37 - pen.t * 2) * 1.4,
        );
        pen.rect(x, y + 1, 1, 27 - y, (_, yy) => 0.55 - (yy - y) * 0.03);
        if (x > 4) pen.line(x - 1, last, x, y);
        last = y;
    }
    pen.ellipse(29, last, 1.5, 1.5, 1);
};

const txto: Sprite = (pen) => {
    shadow(pen, 2, 4, 28, 23);
    pen.rect(2, 4, 28, 23, 1);
    pen.rect(3, 5, 26, 3, 0.2);
    for (const x of [5, 8, 11]) pen.set(x, 6, 1);
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

const moss: Sprite = (pen) => {
    const stems = [
        [9, 7, 0.4],
        [16, 12, 1.3],
        [23, 8, 2.1],
    ];
    for (const [x, height, seed] of stems) {
        const sway = moving(pen) ? Math.sin(pen.t * 2.4 + seed) * 1.6 : 0;
        const tipX = x + sway;
        const tipY = 22 - height;
        pen.line(x, 23, tipX, tipY);
        pen.ellipse(tipX - 2.5, tipY + 1, 2.5, 1.2, 1);
        pen.ellipse(tipX + 2.5, tipY + 2, 2.5, 1.2, 1);
    }
    // A fuzzy mound, denser at the bottom.
    for (let y = 20; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            const dx = (x - 16) / 15;
            const dy = (y - 31) / 10;
            const edge = 1 - (dx * dx + dy * dy);
            if (edge < -0.12) continue;
            const fuzz = hash(x, y, 5) - 0.5;
            if (edge + fuzz * 0.3 < 0) continue;
            pen.set(x, y, 0.15 + (y - 20) * 0.06 + fuzz * 0.25);
        }
    }
    if (moving(pen)) {
        for (let i = 0; i < 4; i++) {
            const rise = (pen.t * 5 + i * 7) % 20;
            pen.set(6 + i * 7 + Math.sin(rise) * 1.5, 20 - rise, 1);
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
    pen.box(4 - slide, 4, 15, 21, (x, y) => ((x + y) % 4 === 0 ? 1 : 0.08));
    shadow(pen, 13, 8, 15, 21);
    pen.box(13, 8, 15, 21, 0.04);
    const reveal = moving(pen) && Math.sin(pen.t * 3) > 0.4;
    pen.glyph(reveal ? BANG : QUESTION, 17, 15);
};

const mines: Sprite = (pen) => {
    // A block of stone with a couple of ore specks.
    pen.box(3, 16, 14, 14, (x, y) => 0.25 + hash(x, y, 3) * 0.35);
    pen.rect(4, 17, 12, 2, 0.1);
    for (const [x, y] of [
        [7, 22],
        [8, 22],
        [12, 25],
        [11, 26],
    ]) {
        pen.set(x, y, 1);
    }
    const swing = moving(pen) ? Math.max(0, Math.sin(pen.t * 5)) : 0.35;
    const turn = -0.2 - swing * 0.62;
    const [cos, sin] = [Math.cos(turn), Math.sin(turn)];
    const [gx, gy] = [27, 30];
    // Drawn upright around the grip, then turned: every pixel asks where it
    // would sit on an upright pickaxe, so the shape stays solid at any angle.
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            const lx = (x - gx) * cos + (y - gy) * sin;
            const ly = -(x - gx) * sin + (y - gy) * cos;
            const handle = Math.abs(lx) <= 0.9 && ly >= -16 && ly <= 0.5;
            const r = Math.hypot(lx, ly + 7);
            const along = Math.abs(Math.atan2(lx, -(ly + 7))) / 0.95;
            const head =
                along < 1 && r >= 9.4 && r <= 9.4 + 2.8 * (1 - along) + 0.7;
            if (handle || head) pen.set(x, y, 1);
        }
    }
    if (swing > 0.92) {
        for (let i = 0; i < 6; i++) {
            pen.set(12 + hash(i, 1, 9) * 8, 10 + hash(i, 2, 9) * 6, 1);
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
