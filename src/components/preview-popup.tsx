import { PreviewCard } from "@base-ui/react/preview-card";
import type * as React from "react";
import { cn } from "#/lib/utils";

interface PreviewPopupProps {
    trigger: React.ReactNode;
    triggerRender?: React.ReactElement;
    triggerClassName?: string;
    openDelay?: number;
    closeDelay?: number;
    children: React.ReactNode;
}

export function PreviewPopup({
    trigger,
    triggerRender,
    triggerClassName,
    openDelay = 150,
    closeDelay = 50,
    children,
}: PreviewPopupProps) {
    return (
        <PreviewCard.Root>
            <PreviewCard.Trigger
                delay={openDelay}
                closeDelay={closeDelay}
                render={triggerRender ?? <span />}
                className={cn(
                    // Sits above the popup's blur layers (z-50) so the cited
                    // term stays crisp. This is deliberately *unconditional*:
                    // toggling z-index on open/close re-creates the stacking
                    // context and forces a re-raster of the chip's gradient and
                    // inset rings, which reads as a one-frame flicker. Paint
                    // order never changes now, so there is nothing to flicker.
                    "relative z-[60] inline-flex w-fit self-start",
                    // Consequence of the above: a *different* citation in the
                    // same paragraph would also stay crisp and float sharp in
                    // an otherwise blurred field. Blur those ourselves, on the
                    // popup's timing. Filter-only, so still no reflow/reorder.
                    "transition-[filter,opacity] duration-300 ease-out",
                    "[body:has([data-popup-open])_&:not([data-popup-open])]:opacity-70",
                    "[body:has([data-popup-open])_&:not([data-popup-open])]:blur-[5px]",
                    triggerClassName,
                )}
            >
                {trigger}
            </PreviewCard.Trigger>

            <PreviewCard.Portal>
                <PreviewCard.Positioner sideOffset={10} className="z-50">
                    <PreviewCard.Popup
                        className={cn(
                            "relative w-fit max-w-md px-5 py-4",
                            "origin-(--transform-origin) text-foreground",
                            "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                            "data-starting-style:translate-y-2 data-starting-style:scale-[0.96]",
                            "data-ending-style:translate-y-1 data-ending-style:scale-[0.98]",
                        )}
                    >
                        {/*
                         * Progressive blur: stacked backdrop layers at rising
                         * strength with nested masks, so the edge fades between
                         * blur levels rather than between blurred and raw
                         * backdrop (which reads as a washed-out rectangle).
                         * The falloff is stretched far past the content so no
                         * boundary is locatable.
                         */}
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -inset-x-52 -inset-y-32"
                        >
                            <div className="absolute inset-0 backdrop-blur-[4px] transition-[backdrop-filter] duration-300 ease-out in-data-[starting-style]:backdrop-blur-[0px] in-data-[ending-style]:backdrop-blur-[0px] [mask-image:radial-gradient(farthest-side_at_50%_50%,black_20%,transparent_100%)]" />
                            <div className="absolute inset-0 backdrop-blur-[7px] transition-[backdrop-filter] duration-300 ease-out in-data-[starting-style]:backdrop-blur-[0px] in-data-[ending-style]:backdrop-blur-[0px] [mask-image:radial-gradient(farthest-side_at_50%_50%,black_15%,transparent_92%)]" />
                            <div className="absolute inset-0 backdrop-blur-[9px] transition-[backdrop-filter] duration-300 ease-out in-data-[starting-style]:backdrop-blur-[0px] in-data-[ending-style]:backdrop-blur-[0px] [mask-image:radial-gradient(farthest-side_at_50%_50%,black_10%,transparent_68%)]" />
                            {/* Soft bloom of light behind the text. */}
                            <div className="absolute inset-0 bg-[radial-gradient(farthest-side_at_50%_48%,rgba(255,255,255,0.6),transparent_72%)] transition-opacity duration-300 ease-out in-data-[starting-style]:opacity-0 in-data-[ending-style]:opacity-0" />
                        </div>

                        <div className="relative blur-[0px] transition-[opacity,filter] duration-300 ease-out in-data-[starting-style]:opacity-0 in-data-[starting-style]:blur-[6px] in-data-[ending-style]:opacity-0 in-data-[ending-style]:blur-[3px]">
                            {children}
                        </div>
                    </PreviewCard.Popup>
                </PreviewCard.Positioner>
            </PreviewCard.Portal>
        </PreviewCard.Root>
    );
}
