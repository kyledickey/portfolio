import { useCallback, useEffect, useRef, useState } from "react";
import { Fuse } from "#/components/fuse";
import { PixelSprite } from "#/components/pixel-sprite";
import { external } from "#/lib/external";
import type { Project } from "#/lib/projects";
import { sprites } from "#/lib/sprites";

const TILT = [-2.5, 1.5, -1, 2.5, -2, 1, -1.5, 2, -0.5, 1.8];
const DROP = [0, 18, -6, 24, 8, -10, 16, 0, 22, -4];
// How long a card has to be held down before the wall gives out.
const FUSE = 1400;
// Room for a flung card's corners once it's spun.
const MARGIN = 90;
const CANDIDATES = 12;
// Same places cards can be dragged: a mouse, on the wide layout.
const BLOWABLE = "(hover: hover) and (min-width: 601px)";

const offsetOf = (card: HTMLElement) => ({
    x: Number.parseFloat(card.style.getPropertyValue("--dx")) || 0,
    y: Number.parseFloat(card.style.getPropertyValue("--dy")) || 0,
});

export function ProjectWall({ projects }: { projects: Project[] }) {
    const wallRef = useRef<HTMLOListElement>(null);
    const [top, setTop] = useState<string | null>(null);
    const [charging, setCharging] = useState(false);
    const [scattered, setScattered] = useState(false);
    const [flying, setFlying] = useState(false);
    const landing = useRef<number>(undefined);
    // Which card wears the fuse. Picked after load so the server and
    // browser agree, and again whenever the cards come home.
    const [fused, setFused] = useState<string | null>(null);
    const relight = useCallback(() => {
        const pick = projects[Math.floor(Math.random() * projects.length)];
        setFused(pick.name);
    }, [projects]);
    useEffect(() => relight(), [relight]);

    // Flings every card somewhere on the page, or calls them all home.
    const burst = useCallback(() => {
        const wall = wallRef.current;
        if (!wall) return;
        const home = wall.dataset.scattered === "true";
        if (!home && !matchMedia(BLOWABLE).matches) return;
        const cards = [...wall.children] as HTMLElement[];
        const page = document.documentElement;
        const width = page.clientWidth - MARGIN * 2;
        const height = page.scrollHeight - MARGIN * 2;
        // Best-candidate sampling: each card tries a handful of random
        // spots and takes the one farthest from every card already
        // landed, so they spread out evenly instead of piling up.
        const landed: { x: number; y: number }[] = [];
        for (const card of cards) {
            let x = 0;
            let y = 0;
            let spin = 0;
            if (!home) {
                const now = offsetOf(card);
                const rect = card.getBoundingClientRect();
                const left = rect.left + scrollX - now.x;
                const top = rect.top + scrollY - now.y;
                const roomX = Math.max(0, width - rect.width);
                const roomY = Math.max(0, height - rect.height);
                let best = { x: 0, y: 0 };
                let bestGap = -1;
                for (let i = 0; i < CANDIDATES; i++) {
                    const spot = {
                        x: Math.random() * roomX,
                        y: Math.random() * roomY,
                    };
                    const gap = Math.min(
                        Infinity,
                        ...landed.map((other) =>
                            Math.hypot(spot.x - other.x, spot.y - other.y),
                        ),
                    );
                    if (gap > bestGap) {
                        best = spot;
                        bestGap = gap;
                    }
                }
                landed.push(best);
                x = MARGIN + best.x - left;
                y = MARGIN + best.y - top;
                spin = (Math.random() - 0.5) * 60;
            }
            card.style.setProperty("--dx", `${x}px`);
            card.style.setProperty("--dy", `${y}px`);
            card.style.setProperty("--spin", `${spin}deg`);
            card.style.setProperty("--delay", `${Math.random() * 140}ms`);
        }
        setScattered(!home);
        if (home) relight();
        setFlying(true);
        clearTimeout(landing.current);
        landing.current = window.setTimeout(() => setFlying(false), 1300);
    }, [relight]);

    // Or just type it.
    useEffect(() => {
        let typed = "";
        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            if (target.closest("input, textarea, [contenteditable]")) return;
            typed = (typed + event.key.toLowerCase()).slice(-4);
            if (typed === "boom") burst();
        };
        addEventListener("keydown", onKey);
        return () => {
            removeEventListener("keydown", onKey);
            clearTimeout(landing.current);
        };
    }, [burst]);

    return (
        <ol
            ref={wallRef}
            className="wall"
            data-charging={charging}
            data-scattered={scattered}
            data-flying={flying}
        >
            {projects.map((project, index) => (
                <ProjectCard
                    key={project.name}
                    project={project}
                    tilt={TILT[index % TILT.length]}
                    drop={DROP[index % DROP.length]}
                    raised={top === project.name}
                    onGrab={() => setTop(project.name)}
                    fused={fused === project.name}
                    charging={charging}
                    scattered={scattered}
                    onCharge={setCharging}
                    onBurst={burst}
                />
            ))}
        </ol>
    );
}

