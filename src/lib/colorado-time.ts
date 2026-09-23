const denver = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
});
/** The hour in Colorado right now, with minutes as a fraction. */
export function coloradoHour() {
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
