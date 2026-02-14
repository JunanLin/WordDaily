import { addDays, differenceInDays } from 'date-fns';

export interface SM2Result {
    nextReviewAt: Date;
    easeFactor: number;
    intervalDays: number;
}

/**
 * Calculates SM-2 spaced repetition values.
 * @param score User score from 0 to 10.
 * @param currentEaseFactor Current ease factor (default 2.5).
 * @param currentIntervalDays Current interval in days.
 * @returns Updated SM-2 values.
 */
export function calculateSM2(
    score: number,
    currentEaseFactor: number,
    currentIntervalDays: number
): SM2Result {
    let intervalDays: number;
    let easeFactor: number;

    if (score < 4) {
        intervalDays = 1;
        // According to user request, ease factor logic still applies or reset?
        // User request: "ease_factor = ease_factor + (0.1 - (10 - score) * 0.02)"
        easeFactor = currentEaseFactor + (0.1 - (10 - score) * 0.02);
    } else {
        // If it's the first time (intervalDays = 0), start with 1 day?
        // User request: "interval_days = interval_days * ease_factor"
        // We'll normalize starting point to 1 if it was 0
        const baseInterval = currentIntervalDays === 0 ? 1 : currentIntervalDays;
        intervalDays = Math.round(baseInterval * currentEaseFactor);
        easeFactor = currentEaseFactor + (0.1 - (10 - score) * 0.02);
    }

    easeFactor = Math.max(1.3, easeFactor);

    return {
        nextReviewAt: addDays(new Date(), intervalDays),
        easeFactor,
        intervalDays,
    };
}

/**
 * Calculates priority score for word prioritization.
 * priority = times_seen * 0.4 + days_overdue * 0.4 + (10 - memory_score) * 0.2
 */
export function calculatePriority(
    timesSeen: number,
    nextReviewAt: Date,
    memoryScore: number
): number {
    const today = new Date();
    const daysOverdue = Math.max(0, differenceInDays(today, nextReviewAt));

    return (timesSeen * 0.4) + (daysOverdue * 0.4) + ((10 - memoryScore) * 0.2);
}
