import { describe, expect, it } from 'vitest';
import {
  isStudioEntitlementSource,
  STUDIO_BUNDLE_FEATURES,
  STUDIO_ENTITLEMENT_SOURCES,
} from './entitlement-sources';

describe('Studio entitlement sources', () => {
  it('recognizes exactly the four defined sources', () => {
    expect([...STUDIO_ENTITLEMENT_SOURCES]).toEqual([
      'bundle',
      'standalone',
      'trial',
      'admin',
    ]);
    for (const s of STUDIO_ENTITLEMENT_SOURCES) {
      expect(isStudioEntitlementSource(s)).toBe(true);
    }
  });

  it('rejects unknown sources', () => {
    for (const bad of ['gift', '', 'BUNDLE', null, undefined, 3]) {
      expect(isStudioEntitlementSource(bad)).toBe(false);
    }
  });

  it('bundle features include the desktop + content grants', () => {
    expect(STUDIO_BUNDLE_FEATURES).toContain('studio_pro_desktop');
    expect(STUDIO_BUNDLE_FEATURES).toContain('aura_content');
  });
});
