-- Migration: Update Examples Schema
-- Description: Allow examples to be linked directly to words for general usage examples.

ALTER TABLE public.examples ALTER COLUMN definition_id DROP NOT NULL;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='examples' AND column_name='word_id') THEN
        ALTER TABLE public.examples ADD COLUMN word_id UUID REFERENCES public.words(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_examples_word_id ON public.examples(word_id);
