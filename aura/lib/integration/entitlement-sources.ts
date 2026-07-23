/**
 * Vocabulary for the Studio Pro + AURA commercial bundle. Kept pure and
 * provider-agnostic: entitlements grant *features and limits*, never behavior
 * keyed off a price name. No Stripe IDs or prices are defined here — that is
 * deliberately deferred.
 */

/** Where an entitlement came from. Recorded on `studio_entitlement.source`. */
export const STUDIO_ENTITLEMENT_SOURCES = [
  'bundle', // a single Studio Pro + AURA purchase
  'standalone', // Studio Pro bought on its own
  'trial', // auto-provisioned trial
  'admin', // manual/administrative grant
] as const;

export type StudioEntitlementSource = (typeof STUDIO_ENTITLEMENT_SOURCES)[number];

export function isStudioEntitlementSource(
  value: unknown
): value is StudioEntitlementSource {
  return (
    typeof value === 'string' &&
    (STUDIO_ENTITLEMENT_SOURCES as readonly string[]).includes(value)
  );
}

/**
 * Feature set a full Studio Pro + AURA bundle is expected to grant. Used to
 * shape entitlements when bundle billing is wired up later; today it only
 * documents the intent (the trial grants a subset via DEFAULT_STUDIO_FEATURES).
 */
export const STUDIO_BUNDLE_FEATURES = [
  'studio_pro_desktop',
  'aura_content',
] as const;

/**
 * Shape of a bundle entitlement, for reference when a single subscription
 * later provisions both products. Mirrors the columns already on
 * `studio_entitlement` plus AURA-side quota/voice/format allowances.
 */
export interface StudioBundleEntitlement {
  source: StudioEntitlementSource;
  features: string[]; // includes STUDIO_BUNDLE_FEATURES for a bundle
  maxStations: number;
  maxDevicesPerStation: number;
  maxConcurrentOutputs: number;
  auraMonthlyGenerationQuota: number | null; // null = inherit AURA plan quota
  allowedVoiceIds: string[] | null; // null = all voices the AURA plan allows
  allowedFormats: string[] | null; // null = all formats
  offlineLicenseDays: number;
}
