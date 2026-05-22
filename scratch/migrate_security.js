import pg from "pg";
import fs from "fs";
import path from "path";

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

const sql = fs.readFileSync(path.join("supabase", "09_security_and_ip.sql"), "utf-8");

async function run() {
  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL database!");
    await client.query(sql);
    console.log("Security and IP logging migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
