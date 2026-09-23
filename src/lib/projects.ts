import type { SpriteName } from "#/lib/sprites";

export type Project = {
    name: string;
    line: string;
    url?: string;
    source?: string;
    sprite: SpriteName;
    aside?: string;
};

export const projects: Project[] = [
    {
        name: "Are they up?",
        sprite: "aretheyup",
        line: "A live website outage tracker. Check if a site is down for everyone or just you.",
        url: "https://aretheyup.com",
        source: "https://github.com/novembersoftware/aretheyup",
    },
    {
        name: "No System",
        sprite: "nosystem",
        line: "A simple AI chat app with no hidden system prompt.",
        url: "https://nosystem.chat",
    },
    {
        name: "Poof",
        sprite: "poof",
        line: "Share an e2e encrypted message that disappears after it’s read once.",
        url: "https://poof.sh",
        source: "https://github.com/kyledickey/poof",
    },
    {
        name: "Diary",
        sprite: "diary",
        line: "A simple, distraction-free online journal.",
        url: "https://diary.kyle.so",
        source: "https://github.com/kyledickey/diary",
        aside: "oldest one still going",
    },
    {
        name: "Quack",
        sprite: "quack",
        line: "A Discord bot that helps servers with moderation.",
        url: "https://quack.bot",
    },
    {
        name: "stock.toys",
        sprite: "stocktoys",
        line: "A clean, simple way to research stocks.",
        url: "https://stock.toys",
    },
    {
        name: "txto",
        sprite: "txto",
        line: "Peer-to-peer, encrypted chat right in your terminal.",
        source: "https://github.com/kyledickey/txto",
    },
    {
        name: "Moss",
        sprite: "moss",
        line: "Turns a folder of Markdown files into a documentation site.",
        source: "https://github.com/kyledickey/moss",
    },
    {
        name: "Alias",
        sprite: "alias",
        line: "The game my family plays on holidays, now in your browser.",
        url: "https://alias.kyle.so",
        source: "https://github.com/kyledickey/alias",
        aside: "for my family",
    },
    {
        name: "Simple Mines",
        sprite: "mines",
        line: "A Minecraft plugin with mines that reset, ore to sell, and pickaxe upgrades.",
        source: "https://github.com/kyledickey/mc-plugins",
        aside: "just for fun",
    },
];

export const smallerThings = [
    {
        name: "jev-go",
        url: "https://github.com/kyledickey/jev-go",
        desc: "an SDK for Jev",
    },
    {
        name: "jalc",
        url: "https://github.com/kyledickey/jalc",
        desc: "counts lines of code",
    },
    {
        name: "vines",
        url: "https://github.com/novmbrs/vines",
        desc: "points a pile of domains at one server",
    },
    {
        name: "collatz",
        url: "https://github.com/kyledickey/collatz",
        desc: "is the same program written three times",
    },
    {
        name: "password manager",
        url: "https://github.com/novembersoftware/passwords",
        desc: "that I swear I'll finish one day",
    },
];
