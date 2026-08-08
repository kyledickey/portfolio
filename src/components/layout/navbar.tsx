import BlueskyIcon from "../icons/bluesky";
import GitHubIcon from "../icons/github";
import LinkedInIcon from "../icons/linkedin";
import TwitterIcon from "../icons/twitter";

const BLUR_LAYERS = [
    { blur: "2px", stop: "90%" },
    { blur: "6px", stop: "65%" },
    { blur: "14px", stop: "38%" },
    { blur: "24px", stop: "12%" },
] as const;

const socials = [
    {
        icon: GitHubIcon,
        href: "https://github.com/kyledickey",
    },
    {
        icon: TwitterIcon,
        href: "https://twitter.com/kyledickeyy",
    },
    {
        icon: BlueskyIcon,
        href: "https://bsky.app/profile/kyle.so",
    },
    {
        icon: LinkedInIcon,
        href: "https://www.linkedin.com/in/kyletdickey",
    },
];

export function Navbar() {
    return (
        <header className="sticky top-0 z-50 w-full">
            {/* Progressive blur: high blur at top, none at bottom */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {BLUR_LAYERS.map(({ blur, stop }) => (
                    <div
                        key={blur}
                        className="absolute inset-0"
                        style={{
                            backdropFilter: `blur(${blur})`,
                            WebkitBackdropFilter: `blur(${blur})`,
                            maskImage: `linear-gradient(to bottom, black 0%, transparent ${stop})`,
                            WebkitMaskImage: `linear-gradient(to bottom, black 0%, transparent ${stop})`,
                        }}
                    />
                ))}
                <div
                    className="absolute inset-0 bg-background/50"
                    style={{
                        maskImage:
                            "linear-gradient(to bottom, black 0%, transparent 100%)",
                        WebkitMaskImage:
                            "linear-gradient(to bottom, black 0%, transparent 100%)",
                    }}
                />
            </div>

            <div className="relative mx-auto flex w-screen items-center justify-end px-6 sm:px-12 py-2">
                {/*<img src="/logo.svg" alt="Kyle Dickey" className="size-6" />*/}
                <div className="flex items-center gap-3">
                    {socials.map(({ icon, href }) => (
                        <SocialIcon key={href} icon={icon} href={href} />
                    ))}
                </div>
            </div>
        </header>
    );
}

function SocialIcon({
    icon: Icon,
    href,
}: {
    icon: React.ElementType;
    href: string;
}) {
    return (
        <a
            href={href}
            target="_blank"
            aria-label={`Open ${href} in a new tab`}
            rel="noopener noreferrer"
        >
            <Icon className="size-4 fill-foreground/40 hover:fill-foreground/80 transition-colors ease-in-out" />
        </a>
    );
}
