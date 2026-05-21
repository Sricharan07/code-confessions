-- ==========================================
-- 2. FOLLOWERS
-- ==========================================
create table public.followers (
  follower_id uuid references auth.users on delete cascade not null,
  following_id uuid references auth.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id)
);

alter table public.followers enable row level security;

create policy "Followers are viewable by everyone." on public.followers
  for select using (true);

create policy "Users can follow others." on public.followers
  for insert with check (
    auth.uid() = follower_id AND
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.status != 'ghost'
    )
  );

create policy "Users can unfollow." on public.followers
  for delete using (auth.uid() = follower_id);
