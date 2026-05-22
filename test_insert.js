import pg from 'pg';

const client = new pg.Client({
  user: 'postgres.hmajzzaruwyqhtwasrdu',
  password: 'DodgeViperSRT@999',
  host: 'aws-1-us-east-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function main() {
  try {
    await client.connect();
    
    // Attempt insert mimicking createPostFn
    const id = '11111111-2222-3333-4444-555555555555';
    const title = 'test title validation length';
    const body = 'test body text that needs to be at least 20 chars long.';
    const tool = 'cursor';
    const vibe = 'vibe_coding';
    const verdict = 'still_broken';
    const plea = 'innocent';
    const aiDefense = 'test ai defense';
    const memeUrl = 'test meme url';
    const author = 'anon-test';
    const authorSessionId = '00000000-0000-0000-0000-000000000000'; // dummy uuid
    
    console.log("Attempting insert...");
    
    const query = {
      text: `INSERT INTO public.posts (
        id, title, body, tool, vibe, verdict, plea, ai_defense, meme_url, author, author_session_id, reactions, court, hidden
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      values: [
        id, title, body, tool, vibe, verdict, plea, aiDefense, memeUrl, author, authorSessionId,
        JSON.stringify({ cooked: 0, relatable: 0, segfault: 0, skill_issue: 0, rip_repo: 0, cursed: 0, samehere: 0 }),
        JSON.stringify({ ai_wrong: 0, skill_issue: 0 }),
        false
      ]
    };
    
    await client.query(query);
    console.log("Insert succeeded!");
    
    // clean up
    await client.query("DELETE FROM public.posts WHERE id = $1", [id]);
    console.log("Clean up succeeded!");
  } catch (err) {
    console.error("Error executing insert:", err);
  } finally {
    await client.end();
  }
}

main();
