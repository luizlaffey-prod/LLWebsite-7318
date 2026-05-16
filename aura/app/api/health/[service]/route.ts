import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { isAdminSession } from '@/lib/auth/admin';
import { checkOne, SERVICES, type HealthService } from '@/lib/health/checks';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ service: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { service } = await ctx.params;
  if (!SERVICES.includes(service as HealthService)) {
    return NextResponse.json({ error: 'unknown_service' }, { status: 404 });
  }
  const result = await checkOne(service as HealthService);
  return NextResponse.json({ result });
}
