-- Add notification settings to users table
alter table public.users 
add column if not exists notifications_enabled boolean default false,
add column if not exists day_reminder_time time default '18:00',
add column if not exists review_reminder_time time default '21:00',
add column if not exists timezone text default 'America/Toronto';

-- Push Subscriptions Table
create table if not exists public.push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, endpoint)
);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Policies for push_subscriptions
create policy "Users can view own subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own subscriptions"
  on public.push_subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can delete own subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
