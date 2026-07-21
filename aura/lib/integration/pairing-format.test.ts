import { describe, expect, it } from 'vitest';
import { formatPairingCode, remainingMs, formatCountdown } from './pairing-format';

describe('Studio Pro pairing-code formatting', () => {
  it('formats an 8-char code as ABCD-EFGH', () => {
    expect(formatPairingCode('ABCDEFGH')).toBe('ABCD-EFGH');
  });

  it('uppercases and strips separators/whitespace', () => {
    expect(formatPairingCode('abcd-efgh')).toBe('ABCD-EFGH');
    expect(formatPairingCode(' ab cd ef gh ')).toBe('ABCD-EFGH');
  });

  it('groups non-8 lengths into 4-char blocks', () => {
    expect(formatPairingCode('ABCDEF')).toBe('ABCD-EF');
    expect(formatPairingCode('ABCDEFGHIJ')).toBe('ABCD-EFGH-IJ');
  });
});

describe('Studio Pro pairing-code countdown', () => {
  const now = Date.parse('2026-07-21T12:00:00.000Z');

  it('returns the remaining window and clamps expired codes at 0', () => {
    expect(remainingMs('2026-07-21T12:10:00.000Z', now)).toBe(10 * 60_000);
    expect(remainingMs('2026-07-21T11:59:00.000Z', now)).toBe(0);
  });

  it('treats an unparseable expiry as expired', () => {
    expect(remainingMs('not-a-date', now)).toBe(0);
  });

  it('formats durations as M:SS', () => {
    expect(formatCountdown(10 * 60_000)).toBe('10:00');
    expect(formatCountdown(65_000)).toBe('1:05');
    expect(formatCountdown(9_000)).toBe('0:09');
    expect(formatCountdown(-5_000)).toBe('0:00');
  });
});
