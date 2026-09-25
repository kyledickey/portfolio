import { Fragment, useId } from "react";
import { CobaltPrint } from "#/components/cobalt-print";
import { CursorMaker } from "#/components/cursor-maker";
import { Films } from "#/components/films";
import { Listening } from "#/components/listening";
import { Pennant } from "#/components/pennant";
import { Pond } from "#/components/pond";
import { ProjectWall } from "#/components/project-wall";
import { Roommate } from "#/components/roommate";
import { external } from "#/lib/external";
import { projects, smallerThings } from "#/lib/projects";

const links = [
    { label: "GitHub", href: "https://github.com/kyledickey" },
    { label: "Bluesky", href: "https://bsky.app/profile/kyle.so" },
    { label: "Twitter", href: "https://twitter.com/kyledickeyy" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/kyletdickey" },
];

export function Home() {
    const mainId = useId();
    const projectsId = useId();
    const recordsId = useId();
    const filmsId = useId();
    return (
        <>
            <div className="page">
                <a className="skip-link" href={`#${mainId}`}>
                    Skip to content
                </a>
                <header className="masthead">
                    <span>kyle.so</span>
                    <nav aria-label="Elsewhere">
                        {links.map((link) => (
                            <a key={link.href} href={link.href} {...external}>
                                {link.label}
                            </a>
                        ))}
                    </nav>
                </header>
                <CobaltPrint />
                <main id={mainId}>
                    <section className="prose intro">
                        <h1 className="intro-name">Kyle Dickey</h1>
                        <p className="opening">
                            I make software in Colorado, mostly in Go and
                            TypeScript.
                        </p>
                        <p>
                            I’m an embedded intern software engineer at{" "}
                            <a href="https://www.terumobct.com/" {...external}>
                                TerumoBCT
                            </a>
                            , and I studied computer science at{" "}
                            <span className="nowrap">
                                Colorado State <Pennant />
                            </span>
                            . Outside of work I make things under my org{" "}
                            <a href="https://novmbr.org" {...external}>
                                November
                            </a>
                            , plus whatever else I get stuck on that week.
                        </p>
                    </section>

                    <section className="shelf" aria-labelledby={projectsId}>
                        <h2 id={projectsId} className="label">
                            Some things I’ve made
                        </h2>
                        <p className="secret" aria-hidden="true">
                            type boom
                        </p>
                        <ProjectWall projects={projects} />
                        <div className="prose drawer">
                            <p className="smaller">
                                Plus some smaller stuff:{" "}
                                {smallerThings.map((thing, i) => {
                                    return (
                                        <Fragment key={thing.url}>
                                            <a href={thing.url} {...external}>
                                                {thing.name}
                                            </a>{" "}
                                            {thing.desc}
                                            {i === smallerThings.length - 1
                                                ? "."
                                                : i === smallerThings.length - 2
                                                  ? ", and there's a "
                                                  : ", "}{" "}
                                        </Fragment>
                                    );
                                })}
                            </p>
                        </div>
                        <a
                            className="wall-more"
                            href="https://github.com/kyledickey"
                            {...external}
                        >
                            That’s the short list. The rest is on GitHub →
                        </a>
                    </section>

                    <section
                        className="records-section"
                        aria-labelledby={recordsId}
                    >
                        <h2 id={recordsId} className="label">
                            My records
                        </h2>
                        <Listening />
                    </section>

                    <section
                        className="films-section"
                        aria-labelledby={filmsId}
                    >
                        <h2 id={filmsId} className="label">
                            Some movies I love
                        </h2>
                        <Films />
                    </section>
                </main>
                <div className="pond-bank">
                    <CursorMaker />
                </div>
            </div>
            <Pond />
            <Roommate />
        </>
    );
}
