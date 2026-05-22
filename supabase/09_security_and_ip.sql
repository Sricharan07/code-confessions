-- ==========================================
-- 9. SECURITY LAYER: AUDIT LOGS FOR IP LOGGING
-- ==========================================

create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.profiles(id) on delete set null,
  action_type text not null, -- 'post' or 'comment'
  target_id uuid not null,
  client_ip text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.audit_logs enable row level security;

-- Policies: Nobody is allowed to view audit logs from the client.
-- Only the service role (which bypasses RLS) can read/select from this table.
drop policy if exists "Disable select for everyone." on public.audit_logs;
create policy "Disable select for everyone." on public.audit_logs
  for select using (false);

-- Allow server functions to insert
drop policy if exists "Enable insert for server actions." on public.audit_logs;
create policy "Enable insert for server actions." on public.audit_logs
  for insert with check (true);
