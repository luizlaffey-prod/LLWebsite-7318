import { describe, expect, it } from 'vitest';
import {
  ContentRequestInputSchema,
  LicenseHeartbeatRequestSchema,
  PairingExchangeSchema,
  RefreshTokenSchema,
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
    expect(parsed.speed).toBe(1);
    expect(parsed.includeWeather).toBe(false);
    expect(parsed.validForSeconds).toBe(86_400);
  });

  it('defaults to a bulletin with no background bed', () => {
    // A cama é opcional: quem não pedir continua recebendo locução seca, como
    // antes desta mudança.
    const parsed = ContentRequestInputSchema.parse({
      source: { mode: 'search', categories: ['general'] },
      durationSeconds: 60,
      language: 'pt',
    });
    expect(parsed.backgroundMode).toBe('none');
    expect(parsed.backgroundVolume).toBe(20);
    expect(parsed.duckBackground).toBe(true);
  });

  it('accepts an AI background bed with an explicit level', () => {
    const parsed = ContentRequestInputSchema.parse({
      source: { mode: 'search', categories: ['general'] },
      durationSeconds: 90,
      language: 'pt',
      backgroundMode: 'ai',
      backgroundVolume: 35,
      duckBackground: false,
    });
    expect(parsed.backgroundMode).toBe('ai');
    expect(parsed.backgroundVolume).toBe(35);
    expect(parsed.duckBackground).toBe(false);
  });

  it('rejects a background level outside the usable range', () => {
    const tooLoud = ContentRequestInputSchema.safeParse({
      source: { mode: 'search', categories: ['general'] },
      durationSeconds: 60,
      language: 'pt',
      backgroundVolume: 140,
    });
    expect(tooLoud.success).toBe(false);
  });

  it('rejects an upload background mode, which this endpoint cannot serve', () => {
    // O corpo da requisição é limitado e não comporta uma trilha de qualidade.
    // Recusar explicitamente é melhor que aceitar e ignorar em silêncio.
    const upload = ContentRequestInputSchema.safeParse({
      source: { mode: 'search', categories: ['general'] },
      durationSeconds: 60,
      language: 'pt',
      backgroundMode: 'upload',
    });
    expect(upload.success).toBe(false);
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
