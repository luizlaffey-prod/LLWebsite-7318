import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { generatedAudio, user } from '@/lib/db/schema';
import { effectiveTier } from '@/lib/billing/quota';
import type { PlanTier } from '@/lib/billing/plans';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Streams the audio as uncompressed WAV (PCM 16-bit, 44.1 kHz, stereo).
 * Pro-only: WAV is the broadcast-friendly format, included in the Pro
 * tier marketing so we gate the route to match.
 *
 * Implementation: fetch the cached MP3 from R2, run ffmpeg to
 * transcode in-place. We're not regenerating from the original blocks
 * because the MP3 was already encoded at 192k from the raw TTS
   * output — re-rendering would consume synthesis credits to produce
 * an audio bit-stream that the listener can't distinguish from the
 * MP3-sourced one. Same audible content, container differs.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return new Response('unauthorized', { status: 401 });
  }

  // Tier gate.
  const [u] = await db
    .select({ plan: user.plan })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const tier: PlanTier = effectiveTier(u?.plan);
  if (tier !== 'pro') {
    return new Response('feature_not_available', { status: 403 });
  }

  const { id } = await ctx.params;
  const [row] = await db
    .select({
      audioUrl: generatedAudio.audioUrl,
      title: generatedAudio.title,
    })
    .from(generatedAudio)
    .where(
      and(eq(generatedAudio.id, id), eq(generatedAudio.userId, session.user.id))
    )
    .limit(1);

  if (!row) return new Response('not_found', { status: 404 });
  if (!row.audioUrl) return new Response('not_ready', { status: 425 });

  const upstream = await fetch(row.audioUrl);
  if (!upstream.ok) {
    return new Response(`upstream_${upstream.status}`, { status: 502 });
  }
  const mp3Bytes = new Uint8Array(await upstream.arrayBuffer());

  const dir = await mkdtemp(join(tmpdir(), 'aura-wav-'));
  const mp3Path = join(dir, 'in.mp3');
  const wavPath = join(dir, 'out.wav');
  let wavBytes: Uint8Array;
  try {
    await writeFile(mp3Path, mp3Bytes);
    await runFfmpeg([
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      mp3Path,
      // Uncompressed PCM. 16-bit signed little-endian is the most
      // universally accepted WAV variant for radio playout software
      // (Zetta, RCS, NexGen, AudioVault) and DAWs.
      '-c:a',
      'pcm_s16le',
      '-ar',
      '44100',
      '-ac',
      '2',
      wavPath,
    ]);
    wavBytes = new Uint8Array(await readFile(wavPath));
  } catch (err) {
    console.error('[wav-export] ffmpeg failed', err);
    return new Response('transcode_failed', { status: 502 });
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }

  const filename = sanitizeFilename(row.title) + '.wav';

  return new Response(wavBytes as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Length': String(wavBytes.byteLength),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-cache',
    },
  });
}

function sanitizeFilename(raw: string): string {
  const slug = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  return slug || 'aura';
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegInstaller.path, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-400)}`));
    });
  });
}
