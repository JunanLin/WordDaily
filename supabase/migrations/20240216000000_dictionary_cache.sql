-- Migration: Shared Dictionary Cache Architecture
-- Description: Updates words table schema and creates definitions, examples, and user_word_history tables.
-- This migration attempts to preserve user_words and review_history by using ALTER instead of DROP CASCADE.

-- 1. Update Words Table
-- First, rename old columns if they exist to avoid conflicts and allow for data migration if needed.
-- If the table exists from the old schema, it will have 'lemma', 'phonetic', 'audio_url'.
DO $$ 
BEGIN
    -- Rename lemma to word if lemma exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='words' AND column_name='lemma') THEN
        ALTER TABLE public.words RENAME COLUMN lemma TO word;
    END IF;

    -- Rename phonetic to phonetic_ipa if phonetic exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='words' AND column_name='phonetic') THEN
        ALTER TABLE public.words RENAME COLUMN phonetic TO phonetic_ipa;
    END IF;

    -- Rename audio_url to pronunciation_audio_url if audio_url exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='words' AND column_name='audio_url') THEN
        ALTER TABLE public.words RENAME COLUMN audio_url TO pronunciation_audio_url;
    END IF;

    -- Add updated_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='words' AND column_name='updated_at') THEN
        ALTER TABLE public.words ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;
    END IF;
END $$;

-- 2. Drop Obsolete Legacy Dictionary Tables (Data is now in definitions/examples)
DROP TABLE IF EXISTS public.word_variants CASCADE;
DROP TABLE IF EXISTS public.word_meanings CASCADE;

-- 3. Create new Definitions Table
CREATE TABLE IF NOT EXISTS public.definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
    part_of_speech TEXT,
    definition_text_en TEXT NOT NULL,
    definition_text_zh TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_definitions_word_id ON public.definitions(word_id);

-- 4. Create new Examples Table
CREATE TABLE IF NOT EXISTS public.examples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    definition_id UUID NOT NULL REFERENCES public.definitions(id) ON DELETE CASCADE,
    example_en TEXT NOT NULL,
    example_zh TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_examples_definition_id ON public.examples(definition_id);

-- 5. Create new User Word History Table
CREATE TABLE IF NOT EXISTS public.user_word_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
    action_type TEXT CHECK (action_type IN ('lookup', 'saved', 'daily_word')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_word_history_user_id ON public.user_word_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_word_history_word_id ON public.user_word_history(word_id);

-- 6. Update RLS Polices for existing and new tables
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Words are publicly readable" ON public.words;
CREATE POLICY "Words are publicly readable" ON public.words FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert words" ON public.words;
CREATE POLICY "Authenticated users can insert words" ON public.words FOR INSERT WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Definitions are publicly readable" ON public.definitions;
CREATE POLICY "Definitions are publicly readable" ON public.definitions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert definitions" ON public.definitions;
CREATE POLICY "Authenticated users can insert definitions" ON public.definitions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.examples ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Examples are publicly readable" ON public.examples;
CREATE POLICY "Examples are publicly readable" ON public.examples FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert examples" ON public.examples;
CREATE POLICY "Authenticated users can insert examples" ON public.examples FOR INSERT WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.user_word_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own history" ON public.user_word_history;
CREATE POLICY "Users can view their own history" ON public.user_word_history FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own history" ON public.user_word_history;
CREATE POLICY "Users can insert their own history" ON public.user_word_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Trigger for updated_at on words
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_words_updated_at ON public.words;
CREATE TRIGGER update_words_updated_at
    BEFORE UPDATE ON public.words
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
