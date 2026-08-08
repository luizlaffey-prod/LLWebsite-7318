import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  organization,
  organizationMember,
  station,
  user,
} from '@/lib/db/schema';
import { ensureStudioEntitlement } from '@/lib/integration/licensing';
import {
  runStudioBootstrap,
  type ManageableStation,
  type StudioBootstrapStore,
} from '@/lib/integration/studio-bootstrap-flow';

export type { ManageableStation } from '@/lib/integration/studio-bootstrap-flow';

/** Stations the user can manage (owner/admin) across all their organizations. */
export async function getManageableStations(
  userId: string
): Promise<ManageableStation[]> {
  return db
    .select({
      organizationId: organization.id,
      organizationName: organization.name,
      stationId: station.id,
      stationName: station.name,
      role: organizationMember.role,
      defaultVoiceId: station.defaultVoiceId,
    })
    .from(organizationMember)
    .innerJoin(organization, eq(organization.id, organizationMember.organizationId))
    .innerJoin(station, eq(station.organizationId, organization.id))
    .where(
      and(
        eq(organizationMember.userId, userId),
        inArray(organizationMember.role, ['owner', 'admin'])
      )
    );
}

/**
 * Drizzle-backed bootstrap store. neon-http has no interactive transactions,
 * so concurrency-safety comes from idempotent `ON CONFLICT DO NOTHING` writes
 * keyed on existing unique constraints (`organization_slug_idx`,
 * `organization_member_org_user_idx`, entitlement-per-org, and
 * `station_org_slug_idx`).
 */
const drizzleStore: StudioBootstrapStore = {
  listManageableStations: getManageableStations,
  async getAccount(userId) {
    const [a] = await db
      .select({
        radioName: user.radioName,
        name: user.name,
        timezone: user.timezone,
        locale: user.locale,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    return a;
  },
  async insertOrganizationIfAbsent(v) {
    await db
      .insert(organization)
      .values(v)
      .onConflictDoNothing({ target: organization.slug });
  },
  async getOrganizationBySlug(slug) {
    const [o] = await db
      .select({
        id: organization.id,
        name: organization.name,
        billingUserId: organization.billingUserId,
      })
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1);
    return o;
  },
  async insertMembershipIfAbsent(v) {
    await db
      .insert(organizationMember)
      .values(v)
      .onConflictDoNothing({
        target: [organizationMember.organizationId, organizationMember.userId],
      });
  },
  async ensureEntitlement(organizationId) {
    await ensureStudioEntitlement(organizationId);
  },
  async insertStationIfAbsent(v) {
    await db
      .insert(station)
      .values(v)
      .onConflictDoNothing({ target: [station.organizationId, station.slug] });
  },
};

/**
 * Like getManageableStations, but bootstraps a default organization + station
 * (+ trial entitlement) for a brand-new account that has none yet. Idempotent
 * and cross-tenant-safe — see runStudioBootstrap.
 */
export async function getOrCreateManageableStations(
  userId: string
): Promise<ManageableStation[]> {
  return runStudioBootstrap(userId, drizzleStore);
}
