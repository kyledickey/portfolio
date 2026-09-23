import { useEffect, useRef } from "react";
import { pondBank } from "#/components/pond";
import { INK, PAPER, threshold } from "#/lib/pixels";
import { type Box, findPath, inside, type Point } from "#/lib/roommate-path";
import {
    drawRoommate,
    ROOMMATE,
    type RoommatePose,
} from "#/lib/roommate-sprite";

/** CSS pixels per sprite pixel, same as the TV and the turntable. */
const SCALE = 2;
const SIZE = ROOMMATE * SCALE;
/** How far his body reaches either side of his feet, and up from them. */
const HALF = 20;
const TALL = 58;
/** Seconds someone has to be looking at the page before he wanders in. */
const SHOWS_UP = 30;
/** CSS pixels a second. He's in no hurry. */
const PACE = 36;
/** Things he walks round rather than over. Words he'll walk right across. */
const IN_THE_WAY = [
    ".print-stage",
    ".turntable",
    ".sleeve-stage",
    ".television",
    ".tape-pile",
    ".card",
];

type Spot = {
    name: "records" | "tv" | "pond" | "wall" | "intro";
    /** How often he picks it. */
    weight: number;
    sitting: boolean;
    facing: 1 | -1;
    /** Spots he pokes around rather than settles into. */
    roams?: boolean;
    /**
     * Where his feet go, in page coordinates, and how far either way he can
     * amble. Null if it isn't on the page.
     */
    seat: () => (Point & { roam?: number }) | null;
};

const onPage = (element: Element | null): Box | null => {
    const rect = element?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return {
        left: rect.left + scrollX,
        right: rect.right + scrollX,
        top: rect.top + scrollY,
        bottom: rect.bottom + scrollY,
    };
};
const find = (selector: string) => onPage(document.querySelector(selector));

/** Everywhere his feet can't go without his body ending up on something. */
function obstacles(): Box[] {
    const boxes: Box[] = [];
    for (const selector of IN_THE_WAY) {
        for (const element of document.querySelectorAll(selector)) {
            const box = onPage(element);
            if (!box) continue;
            boxes.push({
                left: box.left - HALF,
                right: box.right + HALF,
                top: box.top,
                bottom: box.bottom + TALL,
            });
        }
    }
    // The pond: no walking on water. He comes down onto the bank.
    const pond = find(".pond");
    if (pond) {
        const bank = pondBank(pond.right - pond.left);
        boxes.push({
            left: pond.left,
            right: pond.left + bank.left,
            top: pond.top + 12,
            bottom: pond.bottom,
        });
        boxes.push({
            left: pond.left,
            right: pond.right,
            top: pond.top + bank.water,
            bottom: pond.bottom,
        });
    }
    return boxes;
}

const SPOTS: Spot[] = [
    {
        // Next to the turntable, listening.
        name: "records",
        weight: 3,
        sitting: false,
        facing: 1,
        seat: () => {
            const deck = find(".turntable canvas");
            return deck && { x: deck.left - 32, y: deck.bottom };
        },
    },
    {
        // On the floor by the TV.
        name: "tv",
        weight: 3,
        sitting: true,
        facing: 1,
        seat: () => {
            const stand = find(".films-stand");
            return stand && { x: stand.left - 24, y: stand.bottom };
        },
    },
    {
        // Down on the bank, next to the ram.
        name: "pond",
        weight: 3,
        sitting: true,
        facing: -1,
        seat: () => {
            const pond = find(".pond");
            if (!pond) return null;
            const { seat } = pondBank(pond.right - pond.left);
            return { x: pond.left + seat.x, y: pond.top + seat.y };
        },
    },
    {
        // Up on top of the project cards, having a look around. Off to the
        // left, clear of the heading over the middle.
        name: "wall",
        weight: 2,
        sitting: false,
        facing: 1,
        roams: true,
        seat: () => {
            const wall = find(".wall");
            const card = find(".wall .card");
            if (!wall || !card) return null;
            const left = wall.left + 30;
            const right = Math.max(left, (wall.left + wall.right) / 2 - 110);
            return {
                x: (left + right) / 2,
                y: card.top - 1,
                roam: (right - left) / 2,
            };
        },
    },
    {
        // Off to the side of the intro, where there's room.
        name: "intro",
        weight: 1,
        sitting: false,
        facing: -1,
        roams: true,
        seat: () => {
            const intro = find(".intro");
            const page = find(".page");
            if (!intro || !page || page.right - intro.right < 110) return null;
            return {
                x: (intro.right + page.right) / 2,
                y: intro.top + 110,
                roam: (page.right - intro.right) / 2 - 40,
            };
        },
    },
];

