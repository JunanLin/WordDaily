'use client';

import { useEffect } from 'react';
import { getBrowserTimezone } from '@/lib/getBrowserTimezone';
import { updateUserSettings } from '@/lib/actions/user-settings';

interface TimezoneUpdaterProps {
    initialTimezone: string | null;
}

export default function TimezoneUpdater({ initialTimezone }: TimezoneUpdaterProps) {
    useEffect(() => {
        const browserTimezone = getBrowserTimezone();

        // If stored timezone is different from browser timezone, update it
        if (initialTimezone !== browserTimezone) {
            console.log(`Timezone mismatch: App=${initialTimezone}, Browser=${browserTimezone}. Updating...`);
            updateUserSettings({ timezone: browserTimezone }).catch(err => {
                console.error('Failed to auto-update timezone:', err);
            });
        }
    }, [initialTimezone]);

    return null; // Render nothing
}
