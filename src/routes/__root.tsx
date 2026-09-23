import {
    createRootRoute,
    HeadContent,
    Link,
    Scripts,
} from "@tanstack/react-router";
import { DuckWalk } from "#/components/duck-walk";

import {
    KEYWORDS,
    OG_IMAGE,
    SITE_DESCRIPTION,
    SITE_TITLE,
    SITE_URL,
} from "../lib/site";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {
                charSet: "utf-8",
            },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
            {
                name: "keywords",
                content: KEYWORDS.join(", "),
            },
            {
                title: SITE_TITLE,
            },
            {
                name: "description",
                content: SITE_DESCRIPTION,
            },
            {
                property: "og:title",
                content: SITE_TITLE,
            },
            {
                property: "og:description",
                content: SITE_DESCRIPTION,
            },
            {
                property: "og:url",
                content: SITE_URL,
            },
            {
                property: "og:image",
                content: OG_IMAGE,
            },
        ],
        links: [
            {
                rel: "stylesheet",
                href: appCss,
            },
        ],
    }),
    shellComponent: RootDocument,
    notFoundComponent: NotFound,
});

function NotFound() {
    return (
        <div className="page">
            <header className="masthead">
                <Link to="/">kyle.so</Link>
            </header>
            <main className="lost">
                <h1 className="label">404</h1>
                <p>
                    Nothing lives at this address. Get Quack back to the house
                    and you’ll be home.
                </p>
                <DuckWalk />
                <p className="lost-keys">← → to walk, space to jump</p>
                <Link className="lost-skip" to="/">
                    or skip the walk →
                </Link>
            </main>
        </div>
    );
}

function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <HeadContent />
                <script
                    src="https://cdn.visitors.now/v.js"
                    data-token="20bf3839-46d9-4bf3-a206-ba1e8110b95c"
                ></script>
                <link
                    rel="apple-touch-icon"
                    sizes="180x180"
                    href="/apple-touch-icon.png"
                />
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
                <link
                    rel="icon"
                    type="image/png"
                    sizes="32x32"
                    href="/favicon-32x32.png"
                />
                <link
                    rel="icon"
                    type="image/png"
                    sizes="16x16"
                    href="/favicon-16x16.png"
                />
                <link rel="manifest" href="/site.webmanifest" />
            </head>
            <body className="antialiased selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
                {children}
                <Scripts />
            </body>
        </html>
    );
}
