import type { IntegrationContentInput } from '@/lib/db/schema';

/**
 * The AuraPress plan counter measures generated news bulletins. StudioPro
 * voice links are licensed through the separate `aura_content` entitlement
 * and must not consume (or be blocked by) the bulletin allowance.
 */
export function countsAgainstBulletinQuota(
  kind: IntegrationContentInput['kind']
): boolean {
  return kind === 'news_bulletin';
}

export function shouldResumeQuotaFailedRequest(
  status: string,
  errorCode: string | null | undefined
): boolean {
  return status === 'failed' && errorCode === 'quota_exceeded';
}
