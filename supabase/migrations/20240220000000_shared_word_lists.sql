-- Migration: Shared Word Lists and Progress Tracking
-- Description: Creates tables for word lists, word list items, and user progress tracking.

-- 1. Create word_lists table
CREATE TABLE IF NOT EXISTS public.word_lists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL, -- zk, gk, cet4, cet6, ky, ielts, toefl, gre
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create word_list_items junction table
CREATE TABLE IF NOT EXISTS public.word_list_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    list_id UUID REFERENCES public.word_lists(id) ON DELETE CASCADE NOT NULL,
    word_id UUID REFERENCES public.dictionary(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(list_id, word_id)
);

-- 3. Create user_list_progress table
CREATE TABLE IF NOT EXISTS public.user_list_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    list_id UUID REFERENCES public.word_lists(id) ON DELETE CASCADE NOT NULL,
    current_position INTEGER DEFAULT 0 NOT NULL,
    completed_rounds INTEGER DEFAULT 0 NOT NULL,
    stars INTEGER DEFAULT 0 NOT NULL,
    suns INTEGER DEFAULT 0 NOT NULL,
    last_completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, list_id),
    CONSTRAINT stars_limit CHECK (stars >= 0 AND stars <= 5),
    CONSTRAINT suns_limit CHECK (suns >= 0 AND suns <= 5)
);

-- 4. Add Indexes
CREATE INDEX IF NOT EXISTS idx_word_list_items_list_id ON public.word_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_word_list_items_word_id ON public.word_list_items(word_id);
CREATE INDEX IF NOT EXISTS idx_user_list_progress_user_id_list_id ON public.user_list_progress(user_id, list_id);

-- 5. RLS Policies

-- Word Lists: Publicly readable
ALTER TABLE public.word_lists ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Word lists are publicly readable') THEN
        CREATE POLICY "Word lists are publicly readable" ON public.word_lists FOR SELECT USING (true);
    END IF;
END $$;

-- Word List Items: Publicly readable
ALTER TABLE public.word_list_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Word list items are publicly readable') THEN
        CREATE POLICY "Word list items are publicly readable" ON public.word_list_items FOR SELECT USING (true);
    END IF;
END $$;

-- User List Progress: Private to owner
ALTER TABLE public.user_list_progress ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own list progress') THEN
        CREATE POLICY "Users can view their own list progress" ON public.user_list_progress FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own list progress') THEN
        CREATE POLICY "Users can insert their own list progress" ON public.user_list_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own list progress') THEN
        CREATE POLICY "Users can update their own list progress" ON public.user_list_progress FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 6. Insert Predefined Rows for Word Lists
INSERT INTO public.word_lists (code, name, description)
VALUES 
    ('zk', '中考词汇', 'Junior High School Entrance Exam vocabulary'),
    ('gk', '高考词汇', 'Senior High School Entrance Exam vocabulary'),
    ('cet4', '四级词汇', 'College English Test Band 4 vocabulary'),
    ('cet6', '六级词汇', 'College English Test Band 6 vocabulary'),
    ('ky', '考研词汇', 'Postgraduate Entrance Exam vocabulary'),
    ('ielts', '雅思词汇', 'International English Language Testing System vocabulary'),
    ('toefl', '托福词汇', 'Test of English as a Foreign Language vocabulary'),
    ('gre', 'GRE词汇', 'Graduate Record Examinations vocabulary')
ON CONFLICT (code) DO NOTHING;
