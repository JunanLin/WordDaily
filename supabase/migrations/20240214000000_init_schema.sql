-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users Table
create table public.users (
  id uuid references auth.users not null primary key,
  email text unique not null,
  daily_goal int default 20,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Words Table
create table public.words (
  id uuid default uuid_generate_v4() primary key,
  lemma text unique not null,
  phonetic text,
  audio_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- WordVariants Table
create table public.word_variants (
  id uuid default uuid_generate_v4() primary key,
  word_id uuid references public.words(id) on delete cascade not null,
  variant_text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(word_id, variant_text)
);

-- WordMeaning Table
create table public.word_meanings (
  id uuid default uuid_generate_v4() primary key,
  word_id uuid references public.words(id) on delete cascade not null,
  part_of_speech text,
  english_definition text not null,
  chinese_translation text,
  example_sentence text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- UserWords Table
create table public.user_words (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  word_id uuid references public.words(id) on delete cascade not null,
  times_seen int default 1,
  last_reviewed_at timestamp with time zone,
  next_review_at timestamp with time zone default timezone('utc'::text, now()) not null,
  memory_score float default 0.0,
  ease_factor float default 2.5,
  interval_days int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, word_id)
);

-- ReviewHistory Table
create table public.review_history (
  id uuid default uuid_generate_v4() primary key,
  user_word_id uuid references public.user_words(id) on delete cascade not null,
  score int check (score >= 0 and score <= 10) not null,
  reviewed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  direction text check (direction in ('EN_TO_CN', 'CN_TO_EN')) not null
);

-- RLS Policies

-- Users
alter table public.users enable row level security;
create policy "Users can view their own data" on public.users for select using (auth.uid() = id);
create policy "Users can update their own data" on public.users for update using (auth.uid() = id);

-- Words (Publicly readable, Authenticated users can insert)
alter table public.words enable row level security;
create policy "Words are publicly readable" on public.words for select using (true);
create policy "Authenticated users can insert words" on public.words for insert with check (auth.role() = 'authenticated');

-- WordVariants (Publicly readable, Authenticated users can insert)
alter table public.word_variants enable row level security;
create policy "Word variants are publicly readable" on public.word_variants for select using (true);
create policy "Authenticated users can insert variants" on public.word_variants for insert with check (auth.role() = 'authenticated');

-- WordMeanings (Publicly readable, Authenticated users can insert)
alter table public.word_meanings enable row level security;
create policy "Word meanings are publicly readable" on public.word_meanings for select using (true);
create policy "Authenticated users can insert meanings" on public.word_meanings for insert with check (auth.role() = 'authenticated');

-- UserWords
alter table public.user_words enable row level security;
create policy "Users can view their own words" on public.user_words for select using (auth.uid() = user_id);
create policy "Users can insert their own words" on public.user_words for insert with check (auth.uid() = user_id);
create policy "Users can update their own words" on public.user_words for update using (auth.uid() = user_id);

-- ReviewHistory
alter table public.review_history enable row level security;
create policy "Users can view their own review history" on public.review_history for select using (
  exists (
    select 1 from public.user_words
    where public.user_words.id = review_history.user_word_id
    and public.user_words.user_id = auth.uid()
  )
);
create policy "Users can insert their own review history" on public.review_history for insert with check (
  exists (
    select 1 from public.user_words
    where public.user_words.id = review_history.user_word_id
    and public.user_words.user_id = auth.uid()
  )
);

-- Function to handle new user registration
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Allow logged-in users to contribute new words to the global dictionary
create policy "Authenticated users can insert words" on public.words 
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can insert variants" on public.word_variants 
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can insert meanings" on public.word_meanings 
  for insert with check (auth.role() = 'authenticated');