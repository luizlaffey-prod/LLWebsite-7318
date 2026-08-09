import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { fetchWithRetry, FetchError } from '@/lib/utils/retry';

/**
 * Concatenates N MP3 chunks into a single, properly-muxed MP3 with correct
 * container metadata (Xing/LAME header, total duration, frame index). Used
 * instead of raw byte concat to ensure downstream consumers — desktop
 * players, WhatsApp, mobile share sheets — see a valid file.
 *
 * Raw byte concat works for tolerant decoders (browsers play it fine) but
 * the resulting file's header only describes the first chunk, which is
 * why players show 6s for a 60s bulletin and WhatsApp refuses to share
 * it. Re-encoding through libmp3lame guarantees a clean CBR output with
 * proper duration metadata; the ~300ms cost is invisible next to the
 * multi-second TTS roundtrip.
 *
 * Single-chunk inputs are still remuxed so the stored file is normalized
 * regardless of how many blocks the script generator produced.
 */
export async function concatMp3Bytes(
  chunks: Uint8Array[]
): Promise<Uint8Array> {
  if (chunks.length === 0) return new Uint8Array(0);

  const dir = await mkdtemp(join(tmpdir(), 'aura-concat-'));
  try {
    const files: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const p = join(dir, `chunk-${String(i).padStart(4, '0')}.mp3`);
      await writeFile(p, chunks[i]);
      files.push(p);
    }

    const outPath = join(dir, 'out.mp3');

    // Common encode args:
    //   -ac 2            stereo output. ElevenLabs returns mono per
    //                    voice call; libmp3lame upmixes by duplicating.
    //   -af volume+alimiter
    //                    +4dB simple gain (raises ElevenLabs' ~-23
    //                    dBFS peak to ~-19, still no clipping) plus a
    //                    safety limiter at 0.92 in case any block
    //                    runs hotter. Earlier we used loudnorm here
    //                    but single-pass loudnorm processes speech in
    //                    3s blocks and audibly flattens the voice
    //                    actor's expressiveness ("interpretação
    //                    piorou" — beta tester). Simple gain keeps
    //                    the rendered emotion intact and only fixes
    //                    the "audio is too quiet" gap.
    //   -b:a 192k        voice clarity bump.
    const ENCODE_ARGS = [
      '-c:a',
      'libmp3lame',
      '-b:a',
      '192k',
      '-ar',
      '44100',
      '-ac',
      '2',
      '-af',
      'volume=4dB,alimiter=limit=0.92',
    ];

    if (chunks.length === 1) {
      await runFfmpeg([
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        files[0],
        ...ENCODE_ARGS,
        outPath,
      ]);
    } else {
      const listPath = join(dir, 'list.txt');
      // ffmpeg's concat demuxer accepts a list of "file 'path'" lines.
      // We escape single quotes by closing the quoted string, inserting
      // an escaped quote, then reopening — same trick ffmpeg docs use.
      const body = files
        .map((f) => `file '${f.replace(/'/g, "'\\''")}'`)
        .join('\n');
      await writeFile(listPath, body);

      await runFfmpeg([
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        listPath,
        ...ENCODE_ARGS,
        outPath,
      ]);
    }

    return new Uint8Array(await readFile(outPath));
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Mixes the synthesized voice MP3 with a looping background track via
 * the bundled ffmpeg binary (@ffmpeg-installer/ffmpeg). Output is MP3.
 *
 * Supply EITHER bgUrl (fetched server-side, no CORS) OR bgBytes
 * directly (when the caller already has them in memory — e.g. from
 * a multipart upload that came from the browser).
 *
 * The bg track is downloaded to /tmp (Vercel allows up to 512 MB
 * there and clears it per invocation), the voice bytes are written
 * next to it, ffmpeg runs once, and the mixed bytes are returned.
 * Temp files are cleaned up even on error.
 *
 * When `duck` is true the bg lives at a low base level under the
 * voice but rises during sustained silences (>= 1s) and dips back
 * down ~0.5s before the voice resumes — the breathing/lookahead
 * envelope that makes radio bgs feel alive. Implemented by
 * detecting silences offline and synthesizing a piecewise volume
 * expression evaluated per-frame, not by a real-time sidechain
 * (which has no native lookahead in ffmpeg).
 */
export interface ServerMixInput {
  voiceBytes: Uint8Array;
  bgUrl?: string;
  /** Alternative to bgUrl — raw bytes already in memory. */
  bgBytes?: Uint8Array;
  /** Original filename when bgBytes is supplied — its extension
   * helps ffmpeg pick the right demuxer (most formats are detected
   * from content, but a correct ext never hurts). */
  bgFilename?: string;
  duck?: boolean;
  /**
   * Nível da trilha sob a locução, de 0 a 1. Omitido, usa o padrão da casa.
   * O nível nos intervalos de fala sobe proporcionalmente, preservando a
   * diferença que torna o ducking perceptível.
   */
  bgGain?: number;
}

const BG_GAIN_LOW = 0.18;
const BG_GAIN_HIGH = 0.4;
const SILENCE_MIN_SEC = 1.0;
const SILENCE_THRESHOLD_DB = -32;
/** How many seconds before voice resumes the bg starts ducking back. */
const LOOKAHEAD_SEC = 0.5;

export async function mixVoiceAndBackgroundServerSide(
  input: ServerMixInput
): Promise<Uint8Array> {
  if (!input.bgUrl && !input.bgBytes) {
    throw new Error('mix: either bgUrl or bgBytes must be provided');
  }
  const bgBytes = input.bgBytes ?? (await fetchBg(input.bgUrl!));

  const dir = await mkdtemp(join(tmpdir(), 'aura-mix-'));
  const voicePath = join(dir, 'voice.mp3');
  // Preserve the bg's extension so ffmpeg's demuxer picks the right one.
  const bgExt =
    (input.bgFilename ? guessExtFromName(input.bgFilename) : null) ||
    (input.bgUrl ? guessExt(input.bgUrl) : null) ||
    'mp3';
  const bgPath = join(dir, `bg.${bgExt}`);
  const outPath = join(dir, 'mixed.mp3');

  try {
    await Promise.all([
      writeFile(voicePath, input.voiceBytes),
      writeFile(bgPath, bgBytes),
    ]);

    // Detect silences in the voice track so we can build an explicit
    // gain envelope for the bg. Failures here fall back to a flat
    // static gain — the bulletin still ships, just without the
    // interactive ducking.
    const lowGain =
      typeof input.bgGain === 'number' && Number.isFinite(input.bgGain)
        ? Math.min(1, Math.max(0, input.bgGain))
        : BG_GAIN_LOW;
    // Sem ducking a trilha fica num nível fixo um pouco acima, já que não há
    // nada abrindo espaço para ela nos intervalos.
    let bgVolumeExpr: string = (
      input.duck === false ? Math.min(1, lowGain * 1.67) : lowGain
    ).toFixed(4);
    if (input.duck !== false) {
      try {
        const silences = await detectSilences(voicePath);
        bgVolumeExpr = buildBgVolumeExpression(silences, lowGain);
      } catch (err) {
        console.warn(
          '[mix] silencedetect failed, falling back to static duck',
          err instanceof Error ? err.message : err
        );
      }
    }

    // Mix chain:
    //   [1:a]aloop=loop=-1:size=...   → in-filter loop of the bg
    //                                   stream. Replaces -stream_loop
    //                                   which choked on short bg
    //                                   tracks. The filter-side loop
    //                                   operates on decoded samples
    //                                   and handles timestamps cleanly.
    //   [0:a]volume=4dB[v]            → bump voice the same +4dB the
    //                                   voice-only path applies.
    //   [bgLoop]volume=<expr>:eval=frame[bg]
    //                                 → piecewise time-varying gain.
    //                                   `eval=frame` re-evaluates the
    //                                   expression every frame so the
    //                                   silence-detected envelope
    //                                   actually animates the level.
    //   [v][bg]amix=duration=first    → blend, truncate to voice length.
    //   ,alimiter=limit=0.92          → safety limiter.
    //   ,aformat=channel_layouts=stereo
    //                                 → ensure 2 channels out.
    // size=536870912 is the buffer cap for aloop (~3.4h of mono PCM).
    const filterComplex =
      `[1:a]aloop=loop=-1:size=536870912[bgLoop];` +
      `[0:a]volume=4dB[v];` +
      `[bgLoop]volume='${bgVolumeExpr}':eval=frame[bg];` +
      `[v][bg]amix=inputs=2:duration=first:dropout_transition=0,` +
      `alimiter=limit=0.92,aformat=channel_layouts=stereo`;

    await runFfmpeg([
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      voicePath,
      '-i',
      bgPath,
      '-filter_complex',
      filterComplex,
      '-c:a',
      'libmp3lame',
      '-b:a',
      '192k',
      '-ar',
      '44100',
      outPath,
    ]);

    return new Uint8Array(await readFile(outPath));
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

interface SilenceSegment {
  start: number;
  end: number;
}

/**
 * Runs ffmpeg's silencedetect filter over the voice track to find
 * pauses longer than SILENCE_MIN_SEC. Returns the list of silence
 * intervals (in seconds from the file start).
 *
 * silencedetect logs to stderr in pairs:
 *   silence_start: <t>
 *   silence_end:   <t> | silence_duration: <d>
 * The match-all here is intentionally generous — if a trailing silence
 * runs to EOF, ffmpeg may omit silence_end, in which case we just
 * skip that orphaned start.
 */
async function detectSilences(voicePath: string): Promise<SilenceSegment[]> {
  const stderr = await runFfmpegCaptureStderr([
    '-hide_banner',
    '-i',
    voicePath,
    '-af',
    `silencedetect=n=${SILENCE_THRESHOLD_DB}dB:d=${SILENCE_MIN_SEC}`,
    '-f',
    'null',
    '-',
  ]);

  const starts: number[] = [];
  for (const m of stderr.matchAll(/silence_start:\s*([0-9.]+)/g)) {
    starts.push(parseFloat(m[1]));
  }
  const ends: number[] = [];
  for (const m of stderr.matchAll(/silence_end:\s*([0-9.]+)/g)) {
    ends.push(parseFloat(m[1]));
  }

  const out: SilenceSegment[] = [];
  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    if (ends[i] > starts[i]) out.push({ start: starts[i], end: ends[i] });
  }
  return out;
}

/**
 * Builds a ffmpeg `volume` filter expression that produces the
 * breathing-bg envelope: low under voice, high during sustained
 * silences, ducking back down LOOKAHEAD_SEC seconds before voice
 * resumes. Falls back to a flat low gain when no qualifying
 * silences are found.
 *
 * The expression is a chain of nested `if(between(t, a, b), HIGH, ...)`
 * clauses — one per silence window. For each silence, we open the
 * window at silence_start and close it `LOOKAHEAD_SEC` before
 * silence_end so the bg starts ducking back before the voice
 * actually returns. Silences shorter than that lookahead (rare,
 * since SILENCE_MIN_SEC >= 1.0) produce a degenerate empty window
 * and are skipped.
 */
function buildBgVolumeExpression(
  silences: SilenceSegment[],
  lowGain: number = BG_GAIN_LOW
): string {
  // The gap between the under-voice level and the in-silence level is what
  // makes the ducking audible. Scaling both keeps that relationship intact
  // when the operator picks a different bed level.
  const highGain = Math.min(1, lowGain * (BG_GAIN_HIGH / BG_GAIN_LOW));

  const windows: SilenceSegment[] = [];
  for (const s of silences) {
    const closeAt = s.end - LOOKAHEAD_SEC;
    if (closeAt > s.start) windows.push({ start: s.start, end: closeAt });
  }
  if (windows.length === 0) return lowGain.toFixed(4);

  // Nest from innermost out so the final string reads
  // `if(between, HIGH, if(between, HIGH, ...LOW))`.
  let expr = lowGain.toFixed(4);
  for (const w of windows) {
    expr = `if(between(t,${w.start.toFixed(3)},${w.end.toFixed(3)}),${highGain.toFixed(4)},${expr})`;
  }
  return expr;
}

/** Runs ffmpeg and returns stderr (silencedetect logs there). */
function runFfmpegCaptureStderr(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegInstaller.path, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', () => resolve(stderr));
  });
}

async function fetchBg(url: string): Promise<Uint8Array> {
  try {
    const res = await fetchWithRetry(url, {}, { timeoutMs: 60_000 });
    return new Uint8Array(await res.arrayBuffer());
  } catch (err) {
    if (err instanceof FetchError) {
      throw new Error(`bg_fetch_${err.status}: ${err.message}`);
    }
    throw err;
  }
}

function guessExt(url: string): string | null {
  const m = url.match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/);
  if (!m) return null;
  const ext = m[1].toLowerCase();
  if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'opus'].includes(ext)) {
    return ext;
  }
  return null;
}

function guessExtFromName(name: string): string | null {
  const m = name.match(/\.([a-zA-Z0-9]{2,5})$/);
  if (!m) return null;
  const ext = m[1].toLowerCase();
  if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'opus'].includes(ext)) {
    return ext;
  }
  return null;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegInstaller.path, args, { stdio: ['ignore', 'pipe', 'pipe'] });
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
