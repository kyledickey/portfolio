import { createFileRoute } from "@tanstack/react-router";
import { useId } from "react";
import { ExperienceCitation } from "#/components/citation";
import { Footer } from "#/components/layout/footer";
import { Navbar } from "#/components/layout/navbar";
import { NoiseBackground } from "#/components/noise-background";
import { NowPlaying } from "#/components/now-playing";
import { InlineProject } from "#/components/project.tsx";

export const Route = createFileRoute("/")({
    component: RouteComponent,
});

const PROJECTS = [
    {
        name: "No System",
        description:
            "A debloated, privacy-focused LLM interface for power users.",
        link: "https://nosystem.chat",
    },
    {
        name: "Are they up?",
        description:
            "A fast and open source real-time service disruption monitoring tool.",
        github: "https://github.com/novembersoftware/aretheyup",
        link: "https://aretheyup.com",
    },
    {
        name: "Diary",
        description:
            "A zero-knowledge journaling platform with E2E encryption and real-time synchronization across devices.",
        github: "https://github.com/kyledickey/diary",
        link: "https://diary.kyle.so",
    },
    {
        name: "Poof",
        description: "A self-destructing text sharing service.",
        github: "https://github.com/kyledickey/poof",
        link: "https://poof.sh",
    },
    {
        name: "Quack",
        description:
            "A Discord bot aimed at making servers of all sizes safer for everyone, with the best moderation tools.",
        github: "https://github.com/quackdiscord/bot",
        link: "https://quack.bot",
    },
    {
        name: "stock.toys",
        description:
            "A simple way to research stocks without getting buried in noise",
        link: "https://stock.toys",
    },
    {
        name: "Alias",
        description:
            "A digitized version of a game played by my family on holidays.",
        github: "https://github.com/kyledickey/alias",
        link: "https://alias.kyle.so",
    },
    {
        name: "vimhint",
        description: "A discrete Vim cheatsheet for macOS",
        github: "https://github.com/kyledickey/vimhint",
    },
];

function RouteComponent() {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-start">
            <NoiseBackground colorFg="#e4eee5" className="z-[-1]" fixed />
            <Navbar />

            <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12 gap-3">
                <p>Hey, my name's Kyle Dickey</p>
                <p>
                    I recently graduated from{" "}
                    <ExperienceCitation
                        label="Colorado State University"
                        logoURL="/logos/csu.png"
                        render={
                            <div className="flex flex-col gap-2">
                                <p>Some of my favorite public projects were</p>
                                <ul className="list-disc list-inside marker:text-[0.65em]">
                                    <li>
                                        <a
                                            href="https://github.com/kyledickey/unemployed-listening"
                                            target="_blank"
                                            rel="noopener"
                                            className="underline decoration-offset-2"
                                        >
                                            Unemployed Listening
                                        </a>
                                        , a MapReduce project analyzing music
                                        popularity.
                                    </li>
                                    <li>
                                        <a
                                            href="https://github.com/kyledickey/ai-vs-rng"
                                            target="_blank"
                                            rel="noopener"
                                            className="underline decoration-offset-2"
                                        >
                                            AI vs. RNG
                                        </a>
                                        , a study on AI stock trading efficacy.
                                    </li>
                                </ul>
                            </div>
                        }
                    />{" "}
                    where I studied Computer Science, with a focus in Software
                    Enginerring
                </p>
            </main>
        </div>
    );
}

// ------------------ OLD ------------------

// function SectionHeader({ n, title }: { n: string; title: string }) {
//     return (
//         <div className="flex items-center gap-3 mb-8">
//             <span className="font-serif text-xl shrink-0">{title}</span>
//             <div className="h-px flex-1 bg-border" />
//             <span className="font-mono text-xs text-muted-foreground shrink-0">
//                 {n}
//             </span>
//         </div>
//     )                ;
// }

// function RouteComponent() {
//     return (
//         <div className="relative flex min-h-screen flex-col">
//             <NoiseBackground colorFg="#0d4a2a" className="z-[-1]" fixed />

//             <Navbar />

//             <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
//                 {/* Hero */}
//                 <section className="mb-12">
//                     <NowPlaying />
//                 </section>

//                 <section className="mb-4">
//                     <h1 className="font-serif text-6xl leading-none mb-5 tracking-tight">
//                         Kyle Dickey
//                     </h1>
//                 </section>

//                 {/* Bio */}
//                 <section className="mb-24">
//                     <p className="text-base leading-loose text-foreground/75">
//                         I'm an embedded software engineering intern at TerumoBCT
//                         and a Colorado State University graduate. I like
//                         building cool things and I spend a lot of my free time
//                         doing it.
//                     </p>
//                 </section>

