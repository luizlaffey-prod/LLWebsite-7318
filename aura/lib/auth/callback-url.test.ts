import { describe, expect, it } from 'vitest';
import { safeCallbackPath } from './callback-url';

describe('safeCallbackPath — open-redirect prevention', () => {
  it('accepts internal rooted paths', () => {
    expect(safeCallbackPath('/en/studio-connect?client_id=x')).toBe(
      '/en/studio-connect?client_id=x'
    );
    expect(safeCallbackPath('/pt/dashboard')).toBe('/pt/dashboard');
  });

  it('rejects absolute URLs, protocol-relative and backslash tricks', () => {
    for (const bad of [
      'https://evil.com',
      'http://evil.com/x',
      '//evil.com',
      '/\\evil.com',
      'evil.com',
      'javascript:alert(1)',
      '',
      null,
      undefined,
    ]) {
      expect(safeCallbackPath(bad as string)).toBeNull();
    }
  });

  it('rejects control characters', () => {
    expect(safeCallbackPath('/en/a\nb')).toBeNull();
    expect(safeCallbackPath('/en/a\tb')).toBeNull();
  });
});
