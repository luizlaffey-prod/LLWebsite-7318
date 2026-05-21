import { NextResponse } from 'next/server';
import { earlyAccessSchema } from '@/lib/early-access/schema';
import { sendEarlyAccessLeadEmail } from '@/lib/email/send';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = earlyAccessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation' }, { status: 400 });
  }

  try {
    await sendEarlyAccessLeadEmail({
      lead: parsed.data,
      submittedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[early-access] send failed', err);
    return NextResponse.json({ error: 'send_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
