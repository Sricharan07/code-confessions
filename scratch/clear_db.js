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

async function run() {
  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL database!");

    // 1. Delete all reports
    console.log("Deleting reports...");
    await client.query("DELETE FROM public.reports;");

    // 2. Delete all comments
    console.log("Deleting comments...");
    await client.query("DELETE FROM public.comments;");

    // 3. Delete all reaction logs and court votes
    console.log("Deleting reactions and votes...");
    await client.query("DELETE FROM public.reaction_logs;");
    await client.query("DELETE FROM public.court_votes;");
    
    // 4. Delete rate limits
    console.log("Deleting rate limits...");
    await client.query("DELETE FROM public.rate_limits;");

    // 5. Delete all posts
    console.log("Deleting posts...");
    await client.query("DELETE FROM public.posts;");

    // 6. Delete all guest users from auth.users (cascades to profiles)
    console.log("Deleting guest users...");
    const res = await client.query("DELETE FROM auth.users WHERE email LIKE 'guest_%@vibefail.local';");
    console.log(`Deleted ${res.rowCount} guest users!`);

    console.log("Database reset complete! Fresh slate is ready.");
  } catch (err) {
    console.error("Database reset failed:", err);
  } finally {
    await client.end();
  }
}

run();