function ProjectCard({
    project,
    tilt,
    drop,
    raised,
    onGrab,
    fused,
    charging,
    scattered,
    onCharge,
    onBurst,
}: {
    project: Project;
    tilt: number;
    drop: number;
    raised: boolean;
    onGrab: () => void;
    fused: boolean;
    charging: boolean;
    scattered: boolean;
    onCharge: (charging: boolean) => void;
    onBurst: () => void;
}) {
    const cardRef = useRef<HTMLLIElement>(null);
    const [playing, setPlaying] = useState(false);
    const [grabbed, setGrabbed] = useState(false);
    const drag = useRef<{
        startX: number;
        startY: number;
        fromX: number;
        fromY: number;
        moved: boolean;
        blew: boolean;
    } | null>(null);
    const dragged = useRef(false);
    const fuse = useRef<number>(undefined);

    const defuse = () => {
        if (fuse.current === undefined) return;
        clearTimeout(fuse.current);
        fuse.current = undefined;
        onCharge(false);
    };

    // Without a mouse to hover, play whichever card is mid-screen.
    useEffect(() => {
        const card = cardRef.current;
        if (!card || matchMedia("(hover: hover)").matches) return;
        const observer = new IntersectionObserver(
            (entries) => setPlaying(entries[0].isIntersecting),
            { rootMargin: "-35% 0px -35% 0px" },
        );
        observer.observe(card);
        return () => observer.disconnect();
    }, []);

    useEffect(() => () => clearTimeout(fuse.current), []);

    return (
        <li
            ref={cardRef}
            className="card"
            data-raised={raised}
            data-grabbed={grabbed}
            style={
                {
                    "--tilt": `${tilt}deg`,
                    "--drop": `${drop}px`,
                } as React.CSSProperties
            }
            onPointerEnter={(event) => {
                if (event.pointerType === "mouse") setPlaying(true);
            }}
            onPointerLeave={(event) => {
                if (event.pointerType === "mouse") setPlaying(false);
                // Left before it turned into a drag: forget the press.
                if (drag.current && !drag.current.moved) {
                    drag.current = null;
                    defuse();
                }
            }}
            onFocus={() => setPlaying(true)}
            onBlur={() => setPlaying(false)}
            onPointerDown={(event) => {
                // Touch keeps scrolling the page; mice can move cards around.
                if (event.pointerType !== "mouse" || event.button !== 0) return;
                const from = offsetOf(event.currentTarget);
                const state = {
                    startX: event.clientX,
                    startY: event.clientY,
                    fromX: from.x,
                    fromY: from.y,
                    moved: false,
                    blew: false,
                };
                drag.current = state;
                dragged.current = false;
                // Holding a card still, instead of dragging it, lights
                // the fuse.
                onCharge(true);
                fuse.current = window.setTimeout(() => {
                    fuse.current = undefined;
                    state.blew = true;
                    onCharge(false);
                    onBurst();
                }, FUSE);
            }}
            onPointerMove={(event) => {
                const state = drag.current;
                if (!state || state.blew) return;
                const dx = event.clientX - state.startX;
                const dy = event.clientY - state.startY;
                if (!state.moved && Math.hypot(dx, dy) < 5) return;
                if (!state.moved) {
                    // Only a real drag takes the pointer; a plain click
                    // still reaches the link.
                    state.moved = true;
                    defuse();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    onGrab();
                    setGrabbed(true);
                }
                const card = event.currentTarget;
                card.style.setProperty("--dx", `${state.fromX + dx}px`);
                card.style.setProperty("--dy", `${state.fromY + dy}px`);
            }}
            onPointerUp={() => {
                dragged.current =
                    (drag.current?.moved || drag.current?.blew) ?? false;
                drag.current = null;
                defuse();
                setGrabbed(false);
            }}
            onClickCapture={(event) => {
                // Letting go of a card shouldn't also open it.
                if (dragged.current) {
                    event.preventDefault();
                    dragged.current = false;
                }
            }}
        >
            <a
                className="card-link"
                href={project.url ?? project.source}
                {...external}
                draggable={false}
            >
                <PixelSprite
                    className="card-sprite"
                    sprite={sprites[project.sprite]}
                    playing={playing}
                />
                <span className="card-name">{project.name}</span>
            </a>
            <p className="card-line">{project.line}</p>
            {fused && (
                <Fuse burning={charging} spent={scattered} duration={FUSE} />
            )}
            {project.aside && (
                <span className="card-note" aria-hidden="true">
                    {project.aside}
                </span>
            )}
        </li>
    );
}
