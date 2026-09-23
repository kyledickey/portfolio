import { useEffect, useRef } from "react";

const PX = 3;
// Wick pixels from where it meets the card up to the lit tip.
const WICK = [
    [1, 9],
    [1, 8],
    [2, 7],
    [2, 6],
    [3, 5],
    [4, 5],
    [5, 4],
    [5, 3],
    [6, 2],
] as const;
const [TIP_X, TIP_Y] = WICK[WICK.length - 1];
const FLARE = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
    [-2, -2],
    [2, -2],
    [2, 1],
] as const;

/** A little wick on one card. While a card is held it burns down. */
export function Fuse({
    burning,
    spent,
    duration,
}: {
    burning: boolean;
    spent: boolean;
    duration: number;
}) {
    const wickRefs = useRef<(SVGRectElement | null)[]>([]);
    const sparkRef = useRef<SVGGElement>(null);

    useEffect(() => {
        const spark = sparkRef.current;
        if (!burning || !spark) return;
        const path = [...WICK].reverse();
        const step = duration / (path.length - 1);
        // The spark hops down the wick a pixel at a time, eating it.
        const animations = [
            spark.animate(
                path.map(([x, y]) => ({
                    transform: `translate(${x - TIP_X}px, ${y - TIP_Y}px)`,
                    easing: "steps(1, end)",
                })),
                { duration, fill: "forwards" },
            ),
            ...path.slice(0, -1).map((_, i) =>
                wickRefs.current[WICK.length - 1 - i]?.animate(
                    [{ opacity: 1 }, { opacity: 0 }],
                    {
                        duration: 1,
                        delay: step * (i + 1),
                        fill: "forwards",
                    },
                ),
            ),
        ];
        return () => {
            for (const animation of animations) animation?.cancel();
        };
    }, [burning, duration]);

    return (
        <svg
            className="fuse"
            data-burning={burning}
            width={9 * PX}
            height={10 * PX}
            viewBox="0 0 9 10"
            aria-hidden="true"
        >
            {(spent ? WICK.slice(0, 1) : WICK).map(([x, y], i) => (
                <rect
                    key={`${x}-${y}`}
                    ref={(rect) => {
                        wickRefs.current[i] = rect;
                    }}
                    x={x}
                    y={y}
                    width={1}
                    height={1}
                />
            ))}
            {!spent && (
                <g ref={sparkRef} className="fuse-spark">
                    <rect x={TIP_X} y={TIP_Y} width={1} height={1} />
                    <g className="fuse-flare">
                        {FLARE.map(([x, y]) => (
                            <rect
                                key={`${x}-${y}`}
                                x={TIP_X + x}
                                y={TIP_Y + y}
                                width={1}
                                height={1}
                            />
                        ))}
                    </g>
                </g>
            )}
        </svg>
    );
}
