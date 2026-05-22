-- ==========================================
-- 6. SAVES (Bookmarks)
-- ==========================================
create table public.saves (
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (post_id, user_id)
);

alter table public.saves enable row level security;

-- NOTE: Saves are PRIVATE. Users can only see their own saves!
create policy "Users can only see their own saves." on public.saves
  for select using (auth.uid() = user_id);

create policy "Authenticated users can save posts." on public.saves
  for insert with check (auth.uid() = user_id);

create policy "Users can unsave posts." on public.saves
  for delete using (auth.uid() = user_id);
