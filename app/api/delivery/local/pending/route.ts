import { NextResponse } from 'next/server';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import {
  deliveryEndpoint,
  deliveryLog,
  generatedAudio,
} from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Returns the list of delivery_log rows the operator's browser still
 * has to drop into the local folder. The client-side worker polls this
 * while the AURA tab is open: for each row, it fetches the audio bytes
 * from audioUrl, writes them under filenameSuggestion, then POSTs the
 * sibling /ack route to mark the row as 'success'.
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rows = await db
    .select({
      logId: deliveryLog.id,
      audioId: generatedAudio.id,
      audioUrl: generatedAudio.audioUrl,
      title: generatedAudio.title,
      namingPattern: deliveryEndpoint.slotNamingPattern,
      createdAt: deliveryLog.createdAt,
    })
    .from(deliveryLog)
    .innerJoin(
      deliveryEndpoint,
      eq(deliveryEndpoint.id, deliveryLog.deliveryEndpointId)
    )
    .innerJoin(generatedAudio, eq(generatedAudio.id, deliveryLog.audioId))
    .where(
      and(
        eq(deliveryEndpoint.userId, session.user.id),
        eq(deliveryEndpoint.type, 'local_folder'),
        eq(deliveryEndpoint.enabled, true),
        eq(deliveryLog.status, 'pending'),
        isNotNull(generatedAudio.audioUrl)
      )
    )
    .orderBy(desc(deliveryLog.createdAt))
    .limit(50);

  const pending = rows.map((r) => ({
    logId: r.logId,
    audioId: r.audioId,
    audioUrl: r.audioUrl,
    title: r.title,
    filename: renderName(r.namingPattern, {
      name: r.title,
      date: r.createdAt.toISOString().slice(0, 10),
    }),
  }));

  return NextResponse.json({ pending });
}

function renderName(pattern: string, ctx: { name: string; date: string }): string {
  const safeName = ctx.name
    .replace(/[\/\\:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_');
  return pattern
    .replace(/\{\{name\}\}/g, safeName)
    .replace(/\{\{date\}\}/g, ctx.date);
}
