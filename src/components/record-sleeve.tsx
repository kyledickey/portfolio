import { useEffect, useRef, useState } from "react";
import { INK, loadTones, PAPER, paintDiffused, threshold } from "#/lib/pixels";

const COLLECTION_URL = "https://api.kyle.so/vinyl/collection";
/** Cover pixels; shown at twice this size. */
const COVER = 120;
/** The record, in pixels; also shown at twice this size. */
const DISC = 112;
const LABEL = 18;
const SLIDE_MS = 280;

type Release = {
    basic_information: {
        title: string;
        cover_image: string;
        artists: { name: string }[];
        formats: { text?: string }[];
    };
    date_added: string;
    instance_id: number;
};

type Album = {
    id: number;
    title: string;
    artist: string;
    pressing: string;
    added: Date;
    cover: string;
};

function toAlbum(release: Release): Album {
    const info = release.basic_information;
    return {
        id: release.instance_id,
        title: info.title.trim(),
        // Discogs numbers artists who share a name, like "Clairo (2)".
        artist: (info.artists[0]?.name ?? "Unknown").replace(/ \(\d+\)$/, ""),
        pressing: info.formats[0]?.text ?? "",
        added: new Date(release.date_added),
        cover: `/cover?src=${encodeURIComponent(info.cover_image)}`,
    };
}

export function RecordSleeve({
    onPlay,
}: {
    onPlay: (album: { title: string; artist: string; cover: string }) => void;
}) {
    const [records, setRecords] = useState<Album[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [current, setCurrent] = useState(0);
    const [shown, setShown] = useState(0);

    useEffect(() => {
        let cancelled = false;
        fetch(COLLECTION_URL)
            .then((response) => response.json() as Promise<Release[]>)
            .then((releases) => {
                if (cancelled) return;
                setRecords(
                    releases
                        .map(toAlbum)
                        .sort((a, b) => b.added.getTime() - a.added.getTime()),
                );
            })
            .catch(() => !cancelled && setFailed(true));
        return () => {
            cancelled = true;
        };
    }, []);

    // Let the record slide home before the sleeve changes.
    useEffect(() => {
        if (current === shown) return;
        const timer = window.setTimeout(() => setShown(current), SLIDE_MS);
        return () => window.clearTimeout(timer);
    }, [current, shown]);

    if (failed) return null;
    const count = records?.length ?? 0;
    const go = (index: number) => count && setCurrent((index + count) % count);
    const record = records?.[shown];

    return (
        <div className="records">
            <div className="listen-visual">
                <div className="sleeve-stage" data-out={current === shown}>
                    <Disc cover={record?.cover} />
                    <button
                        type="button"
                        className="sleeve"
                        aria-label={
                            record
                                ? `Put ${record.title} by ${record.artist} on the turntable`
                                : "Put this record on the turntable"
                        }
                        onClick={() => record && onPlay(record)}
                    >
                        <Cover src={record?.cover} />
                    </button>
                </div>
            </div>
            <div className="records-controls">
                <button type="button" onClick={() => go(current - 1)}>
                    ← back
                </button>
                <button type="button" onClick={() => go(current + 1)}>
                    next →
                </button>
                <button
                    type="button"
                    onClick={() => go(Math.floor(Math.random() * count))}
                >
                    random
                </button>
                <button
                    type="button"
                    className="records-play"
                    onClick={() => record && onPlay(record)}
                >
                    play it
                </button>
                <span className="records-count">
                    {records ? `${shown + 1} / ${count}` : ""}
                </span>
            </div>
            <div className="listen-text" aria-live="polite">
                <span className="label">From my shelf</span>
                {record ? (
                    <>
                        <span className="listen-title">{record.title}</span>
                        <span className="listen-artist">{record.artist}</span>
                        {record.pressing && (
                            <span className="listen-detail">
                                {record.pressing}
                            </span>
                        )}
                    </>
                ) : (
                    <span className="listen-artist">Pulling one out…</span>
                )}
            </div>
        </div>
    );
}

function Cover({ src }: { src?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const context = canvasRef.current?.getContext("2d");
        if (!context || !src) return;
        let cancelled = false;
        loadTones(src, COVER, COVER).then(
            (tones) =>
                !cancelled && paintDiffused(context, tones, COVER, COVER),
            () => {},
        );
        return () => {
            cancelled = true;
        };
    }, [src]);
    return (
        <>
            {src && <img src={src} alt="" />}
            <canvas ref={canvasRef} width={COVER} height={COVER} />
        </>
    );
}

function Disc({ cover }: { cover?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const context = canvasRef.current?.getContext("2d");
        if (!context) return;
        let cancelled = false;
        const draw = (label: Float32Array | null) => {
            const pixels = context.createImageData(DISC, DISC);
            const center = DISC / 2 - 0.5;
            for (let y = 0; y < DISC; y++) {
                for (let x = 0; x < DISC; x++) {
                    const dx = x - center;
                    const dy = y - center;
                    const r = Math.hypot(dx, dy);
                    if (r > DISC / 2) continue;
                    let tone: number;
                    if (r < 1.5) tone = 0;
                    else if (r <= LABEL) {
                        const size = LABEL * 2;
                        const lx = Math.floor(
                            ((dx / LABEL + 1) / 2) * (size - 1),
                        );
                        const ly = Math.floor(
                            ((dy / LABEL + 1) / 2) * (size - 1),
                        );
                        tone = label ? label[ly * size + lx] : 0.1;
                    } else if (r < LABEL + 1.5) tone = 0;
                    else {
                        tone = r % 3 < 1 ? 0.72 : 0.95;
                        const sheen = Math.abs(
                            Math.sin(Math.atan2(dy, dx) - 0.7),
                        );
                        if (sheen < 0.2 && r < DISC / 2 - 2) tone -= 0.4;
                    }
                    const index = (y * DISC + x) * 4;
                    const color = tone > threshold(x, y) ? INK : PAPER;
                    pixels.data[index] = color[0];
                    pixels.data[index + 1] = color[1];
                    pixels.data[index + 2] = color[2];
                    pixels.data[index + 3] = 255;
                }
            }
            context.putImageData(pixels, 0, 0);
        };
        draw(null);
        if (cover) {
            loadTones(cover, LABEL * 2, LABEL * 2).then(
                (tones) => !cancelled && draw(tones),
                () => {},
            );
        }
        return () => {
            cancelled = true;
        };
    }, [cover]);
    return (
        <canvas ref={canvasRef} className="disc" width={DISC} height={DISC} />
    );
}
