import { createHash } from 'node:crypto';

/**
 * Collision-resistant, deterministic organization slug for the auto-bootstrap
 * of a brand-new Studio Pro account. Derived from a SHA-256 of the user id
 * (not a human/name-derived slug), so two different users can never normalize
 * or truncate to the same tenant identity, while the same user always maps to
 * the same slug (idempotent). Fixed length, well under the 64-char column.
 */
export function studioBootstrapOrgSlug(userId: string): string {
  const digest = createHash('sha256').update(userId).digest('hex').slice(0, 40);
  return `studio-${digest}`;
}
