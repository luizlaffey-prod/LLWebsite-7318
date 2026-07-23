import { studioBootstrapOrgSlug } from '@/lib/integration/studio-bootstrap';

/**
 * Pure orchestration for the Studio Pro account bootstrap, decoupled from the
 * database via a small store interface so the concurrency/idempotency/cross-
 * tenant behavior is deterministically testable (see studio-bootstrap-flow.test.ts)
 * without a live DB. The drizzle-backed store lives in studio-stations.ts.
 *
 * Invariants enforced here:
 *  - The organization identity is a collision-resistant hash of the user id;
 *    if that slug is already owned by a different billing user, we REFUSE
 *    before creating any membership/entitlement (no cross-tenant attach).
 *  - Every write is an idempotent "insert-if-absent" keyed on an existing
 *    unique constraint, and the default station uses an IMMUTABLE slug — so
 *    concurrent bootstraps and retries converge on exactly one org, one
 *    membership, one entitlement and one default station.
 */

/** Immutable slug for the auto-created default station — never derived from the
 * mutable account/radio name, so a rename or a name difference between
 * concurrent requests cannot produce a second default station. */
export const DEFAULT_STATION_SLUG = 'default-station';

type StudioLocale = 'en' | 'pt' | 'es';

export interface ManageableStation {
  organizationId: string;
  organizationName: string;
  stationId: string;
  stationName: string;
  role: string;
  defaultVoiceId: string | null;
}

export interface BootstrapAccount {
  radioName: string | null;
  name: string | null;
  timezone: string;
  locale: StudioLocale;
}

/** DB operations the bootstrap needs. Each mutating op is idempotent
 * (insert-if-absent on a unique key), mirroring `ON CONFLICT DO NOTHING`. */
export interface StudioBootstrapStore {
  listManageableStations(userId: string): Promise<ManageableStation[]>;
  getAccount(userId: string): Promise<BootstrapAccount | undefined>;
  insertOrganizationIfAbsent(v: {
    name: string;
    slug: string;
    billingUserId: string;
  }): Promise<void>;
  getOrganizationBySlug(
    slug: string
  ): Promise<{ id: string; name: string; billingUserId: string | null } | undefined>;
  insertMembershipIfAbsent(v: {
    organizationId: string;
    userId: string;
    role: 'owner';
  }): Promise<void>;
  ensureEntitlement(organizationId: string): Promise<void>;
  insertStationIfAbsent(v: {
    organizationId: string;
    name: string;
    slug: string;
    timezone: string;
    defaultLanguage: StudioLocale;
  }): Promise<void>;
}

export async function runStudioBootstrap(
  userId: string,
  store: StudioBootstrapStore
): Promise<ManageableStation[]> {
  const existing = await store.listManageableStations(userId);
  if (existing.length > 0) return existing;

  const account = await store.getAccount(userId);
  const fallback = account?.radioName || account?.name || 'My station';
  const orgSlug = studioBootstrapOrgSlug(userId);

  await store.insertOrganizationIfAbsent({
    name: fallback,
    slug: orgSlug,
    billingUserId: userId,
  });
  const org = await store.getOrganizationBySlug(orgSlug);
  if (!org) throw new Error('studio_bootstrap_failed');
  // Cross-tenant safety net: never attach to an org owned by another user.
  if (org.billingUserId !== userId) {
    throw new Error('studio_bootstrap_org_conflict');
  }

  await store.insertMembershipIfAbsent({
    organizationId: org.id,
    userId,
    role: 'owner',
  });
  await store.ensureEntitlement(org.id);
  await store.insertStationIfAbsent({
    organizationId: org.id,
    name: fallback,
    slug: DEFAULT_STATION_SLUG,
    timezone: account?.timezone ?? 'UTC',
    defaultLanguage: account?.locale ?? 'en',
  });

  return store.listManageableStations(userId);
}
