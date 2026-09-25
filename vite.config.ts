import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import {
    KEYWORDS,
    OG_IMAGE,
    SITE_DESCRIPTION,
    SITE_TITLE,
    SITE_URL,
} from "./src/lib/site";

function siteHead(): Plugin {
    const meta = (
        key: "name" | "property",
        value: string,
        content: string,
    ) => ({
        tag: "meta",
        attrs: { [key]: value, content },
        injectTo: "head" as const,
    });
    return {
        name: "site-head",
        transformIndexHtml: () => [
            { tag: "title", children: SITE_TITLE, injectTo: "head" },
            meta("name", "keywords", KEYWORDS.join(", ")),
            meta("name", "description", SITE_DESCRIPTION),
            meta("property", "og:title", SITE_TITLE),
            meta("property", "og:description", SITE_DESCRIPTION),
            meta("property", "og:url", SITE_URL),
            meta("property", "og:image", OG_IMAGE),
        ],
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const goServer = `http://localhost:${env.PORT || 8080}`;

    return {
        plugins: [
            tsconfigPaths({ projects: ["./tsconfig.json"] }),
            tailwindcss(),
            viteReact(),
            siteHead(),
        ],
        server: {
            port: 3000,
            proxy: {
                "/cover": goServer,
                "/api": { target: goServer, ws: true },
            },
        },
    };
});