/** Dithers him, leaving anything that isn't him see-through. */
function paint(tones: Float32Array, target: ImageData) {
    for (let index = 0; index < tones.length; index++) {
        const x = index % ROOMMATE;
        const y = Math.floor(index / ROOMMATE);
        const tone = tones[index];
        const color = tone > threshold(x, y) ? INK : PAPER;
        target.data[index * 4] = color[0];
        target.data[index * 4 + 1] = color[1];
        target.data[index * 4 + 2] = color[2];
        target.data[index * 4 + 3] = tone >= 0 ? 255 : 0;
    }
}

type Plan =
    | { kind: "away" }
    | {
          kind: "walk";
          to: Spot;
          path: Point[];
          /** What was in the way when he set off, to notice anything new. */
          known: Set<string>;
      }
    | {
          kind: "hang";
          spot: Spot;
          since: number;
          until: number;
          /** Where he's ambled to, from the spot's middle. */
          offset: number;
          goal: number;
          nextAmble: number;
          facing: 1 | -1;
      };

const key = (box: Box) =>
    [box.left, box.top, box.right, box.bottom].map(Math.round).join();

const between = (low: number, high: number) =>
    low + Math.random() * (high - low);

function pick(spots: Spot[], not?: Spot): Spot | undefined {
    const choices = spots.filter((spot) => spot !== not && spot.seat());
    let roll = Math.random() * choices.reduce((sum, s) => sum + s.weight, 0);
    for (const spot of choices) {
        roll -= spot.weight;
        if (roll <= 0) return spot;
    }
    return choices[0];
}

/**
 * A guy who hangs around. He isn't here at first. Stick around for a bit
 * and he wanders in, then drifts between the turntable, the TV, the pond
 * and up to the projects, walking round things but straight over words.
 * Click him and he hops.
 */
