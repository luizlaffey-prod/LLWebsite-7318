/**
 * Validates a post-auth `callbackURL` so login/signup can return the user to
 * an internal page (e.g. the Studio Pro consent screen) without becoming an
 * open redirect. Only same-origin absolute paths are allowed — anything with
 * a scheme, host, protocol-relative `//`, backslash trick, or control char is
 * rejected (callers fall back to the dashboard).
 */
export function safeCallbackPath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  if (raw.length > 2048) return null;
  if (!raw.startsWith('/')) return null; // must be a rooted path
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null; // protocol-relative
  for (let i = 0; i < raw.length; i += 1) {
    if (raw.charCodeAt(i) < 0x20) return null; // no control characters
  }
  return raw;
}
