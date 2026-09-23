import { useEffect, useRef, useState } from "react";
import { external } from "#/lib/external";
import { INK, loadTones, PAPER, threshold } from "#/lib/pixels";

type NowPlayingTrack = {
    artist: string;
    title: string;
    url: string;
    isPlaying: boolean;
    imageUrl: string;
};

const WEBSOCKET_URL =
    "wss://api.kyle.so/spotify/current-track/ws?user=mrdickeyy";

/** A record a visitor pulled off my shelf and put on the turntable. */
export type PickedRecord = {
    title: string;
    artist: string;
    cover: string;
    /** The preview that's playing, if one is. */
    song: string | null;
    /** Anything worth saying instead, like "Finding it…". */
    status: string | null;
};

export function NowPlaying({
    picked,
    onLift,
}: {
    picked: PickedRecord | null;
    onLift: () => void;
}) {
    const [live, setLive] = useState<NowPlayingTrack | null>(null);

    useEffect(() => {
        let socket: WebSocket | null = null;
        let reconnectTimer: number | null = null;
        let disposed = false;

        const connect = () => {
            socket = new WebSocket(WEBSOCKET_URL);
            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data) as unknown;
                    setLive(
                        isNowPlayingTrack(data) && data.isPlaying ? data : null,
                    );
                } catch {
                    setLive(null);
                }
            };
            socket.onerror = () => {};
            socket.onclose = () => {
                if (disposed) return;
                reconnectTimer = window.setTimeout(connect, 3500);
            };
        };

        connect();
        return () => {
            disposed = true;
            if (reconnectTimer) window.clearTimeout(reconnectTimer);
            socket?.close();
        };
    }, []);

    // A visitor's pick takes the platter until they lift it off.
    const track: NowPlayingTrack | null = picked
        ? {
              title: picked.title,
              artist: picked.artist,
              imageUrl: picked.cover,
              url: "",
              isPlaying: true,
          }
        : live;

    return (
        <section className="now-playing" aria-live="polite">
            <div className="listen-visual">
                <Turntable track={track} />
            </div>
            <div className="listen-text">
                <span className="label">
                    {picked
                        ? "You put this on"
                        : live
                          ? "I’m listening to"
                          : "The turntable"}
                </span>
                {track ? (
                    <>
                        {picked ? (
                            <span className="listen-title">{track.title}</span>
                        ) : (
                            <a
                                className="listen-title"
                                href={track.url}
                                {...external}
                            >
                                {track.title}
                            </a>
                        )}
                        <span className="listen-artist">{track.artist}</span>
                        {picked && (
                            <span className="listen-detail">
                                {picked.song
                                    ? `♪ ${picked.song} (preview)`
                                    : picked.status}
                            </span>
                        )}
                    </>
                ) : (
                    <span className="listen-artist">
                        Nothing on right now. Pick a record from the shelf.
                    </span>
                )}
                {picked && (
                    <button
                        type="button"
                        className="listen-lift"
                        onClick={onLift}
                    >
                        {live ? "back to what I’m playing" : "lift the needle"}
                    </button>
                )}
            </div>
        </section>
    );
}

// Print pixels; the canvas is shown at twice this size.
const WIDTH = 132;
const HEIGHT = 156;
/** Open sky above the plinth for the notes to float up into. */
const HEADROOM = 56;
const CENTER = { x: 50, y: HEADROOM + 50 };
const RECORD = 44;
const LABEL = 16;
const COVER = 40;
const ARM = { x: 116, y: HEADROOM + 12 };

const NOTES = [
    [
        "...#...",
        "...##..",
        "...#.#.",
        "...#..#",
        "...#...",
        "...#...",
        ".###...",
        "####...",
        ".##....",
    ],
    [
        "...######",
        "...######",
        "...#....#",
        "...#....#",
        "...#....#",
        ".###..###",
        "####.####",
        ".##...##.",
    ],
];

/**
 * A record player in pixels. The album cover is the label, the arm drops
 * when something's on, notes float up, and the record can be grabbed and
 * scratched.
 */
