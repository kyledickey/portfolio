import GitHubIcon from "#/components/icons/github";

interface Project {
    id: string;
    name: string;
    description: string;
    link?: string;
    repo?: string;
    active?: boolean;
    logoURL?: string;
}

export function InlineProject(project: Project) {
    const { name, description, link, repo } = project;

    return (
        <div>
            <p className="text-sm leading-relaxed">{description}</p>

            {link || repo ? (
                <div className="mt-2 flex items-center gap-4">
                    {link ? (
                        <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-muted-foreground text-sm transition-colors hover:text-foreground"
                        >
                            Visit
                        </a>
                    ) : null}
                    {repo ? (
                        <a
                            href={repo}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${name} source on GitHub`}
                            className="flex shrink-0 items-center text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <GitHubIcon className="size-3.5" />
                        </a>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
