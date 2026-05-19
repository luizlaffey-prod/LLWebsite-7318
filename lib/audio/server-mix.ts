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
    //   -ac 2          force stereo output. ElevenLabs returns mono
    //                  per voice call; without this every voice-only
    //                  bulletin shipped as mono, which most playout
    //                  systems reject or upmix poorly.
    //   -af loudnorm   single-pass EBU R128 normaliser. I=-16 LUFS is
    //                  the podcast standard (safer headroom than the
    //                  streaming -14 LUFS once a station's compressor
    //                  hits). TP=-1.5 dBTP keeps peaks below clipping.
    //   -b:a 192k      voice clarity bump over the old 128k. ~25%
    //                  bigger file, indistinguishable from 256k on
    //                  speech.
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
      'loudnorm=I=-16:TP=-1.5:LRA=11',
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
 * The bg track is downloaded to /tmp (Vercel allows up to 512 MB there
 * and clears it per invocation), the voice bytes are written next to
 * it, ffmpeg runs once, and the mixed bytes are returned. Temp files
 * are cleaned up even on error.
 *
 * When `duck` is true the bg sits lower under the voice — closer to a
 * proper sidechain feel without the cost of running asidechain filter.
 */
export interface ServerMixInput {
  voiceBytes: Uint8Array;
  bgUrl: string;
  duck?: boolean;
}

export async function mixVoiceAndBackgroundServerSide(
  input: ServerMixInput
): Promise<Uint8Array> {
  const bgGain = input.duck === false ? 0.3 : 0.18;
  const bgBytes = await fetchBg(input.bgUrl);

  const dir = await mkdtemp(join(tmpdir(), 'aura-mix-'));
  const voicePath = join(dir, 'voice.mp3');
  // Preserve the bg's extension so ffmpeg's demuxer picks the right one.
  const bgExt = guessExt(input.bgUrl) || 'mp3';
  const bgPath = join(dir, `bg.${bgExt}`);
  const outPath = join(dir, 'mixed.mp3');

  try {
    await Promise.all([
      writeFile(voicePath, input.voiceBytes),
      writeFile(bgPath, bgBytes),
    ]);

    // Mix chain:
    //   [1:a]volume=N[bg]            → attenuate the bg track.
    //   [0:a][bg]amix=...             → blend voice + bg.
    //   ,aresample=44100              → defensive resample so the
    //                                   downstream loudnorm sees a
    //                                   known sample rate.
    //   ,loudnorm=I=-16:TP=-1.5       → EBU R128 single-pass; brings
    //                                   the mix to -16 LUFS so faint
    //                                   bulletins don't ship quiet.
    //   ,aformat=channel_layouts=stereo
    //                                 → guarantees 2 channels even if
    //                                   the bg was mono, so playout
    //                                   systems get the format they
    //                                   expect.
    await runFfmpeg([
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      voicePath,
      '-stream_loop',
      '-1',
      '-i',
      bgPath,
      '-filter_complex',
      `[1:a]volume=${bgGain}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=0,aresample=44100,loudnorm=I=-16:TP=-1.5:LRA=11,aformat=channel_layouts=stereo`,
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
