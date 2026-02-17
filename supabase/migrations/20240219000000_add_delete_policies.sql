-- Allow users to delete their own words
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_words' 
        AND policyname = 'Users can delete their own words'
    ) THEN
        CREATE POLICY "Users can delete their own words" 
        ON public.user_words 
        FOR DELETE 
        USING (auth.uid() = user_id);
    END IF;

    -- Allow users to delete their own history
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_word_history' 
        AND policyname = 'Users can delete their own history'
    ) THEN
        CREATE POLICY "Users can delete their own history" 
        ON public.user_word_history 
        FOR DELETE 
        USING (auth.uid() = user_id);
    END IF;
END $$;
