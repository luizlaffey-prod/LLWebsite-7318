/**
 * Client-side audio mixing for bulletin drawer (strategy "3b"):
 * the server generates voice-only MP3, the browser overlays a
 * user-selected background track without uploading it anywhere.
 *
 * Output is a 16-bit PCM WAV Blob. WAV is bigger than MP3 but
 * needs no encoder dependency; stations can transcode if needed.
 */

export interface MixOptions {
  voiceUrl: string;
  /** Local file (upload path). */
  bgFile?: File;
  /** Remote URL for a previously uploaded background track. */
  bgUrl?: string;
  /** Background gain 0..1 — keep low so the voice stays on top. */
  bgGain?: number;
}

export async function mixVoiceWithBackground({
  voiceUrl,
  bgFile,
  bgUrl,
  bgGain = 0.22,
}: MixOptions): Promise<Blob> {
  if (!bgFile && !bgUrl) {
    throw new Error('mix: either bgFile or bgUrl must be provided');
  }

  const tempCtx = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext)();

  let bgArrayBuffer: ArrayBuffer;
  if (bgFile) {
    bgArrayBuffer = await bgFile.arrayBuffer();
  } else {
    const res = await fetch(bgUrl as string);
    if (!res.ok) {
      console.error('[mix] bg fetch failed', {
        url: bgUrl,
        status: res.status,
        contentType: res.headers.get('content-type'),
      });
      throw new Error(`mix_bg_fetch_${res.status}`);
    }
    bgArrayBuffer = await res.arrayBuffer();
    console.log('[mix] bg fetched', {
      url: bgUrl,
      contentType: res.headers.get('content-type'),
      bytes: bgArrayBuffer.byteLength,
    });
  }

  let voiceBuf: AudioBuffer;
  let bgBuf: AudioBuffer;
  try {
    [voiceBuf, bgBuf] = await Promise.all([
      fetch(voiceUrl)
        .then((r) => r.arrayBuffer())
        .then((b) => tempCtx.decodeAudioData(b)),
      // decodeAudioData mutates the buffer — slice() defends against the
      // implementations that detach the original.
      tempCtx.decodeAudioData(bgArrayBuffer.slice(0)),
    ]);
  } catch (err) {
    console.error('[mix] decodeAudioData failed', err);
    await tempCtx.close();
    throw err;
  }
  await tempCtx.close();

  const channels = Math.max(voiceBuf.numberOfChannels, bgBuf.numberOfChannels, 2);
  const sampleRate = voiceBuf.sampleRate;
  const frames = Math.ceil(voiceBuf.duration * sampleRate);
  const offline = new OfflineAudioContext(channels, frames, sampleRate);

  const voiceNode = offline.createBufferSource();
  voiceNode.buffer = voiceBuf;
  voiceNode.connect(offline.destination);
  voiceNode.start(0);

  const bgNode = offline.createBufferSource();
  bgNode.buffer = bgBuf;
  bgNode.loop = true;
  const gain = offline.createGain();
  gain.gain.value = bgGain;
  bgNode.connect(gain).connect(offline.destination);
  bgNode.start(0);
  bgNode.stop(voiceBuf.duration);

  const rendered = await offline.startRendering();
  return audioBufferToWavBlob(rendered);
}

function audioBufferToWavBlob(buf: AudioBuffer): Blob {
  const numChannels = buf.numberOfChannels;
  const sampleRate = buf.sampleRate;
  const length = buf.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buf.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeAscii(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