export function Roommate() {
    const rootRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // When he was last clicked, in seconds on the page clock.
    const poked = useRef(-10);
    const clock = useRef(0);

    useEffect(() => {
        const root = rootRef.current;
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!root || !canvas || !context) return;
        const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
        const pixels = context.createImageData(ROOMMATE, ROOMMATE);

        let plan: Plan = { kind: "away" };
        const at: Point = { x: 0, y: 0 };
        let walked = 0;
        let facing: 1 | -1 = 1;
        let greetAt = -10;
        let greeted = false;
        // When he last walked into something someone put in his way.
        let bumpAt = -10;
        let drawn = "";
        let lastPoke = poked.current;
        let frame = 0;
        let last = 0;
        let t = 0;

        const settle = (spot: Spot) => {
            const stay = spot.roams ? between(18, 32) : between(30, 70);
            plan = {
                kind: "hang",
                spot,
                since: t,
                until: t + stay,
                offset: 0,
                goal: 0,
                nextAmble: t + between(3, 6),
                facing: spot.facing,
            };
        };

        const head = (spot: Spot | undefined) => {
            const seat = spot?.seat();
            if (!spot || !seat) return;
            const boxes = obstacles();
            const path = findPath(
                at,
                seat,
                boxes,
                document.documentElement.scrollWidth,
                document.documentElement.scrollHeight,
            );
            plan = {
                kind: "walk",
                to: spot,
                path,
                known: new Set(boxes.map(key)),
            };
        };

        const arrive = () => {
            // Whichever of his spots is nearest to where you're reading.
            const middle = scrollY + innerHeight / 2;
            const nearest = SPOTS.map((spot) => ({ spot, seat: spot.seat() }))
                .filter((s) => s.seat !== null)
                .sort(
                    (a, b) =>
                        Math.abs((a.seat as Point).y - middle) -
                        Math.abs((b.seat as Point).y - middle),
                )[0];
            if (!nearest) return;
            const seat = nearest.seat as Point;
            root.hidden = false;
            if (still) {
                at.x = seat.x;
                at.y = seat.y;
                greeted = true;
                settle(nearest.spot);
                return;
            }
            // In from whichever side of the window is closer, at a height
            // you can see.
            const fromLeft = seat.x - scrollX < innerWidth / 2;
            at.x = scrollX + (fromLeft ? -SIZE / 2 : innerWidth + SIZE / 2);
            at.y = Math.min(
                scrollY + innerHeight - 30,
                Math.max(scrollY + innerHeight * 0.45, seat.y),
            );
            head(nearest.spot);
        };

        const pose = (): { pose: RoommatePose; facing: 1 | -1 } => {
            const pose: RoommatePose = {
                sitting: false,
                step: -1,
                view: "front",
                mood: "chill",
                nod: 0,
                snooze: -1,
            };
            if (plan.kind === "hang") pose.sitting = plan.spot.sitting;
            if (t - poked.current < 1.6 || t - greetAt < 1.6) {
                // Oh, hey.
                pose.mood = "happy";
                return { pose, facing: 1 };
            }
            if (t - bumpAt < 1.4) {
                // Huh. Who put that there?
                pose.mood = t - bumpAt < 0.7 ? "surprised" : "chill";
                return { pose, facing };
            }
            if (plan.kind === "walk") {
                const [next] = plan.path;
                const dx = next ? next.x - at.x : 0;
                const dy = next ? next.y - at.y : 0;
                pose.step = Math.floor(walked / 6) % 4;
                if (Math.abs(dx) >= Math.abs(dy)) {
                    pose.view = "side";
                    facing = dx < 0 ? -1 : 1;
                } else {
                    pose.view = dy < 0 ? "back" : "front";
                }
                return { pose, facing };
            }
            if (plan.kind !== "hang") return { pose, facing };
            const { spot } = plan;
            const there = t - plan.since;
            // Every so often he glances out at you.
            const glance = Math.sin(there * 0.4 + 1) > 0.93;
            pose.view = glance ? "front" : "side";
            facing = plan.facing;
            if (spot.name === "records") {
                if (document.querySelector(".turntable[data-spinning]")) {
                    pose.mood = Math.sin(there * 0.5) > 0.7 ? "happy" : "vibe";
                    pose.nod = (t * 1.8) % 1 < 0.35 ? 1 : 0;
                }
            } else if (spot.name === "tv") {
                if (!document.querySelector(".tv-glass")) {
                    // Nothing on. He drifts off.
                    if (there > 8) {
                        pose.view = "front";
                        pose.mood = "sleepy";
                        pose.nod = 1;
                        pose.snooze = Math.round(there * 10) / 10;
                    }
                } else if (Math.sin(there * 0.7) > 0.9) {
                    pose.mood = "happy";
                }
            } else if (spot.name === "pond") {
                if (glance) pose.mood = "happy";
            } else if (plan.goal !== plan.offset) {
                pose.step = Math.floor(walked / 6) % 4;
                pose.view = "side";
            }
            if (still) {
                pose.nod = 0;
                pose.snooze = -1;
            }
            return { pose, facing };
        };

        const place = () => {
            const { pose: current, facing: flip } = pose();
            const key = JSON.stringify(current) + flip;
            if (key !== drawn) {
                drawn = key;
                paint(drawRoommate(current).tones, pixels);
                context.putImageData(pixels, 0, 0);
                canvas.style.transform = flip < 0 ? "scaleX(-1)" : "";
            }
            // A couple of little hops when he's happy to see you.
            const since = Math.min(t - poked.current, t - greetAt);
            const hop =
                !still && since < 0.9
                    ? Math.abs(Math.sin((since / 0.45) * Math.PI)) * 10
                    : 0;
            // Snapped to his own pixels, so he stays crisp.
            const x = Math.round((at.x - SIZE / 2) / SCALE) * SCALE;
            const y = Math.round((at.y - SIZE - hop) / SCALE) * SCALE;
            root.style.transform = `translate(${x}px, ${y}px)`;
        };

        const step = (dt: number) => {
            if (plan.kind === "walk") {
                if (t - poked.current < 1.6 || t - greetAt < 1.6) return;
                // Say hi the first time he's properly on screen.
                const inView =
                    at.x - scrollX > SIZE && at.x - scrollX < innerWidth - SIZE;
                if (!greeted && inView) {
                    greeted = true;
                    greetAt = t;
                    return;
                }
                if (t - bumpAt < 1.4) return;
                const [next] = plan.path;
                if (!next) {
                    settle(plan.to);
                    return;
                }
                const gap = Math.hypot(next.x - at.x, next.y - at.y);
                const move = Math.min(gap, PACE * dt);
                const ahead =
                    gap > 0
                        ? {
                              x:
                                  at.x +
                                  ((next.x - at.x) / gap) * Math.min(gap, 8),
                              y:
                                  at.y +
                                  ((next.y - at.y) / gap) * Math.min(gap, 8),
                          }
                        : at;
                // Someone's dragged a card into his way: he walks into it,
                // stops, and finds a way round.
                const known = plan.known;
                const blocking = obstacles().some(
                    (box) =>
                        !known.has(key(box)) &&
                        inside(box, ahead) &&
                        !inside(box, at),
                );
                if (blocking) {
                    bumpAt = t;
                    head(plan.to);
                    return;
                }
                if (gap > 0) {
                    at.x += ((next.x - at.x) / gap) * move;
                    at.y += ((next.y - at.y) / gap) * move;
                    walked += move;
                }
                if (gap - move < 0.5) plan.path.shift();
                return;
            }
            if (plan.kind !== "hang") return;
            if (poked.current !== lastPoke) {
                // Woken up, if he'd dozed off.
                lastPoke = poked.current;
                plan.since = t;
            }
            const seat = plan.spot.seat();
            if (!seat) {
                head(pick(SPOTS));
                return;
            }
            if (plan.spot.roams && !still) {
                // Poking around: amble a little way, stop, look about.
                const reach = Math.max(0, seat.roam ?? 0);
                if (t > plan.nextAmble) {
                    plan.goal = between(-reach, reach);
                    plan.nextAmble = t + between(4, 9);
                }
                const gap = plan.goal - plan.offset;
                const move = Math.min(Math.abs(gap), PACE * 0.8 * dt);
                if (move > 0) {
                    plan.offset += Math.sign(gap) * move;
                    plan.facing = gap < 0 ? -1 : 1;
                    walked += move;
                }
                if (Math.abs(plan.goal - plan.offset) < 0.5) {
                    plan.offset = plan.goal;
                }
            }
            at.x = seat.x + plan.offset;
            at.y = seat.y;
            if (!still && t > plan.until) head(pick(SPOTS, plan.spot));
        };

        const tick = (time: number) => {
            const dt = last ? Math.min(0.1, (time - last) / 1000) : 0;
            last = time;
            t += dt;
            clock.current = t;
            step(dt);
            place();
            frame = requestAnimationFrame(tick);
        };

        // Only count time someone's actually looking at the page.
        let seen = 0;
        const timer = window.setInterval(() => {
            if (document.visibilityState !== "visible") return;
            seen += 1;
            if (seen < SHOWS_UP) return;
            window.clearInterval(timer);
            arrive();
            if (plan.kind !== "away") frame = requestAnimationFrame(tick);
        }, 1000);

        return () => {
            window.clearInterval(timer);
            cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <div ref={rootRef} className="roommate" aria-hidden="true" hidden>
            <canvas ref={canvasRef} width={ROOMMATE} height={ROOMMATE} />
            <div
                className="roommate-hit"
                onPointerDown={() => {
                    if (clock.current - poked.current > 1.6) {
                        poked.current = clock.current;
                    }
                }}
            />
        </div>
    );
}
