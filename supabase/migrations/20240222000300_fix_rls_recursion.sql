-- Migration to fix RLS recursion error
-- The recursion happened because the 'Admin' policy on the 'users' table 
-- queried the 'users' table itself, triggering the policy again.

-- 1. Create a helper function to check admin status
-- SECURITY DEFINER allows this function to bypass RLS checks for the query inside it.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT (role = 'admin')
    FROM public.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Update 'users' table policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
CREATE POLICY "Admins can view all profiles" ON public.users 
FOR SELECT USING (is_admin());

-- 3. Update 'dictionary' table policies
DROP POLICY IF EXISTS "Admins can manage dictionary" ON public.dictionary;
CREATE POLICY "Admins can manage dictionary" ON public.dictionary 
FOR ALL USING (is_admin());

-- 4. Update 'user_words' table policies
DROP POLICY IF EXISTS "Admins can view all user words" ON public.user_words;
CREATE POLICY "Admins can view all user words" ON public.user_words 
FOR SELECT USING (is_admin());

-- 5. Update 'word_lists' table policies
DROP POLICY IF EXISTS "Admins can manage word lists" ON public.word_lists;
DROP POLICY IF EXISTS "Admins can see all word lists" ON public.word_lists;

CREATE POLICY "Admins can manage word lists" ON public.word_lists 
FOR ALL USING (is_admin());

CREATE POLICY "Admins can see all word lists" ON public.word_lists
FOR SELECT USING (is_admin());

-- 6. Update 'security_events' table policies
DROP POLICY IF EXISTS "Admins can view security events" ON public.security_events;
CREATE POLICY "Admins can view security events" ON public.security_events
FOR SELECT USING (is_admin());
