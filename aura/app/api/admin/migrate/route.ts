import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import path from 'node:path';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.MIGRATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'MIGRATE_SECRET not configured' }, { status: 500 });
  }
  const token = req.headers.get('x-migrate-secret');
  if (token !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle({ client: sql });
    const folder = path.join(process.cwd(), 'drizzle');
    await migrate(db, { migrationsFolder: folder });
    return NextResponse.json({ ok: true, migrationsFolder: folder });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
