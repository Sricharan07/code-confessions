-- ==========================================
-- 7. AUTH TRIGGER (Automatic Profile Creation)
-- ==========================================
-- This function automatically creates a row in public.profiles whenever a new user signs up.
-- It expects the frontend to pass 'username' and 'status' in the user_metadata.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'anon_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'status', 'ghost')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
