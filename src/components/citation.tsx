import { cn } from "#/lib/utils.ts";
import { PreviewPopup } from "./preview-popup";

interface ExperienceCitationProps {
    label: string;
    logoURL: string;
    render: React.ReactNode;
}

export function ExperienceCitation(props: ExperienceCitationProps) {
    const { label: name, logoURL } = props;
    return (
        <PreviewPopup
            trigger={
                <ExperienceCitationTrigger name={name} logoURL={logoURL} />
            }
        >
            {props.render}
        </PreviewPopup>
    );
}

export function ExperienceCitationTrigger({
    name,
    logoURL,
    className,
}: {
    name: string;
    logoURL?: string;
    className?: string;
}) {
    return (
        <span
            className={cn(
                "citation-chip inline-flex cursor-default items-baseline gap-1 px-1",
                logoURL && "pr-1.75",
                className,
            )}
        >
            {logoURL && (
                <img
                    src={logoURL}
                    alt=""
                    aria-hidden
                    className="size-[1em] shrink-0 self-center rounded-[0.2em] object-cover"
                />
            )}
            <span>{name}</span>
        </span>
    );
}
