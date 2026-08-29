import { describe, expect, it } from 'vitest';
import {
  countsAgainstBulletinQuota,
  shouldResumeQuotaFailedRequest,
} from './content-quota-policy';

describe('countsAgainstBulletinQuota', () => {
  it('charges news bulletins to the AuraPress daily bulletin allowance', () => {
    expect(countsAgainstBulletinQuota('news_bulletin')).toBe(true);
  });

  it('does not charge StudioPro voice links to the bulletin allowance', () => {
    expect(countsAgainstBulletinQuota('voice_link')).toBe(false);
  });

  it('resumes only requests that failed because quota was exhausted', () => {
    expect(shouldResumeQuotaFailedRequest('failed', 'quota_exceeded')).toBe(true);
    expect(shouldResumeQuotaFailedRequest('failed', 'generation_failed')).toBe(false);
    expect(shouldResumeQuotaFailedRequest('ready', 'quota_exceeded')).toBe(false);
    expect(shouldResumeQuotaFailedRequest('processing', null)).toBe(false);
  });
});
