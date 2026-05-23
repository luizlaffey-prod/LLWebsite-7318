import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { feedbackSchema } from '@/lib/feedback/schema';
import { sendFeedbackEmail } from '@/lib/email/send';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * In-app feedback funnel. Authenticated users send a short message
 * (categorized) that gets emailed to contact@aurapress.app with
 * their identity attached server-side — the client never has to
 * transmit who they are.
 *
 * Pre-PMF this is the highest-ROI feature loop: silent churners
 * leave, vocal ones engage. Cheap to ship, expensive to skip.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation' }, { status: 400 });
  }

  // Pull identity from session, not the request body — prevents a
  // user impersonating someone else in the reply-to header.
  const [dbUser] = await db
    .select({
      email: user.email,
      name: user.name,
      radioName: user.radioName,
      plan: user.plan,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  const senderEmail = dbUser?.email ?? session.user.email ?? '';
  if (!senderEmail) {
    return NextResponse.json({ error: 'no_email_on_account' }, { status: 400 });
  }

  try {
    await sendFeedbackEmail({
      category: parsed.data.category,
      message: parsed.data.message,
      pageUrl: parsed.data.pageUrl,
      user: {
        email: senderEmail,
        radioName: dbUser?.radioName ?? null,
        name: dbUser?.name ?? null,
        plan: dbUser?.plan ?? null,
      },
      submittedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[feedback] send failed', err);
    return NextResponse.json({ error: 'send_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
