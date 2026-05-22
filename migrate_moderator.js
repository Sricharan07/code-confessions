import pg from "pg";

const client = new pg.Client({
  user: "postgres.hmajzzaruwyqhtwasrdu",
  password: "DodgeViperSRT@999",
  host: "aws-1-us-east-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  ssl: {
    rejectUnauthorized: false
  }
});

const sql = `
-- 1. Add role column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- 2. Update existing 'admin' users to moderator role
UPDATE public.profiles SET role = 'moderator' WHERE username = 'admin';

-- 3. Update the handle_new_user trigger function to auto-assign moderator role to 'admin'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, status, is_guest, role)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'anon_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'status', 'ghost'),
    coalesce((new.raw_user_meta_data->>'is_guest')::boolean, false),
    CASE 
      WHEN coalesce(new.raw_user_meta_data->>'username', '') = 'admin' THEN 'moderator'
      ELSE 'user'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update posts RLS update/delete policies
DROP POLICY IF EXISTS "Users can update their own posts." ON public.posts;
CREATE POLICY "Users can update their own posts." ON public.posts
  FOR UPDATE USING (
    auth.uid() = author_session_id 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'moderator'
    )
  );

DROP POLICY IF EXISTS "Users can delete their own posts." ON public.posts;
CREATE POLICY "Users can delete their own posts." ON public.posts
  FOR DELETE USING (
    auth.uid() = author_session_id 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'moderator'
    )
  );

-- 5. Update comments RLS update/delete policies
DROP POLICY IF EXISTS "Users can update their own comments." ON public.comments;
CREATE POLICY "Users can update their own comments." ON public.comments
  FOR UPDATE USING (
    auth.uid() = author_session_id 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'moderator'
    )
  );

DROP POLICY IF EXISTS "Users can delete their own comments." ON public.comments;
CREATE POLICY "Users can delete their own comments." ON public.comments
  FOR DELETE USING (
    auth.uid() = author_session_id 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'moderator'
    )
  );
`;

async function run() {
  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL database!");
    await client.query(sql);
    console.log("Moderator permissions migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
