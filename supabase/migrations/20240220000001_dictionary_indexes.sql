-- Migration: Dictionary Table Indexes
-- Description: Adds indexes to 'word' and 'tag' columns to improve search and migration performance.

-- 1. Index on word (already unique, but beneficial for range/ordering)
CREATE INDEX IF NOT EXISTS idx_dictionary_word ON public.dictionary(word);

-- 2. Index on tag (crucial for shared lists migration and lookup)
CREATE INDEX IF NOT EXISTS idx_dictionary_tag ON public.dictionary(tag);

-- 3. Index on updated_at (crucial for batch enrichment script)
CREATE INDEX IF NOT EXISTS idx_dictionary_updated_at ON public.dictionary(updated_at);
