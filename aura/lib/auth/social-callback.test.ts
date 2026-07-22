import { describe, expect, it } from 'vitest';
import { resolveSocialCallbackURL } from './social-callback';

describe('resolveSocialCallbackURL (Google path)', () => {
  it('returns the validated internal callback so Studio Pro flow survives Google', () => {
    expect(
      resolveSocialCallbackURL('/en/studio-connect?client_id=studio-pro-desktop', 'en')
    ).toBe('/en/studio-connect?client_id=studio-pro-desktop');
  });

  it('falls back to the dashboard when there is no callback', () => {
    expect(resolveSocialCallbackURL(null, 'pt')).toBe('/pt/dashboard');
    expect(resolveSocialCallbackURL(undefined, 'es')).toBe('/es/dashboard');
  });

  it('refuses an external/open-redirect callback and falls back to dashboard', () => {
    expect(resolveSocialCallbackURL('https://evil.com', 'en')).toBe('/en/dashboard');
    expect(resolveSocialCallbackURL('//evil.com', 'en')).toBe('/en/dashboard');
  });
});
