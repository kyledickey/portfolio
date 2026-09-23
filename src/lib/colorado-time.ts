const denver = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
});
/** Set by the time-of-day preview under the print; null means real time. */
let hourOverride: number | null = null;
/** The hour in Colorado right now, with minutes as a fraction. */
export function coloradoHour() {
    if (hourOverride !== null) return hourOverride;
    const parts = denver.formatToParts(new Date());
    const part = (type: string) =>
        Number(parts.find((item) => item.type === type)?.value ?? 0);
    return part("hour") + part("minute") / 60;
}
const smooth = (edge0: number, edge1: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
};
/** 0 in full daylight, 1 at night, easing through dawn and dusk. */
export const darkness = (hour: number) =>
    1 - smooth(5, 7.5, hour) + smooth(18.5, 21, hour);

export const PREVIEW_HOURS = [
    { label: "now", hour: null },
    { label: "day", hour: 12 },
    { label: "dusk", hour: 19.6 },
    { label: "night", hour: 23 },
] as const;
export function previewHour(hour: number | null) {
    hourOverride = hour;
}
