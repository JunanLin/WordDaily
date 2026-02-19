-- Create feedback status enum
DO $$ BEGIN
    CREATE TYPE public.feedback_status AS ENUM ('new', 'reviewed', 'approved', 'declined', 'implemented');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create feedbacks table
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    page TEXT,
    status public.feedback_status DEFAULT 'new' NOT NULL,
    ai_priority_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Auth users can insert feedback
CREATE POLICY "Authenticated users can submit feedback" 
ON public.feedbacks FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback" 
ON public.feedbacks FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback" 
ON public.feedbacks FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE public.users.id = auth.uid()
        AND public.users.role = 'admin'
    )
);

-- Admins can update feedback
CREATE POLICY "Admins can update feedback" 
ON public.feedbacks FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE public.users.id = auth.uid()
        AND public.users.role = 'admin'
    )
);
