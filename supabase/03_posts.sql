-- ==========================================
-- 3. POSTS (Confessions)
-- ==========================================
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  body text not null,
  image_url text, -- Optional image attached to the confession
  tool text not null,
  status text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.posts enable row level security;

create policy "Posts are viewable by everyone." on public.posts
  for select using (true);

create policy "Authenticated users can create posts." on public.posts
  for insert with check (auth.uid() = author_id);

create policy "Users can update their own posts." on public.posts
  for update using (auth.uid() = author_id);

create policy "Users can delete their own posts." on public.posts
  for delete using (auth.uid() = author_id);
