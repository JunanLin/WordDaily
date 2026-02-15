import { differenceInDays } from 'date-fns';



/**
 * Calculates SM-2 spaced repetition values.
 * @param score User score from 0 to 10.
 * @param currentEaseFactor Current ease factor (default 2.5).
 * @param currentIntervalDays Current interval in days.
 * @returns Updated SM-2 values.
 */
/**
 * Converts a 0-10 score to a 0-5 quality rating for SM-2.
 */
export function scoreToQuality(score: number): number {
    if (score <= 3) return 0;   // forgot
    if (score <= 6) return 3;   // hard
    if (score <= 8) return 4;   // good
    return 5;                   // easy
}

export interface SM2Result {
    repetition_count: number;
    interval_days: number;
    ease_factor: number;
    nextReviewAt: Date;
    lastReviewedAt: Date;
}

/**
 * Updates spaced repetition values based on user performance.
 * @param word Current word state (repetition_count, interval_days, ease_factor).
 * @param score User score (0-10).
 */
export function updateSpacedRepetition(
    word: { repetition_count: number, interval_days: number, ease_factor: number, add_count?: number },
    score: number
): SM2Result {
    const quality = scoreToQuality(score);
    let { repetition_count, interval_days, ease_factor } = word;

    // Default values if missing
    repetition_count = repetition_count || 0;
    interval_days = interval_days || 0;
    ease_factor = ease_factor || 2.5;

    if (quality < 3) {
        // Forgot → reset learning
        repetition_count = 0;
        interval_days = 1;
    } else {
        if (repetition_count === 0) {
            interval_days = 1;
        } else if (repetition_count === 1) {
            interval_days = 3;
        } else {
            interval_days = Math.round(interval_days * ease_factor);
        }

        repetition_count += 1;
    }

    // Update ease factor: EF' = EF + (0.1 - (5-q)*(0.08+(5-q)*0.02))
    // q = quality (0-5)
    // Formula from SM-2 description provided
    ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    if (ease_factor < 1.3) ease_factor = 1.3;

    // Bonus: prioritize frequently-added words
    // interval_days = interval_days / log(2 + word.add_count)
    if (word.add_count && word.add_count > 1) {
        interval_days = Math.round(interval_days / Math.log(2 + word.add_count));
        if (interval_days < 1) interval_days = 1;
    }

    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + interval_days);

    return {
        repetition_count,
        interval_days,
        ease_factor,
        nextReviewAt,
        lastReviewedAt: new Date()
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
