-- Final Schema Cleanup & Resilient Migration
SET statement_timeout = 300000; -- 5 minutes

-- 1. Ensure the unified dictionary table exists
CREATE TABLE IF NOT EXISTS public.dictionary (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    word TEXT UNIQUE NOT NULL,
    phonetic TEXT,
    definition TEXT,
    translation TEXT,
    pos TEXT,
    collins TEXT,
    oxford TEXT,
    tag TEXT,
    bnc INTEGER,
    frq INTEGER,
    exchange TEXT,
    detail JSONB, 
    audio TEXT,   
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Migrate from old tables ONLY if they still exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'words' AND schemaname = 'public') THEN
        INSERT INTO public.dictionary (id, word, phonetic, audio, updated_at, translation)
        SELECT 
            w.id, 
            w.word, 
            w.phonetic_ipa, 
            w.pronunciation_audio_url, 
            w.updated_at,
            m.translation
        FROM public.words w
        LEFT JOIN (
            SELECT word_id, string_agg(chinese_meaning, '\n' ORDER BY created_at) as translation
            FROM public.meanings
            GROUP BY word_id
        ) m ON w.id = m.word_id
        ON CONFLICT (word) DO NOTHING;

        -- Drop old tables after successful migration check
        DROP TABLE IF EXISTS public.meanings CASCADE;
        DROP TABLE IF EXISTS public.examples CASCADE;
        DROP TABLE IF EXISTS public.definitions CASCADE;
        DROP TABLE IF EXISTS public.word_variants CASCADE;
        DROP TABLE IF EXISTS public.word_meanings CASCADE;
        DROP TABLE IF EXISTS public.words CASCADE;
    END IF;
END $$;

-- 3. DATA CLEANUP: Remove repeated contents in translation
-- This handles cases like "阳光, 光明\n阳光, 光明" -> "阳光, 光明"
UPDATE public.dictionary
SET translation = (
    SELECT string_agg(DISTINCT TRIM(line), '\n')
    FROM unnest(string_to_array(translation, '\n')) AS line
    WHERE line IS NOT NULL AND TRIM(line) <> ''
)
WHERE translation IS NOT NULL AND translation LIKE '%\n%';

-- 4. Finalize foreign keys in user_words and user_word_history
-- These currently point to words.id. 

-- Remove old constraints (if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_words_word_id_fkey') THEN
        ALTER TABLE public.user_words DROP CONSTRAINT user_words_word_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_word_history_word_id_fkey') THEN
        ALTER TABLE public.user_word_history DROP CONSTRAINT user_word_history_word_id_fkey;
    END IF;
END $$;

-- Add new constraints pointing to dictionary (Safely)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_words_word_id_fkey') THEN
        ALTER TABLE public.user_words
        ADD CONSTRAINT user_words_word_id_fkey 
        FOREIGN KEY (word_id) REFERENCES public.dictionary(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_word_history_word_id_fkey') THEN
        ALTER TABLE public.user_word_history
        ADD CONSTRAINT user_word_history_word_id_fkey 
        FOREIGN KEY (word_id) REFERENCES public.dictionary(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. RLS Policies for dictionary
ALTER TABLE public.dictionary ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Dictionary is publicly readable') THEN
        CREATE POLICY "Dictionary is publicly readable" ON public.dictionary FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can manage dictionary') THEN
        CREATE POLICY "Service role can manage dictionary" ON public.dictionary FOR ALL USING (true);
    END IF;
END $$;
