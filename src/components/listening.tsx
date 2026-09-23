import { useEffect, useRef, useState } from "react";
import { NowPlaying, type PickedRecord } from "#/components/now-playing";
import { RecordSleeve } from "#/components/record-sleeve";

type Song = { name: string; url: string };

/**
 * Finds 30-second previews for an album through Apple's public search API.
 * Discogs knows my records but has no audio, so this is where sound comes
 * from.
 */
async function findSongs(artist: string, album: string): Promise<Song[]> {
    const search = await fetch(
        `https://itunes.apple.com/search?${new URLSearchParams({
            term: `${artist} ${album}`,
            entity: "album",
            limit: "1",
        })}`,
    ).then((response) => response.json());
    const id = search.results?.[0]?.collectionId;
    if (!id) return [];
    const lookup = await fetch(
        `https://itunes.apple.com/lookup?id=${id}&entity=song`,
    ).then((response) => response.json());
    return (lookup.results ?? [])
        .filter(
            (item: { previewUrl?: string }) => item.previewUrl !== undefined,
        )
        .map((item: { trackName: string; previewUrl: string }) => ({
            name: item.trackName,
            url: item.previewUrl,
        }));
}

export function Listening() {
    const [picked, setPicked] = useState<PickedRecord | null>(null);
    const audio = useRef<HTMLAudioElement | null>(null);
    // Bumped on every pick, so a slow lookup can't start the wrong record.
    const pick = useRef(0);

    const stop = () => {
        pick.current++;
        audio.current?.pause();
    };
    useEffect(
        () => () => {
            pick.current++;
            audio.current?.pause();
        },
        [],
    );

    const play = (album: { title: string; artist: string; cover: string }) => {
        stop();
        const id = pick.current;
        const player = audio.current ?? new Audio();
        audio.current = player;
        player.volume = 0.7;
        setPicked({ ...album, song: null, status: "Finding it…" });

        findSongs(album.artist, album.title)
            .then((songs) => {
                if (id !== pick.current) return;
                if (songs.length === 0) {
                    setPicked({
                        ...album,
                        song: null,
                        status: "No preview for this one, sorry.",
                    });
                    return;
                }
                const playSong = (index: number) => {
                    if (id !== pick.current) return;
                    const song = songs[index % songs.length];
                    player.src = song.url;
                    player.onended = () => playSong(index + 1);
                    player.play().catch(() => {
                        if (id === pick.current) {
                            setPicked({
                                ...album,
                                song: null,
                                status: "Your browser blocked the sound.",
                            });
                        }
                    });
                    setPicked({ ...album, song: song.name, status: null });
                };
                playSong(0);
            })
            .catch(() => {
                if (id === pick.current) {
                    setPicked({
                        ...album,
                        song: null,
                        status: "Couldn’t find a preview.",
                    });
                }
            });
    };

    return (
        <div className="listening">
            <NowPlaying
                picked={picked}
                onLift={() => {
                    stop();
                    setPicked(null);
                }}
            />
            <RecordSleeve onPlay={play} />
        </div>
    );
}
