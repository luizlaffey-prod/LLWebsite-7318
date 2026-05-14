import 'server-only';
import { headers } from 'next/headers';
import { auth } from './config';
import type { Session } from './config';

export async function getSession(): Promise<Session | null> {
  const res = await auth.api.getSession({ headers: await headers() });
  return res as Session | null;
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  return session;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('unauthorized');
    this.name = 'UnauthorizedError';
  }
}
