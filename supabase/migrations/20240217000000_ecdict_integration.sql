-- Migration: ECDICT Integration
-- Description: Creates meanings table and adds exchange column to words table.
-- Also refines examples table for the new workflow.

-- 1. Update Words Table
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS exchange TEXT;

-- 2. Create Meanings Table (Replacing the need for English definitions)
CREATE TABLE IF NOT EXISTS public.meanings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
    part_of_speech TEXT,
    chinese_meaning TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meanings_word_id ON public.meanings(word_id);

-- 3. Refine Examples Table
-- Ensure word_id exists (from 20240216000001)
-- definition_id is already nullable, but we'll eventually transition away from it.

-- 4. Enable RLS for meanings
ALTER TABLE public.meanings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Meanings are publicly readable" ON public.meanings;
CREATE POLICY "Meanings are publicly readable" ON public.meanings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert meanings" ON public.meanings;
CREATE POLICY "Authenticated users can insert meanings" ON public.meanings FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5. Set up RLS for examples (ensure consistency)
-- (Already handled by 20240216000000)

-- Note: We are keeping the 'definitions' table for now to avoid breaking existing code 
-- until the ingestion logic is fully updated.
