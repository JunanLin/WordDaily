-- Add repetition_count to user_words table
alter table public.user_words
add column if not exists repetition_count int default 0;

-- Existing columns (just for reference, no action needed if they exist)
-- interval_days int default 0
-- ease_factor float default 2.5
-- next_review_at timestamp with time zone
-- last_reviewed_at timestamp with time zone
