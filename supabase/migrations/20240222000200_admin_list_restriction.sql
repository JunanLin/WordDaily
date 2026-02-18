-- 1. Restrict 'testing' list visibility in RLS
-- First, remove the generic policy
DROP POLICY IF EXISTS "Word lists are readable by authenticated users" ON public.word_lists;

-- New policy: Authenticated users can see everything EXCEPT 'testing'
CREATE POLICY "Regular word lists are readable" ON public.word_lists 
FOR SELECT USING (
    code != 'testing' AND auth.role() = 'authenticated'
);

-- New policy: Admins can see EVERYTHING (including 'testing')
-- (This policy might already be covered by 'Admins can manage word lists' depending on how it's defined, 
-- but we make it explicit for SELECT for safety)
CREATE POLICY "Admins can see all word lists" ON public.word_lists
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE public.users.id = auth.uid()
        AND public.users.role = 'admin'
    )
);

-- 2. Utility Command for User Promotion
-- Usage: UPDATE public.users SET role = 'admin' WHERE email = 'target@example.com';
