import 'server-only';
import { emailInList } from './account-quota-policy';

/**
 * Explicit allowlist for product-owner and reference/test accounts whose
 * generation is intentionally unmetered. Customer plans never inherit this.
 */
export function isUnmeteredGenerationEmail(
  email: string | null | undefined
): boolean {
  return emailInList(process.env.UNMETERED_GENERATION_EMAILS, email);
}
