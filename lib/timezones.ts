/**
 * Curated list of major-city timezones with GMT offset labels.
 */

export function getOffsetMinutes(timeZone: string) {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone }));
    return (tzDate.getTime() - utcDate.getTime()) / 60000;
}

export function formatOffset(minutes: number) {
    const sign = minutes >= 0 ? "+" : "-";
    const abs = Math.abs(minutes);
    const hours = Math.floor(abs / 60);
    const mins = abs % 60;
    if (mins === 0) {
        return `GMT${sign}${hours}`;
    }
    return `GMT${sign}${hours}:${String(mins).padStart(2, "0")}`;
}

/** Curated major cities covering common offsets */
const MAJOR_CITY_ZONES = [
    // GMT-12 to GMT+14 — one recognizable city per common offset
    { value: "Pacific/Auckland", city: "Auckland" },
    { value: "Pacific/Fiji", city: "Fiji" },
    { value: "Asia/Tokyo", city: "Tokyo" },
    { value: "Asia/Seoul", city: "Seoul" },
    { value: "Asia/Shanghai", city: "Shanghai" },
    { value: "Asia/Hong_Kong", city: "Hong Kong" },
    { value: "Asia/Singapore", city: "Singapore" },
    { value: "Asia/Bangkok", city: "Bangkok" },
    { value: "Asia/Kolkata", city: "Mumbai" },
    { value: "Asia/Karachi", city: "Karachi" },
    { value: "Asia/Dubai", city: "Dubai" },
    { value: "Asia/Tehran", city: "Tehran" },
    { value: "Europe/Moscow", city: "Moscow" },
    { value: "Africa/Nairobi", city: "Nairobi" },
    { value: "Europe/Istanbul", city: "Istanbul" },
    { value: "Europe/Athens", city: "Athens" },
    { value: "Europe/Berlin", city: "Berlin" },
    { value: "Europe/Paris", city: "Paris" },
    { value: "Europe/London", city: "London" },
    { value: "Atlantic/Cape_Verde", city: "Cape Verde" },
    { value: "America/Sao_Paulo", city: "São Paulo" },
    { value: "America/Buenos_Aires", city: "Buenos Aires" },
    { value: "America/New_York", city: "New York" },
    { value: "America/Chicago", city: "Chicago" },
    { value: "America/Denver", city: "Denver" },
    { value: "America/Los_Angeles", city: "Los Angeles" },
    { value: "America/Anchorage", city: "Anchorage" },
    { value: "Pacific/Honolulu", city: "Honolulu" },
];

export function getModernTimezones() {
    return MAJOR_CITY_ZONES
        .map(({ value, city }) => {
            try {
                const offset = getOffsetMinutes(value);
                return {
                    value,
                    label: `(${formatOffset(offset)}) ${city}`,
                    offset,
                };
            } catch {
                return null;
            }
        })
        .filter((tz): tz is NonNullable<typeof tz> => tz !== null)
        .sort((a, b) => a.offset - b.offset);
}
