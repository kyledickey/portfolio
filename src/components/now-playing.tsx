import { useEffect, useState } from "react";
import { Turntable } from "#/components/turntable";
import { external } from "#/lib/external";

export type NowPlayingTrack = {
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
    song: string | null;
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
