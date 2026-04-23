import 'dotenv/config';
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const r = await c.query('ALTER TABLE "Designer" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT');
console.log('Designer:', r.command);
await c.end();
