import { describe, expect, it } from 'vitest';
import { rateBucket, windowStartMs } from './rate-limit';

describe('fixed-window rate-limit math', () => {
  it('snaps a timestamp to the start of its window', () => {
    const w = 60_000;
    expect(windowStartMs(0, w)).toBe(0);
    expect(windowStartMs(59_999, w)).toBe(0);
    expect(windowStartMs(60_000, w)).toBe(60_000);
    expect(windowStartMs(125_000, w)).toBe(120_000);
  });

  it('produces one stable bucket per (key, window) and rotates across windows', () => {
    const w = 60_000;
    const a1 = rateBucket('k', windowStartMs(10_000, w));
    const a2 = rateBucket('k', windowStartMs(50_000, w));
    const b = rateBucket('k', windowStartMs(70_000, w));
    expect(a1).toBe(a2); // same window → same bucket
    expect(a1).not.toBe(b); // next window → new bucket
  });
});
