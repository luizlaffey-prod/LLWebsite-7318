import { describe, expect, it } from 'vitest';
import {
  findReusableFishModel,
  fishReferenceId,
  parseFishModelId,
} from './fish-audio-contract';

describe('Fish Audio contract', () => {
  it('reads the documented _id field and keeps legacy id compatibility', () => {
    expect(parseFishModelId({ _id: 'fish-model-id' })).toBe('fish-model-id');
    expect(parseFishModelId({ id: 'legacy-model-id' })).toBe('legacy-model-id');
  });

  it('rejects missing or malformed model IDs', () => {
    expect(parseFishModelId({})).toBeNull();
    expect(parseFishModelId({ _id: '' })).toBeNull();
    expect(parseFishModelId({ _id: { value: 'nested' } })).toBeNull();
  });

  it('omits the provider default placeholder from TTS requests', () => {
    expect(fishReferenceId('fish:default')).toBeUndefined();
    expect(fishReferenceId('default')).toBeUndefined();
    expect(fishReferenceId('fish:abc123')).toBe('abc123');
  });

  it('recovers only a recent owned-model candidate with the exact title', () => {
    const now = new Date('2026-08-28T23:00:00.000Z');
    const result = findReusableFishModel(
      {
        items: [
          {
            _id: 'older',
            title: 'aAhsoG-Tony T New',
            type: 'tts',
            state: 'created',
            created_at: '2026-08-28T21:00:00.000Z',
          },
          {
            _id: 'newer',
            title: 'aAhsoG-Tony T New',
            type: 'tts',
            state: 'trained',
            created_at: '2026-08-28T22:00:00.000Z',
          },
          {
            _id: 'other-user',
            title: 'other-Tony T New',
            type: 'tts',
            state: 'trained',
            created_at: '2026-08-28T22:30:00.000Z',
          },
        ],
      },
      'aAhsoG-Tony T New',
      now
    );

    expect(result).toEqual({ id: 'newer', title: 'aAhsoG-Tony T New' });
  });

  it('does not reuse stale or failed clones', () => {
    const now = new Date('2026-08-28T23:00:00.000Z');
    expect(
      findReusableFishModel(
        {
          items: [
            {
              _id: 'failed',
              title: 'aAhsoG-Tony T New',
              type: 'tts',
              state: 'failed',
              created_at: '2026-08-28T22:00:00.000Z',
            },
            {
              _id: 'stale',
              title: 'aAhsoG-Tony T New',
              type: 'tts',
              state: 'trained',
              created_at: '2026-08-25T22:00:00.000Z',
            },
          ],
        },
        'aAhsoG-Tony T New',
        now
      )
    ).toBeNull();
  });
});
