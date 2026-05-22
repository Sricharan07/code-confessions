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
-- 1. Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_session_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_type text NOT NULL, -- 'post' or 'comment'
  target_id uuid NOT NULL,
  reason text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 3. RLS policy for inserting reports
DROP POLICY IF EXISTS "Anyone can create reports." ON public.reports;
CREATE POLICY "Anyone can create reports." ON public.reports
  FOR INSERT WITH CHECK (true);

-- 4. RLS policy for viewing reports
DROP POLICY IF EXISTS "Admins/Moderators can view reports." ON public.reports;
CREATE POLICY "Admins/Moderators can view reports." ON public.reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'moderator'
    )
  );

-- 5. RLS policy for deleting reports
DROP POLICY IF EXISTS "Admins/Moderators can delete reports." ON public.reports;
CREATE POLICY "Admins/Moderators can delete reports." ON public.reports
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'moderator'
    )
  );

-- 6. Upgraded comments RLS delete policy to allow post owners to moderate their comment sections
DROP POLICY IF EXISTS "Users can delete their own comments." ON public.comments;
CREATE POLICY "Users can delete their own comments." ON public.comments
  FOR DELETE USING (
    auth.uid() = author_session_id 
    OR EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = post_id
      AND posts.author_session_id = auth.uid()
    )
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
    console.log("Reports and Comment RLS migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
