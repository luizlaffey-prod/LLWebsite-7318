/**
 * Presentation helpers for the Studio Pro pairing code. Kept pure (no React,
 * no DB) so they're trivially testable and shared by the panel UI.
 */

/**
 * Formats an 8-character pairing code as `ABCD-EFGH`. Uppercases and strips
 * any non-alphanumeric characters first, then groups into 4-char blocks so
 * codes of other lengths still render sensibly.
 */
export function formatPairingCode(code: string): string {
  const clean = code.replace(/[^a-z0-9]/gi, '').toUpperCase();
  const groups: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    groups.push(clean.slice(i, i + 4));
  }
  return groups.join('-');
}

/** Milliseconds until `expiresAtISO`, clamped at 0. `now` is injectable for tests. */
export function remainingMs(expiresAtISO: string, now: number = Date.now()): number {
  const expiry = Date.parse(expiresAtISO);
  if (Number.isNaN(expiry)) return 0;
  return Math.max(0, expiry - now);
}

/** Formats a millisecond duration as `M:SS` for a countdown. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
