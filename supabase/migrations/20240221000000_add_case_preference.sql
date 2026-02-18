-- Add case preference setting to users table
alter table public.users 
add column if not exists use_capital_case boolean default false;
