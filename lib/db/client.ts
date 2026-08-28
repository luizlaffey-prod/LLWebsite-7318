import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL || 'postgres://placeholder:placeholder@localhost:5432/placeholder';
const sql = neon(connectionString);

export const db = drizzle({ client: sql, schema });
export type DB = typeof db;
