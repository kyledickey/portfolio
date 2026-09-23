import { useEffect, useRef, useState } from "react";
import { Television } from "#/components/television";
import { external } from "#/lib/external";
import { FILMS } from "#/lib/films";
import { hash, INK, PAPER, threshold } from "#/lib/pixels";

export function Films() {
    const [playing, setPlaying] = useState<number | null>(0);
    // The pile, bottom to top. Whatever comes out of the VCR goes on top.
    const [pile, setPile] = useState([3, 2, 1]);
    const film = playing === null ? null : FILMS[playing];

    const swap = (next: number | null) => {
        setPile((current) => [
            ...current.filter((index) => index !== next),
            ...(playing === null ? [] : [playing]),
        ]);
        setPlaying(next);
    };

    return (
        <div className="films">
            <div className="films-stand">
                <Television film={film} />
                <TapePile pile={pile} playing={playing} onPlay={swap} />
            </div>
            <div className="films-text" aria-live="polite">
                <span className="label">{film ? "In the VCR" : "The VCR"}</span>
                {film ? (
                    <>
                        <a
                            className="listen-title"
                            href={`https://letterboxd.com/film/${film.slug}/`}
                            {...external}
                        >
                            {film.title}
                        </a>
                        <span className="listen-detail">{film.year}</span>
                        <button
                            type="button"
                            className="listen-lift"
                            onClick={() => swap(null)}
                        >
                            eject
                        </button>
                    </>
                ) : (
                    <span className="listen-artist">
                        Nothing in. Grab a tape off the pile.
                    </span>
                )}
                <a
                    className="films-more"
                    href="https://letterboxd.com/kyledickey/"
                    {...external}
                >
                    more on Letterboxd →
                </a>
            </div>
        </div>
    );
}

const NUDGE = [-8, 10, -2, 6];
const TILT = [-1.5, 1, -0.8, 0.5];
/** Pixels between one tape and the next one up. */
const SLOT = 40;

function TapePile({
    pile,
    playing,
    onPlay,
}: {
    pile: number[];
    playing: number | null;
    onPlay: (index: number) => void;
}) {
    // Where each tape last sat, so the one in the VCR leaves from its spot.
    const lastSlot = useRef<number[]>([]);
    const previous = useRef(playing);
    const returning = previous.current !== playing ? previous.current : null;
    useEffect(() => {
        previous.current = playing;
    }, [playing]);

    return (
        <ol className="tape-pile" style={{ height: SLOT * FILMS.length }}>
            {FILMS.map((film, index) => {
                const out = index === playing;
                const slot = out
                    ? (lastSlot.current[index] ?? 0)
                    : pile.indexOf(index);
                lastSlot.current[index] = slot;
                return (
                    <li
                        key={film.slug}
                        className="tape"
                        data-state={
                            out ? "out" : index === returning ? "back" : "in"
                        }
                        style={
                            {
                                bottom: slot * SLOT,
                                zIndex: slot + 1,
                                "--nudge": `${NUDGE[index]}px`,
                                "--tilt": `${TILT[index]}deg`,
                            } as React.CSSProperties
                        }
                    >
                        <button
                            type="button"
                            aria-label={`Put ${film.title} in the VCR`}
                            tabIndex={out ? -1 : undefined}
                            onClick={() => onPlay(index)}
                        >
                            <Cassette seed={index} />
                            <span className="tape-label">
                                <span className="tape-title">{film.spine}</span>
                                <span className="tape-year">{film.year}</span>
                            </span>
                        </button>
                    </li>
                );
            })}
        </ol>
    );
}

// Print pixels; the cassette is shown at twice this size.
const TAPE_W = 132;
const TAPE_H = 18;

function Cassette({ seed }: { seed: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const context = canvasRef.current?.getContext("2d");
        if (!context) return;
        const pixels = context.createImageData(TAPE_W, TAPE_H);
        for (let y = 0; y < TAPE_H; y++) {
            for (let x = 0; x < TAPE_W; x++) {
                const edge =
                    x === 0 || y === 0 || x === TAPE_W - 1 || y === TAPE_H - 1;
                // Solid plastic with a dotted glint along the top edge.
                let tone = y === 2 && x > 2 && x < TAPE_W - 3 ? 0.4 : 1;
                // Grip ridges.
                if (x >= 4 && x <= 11 && x % 2 === 0 && y > 3 && y < 14) {
                    tone = 0;
                }
                // The record tab: a little window with the tab inside it.
                if (x >= 119 && x <= 126 && y >= 6 && y <= 11) {
                    const inside = x >= 121 && x <= 124 && y >= 8 && y <= 9;
                    tone = inside ? 1 : 0;
                }
                // A scuff or two.
                if (tone === 1 && y > 3 && hash(x, y, seed) < 0.015) tone = 0.3;
                const ink = edge || tone > threshold(x, y);
                const index = (y * TAPE_W + x) * 4;
                const color = ink ? INK : PAPER;
                pixels.data[index] = color[0];
                pixels.data[index + 1] = color[1];
                pixels.data[index + 2] = color[2];
                pixels.data[index + 3] = 255;
            }
        }
        context.putImageData(pixels, 0, 0);
    }, [seed]);
    return (
        <canvas
            ref={canvasRef}
            className="tape-shell"
            width={TAPE_W}
            height={TAPE_H}
        />
    );
}
