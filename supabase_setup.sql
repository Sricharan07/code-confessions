-- Supabase Schema for Anonymous Auth & Followers

-- 1. Create the Profiles table to map User IDs to custom Usernames
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique not null,
  is_guest boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- 2. Create the Followers table
create table public.followers (
  follower_id uuid references auth.users on delete cascade not null,
  following_id uuid references auth.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id)
);

alter table public.followers enable row level security;

-- Everyone can see who follows who
create policy "Followers are viewable by everyone." on public.followers
  for select using (true);

-- Only logged-in users (non-guests) can follow people
create policy "Users can follow others." on public.followers
  for insert with check (
    auth.uid() = follower_id AND
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.is_guest = false
    )
  );

-- Users can unfollow
create policy "Users can unfollow." on public.followers
  for delete using (auth.uid() = follower_id);
