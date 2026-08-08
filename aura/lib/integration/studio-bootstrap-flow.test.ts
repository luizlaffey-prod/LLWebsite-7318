import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_STATION_SLUG,
  runStudioBootstrap,
  type ManageableStation,
  type StudioBootstrapStore,
} from './studio-bootstrap-flow';
import { studioBootstrapOrgSlug } from './studio-bootstrap';

/**
 * In-memory store that models the real Postgres unique constraints as
 * idempotent insert-if-absent (i.e. `ON CONFLICT DO NOTHING`), so the flow's
 * concurrency / cross-tenant / retry behavior can be asserted deterministically
 * without a live database.
 */
class FakeStore implements StudioBootstrapStore {
  orgsBySlug = new Map<
    string,
    { id: string; name: string; billingUserId: string | null; slug: string }
  >();
  memberships = new Set<string>(); // `${orgId}::${userId}`
  entitlements = new Set<string>(); // orgId
  stationsByKey = new Map<string, { id: string; orgId: string; slug: string; name: string }>();
  accountName: string;
  failEntitlementOnce = false;
  getAccountName?: () => string; // lets a test simulate a rename mid-flight
  private seq = 0;

  constructor(opts: { accountName?: string } = {}) {
    this.accountName = opts.accountName ?? 'Radio One';
  }

  async listManageableStations(userId: string): Promise<ManageableStation[]> {
    const out: ManageableStation[] = [];
    for (const org of this.orgsBySlug.values()) {
      if (!this.memberships.has(`${org.id}::${userId}`)) continue;
      for (const st of this.stationsByKey.values()) {
        if (st.orgId === org.id) {
          out.push({
            organizationId: org.id,
            organizationName: org.name,
            stationId: st.id,
            stationName: st.name,
            role: 'owner',
            defaultVoiceId: null,
          });
        }
      }
    }
    return out;
  }
  async getAccount() {
    const name = this.getAccountName ? this.getAccountName() : this.accountName;
    return { radioName: name, name, timezone: 'UTC', locale: 'en' as const };
  }
  async insertOrganizationIfAbsent(v: { name: string; slug: string; billingUserId: string }) {
    if (this.orgsBySlug.has(v.slug)) return; // ON CONFLICT (slug) DO NOTHING
    this.orgsBySlug.set(v.slug, {
      id: `org_${++this.seq}`,
      name: v.name,
      billingUserId: v.billingUserId,
      slug: v.slug,
    });
  }
  async getOrganizationBySlug(slug: string) {
    const o = this.orgsBySlug.get(slug);
    return o ? { id: o.id, name: o.name, billingUserId: o.billingUserId } : undefined;
  }
  async insertMembershipIfAbsent(v: { organizationId: string; userId: string }) {
    this.memberships.add(`${v.organizationId}::${v.userId}`); // Set = idempotent
  }
  async ensureEntitlement(orgId: string) {
    if (this.failEntitlementOnce) {
      this.failEntitlementOnce = false;
      throw new Error('transient_entitlement_failure');
    }
    this.entitlements.add(orgId);
  }
  async insertStationIfAbsent(v: { organizationId: string; slug: string; name: string }) {
    const key = `${v.organizationId}::${v.slug}`;
    if (this.stationsByKey.has(key)) return; // ON CONFLICT (org, slug) DO NOTHING
    this.stationsByKey.set(key, {
      id: `st_${++this.seq}`,
      orgId: v.organizationId,
      slug: v.slug,
      name: v.name,
    });
  }
}

describe('runStudioBootstrap — behavior', () => {
  let store: FakeStore;
  beforeEach(() => {
    store = new FakeStore();
  });

  it('refuses a preclaimed org slug owned by a different billing user (no cross-tenant attach)', async () => {
    const slug = studioBootstrapOrgSlug('userA');
    store.orgsBySlug.set(slug, {
      id: 'org_other',
      name: 'Someone else',
      billingUserId: 'userB',
      slug,
    });

    await expect(runStudioBootstrap('userA', store)).rejects.toThrow(
      'studio_bootstrap_org_conflict'
    );
    // Nothing was attached to userA's identity.
    expect(store.memberships.size).toBe(0);
    expect(store.entitlements.size).toBe(0);
    expect(store.stationsByKey.size).toBe(0);
  });

  it('two concurrent bootstraps converge on one org, membership, entitlement and station', async () => {
    await Promise.all([
      runStudioBootstrap('userA', store),
      runStudioBootstrap('userA', store),
    ]);
    expect(store.orgsBySlug.size).toBe(1);
    expect(store.memberships.size).toBe(1);
    expect(store.entitlements.size).toBe(1);
    expect(store.stationsByKey.size).toBe(1);
  });

  it('retry after a partial bootstrap completes without duplicates', async () => {
    store.failEntitlementOnce = true;
    await expect(runStudioBootstrap('userA', store)).rejects.toThrow();
    // org + membership were created; entitlement + station were not.
    expect(store.orgsBySlug.size).toBe(1);
    expect(store.memberships.size).toBe(1);
    expect(store.entitlements.size).toBe(0);
    expect(store.stationsByKey.size).toBe(0);

    const result = await runStudioBootstrap('userA', store);
    expect(store.orgsBySlug.size).toBe(1);
    expect(store.memberships.size).toBe(1);
    expect(store.entitlements.size).toBe(1);
    expect(store.stationsByKey.size).toBe(1);
    expect(result).toHaveLength(1);
  });

  it('an account-name change cannot create a second default station (immutable slug)', async () => {
    let calls = 0;
    store.getAccountName = () => (calls++ === 0 ? 'Radio A' : 'Radio B');
    await Promise.all([
      runStudioBootstrap('userA', store),
      runStudioBootstrap('userA', store),
    ]);
    expect(store.stationsByKey.size).toBe(1);
    expect([...store.stationsByKey.values()][0].slug).toBe(DEFAULT_STATION_SLUG);
  });
});
