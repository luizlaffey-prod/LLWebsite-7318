import { describe, expect, it } from 'vitest';
import { studioBootstrapOrgSlug } from './studio-bootstrap';

describe('studioBootstrapOrgSlug — collision-resistant tenant identity', () => {
  it('is deterministic for the same user (idempotent bootstrap)', () => {
    expect(studioBootstrapOrgSlug('user_abc')).toBe(studioBootstrapOrgSlug('user_abc'));
  });

  it('differs for different users, including near-identical / normalization-prone ids', () => {
    const a = studioBootstrapOrgSlug('user_abc');
    const b = studioBootstrapOrgSlug('user_abd');
    const c = studioBootstrapOrgSlug('User_ABC'); // case variant → different id
    const d = studioBootstrapOrgSlug('user-abc'); // punctuation variant
    expect(new Set([a, b, c, d]).size).toBe(4);
  });

  it('stays within the 64-char column and keeps the studio- prefix', () => {
    const s = studioBootstrapOrgSlug('x'.repeat(500));
    expect(s.startsWith('studio-')).toBe(true);
    expect(s.length).toBeLessThanOrEqual(64);
    expect(s).toMatch(/^studio-[0-9a-f]{40}$/);
  });
});
