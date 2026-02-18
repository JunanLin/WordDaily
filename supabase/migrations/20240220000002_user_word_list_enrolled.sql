-- Migration: Track Enrolled Words per Round
-- Description: Adds a table to track which words from a list have been enrolled by a user in identifying the current round.

CREATE TABLE IF NOT EXISTS public.user_word_list_enrolled (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    list_id UUID REFERENCES public.word_lists(id) ON DELETE CASCADE NOT NULL,
    word_id UUID REFERENCES public.dictionary(id) ON DELETE CASCADE NOT NULL,
    round INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, list_id, word_id, round)
);

-- RLS Policies
ALTER TABLE public.user_word_list_enrolled ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own enrolled words"
    ON public.user_word_list_enrolled
    FOR ALL
    USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_word_list_enrolled_lookup 
    ON public.user_word_list_enrolled(user_id, list_id, round);
