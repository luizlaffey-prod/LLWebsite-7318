import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { uploadAudio } from '@/lib/storage/r2';

const R2_KEY = 'system/transition-silence.mp3';
// 1.2s sits in the middle of the user's "1 to 1.5s" suggestion — long
// enough to land as a clear breath between stories, short enough to
// not feel like dead air. Stereo 44.1kHz / 192kbps matches the encode
// pipeline so the concat demuxer sees identical stream params on
// both sides of the silence and doesn't produce the "scratched
// record" artifact we were getting when stitching the ElevenLabs SFX
// sting in.
const SILENCE_DURATION_S = 1.2;

// Module-level cache so warm Vercel instances reuse the bytes across
// invocations without re-fetching or re-running ffmpeg.
let cachedBytes: Uint8Array | null = null;

/**
 * Returns the MP3 bytes of the transition gap that gets stitched
 * between consecutive blocks whose story (categoria) changes. Was
 * an ElevenLabs SFX whoosh — that produced audible glitches at the
 * concat boundary because the sting's stream params differed from
 * the voice MP3 enough to confuse the demuxer. Now it's just clean
 * silence at exactly the same sample-rate / channel-layout / bitrate
 * the rest of the pipeline targets, which makes the concat seamless.
 *
 * Generated once per deployment by ffmpeg's anullsrc + libmp3lame,
 * uploaded to R2 at `system/transition-silence.mp3`, and reused
 * forever. Returns null on any failure so the caller falls back to
 * a plain concat.
 */
export async function getTransitionStingBytes(): Promise<Uint8Array | null> {
  if (cachedBytes) return cachedBytes;

  // R2 first — cheapest, available across all function instances.
  const r2Url = guessR2PublicUrl(R2_KEY);
  if (r2Url) {
    try {
      const res = await fetch(r2Url);
      if (res.ok) {
        const buf = new Uint8Array(await res.arrayBuffer());
        cachedBytes = buf;
        return buf;
      }
    } catch {
      /* fall through to local generation */
    }
  }

  // Local ffmpeg generation — runs once per deploy if R2 doesn't have
  // it yet. anullsrc emits stereo silence at the chosen sample rate;
  // libmp3lame encodes to MP3 with the same params as the rest of the
  // pipeline (192k, 44.1kHz, stereo) so the concat demuxer is happy.
  let bytes: Uint8Array;
  const dir = await mkdtemp(join(tmpdir(), 'aura-silence-'));
  const outPath = join(dir, 'silence.mp3');
  try {
    await runFfmpeg([
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      `anullsrc=channel_layout=stereo:sample_rate=44100`,
      '-t',
      String(SILENCE_DURATION_S),
      '-c:a',
      'libmp3lame',
      '-b:a',
      '192k',
      '-ar',
      '44100',
      '-ac',
      '2',
      outPath,
    ]);
    bytes = new Uint8Array(await readFile(outPath));
  } catch (err) {
    console.warn('[sting] local silence generation failed', err);
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }

  // Best-effort R2 upload so the next cold start hits the fast path.
  try {
    await uploadAudio(R2_KEY, bytes, 'audio/mpeg');
  } catch (err) {
    console.warn('[sting] R2 upload failed; will regenerate next call', err);
  }

  cachedBytes = bytes;
  return bytes;
}

function guessR2PublicUrl(key: string): string | null {
  const publicHost = process.env.R2_PUBLIC_HOST;
  if (!publicHost) return null;
  const base = publicHost.replace(/\/$/, '');
  return `${base}/${key}`;
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
