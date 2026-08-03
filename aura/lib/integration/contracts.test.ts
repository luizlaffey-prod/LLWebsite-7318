import { describe, expect, it } from 'vitest';
import {
  ContentRequestInputSchema,
  LicenseHeartbeatRequestSchema,
  PairingExchangeSchema,
  RefreshTokenSchema,
  VoiceLinkDraftInputSchema,
  requestFingerprint,
  slugify,
} from './contracts';

describe('Studio Pro integration contracts', () => {
  it('normalizes defaults for a valid article request', () => {
    const parsed = ContentRequestInputSchema.parse({
      source: {
        mode: 'article',
        title: 'Local headline',
        description: 'A verified description.',
      },
      durationSeconds: 60,
      language: 'pt',
    });

    expect(parsed.kind).toBe('news_bulletin');
    if (parsed.kind !== 'news_bulletin') throw new Error('unexpected request kind');
    expect(parsed.speed).toBe(1);
    expect(parsed.includeWeather).toBe(false);
    expect(parsed.validForSeconds).toBe(86_400);
  });

  it('rejects an empty search and unsafe validity windows', () => {
    const result = ContentRequestInputSchema.safeParse({
      source: { mode: 'search', categories: [] },
      durationSeconds: 60,
      language: 'en',
      validForSeconds: 60,
    });
    expect(result.success).toBe(false);
  });

  it('normalizes a valid between-song voice link request', () => {
    const parsed = ContentRequestInputSchema.parse({
      kind: 'voice_link',
      mode: 'between_songs',
      scriptText: 'Você ouviu Luz do Mar. Agora, Céu em Movimento.',
      currentTrack: { title: 'Luz do Mar', artist: 'Aurora Urbana' },
      nextTracks: [{ title: 'Céu em Movimento', artist: 'Ecos do Sul' }],
      durationSeconds: 8,
      language: 'pt',
    });

    expect(parsed.kind).toBe('voice_link');
    if (parsed.kind !== 'voice_link') throw new Error('unexpected request kind');
    expect(parsed.tone).toBe('natural');
    expect(parsed.speed).toBe(1);
    expect(parsed.validForSeconds).toBe(86_400);
  });

  it('limits a voice link draft to four upcoming tracks', () => {
    const result = VoiceLinkDraftInputSchema.safeParse({
      mode: 'between_songs',
      currentTrack: { title: 'Atual', artist: 'Artista atual' },
      nextTracks: Array.from({ length: 5 }, (_, index) => ({
        title: `Próxima ${index + 1}`,
        artist: `Artista ${index + 1}`,
      })),
      language: 'pt',
    });

    expect(result.success).toBe(false);
  });

  it('creates stable request fingerprints independent of object key order', () => {
    const first = ContentRequestInputSchema.parse({
      source: {
        mode: 'article',
        title: 'Headline',
        description: 'Description',
      },
      durationSeconds: 30,
      language: 'en',
    });
    const second = ContentRequestInputSchema.parse({
      language: 'en',
      durationSeconds: 30,
      source: {
        description: 'Description',
        title: 'Headline',
        mode: 'article',
      },
    });
    expect(requestFingerprint(first)).toBe(requestFingerprint(second));
  });

  it('creates URL-safe slugs with a deterministic fallback', () => {
    expect(slugify('Rádio São João FM')).toBe('radio-sao-joao-fm');
    expect(slugify('---')).toBe('station');
  });

  it('requires device-key proof for pairing and refresh', () => {
    expect(
      PairingExchangeSchema.safeParse({
        code: 'ABCD-EFGH',
        deviceName: 'On-air PC',
        platform: 'windows',
      }).success
    ).toBe(false);
    expect(
      RefreshTokenSchema.safeParse({ refreshToken: `aura_rt_${'x'.repeat(48)}` })
        .success
    ).toBe(false);
  });

  it('requires a signed proof for every on-air heartbeat', () => {
    expect(
      LicenseHeartbeatRequestSchema.safeParse({
        leaseId: 'e7bb0e9b-ff3d-48b6-8355-f485741503ec',
        sessionId: '79725216-0a37-48e7-8047-a0762a0da9e5',
        outputId: 'main',
        state: 'on_air',
        appVersion: '0.1.0',
      }).success
    ).toBe(false);
  });
});
