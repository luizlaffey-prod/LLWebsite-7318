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

  it('accepts a song without artist metadata', () => {
    const parsed = VoiceLinkDraftInputSchema.parse({
      mode: 'between_songs',
      currentTrack: { title: 'Solo Piano' },
      nextTracks: [{ title: 'Night Walk' }],
      language: 'en',
    });
    expect(parsed.currentTrack.title).toBe('Solo Piano');
    expect(parsed.currentTrack.artist).toBeUndefined();
  });

  it('validates device pairing payload proof and key format', () => {
    const valid = PairingExchangeSchema.safeParse({
      code: 'A1B2C3D4',
      deviceName: 'Main On-Air DAW',
      platform: 'windows',
      deviceKeyAlgorithm: 'ES256',
      devicePublicKey: 'MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAE'.repeat(3),
      pairingProof: 'a'.repeat(80),
    });
    expect(valid.success).toBe(true);
  });

  it('validates refresh payload tokens and proof', () => {
    const valid = RefreshTokenSchema.safeParse({
      refreshToken: 'r'.repeat(64),
      refreshProof: 'p'.repeat(80),
    });
    expect(valid.success).toBe(true);
  });

  it('validates heartbeat payload shapes', () => {
    const valid = LicenseHeartbeatRequestSchema.safeParse({
      leaseId: '11111111-1111-4111-8111-111111111111',
      sessionId: '22222222-2222-4222-8222-222222222222',
      outputId: 'out-main',
      state: 'on_air',
      appVersion: '0.1.0-alpha.25',
      proof: {
        challengeId: '33333333-3333-4333-8333-333333333333',
        challenge: 'c'.repeat(43),
        signature: 's'.repeat(80),
      },
    });
    expect(valid.success).toBe(true);
  });

  it('creates stable fingerprints for content requests regardless of key order', () => {
    const fp1 = requestFingerprint({
      kind: 'news_bulletin',
      source: { mode: 'search', categories: ['sports', 'tech'], bias: 'center', geographicScope: 'global' },
      durationSeconds: 60,
      language: 'pt',
      speed: 1,
      includeWeather: false,
      weatherFormat: 'separate',
      transitionEffects: false,
      backgroundMode: 'none',
      backgroundVolume: 20,
      duckBackground: true,
      validForSeconds: 86_400,
    });
    const fp2 = requestFingerprint({
      validForSeconds: 86_400,
      duckBackground: true,
      backgroundVolume: 20,
      backgroundMode: 'none',
      transitionEffects: false,
      weatherFormat: 'separate',
      includeWeather: false,
      speed: 1,
      language: 'pt',
      durationSeconds: 60,
      source: { geographicScope: 'global', bias: 'center', categories: ['sports', 'tech'], mode: 'search' },
      kind: 'news_bulletin',
    });
    expect(fp1).toBe(fp2);
  });

  it('generates consistent station slugs', () => {
    expect(slugify('Rádio Cidade FM 101.5')).toBe('radio-cidade-fm-101-5');
    expect(slugify('  São Paulo   News  ')).toBe('sao-paulo-news');
    expect(slugify('!!!')).toBe('station');
  });
});
