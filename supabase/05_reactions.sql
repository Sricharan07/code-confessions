-- ==========================================
-- 5. REACTIONS
-- ==========================================
create table public.reactions (
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  reaction_type text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (post_id, user_id, reaction_type)
);

alter table public.reactions enable row level security;

create policy "Reactions are viewable by everyone." on public.reactions
  for select using (true);

create policy "Authenticated users can react." on public.reactions
  for insert with check (auth.uid() = user_id);

create policy "Users can remove their own reactions." on public.reactions
  for delete using (auth.uid() = user_id);
