import { differenceInDays } from 'date-fns';

/**
 * Self-assessment ratings shown in the review session.
 * - mastered (已掌握): word is removed from the review list.
 * - review   (需复习): remembered but shaky; stays in rotation with SM-2-like growth.
 * - forgot   (忘记了): reset; reviewed again very soon (and requeued in-session).
 */
export const REVIEW_RATINGS = ['mastered', 'review', 'forgot'] as const;
export type ReviewRating = typeof REVIEW_RATINGS[number];

export function isReviewRating(value: unknown): value is ReviewRating {
    return typeof value === 'string' && (REVIEW_RATINGS as readonly string[]).includes(value);
}

/**
 * Stored memory_score for each rating. Kept on the legacy 0-10 scale so existing
 * `memory_score < 10` filters (review queue, due counts, list locking, reminders)
 * and the review_history CHECK (0..10) keep working unchanged.
 */
export const RATING_SCORE: Record<ReviewRating, number> = {
    mastered: 10,
    review: 5,
    forgot: 0,
};

export function ratingToScore(rating: ReviewRating): number {
    return RATING_SCORE[rating];
}

/** Legacy rows with a score at or below this value are treated as "forgot". */
export const FORGOT_SCORE_THRESHOLD = 3;

const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const DEFAULT_EASE = 2.5;
/** Cap for "needs review" words so they stay in rotation. */
const REVIEW_MAX_INTERVAL_DAYS = 60;
/** Ease change for "needs review" (slight penalty). */
const REVIEW_EASE_DELTA = -0.05;
/** Ease change for "forgot" (SM-2 style penalty). */
const FORGOT_EASE_DELTA = -0.2;
/** Ease change for "mastered". */
const MASTERED_EASE_DELTA = 0.1;
/** A forgotten word becomes due again after this many hours. */
const FORGOT_RETRY_HOURS = 4;
/** Minimum interval used for next_review_at of a mastered word (it is excluded anyway). */
const MASTERED_MIN_INTERVAL_DAYS = 30;
/** Upper bound for the frequently-added shortening divisor, so it never collapses intervals. */
const MAX_ADD_COUNT_DIVISOR = 1.5;

export interface SM2Result {
    repetition_count: number;
    interval_days: number;
    ease_factor: number;
    nextReviewAt: Date;
    lastReviewedAt: Date;
}

/**
 * Updates spaced repetition values based on the user's 3-option rating.
 * @param word Current word state (repetition_count, interval_days, ease_factor, add_count).
 * @param rating 'mastered' | 'review' | 'forgot'
 * @param options.isRetry True when this is an in-session repeat of a word just marked "forgot";
 *        the ease penalty was already applied, so it is not applied again.
 */
export function updateSpacedRepetition(
    word: { repetition_count: number, interval_days: number, ease_factor: number, add_count?: number },
    rating: ReviewRating,
    options: { isRetry?: boolean } = {}
): SM2Result {
    let repetition_count = word.repetition_count || 0;
    let interval_days = word.interval_days || 0;
    let ease_factor = word.ease_factor || DEFAULT_EASE;

    const now = new Date();
    const nextReviewAt = new Date(now);

    if (rating === 'forgot') {
        // Reset learning, penalise ease, and bring the word back within a few hours.
        repetition_count = 0;
        interval_days = 0;
        if (!options.isRetry) ease_factor = Math.max(MIN_EASE, ease_factor + FORGOT_EASE_DELTA);
        nextReviewAt.setHours(nextReviewAt.getHours() + FORGOT_RETRY_HOURS);
    } else {
        if (repetition_count === 0) {
            interval_days = 1;
        } else if (repetition_count === 1) {
            interval_days = 3;
        } else {
            interval_days = Math.round(Math.max(interval_days, 1) * ease_factor);
        }
        repetition_count += 1;

        let dueInDays = interval_days;
        if (rating === 'review') {
            if (!options.isRetry) ease_factor = Math.max(MIN_EASE, ease_factor + REVIEW_EASE_DELTA);
            interval_days = Math.min(interval_days, REVIEW_MAX_INTERVAL_DAYS);
            dueInDays = interval_days;

            // Prioritise frequently-added/looked-up words: shorten only this due date.
            // The stored interval_days stays unshortened so the shortening never compounds.
            if (word.add_count && word.add_count > 1) {
                const divisor = Math.min(Math.log(2 + word.add_count), MAX_ADD_COUNT_DIVISOR);
                dueInDays = Math.max(1, Math.round(interval_days / divisor));
            }
        } else {
            // mastered: excluded from the review list via memory_score = 10.
            ease_factor = Math.min(MAX_EASE, ease_factor + MASTERED_EASE_DELTA);
            interval_days = Math.max(interval_days, MASTERED_MIN_INTERVAL_DAYS);
            dueInDays = interval_days;
        }

        nextReviewAt.setDate(nextReviewAt.getDate() + dueInDays);
    }

    return {
        repetition_count,
        interval_days,
        ease_factor,
        nextReviewAt,
        lastReviewedAt: now
    };
}

/**
 * Calculates priority score for word prioritization (higher = reviewed first).
 * priority = times_seen * 0.4 + days_overdue * 0.4 + (10 - memory_score) * 0.2
 *            + forgot bonus (reviewed words with memory_score <= 3, incl. legacy low scores)
 * Never-reviewed words also default to memory_score 0, so lastReviewedAt is used to
 * keep the forgot bonus for words the user actually forgot.
 */
export function calculatePriority(
    timesSeen: number,
    nextReviewAt: Date,
    memoryScore: number,
    lastReviewedAt?: string | Date | null
): number {
    const today = new Date();
    const daysOverdue = Math.max(0, differenceInDays(today, nextReviewAt));
    const score = memoryScore ?? 0;
    const forgotBonus = lastReviewedAt && score <= FORGOT_SCORE_THRESHOLD ? 2 : 0;

    return (timesSeen * 0.4) + (daysOverdue * 0.4) + ((10 - score) * 0.2) + forgotBonus;
}