function Turntable({ track }: { track: NowPlayingTrack | null }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cover, setCover] = useState<Float32Array | null>(null);
    const spinning = track !== null;
    const angle = useRef(0);
    const grab = useRef<number | null>(null);
    const redraw = useRef(() => {});

    const imageUrl = track?.imageUrl;
    useEffect(() => {
        setCover(null);
        if (!imageUrl) return;
        let cancelled = false;
        loadTones(imageUrl, COVER, COVER).then(
            (tones) => !cancelled && setCover(tones),
            () => {},
        );
        return () => {
            cancelled = true;
        };
    }, [imageUrl]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        const pixels = context.createImageData(WIDTH, HEIGHT);
        // -1 marks see-through pixels above the plinth.
        const tone = new Float32Array(WIDTH * HEIGHT);
        const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
        const set = (x: number, y: number, value: number) => {
            x = Math.round(x);
            y = Math.round(y);
            if (x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT) {
                tone[y * WIDTH + x] = value;
            }
        };
        const line = (x0: number, y0: number, x1: number, y1: number) => {
            const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
            for (let i = 0; i <= steps; i++) {
                set(
                    x0 + ((x1 - x0) * i) / steps,
                    y0 + ((y1 - y0) * i) / steps,
                    1,
                );
            }
        };

        const draw = (t: number) => {
            for (let y = 0; y < HEIGHT; y++) {
                for (let x = 0; x < WIDTH; x++) {
                    const inside = y >= HEADROOM;
                    const edge =
                        x === 0 ||
                        x === WIDTH - 1 ||
                        y === HEADROOM ||
                        y === HEIGHT - 1;
                    tone[y * WIDTH + x] = !inside ? -1 : edge ? 1 : 0;
                }
            }
            const turn = angle.current;
            const [cos, sin] = [Math.cos(-turn), Math.sin(-turn)];
            for (let y = CENTER.y - RECORD; y <= CENTER.y + RECORD; y++) {
                for (let x = CENTER.x - RECORD; x <= CENTER.x + RECORD; x++) {
                    const dx = x - CENTER.x;
                    const dy = y - CENTER.y;
                    const r = Math.hypot(dx, dy);
                    if (r > RECORD) continue;
                    // Where this pixel sits on the record itself, unturned.
                    const u = dx * cos - dy * sin;
                    const v = dx * sin + dy * cos;
                    let value: number;
                    if (r < 1.5) {
                        value = 0;
                    } else if (r <= LABEL) {
                        const cx = Math.floor(
                            ((u / LABEL) * 0.5 + 0.5) * COVER,
                        );
                        const cy = Math.floor(
                            ((v / LABEL) * 0.5 + 0.5) * COVER,
                        );
                        value = cover
                            ? cover[
                                  Math.min(COVER - 1, Math.max(0, cy)) * COVER +
                                      Math.min(COVER - 1, Math.max(0, cx))
                              ]
                            : 0.1;
                        if (r > LABEL - 1) value = 1;
                    } else if (r < LABEL + 1.6) {
                        // A thin paper ring keeps the label apart from the vinyl.
                        value = 0;
                    } else if (r > RECORD - 1.2) {
                        value = 1;
                    } else {
                        // Swirled colored vinyl, turning with the record, so
                        // the spin reads from across the room.
                        const swirl = Math.sin(Math.atan2(v, u) * 2 + r * 0.16);
                        value = 0.74 + swirl * 0.16;
                        if (r % 3 < 0.8) value += 0.14;
                        // A band of light that stays put while it turns.
                        const sheen = Math.abs(
                            Math.sin(Math.atan2(dy, dx) - 0.8),
                        );
                        if (sheen < 0.18) value -= 0.35;
                    }
                    tone[y * WIDTH + x] = value;
                }
            }
            // The tonearm: parked off to the side, or down in the groove.
            const tip = spinning
                ? { x: CENTER.x + 30, y: CENTER.y + 18 }
                : { x: ARM.x - 4, y: ARM.y + 62 };
            for (let j = -4; j <= 4; j++) {
                for (let i = -4; i <= 4; i++) {
                    const d = i * i + j * j;
                    if (d <= 16) set(ARM.x + i, ARM.y + j, d <= 4 ? 0 : 1);
                }
            }
            const elbow = { x: ARM.x - 2, y: tip.y - 14 };
            line(ARM.x, ARM.y + 4, elbow.x, elbow.y);
            line(ARM.x + 1, ARM.y + 4, elbow.x + 1, elbow.y);
            line(elbow.x, elbow.y, tip.x, tip.y);
            line(elbow.x + 1, elbow.y, tip.x + 1, tip.y);
            for (let i = -3; i <= 3; i++) {
                line(tip.x + i - 2, tip.y + 2, tip.x + i + 2, tip.y + 6);
            }
            // Notes lifting off the top of the record, dissolving as they go.
            if (spinning && t > 0) {
                const from = CENTER.y - RECORD + 6;
                for (let n = 0; n < 4; n++) {
                    const age = (t * 0.3 + n / 4) % 1;
                    const glyph = NOTES[n % 2];
                    const nx =
                        CENTER.x - 34 + n * 18 + Math.sin(age * 5 + n * 2) * 6;
                    const ny = from - 18 - age * (from - 6);
                    const strength = age < 0.6 ? 1 : 1 - (age - 0.6) / 0.4;
                    // Drawn at double size so they read as notes.
                    glyph.forEach((row, j) => {
                        for (let i = 0; i < row.length; i++) {
                            if (row[i] !== "#") continue;
                            for (let k = 0; k < 4; k++) {
                                set(
                                    nx + i * 2 + (k & 1),
                                    ny + j * 2 + (k >> 1),
                                    strength,
                                );
                            }
                        }
                    });
                }
            }
            for (let y = 0; y < HEIGHT; y++) {
                for (let x = 0; x < WIDTH; x++) {
                    const index = y * WIDTH + x;
                    const value = tone[index];
                    const ink = value > threshold(x, y);
                    const color = ink ? INK : PAPER;
                    pixels.data[index * 4] = color[0];
                    pixels.data[index * 4 + 1] = color[1];
                    pixels.data[index * 4 + 2] = color[2];
                    pixels.data[index * 4 + 3] = ink || value >= 0 ? 255 : 0;
                }
            }
            context.putImageData(pixels, 0, 0);
        };

        draw(0);
        // Without motion it only redraws when someone scratches it.
        redraw.current = still ? () => draw(0) : () => {};
        if (still) return;
        let frame = 0;
        let last = performance.now();
        const start = last;
        const tick = (time: number) => {
            if (time - last >= 1000 / 20) {
                // 33⅓ rpm, unless someone has a hand on it.
                if (spinning && grab.current === null) {
                    angle.current += ((time - last) / 1000) * 3.49;
                }
                last = time;
                draw((time - start) / 1000);
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [cover, spinning]);

    const pointerAngle = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
        const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
        return Math.atan2(y - CENTER.y, x - CENTER.x);
    };

    return (
        <span className="turntable">
            <canvas
                ref={canvasRef}
                width={WIDTH}
                height={HEIGHT}
                role="img"
                aria-label={
                    track
                        ? `A record player spinning ${track.title} by ${track.artist}`
                        : "A record player with nothing on it"
                }
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    grab.current = pointerAngle(event);
                }}
                onPointerMove={(event) => {
                    if (grab.current === null) return;
                    // Scratch: the record follows your hand.
                    const now = pointerAngle(event);
                    angle.current += now - grab.current;
                    grab.current = now;
                    redraw.current();
                }}
                onPointerUp={() => {
                    grab.current = null;
                }}
            />
        </span>
    );
}

function isNowPlayingTrack(value: unknown): value is NowPlayingTrack {
    if (!value || typeof value !== "object") return false;
    const track = value as Partial<NowPlayingTrack> & { error?: unknown };
    if (typeof track.error === "string") return false;
    return (
        typeof track.artist === "string" &&
        typeof track.title === "string" &&
        typeof track.url === "string" &&
        typeof track.imageUrl === "string" &&
        typeof track.isPlaying === "boolean"
    );
}
