-- Add tutorial_completed flag to users table
ALTER TABLE public.users 
ADD COLUMN tutorial_completed boolean DEFAULT false;
