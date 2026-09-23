import { createFileRoute } from "@tanstack/react-router";

// Only album art hosts, so this can't be used as an open proxy.
const ALLOWED = new Set(["i.discogs.com", "i.scdn.co"]);

/**
 * Passes album covers through on this origin. Discogs doesn't send CORS
 * headers, and without them a canvas can't read the pixels to dither them.
 */
export const Route = createFileRoute("/cover")({
    server: {
        handlers: {
            GET: async ({ request }) => {
                let target: URL;
                try {
                    target = new URL(
                        new URL(request.url).searchParams.get("src") ?? "",
                    );
                } catch {
                    return new Response("Bad cover", { status: 400 });
                }
                if (
                    target.protocol !== "https:" ||
                    !ALLOWED.has(target.hostname)
                ) {
                    return new Response("Not a cover", { status: 400 });
                }
                const upstream = await fetch(target, {
                    headers: { "user-agent": "kyle.so" },
                });
                const type = upstream.headers.get("content-type") ?? "";
                if (!upstream.ok || !type.startsWith("image/")) {
                    return new Response("Cover unavailable", { status: 502 });
                }
                return new Response(upstream.body, {
                    headers: {
                        "content-type": type,
                        "cache-control": "public, max-age=604800, immutable",
                    },
                });
            },
        },
    },
});
