import { describe, expect, it } from 'vitest';
import { countsAgainstBulletinQuota } from './content-quota-policy';

describe('countsAgainstBulletinQuota', () => {
  it('charges news bulletins to the AuraPress daily bulletin allowance', () => {
    expect(countsAgainstBulletinQuota('news_bulletin')).toBe(true);
  });

  it('does not charge StudioPro voice links to the bulletin allowance', () => {
    expect(countsAgainstBulletinQuota('voice_link')).toBe(false);
  });
});
