-- ==========================================
-- 1. PROFILES
-- ==========================================
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique not null,
  status text default 'ghost', -- 'ghost' (unclaimed) or 'claimed'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);
