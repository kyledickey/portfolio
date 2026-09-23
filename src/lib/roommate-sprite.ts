import { Pen } from "#/lib/pixels";

export const ROOMMATE = 32;

export type Mood = "chill" | "happy" | "vibe" | "sleepy" | "surprised";

export type RoommatePose = {
    sitting: boolean;
    /** Walk frame 0–3, or -1 standing still. */
    step: number;
    /** "side" is three-quarters, turned toward +x. */
    view: "front" | "side" | "back";
    mood: Mood;
    /** Drops him a pixel, for nodding along. */
    nod: number;
    /** Seconds into a nap, or -1 awake. */
    snooze: number;
};

/** Tones below zero are left see-through; everything drawn is solid. */
export const NOTHING = -1;

const Z = ["###", "..#", ".#.", "#..", "###"];

/**
 * The guy who hangs around. Not anything in particular: a bean with stubby
 * legs, little nub arms, a curl on top, and a face somewhere on the front.
 * Feet at the bottom middle of a 32×32 pen.
 */
export function drawRoommate(pose: RoommatePose) {
    const { sitting, step, view, mood, nod, snooze } = pose;
    const pen = new Pen(ROOMMATE);
    pen.tones.fill(NOTHING);
    const cx = 16;
    const bob = step === 1 || step === 3 ? -1 : 0;
    const side = view === "side";
    const back = view === "back";

    // Legs, drawn first so the body sits on top of them.
    if (sitting) {
        // Stuck out in front.
        for (const x of [cx - 4, cx + 4]) pen.ellipse(x, 29.5, 2.5, 1.6, 1);
    } else {
        const swing = side ? (step === 0 ? 2 : step === 2 ? -2 : 0) : 0;
        const legs = side ? [cx - 1 - swing, cx + 1 + swing] : [cx - 3, cx + 3];
        legs.forEach((x, i) => {
            const lift = !side && step >= 0 && step === i * 2 ? 1 : 0;
            pen.rect(x, 25 + bob, 2, 6 - lift - bob, 1);
            // Feet point the way he's facing, or out a little.
            const toe = side ? 1 : i ? 1 : -1;
            pen.rect(toe > 0 ? x : x - 1, 30 - lift, 3, 2, 1);
        });
    }

    // The bean: round, a little fuller at the bottom, squashed a touch
    // when he sits.
    const cy = (sitting ? 19 : 16) + bob + nod;
    const rx = sitting ? 10 : 9;
    const ry = sitting ? 8.5 : 10;
    const inside = (x: number, y: number) => {
        const dy = (y - cy) / ry;
        const dx = (x - cx) / (rx * (1 + Math.max(0, dy) * 0.08));
        return dx * dx + dy * dy <= 1;
    };
    for (let y = Math.floor(cy - ry) - 1; y <= cy + ry + 1; y++) {
        for (let x = cx - rx - 2; x <= cx + rx + 2; x++) {
            if (!inside(x, y)) continue;
            const edge =
                !inside(x - 1, y) ||
                !inside(x + 1, y) ||
                !inside(x, y - 1) ||
                !inside(x, y + 1);
            pen.set(x, y, edge ? 1 : 0);
        }
    }

    // Nub arms at his sides.
    const armY = cy + 3;
    if (side) {
        pen.path([
            [cx - 4, armY - 3],
            [cx - 5, armY - 1],
            [cx - 5, armY + 1],
            [cx - 3, armY + 2],
        ]);
    } else {
        pen.blob(cx - rx - 0.5, armY, 1.6, 2.6, 0);
        pen.blob(cx + rx + 0.5, armY, 1.6, 2.6, 0);
    }

    // A curl on top.
    const top = Math.ceil(cy - ry);
    const curl = side ? -1 : 0;
    pen.path([
        [cx + curl, top],
        [cx + curl, top - 2],
        [cx + 2 + curl, top - 4],
        [cx + 4 + curl, top - 3],
    ]);

    if (!back) {
        // The face, turned toward where he's going.
        const fx = cx + (side ? 2 : 0);
        const ey = cy - 3;
        const eyes = side ? [fx - 3, fx + 3] : [fx - 4, fx + 3];
        for (const x of eyes) {
            if (mood === "happy") {
                pen.set(x - 1, ey + 1, 1);
                pen.set(x, ey, 1);
                pen.set(x + 1, ey, 1);
                pen.set(x + 2, ey + 1, 1);
            } else if (mood === "vibe" || mood === "sleepy") {
                pen.rect(x - 1, ey + 1, 4, 1, 1);
            } else if (mood === "surprised") {
                pen.rect(x, ey - 1, 2, 3, 1);
            } else {
                // Chill: heavy lids.
                pen.rect(x - 1, ey, 4, 1, 1);
                pen.rect(x, ey + 1, 2, 1, 1);
            }
        }
        const my = ey + 4;
        if (mood === "surprised") {
            pen.rect(fx - 1, my, 2, 2, 1);
        } else if (mood === "happy" || mood === "vibe") {
            pen.set(fx - 2, my, 1);
            pen.rect(fx - 1, my + 1, 3, 1, 1);
            pen.set(fx + 2, my, 1);
        } else if (mood === "chill") {
            pen.rect(fx - 1, my + 1, 2, 1, 1);
            pen.set(fx + 1, my, 1);
        } else {
            pen.set(fx, my + 1, 1);
        }
    }

    // Z's drifting up out of a nap.
    if (snooze >= 0) {
        for (let k = 0; k < 2; k++) {
            const age = (snooze * 0.35 + k * 0.5) % 1;
            const x = cx + 6 + age * 4 + k * 3;
            const y = top - 4 - age * 6;
            if (y >= 0) pen.glyph(Z, x, y);
        }
    }
    return pen;
}
