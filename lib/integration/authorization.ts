import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  organization,
  organizationMember,
  station,
  stationDevice,
} from '@/lib/db/schema';
import {
  bearerToken,
  hashDeviceToken,
  isAccessToken,
} from '@/lib/integration/device-credentials';

type OrganizationRole = 'owner' | 'admin' | 'operator' | 'viewer';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class IntegrationHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message = code
  ) {
    super(message);
    this.name = 'IntegrationHttpError';
  }
}

export async function requireStationMember(
  stationId: string,
  userId: string,
  roles: OrganizationRole[] = ['owner', 'admin', 'operator', 'viewer']
) {
  assertUuidParam(stationId, 'invalid_station_id');
  const [row] = await db
    .select({
      station,
      organization,
      role: organizationMember.role,
    })
    .from(station)
    .innerJoin(organization, eq(organization.id, station.organizationId))
    .innerJoin(
      organizationMember,
      and(
        eq(organizationMember.organizationId, organization.id),
        eq(organizationMember.userId, userId)
      )
    )
    .where(eq(station.id, stationId))
    .limit(1);

  if (!row || !roles.includes(row.role)) {
    throw new IntegrationHttpError(404, 'station_not_found');
  }
  return row;
}

export async function authenticateDevice(
  req: Request,
  expectedStationId?: string,
  requiredScope?: string
) {
  if (expectedStationId) {
    assertUuidParam(expectedStationId, 'invalid_station_id');
  }
  const token = bearerToken(req);
  if (!token || !isAccessToken(token)) {
    throw new IntegrationHttpError(401, 'invalid_device_token');
  }

  const tokenHash = hashDeviceToken(token);
  const [row] = await db
    .select({
      device: stationDevice,
      station,
      organization,
    })
    .from(stationDevice)
    .innerJoin(station, eq(station.id, stationDevice.stationId))
    .innerJoin(organization, eq(organization.id, station.organizationId))
    .where(eq(stationDevice.accessTokenHash, tokenHash))
    .limit(1);

  const now = new Date();
  if (
    !row ||
    row.device.status !== 'active' ||
    row.device.accessTokenExpiresAt <= now ||
    !row.station.enabled
  ) {
    throw new IntegrationHttpError(401, 'invalid_or_expired_device_token');
  }
  if (expectedStationId && row.station.id !== expectedStationId) {
    throw new IntegrationHttpError(403, 'station_scope_mismatch');
  }
  if (requiredScope && !row.device.scopes.includes(requiredScope)) {
    throw new IntegrationHttpError(403, 'insufficient_scope');
  }

  if (!row.device.lastSeenAt || now.getTime() - row.device.lastSeenAt.getTime() > 5 * 60_000) {
    await db
      .update(stationDevice)
      .set({ lastSeenAt: now, updatedAt: now })
      .where(eq(stationDevice.id, row.device.id));
  }
  return row;
}

export function assertUuidParam(value: string, code = 'invalid_id'): void {
  if (!UUID_PATTERN.test(value)) {
    throw new IntegrationHttpError(400, code);
  }
}

export function integrationErrorResponse(error: unknown): Response {
  if (error instanceof IntegrationHttpError) {
    return Response.json(
      { error: error.code, message: error.message },
      { status: error.status }
    );
  }
  console.error('[studio-pro-api] unexpected error', error);
  return Response.json({ error: 'internal_error' }, { status: 500 });
}
