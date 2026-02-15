export function getOffsetMinutes(timeZone: string) {
    const now = new Date();
    // Use a reference date in UTC and the target timezone to compare
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone }));
    return (tzDate.getTime() - utcDate.getTime()) / 60000;
}

export function formatOffset(minutes: number) {
    const sign = minutes >= 0 ? "+" : "-";
    const abs = Math.abs(minutes);
    const hours = String(Math.floor(abs / 60)).padStart(2, "0");
    const mins = String(abs % 60).padStart(2, "0");
    return `UTC${sign}${hours}:${mins}`;
}

export function getModernTimezones() {
    // Check if environment supports Intl.supportedValuesOf
    // In strict environments or during SSG this might fail if not handled
    if (typeof Intl === 'undefined' || !('supportedValuesOf' in Intl)) {
        console.warn("Intl.supportedValuesOf not supported, returning basic UTC");
        return [{ value: 'UTC', label: '(UTC+00:00) UTC', offset: 0 }];
    }

    const zones = Intl.supportedValuesOf("timeZone");
    const map = new Map<number, string[]>();

    zones.forEach((tz) => {
        try {
            const offset = getOffsetMinutes(tz);
            if (!map.has(offset)) map.set(offset, []);
            map.get(offset)!.push(tz);
        } catch {
            // Ignore invalid zones
        }
    });

    const result = Array.from(map.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([offset, tzList]) => {
            // Heuristic: Prefer zones with "America", "Europe", "Asia" as they are common
            // Also prefer "London", "New_York", "Tokyo", "Los_Angeles" etc if available in the bucket
            // But simple first-slash logic is often good enough for "representative"
            // Let's stick to the simple one first, maybe ensure we don't pick "Etc/..." if possible
            const representative = tzList.find(z => !z.startsWith("Etc/") && z.includes("/")) ?? tzList[0];
            const city = representative.split("/").pop()?.replace(/_/g, " ");

            return {
                value: representative,
                label: `(${formatOffset(offset)}) ${city}`,
                offset
            };
        });

    return result;
}
