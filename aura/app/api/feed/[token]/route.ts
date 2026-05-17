import { NextResponse } from 'next/server';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { user, generatedAudio } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ITEMS = 50;

/**
 * Public per-user RSS 2.0 feed of ready bulletins. Radio automation
 * systems (Zetta, NexGen, RCS) and podcast catchers point at this URL
 * and pull new items on their own cadence — no outbound delivery,
 * which makes it the most reliable channel by far (no SMTP, no FTP
 * handshake, no webhook timeout).
 *
 * The token in the path IS the auth: it's a 32-byte hex string scoped
 * to one user, and rotating it from /settings/delivery invalidates
 * every external subscriber. There's no per-listener tracking — the
 * feed is treated like an unguessable secret URL.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  if (!token || token.length < 16) {
    return new NextResponse('not found', { status: 404 });
  }

  const [owner] = await db
    .select({
      id: user.id,
      radioName: user.radioName,
      locale: user.locale,
    })
    .from(user)
    .where(eq(user.feedToken, token))
    .limit(1);

  if (!owner) {
    return new NextResponse('not found', { status: 404 });
  }

  const items = await db
    .select({
      id: generatedAudio.id,
      title: generatedAudio.title,
      audioUrl: generatedAudio.audioUrl,
      durationSeconds: generatedAudio.durationSeconds,
      sourceName: generatedAudio.sourceName,
      createdAt: generatedAudio.createdAt,
    })
    .from(generatedAudio)
    .where(
      and(
        eq(generatedAudio.userId, owner.id),
        eq(generatedAudio.status, 'ready'),
        isNotNull(generatedAudio.audioUrl)
      )
    )
    .orderBy(desc(generatedAudio.createdAt))
    .limit(MAX_ITEMS);

  const station = owner.radioName?.trim() || 'AURA Radio';
  const channelTitle = `${station} — AURA Bulletins`;
  const channelDesc =
    'Automatically generated radio news bulletins, delivered as MP3 enclosures.';
  const channelLink = canonicalHost();
  const selfUrl = `${channelLink}/api/feed/${token}`;

  const xml = buildRss({
    channel: {
      title: channelTitle,
      description: channelDesc,
      link: channelLink,
      selfUrl,
      language: owner.locale,
      lastBuildDate: items[0]?.createdAt ?? new Date(),
    },
    items: items.map((item) => ({
      id: item.id,
      title: item.title || 'Bulletin',
      description: item.sourceName ?? '',
      audioUrl: item.audioUrl as string,
      durationSeconds: item.durationSeconds,
      pubDate: item.createdAt,
      link: `${channelLink}/${owner.locale}/audios`,
    })),
  });

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      // Light caching so a hot subscriber doesn't hammer the DB every
      // poll; new bulletins still surface within a minute.
      'Cache-Control': 'public, max-age=60, s-maxage=60',
    },
  });
}

function canonicalHost(): string {
  // Vercel exposes the production URL via VERCEL_PROJECT_PRODUCTION_URL
  // (no scheme). Fall back to NEXT_PUBLIC_APP_URL for local dev or
  // self-hosted deployments.
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

interface RssInput {
  channel: {
    title: string;
    description: string;
    link: string;
    selfUrl: string;
    language: string;
    lastBuildDate: Date;
  };
  items: Array<{
    id: string;
    title: string;
    description: string;
    audioUrl: string;
    durationSeconds: number;
    pubDate: Date;
    link: string;
  }>;
}

function buildRss(input: RssInput): string {
  const { channel, items } = input;
  const escapedItems = items
    .map(
      (it) => `    <item>
      <title>${esc(it.title)}</title>
      <description>${esc(it.description)}</description>
      <link>${esc(it.link)}</link>
      <guid isPermaLink="false">${esc(it.id)}</guid>
      <pubDate>${rfc822(it.pubDate)}</pubDate>
      <enclosure url="${esc(it.audioUrl)}" type="audio/mpeg" length="0"/>
      <itunes:duration>${formatItunesDuration(it.durationSeconds)}</itunes:duration>
    </item>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>${esc(channel.title)}</title>
    <description>${esc(channel.description)}</description>
    <link>${esc(channel.link)}</link>
    <language>${esc(channel.language)}</language>
    <lastBuildDate>${rfc822(channel.lastBuildDate)}</lastBuildDate>
    <atom:link href="${esc(channel.selfUrl)}" rel="self" type="application/rss+xml"/>
    <itunes:explicit>false</itunes:explicit>
${escapedItems}
  </channel>
</rss>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function rfc822(d: Date): string {
  // Node's toUTCString returns "Mon, 17 May 2026 18:30:00 GMT" — exactly
  // the RFC 822 form RSS readers expect.
  return d.toUTCString();
}

function formatItunesDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}
