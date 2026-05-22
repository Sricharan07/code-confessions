-- ==========================================
-- 8. REPORTS & UPGRADED COMMENT POLICIES
-- ==========================================

-- 1. Create reports table
create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  reporter_session_id uuid references public.profiles(id) on delete set null,
  target_type text not null, -- 'post' or 'comment'
  target_id uuid not null,
  reason text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security
alter table public.reports enable row level security;

-- 3. RLS policy for inserting reports
drop policy if exists "Anyone can create reports." on public.reports;
create policy "Anyone can create reports." on public.reports
  for insert with check (true);

-- 4. RLS policy for viewing reports
drop policy if exists "Admins/Moderators can view reports." on public.reports;
create policy "Admins/Moderators can view reports." on public.reports
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'moderator'
    )
  );

-- 5. RLS policy for deleting reports
drop policy if exists "Admins/Moderators can delete reports." on public.reports;
create policy "Admins/Moderators can delete reports." on public.reports
  for delete using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'moderator'
    )
  );

-- 6. Upgraded comments RLS delete policy to allow post owners to moderate their comment sections
drop policy if exists "Users can delete their own comments." on public.comments;
create policy "Users can delete their own comments." on public.comments
  for delete using (
    auth.uid() = author_session_id 
    or exists (
      select 1 from public.posts
      where posts.id = post_id
      and posts.author_session_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'moderator'
    )
  );
