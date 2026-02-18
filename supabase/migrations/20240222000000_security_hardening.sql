-- Security Hardening Migration
-- 1. Create Role Enum and Update Profiles
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ensure users table has role and is properly structured
-- We will treat 'public.users' as the 'profiles' table as requested in requirements
-- but keeping the name 'users' to avoid breaking existing code that references it.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'user';

-- 2. Audit Logging Table
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- 'unauthorized_access', 'failed_login', 'admin_action'
    resource TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
-- Only admins and service role can view security events
CREATE POLICY "Admins can view security events" ON public.security_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.id = auth.uid()
            AND public.users.role = 'admin'
        )
    );

-- 3. Reset and Harden RLS Policies (Default Deny)

-- Table: users (profiles)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.users FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Table: dictionary
ALTER TABLE public.dictionary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dictionary is publicly readable" ON public.dictionary;
CREATE POLICY "Dictionary is readable by authenticated users" ON public.dictionary FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage dictionary" ON public.dictionary FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Table: user_words
ALTER TABLE public.user_words ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own words" ON public.user_words;
DROP POLICY IF EXISTS "Users can insert their own words" ON public.user_words;
DROP POLICY IF EXISTS "Users can update their own words" ON public.user_words;
DROP POLICY IF EXISTS "Users can delete their own words" ON public.user_words;
CREATE POLICY "Users can manage their own words" ON public.user_words FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all user words" ON public.user_words FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Table: review_history
ALTER TABLE public.review_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own review history" ON public.review_history;
DROP POLICY IF EXISTS "Users can insert their own review history" ON public.review_history;
CREATE POLICY "Users can manage their own review history" ON public.review_history FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_words WHERE id = public.review_history.user_word_id AND user_id = auth.uid())
);

-- Table: word_lists
ALTER TABLE public.word_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Word lists are publicly readable" ON public.word_lists;
CREATE POLICY "Word lists are readable by authenticated users" ON public.word_lists FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage word lists" ON public.word_lists FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Table: user_list_progress
ALTER TABLE public.user_list_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own list progress" ON public.user_list_progress;
DROP POLICY IF EXISTS "Users can insert their own list progress" ON public.user_list_progress;
DROP POLICY IF EXISTS "Users can update their own list progress" ON public.user_list_progress;
CREATE POLICY "Users can manage their own list progress" ON public.user_list_progress FOR ALL USING (auth.uid() = user_id);

-- 4. Secure handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (new.id, new.email, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