//                 {/* Work */}
//                 <section className="mb-24">
//                     <SectionHeader n="00" title="Work" />
//                     <div className="flex flex-col gap-10">
//                         <div className="flex flex-col gap-3">
//                             <div className="flex items-baseline justify-between gap-4">
//                                 <div className="flex flex-col gap-1">
//                                     <h3 className="font-serif text-2xl">
//                                         <a
//                                             href="https://www.terumobct.com"
//                                             target="_blank"
//                                             rel="noopener noreferrer"
//                                             className="hover:text-foreground/70 transition-colors"
//                                         >
//                                             TerumoBCT
//                                         </a>
//                                     </h3>
//                                     <p className="font-mono text-xs text-muted-foreground">
//                                         Embedded SWE Intern
//                                     </p>
//                                 </div>
//                                 <p className="font-mono text-xs text-muted-foreground shrink-0">
//                                     May '26 &mdash; Present
//                                 </p>
//                             </div>
//                             <ul className="mt-1 flex flex-col gap-2">
//                                 <li className="text-sm text-foreground/65 leading-relaxed pl-4 border-l border-border">
//                                     Embedded software engineering for medical
//                                     technology systems.
//                                 </li>
//                             </ul>
//                         </div>

//                         <div className="flex flex-col gap-3">
//                             <div className="flex items-baseline justify-between gap-4">
//                                 <div className="flex flex-col gap-1">
//                                     <h3 className="font-serif text-2xl">
//                                         <a
//                                             href="https://november.software"
//                                             target="_blank"
//                                             rel="noopener noreferrer"
//                                             className="hover:text-foreground/70 transition-colors"
//                                         >
//                                             November Software
//                                         </a>
//                                     </h3>
//                                     <p className="font-mono text-xs text-muted-foreground">
//                                         Founder
//                                     </p>
//                                 </div>
//                                 <p className="font-mono text-xs text-muted-foreground shrink-0">
//                                     March '23 &mdash; Present
//                                 </p>
//                             </div>
//                             <ul className="mt-1 flex flex-col gap-2">
//                                 <li className="text-sm text-foreground/65 leading-relaxed pl-4 border-l border-border">
//                                     Independent software studio.
//                                 </li>
//                                 <li className="text-sm text-foreground/65 leading-relaxed pl-4 border-l border-border">
//                                     Custom merchandise platforms for content
//                                     creators with 1M+ reach.
//                                 </li>
//                                 <li className="text-sm text-foreground/65 leading-relaxed pl-4 border-l border-border">
//                                     5+ products across Go, TypeScript, Postgres,
//                                     and Redis with automated CI/CD.
//                                 </li>
//                             </ul>
//                         </div>
//                     </div>
//                 </section>

//                 {/* Projects */}
//                 <section className="mb-8">
//                     <SectionHeader n="01" title="Projects" />
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border">
//                         {PROJECTS.map((project) => {
//                             const inner = (
//                                 <>
//                                     <div className="flex items-center justify-between gap-2">
//                                         <h3 className="font-mono text-sm">
//                                             {project.name}
//                                         </h3>
//                                         {"github" in project && (
//                                             <a
//                                                 href={project.github}
//                                                 target="_blank"
//                                                 rel="noopener noreferrer"
//                                                 onClick={(e) =>
//                                                     e.stopPropagation()
//                                                 }
//                                                 className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
//                                             >
//                                                 GitHub &rarr;
//                                             </a>
//                                         )}
//                                     </div>
//                                     <p className="text-xs text-foreground/55 leading-relaxed">
//                                         {project.description}
//                                     </p>
//                                 </>
//                             );

//                             return "link" in project ? (
//                                 <a
//                                     key={project.name}
//                                     href={project.link}
//                                     target="_blank"
//                                     rel="noopener noreferrer"
//                                     className="flex flex-col gap-2.5 p-5 bg-background hover:bg-accent/30 transition-colors"
//                                 >
//                                     {inner}
//                                 </a>
//                             ) : (
//                                 <div
//                                     key={project.name}
//                                     className="flex flex-col gap-2.5 p-5 bg-background"
//                                 >
//                                     {inner}
//                                 </div>
//                             );
//                         })}
//                     </div>
//                     <div className="mt-5">
//                         <a
//                             href="https://github.com/kyledickey"
//                             target="_blank"
//                             rel="noopener noreferrer"
//                             className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
//                         >
//                             See more projects on GitHub &rarr;
//                         </a>
//                     </div>
//                 </section>
//             </main>

//             <Footer />

//         </div>
//     );
// }
