import { useEffect, useRef, useState } from "react";
import { PixelSprite } from "#/components/pixel-sprite";
import { external } from "#/lib/external";
import type { Project } from "#/lib/projects";
import { sprites } from "#/lib/sprites";

// Pinned up by hand, so nothing sits quite straight.
const TILT = [-2.5, 1.5, -1, 2.5, -2, 1, -1.5, 2, -0.5, 1.8];
const DROP = [0, 18, -6, 24, 8, -10, 16, 0, 22, -4];

export function ProjectWall({ projects }: { projects: Project[] }) {
    const [top, setTop] = useState<string | null>(null);
    return (
        <ol className="wall">
            {projects.map((project, index) => (
                <ProjectCard
                    key={project.name}
                    project={project}
                    tilt={TILT[index % TILT.length]}
                    drop={DROP[index % DROP.length]}
                    raised={top === project.name}
                    onGrab={() => setTop(project.name)}
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
}: {
    project: Project;
    tilt: number;
    drop: number;
    raised: boolean;
    onGrab: () => void;
}) {
    const cardRef = useRef<HTMLLIElement>(null);
    const [playing, setPlaying] = useState(false);
    const [grabbed, setGrabbed] = useState(false);
    const offset = useRef({ x: 0, y: 0 });
    const drag = useRef<{
        startX: number;
        startY: number;
        fromX: number;
        fromY: number;
        moved: boolean;
    } | null>(null);
    const dragged = useRef(false);

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

    const place = () => {
        const { x, y } = offset.current;
        cardRef.current?.style.setProperty("--dx", `${x}px`);
        cardRef.current?.style.setProperty("--dy", `${y}px`);
    };

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
                if (drag.current && !drag.current.moved) drag.current = null;
            }}
            onFocus={() => setPlaying(true)}
            onBlur={() => setPlaying(false)}
            onPointerDown={(event) => {
                // Touch keeps scrolling the page; mice can move cards around.
                if (event.pointerType !== "mouse" || event.button !== 0) return;
                drag.current = {
                    startX: event.clientX,
                    startY: event.clientY,
                    fromX: offset.current.x,
                    fromY: offset.current.y,
                    moved: false,
                };
                dragged.current = false;
            }}
            onPointerMove={(event) => {
                const state = drag.current;
                if (!state) return;
                const dx = event.clientX - state.startX;
                const dy = event.clientY - state.startY;
                if (!state.moved && Math.hypot(dx, dy) < 5) return;
                if (!state.moved) {
                    // Only a real drag takes the pointer; a plain click
                    // still reaches the link.
                    state.moved = true;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    onGrab();
                    setGrabbed(true);
                }
                offset.current = { x: state.fromX + dx, y: state.fromY + dy };
                place();
            }}
            onPointerUp={() => {
                dragged.current = drag.current?.moved ?? false;
                drag.current = null;
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
            {project.aside && (
                <span className="card-note" aria-hidden="true">
                    {project.aside}
                </span>
            )}
        </li>
    );
}
