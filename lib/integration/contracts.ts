import { createHash } from 'node:crypto';
import { z } from 'zod';
import type {
  IntegrationContentInput,
  IntegrationContentRequest,
} from '@/lib/db/schema';

export const DEFAULT_DEVICE_SCOPES = [
  'station:read',
  'station:content:request',
  'station:assets:read',
  'station:events:write',
] as const;

export const DeviceScopeSchema = z.enum(DEFAULT_DEVICE_SCOPES);

export function normalizeRequestedScopes(
  raw: string | null | undefined
): string[] | null {
  if (!raw || !raw.trim()) return [...DEFAULT_DEVICE_SCOPES];
  const requested = raw.trim().split(/\s+/);
  const allowed = new Set<string>(DEFAULT_DEVICE_SCOPES);
  for (const s of requested) if (!allowed.has(s)) return null;
  const wanted = new Set(requested);
  return DEFAULT_DEVICE_SCOPES.filter((s) => wanted.has(s));
}

const ArticleSourceSchema = z.object({
  mode: z.literal('article'),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(20_000),
  source: z.string().trim().min(1).max(200).optional(),
  url: z.string().url().max(2_000).optional(),
});

const SearchSourceSchema = z.object({
  mode: z.literal('search'),
  categories: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
  bias: z.enum(['left', 'center', 'right', 'mixed']).default('center'),
  geographicScope: z.enum(['global', 'country']).default('global'),
  location: z.string().trim().min(1).max(160).optional(),
});

const TrackMetadataSchema = z.object({
  title: z.string().trim().min(1).max(300),
  artist: z.string().trim().min(1).max(200).optional(),
});

const VerifiedFactSchema = z.object({
  text: z.string().trim().min(1).max(500),
  sources: z.array(z.object({
    title: z.string().trim().min(1).max(300),
    url: z.string().url().max(2_000),
  })).min(1).max(3),
});

const VoiceLinkBaseSchema = z.object({
  mode: z.literal('between_songs'),
  currentTrack: TrackMetadataSchema,
  nextTracks: z.array(TrackMetadataSchema).min(1).max(4),
  language: z.enum(['en', 'pt', 'es']),
  tone: z.enum(['natural', 'energetic', 'warm', 'institutional']).default('natural'),
  maxDurationSeconds: z.number().int().min(4).max(20).default(10),
  customInstruction: z.string().trim().max(500).optional(),
  factMode: z.enum(['off', 'verified']).default('off'),
  verifiedFact: VerifiedFactSchema.optional(),
}).superRefine((value, ctx) => {
  if (value.factMode === 'off' && value.verifiedFact) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'verifiedFact requires factMode=verified',
      path: ['verifiedFact'],
    });
  }
});

export const VoiceLinkDraftInputSchema = VoiceLinkBaseSchema;

export const NewsBulletinInputSchema = z.object({
  kind: z.literal('news_bulletin').default('news_bulletin'),
  source: z.discriminatedUnion('mode', [ArticleSourceSchema, SearchSourceSchema]),
  title: z.string().trim().min(1).max(300).optional(),
  durationSeconds: z.number().int().min(15).max(600),
  language: z.enum(['en', 'pt', 'es']),
  voiceId: z.string().min(1).max(200).optional(),
  speed: z.number().min(0.8).max(1.5).default(1),
  includeWeather: z.boolean().default(false),
  weatherFormat: z.enum(['separate', 'integrated']).default('separate'),
  weatherLocation: z.string().trim().min(1).max(500).optional(),
  transitionEffects: z.boolean().default(false),
  backgroundMode: z.enum(['none', 'ai']).default('none'),
  backgroundVolume: z.number().int().min(0).max(100).default(20),
  duckBackground: z.boolean().default(true),
  scheduledFor: z.string().datetime({ offset: true }).optional(),
  validForSeconds: z.number().int().min(300).max(7 * 24 * 60 * 60).default(24 * 60 * 60),
});

export const VoiceLinkContentInputSchema = VoiceLinkBaseSchema.innerType().omit({
  maxDurationSeconds: true,
  customInstruction: true,
  factMode: true,
  verifiedFact: true,
}).extend({
  kind: z.literal('voice_link'),
  scriptText: z.string().trim().min(1).max(1_000),
  durationSeconds: z.number().int().min(4).max(20),
  voiceId: z.string().min(1).max(200).optional(),
  speed: z.number().min(0.8).max(1.3).default(1),
  scheduledFor: z.string().datetime({ offset: true }).optional(),
  validForSeconds: z.number().int().min(300).max(24 * 60 * 60).default(24 * 60 * 60),
});

export const ContentRequestInputSchema = z.union([
  VoiceLinkContentInputSchema,
  NewsBulletinInputSchema,
]);

export const PairingCodeCreateSchema = z.object({
  scopes: z.array(DeviceScopeSchema).min(1).optional(),
});

export const PairingExchangeSchema = z.object({
  code: z.string().trim().min(8).max(16),
  deviceName: z.string().trim().min(1).max(120),
  platform: z.enum(['windows', 'macos']),
  deviceKeyAlgorithm: z.literal('ES256'),
  devicePublicKey: z.string().trim().min(80).max(1024),
  pairingProof: z.string().trim().regex(/^[A-Za-z0-9_-]+$/).min(64).max(256),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(32).max(256),
  refreshProof: z.string().trim().regex(/^[A-Za-z0-9_-]+$/).min(64).max(256),
});

export const StudioAuthorizeParamsSchema = z.object({
  client_id: z.string().trim().min(1).max(64),
  redirect_uri: z.string().trim().min(1).max(2048),
  state: z.string().trim().min(8).max(512),
  code_challenge: z.string().trim().min(43).max(128),
  code_challenge_method: z.literal('S256'),
  device_name: z.string().trim().min(1).max(120),
  device_platform: z.enum(['windows', 'macos']),
  device_public_key: z.string().trim().min(80).max(1024),
  device_key_algorithm: z.literal('ES256'),
  scope: z.string().trim().max(256).optional(),
});

export const StudioTokenExchangeSchema = z.object({
  grant_type: z.literal('authorization_code'),
  client_id: z.string().trim().min(1).max(64),
  code: z.string().trim().min(20).max(200),
  redirect_uri: z.string().trim().min(1).max(2048),
  code_verifier: z.string().trim().min(43).max(128),
  device_proof: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]+$/)
    .min(64)
    .max(256),
});

export const StationBootstrapSchema = z.object({
  organizationName: z.string().trim().min(1).max(160).optional(),
  stationName: z.string().trim().min(1).max(160).optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
  defaultLanguage: z.enum(['en', 'pt', 'es']).optional(),
  defaultVoiceId: z.string().min(1).max(200).optional(),
});

const DeviceProofSchema = z.object({
  challengeId: z.string().uuid(),
  challenge: z.string().trim().regex(/^[A-Za-z0-9_-]{43}$/),
  signature: z.string().trim().regex(/^[A-Za-z0-9_-]+$/).min(64).max(256),
});

export const LicenseChallengeCreateSchema = z.object({
  purpose: z.enum(['lease', 'heartbeat', 'deactivate']),
});

export const LicenseLeaseRequestSchema = z.object({
  appVersion: z.string().trim().min(1).max(64),
  buildChannel: z.enum(['stable', 'beta']).default('stable'),
  clientTime: z.string().datetime({ offset: true }).optional(),
  proof: DeviceProofSchema,
});

export const LicenseHeartbeatRequestSchema = z.object({
  leaseId: z.string().uuid(),
  sessionId: z.string().uuid(),
  outputId: z.string().trim().min(1).max(128),
  state: z.enum(['on_air', 'standby', 'released']),
  appVersion: z.string().trim().min(1).max(64),
  clientTime: z.string().datetime({ offset: true }).optional(),
  proof: DeviceProofSchema,
});

export const LicenseDeactivateRequestSchema = z.object({
  reason: z.string().trim().min(1).max(240).default('self_service'),
  proof: DeviceProofSchema,
});

export const StationEventCreateSchema = z
  .object({
    idempotencyKey: z.string().trim().min(8).max(128),
    type: z.enum([
      'asset_downloaded',
      'asset_validated',
      'asset_queued',
      'asset_aired',
      'asset_skipped',
      'asset_failed',
    ]),
    contentRequestId: z.string().uuid().optional(),
    audioId: z.string().uuid().optional(),
    occurredAt: z.string().datetime({ offset: true }),
    payload: z
      .record(z.unknown())
      .refine((value) => JSON.stringify(value).length <= 16_384, {
        message: 'payload exceeds 16 KiB',
      })
      .default({}),
  })
  .refine((value) => value.contentRequestId || value.audioId, {
    message: 'contentRequestId or audioId is required',
    path: ['contentRequestId'],
  });

export type ContentRequestInput = z.infer<typeof ContentRequestInputSchema>;
export type NewsBulletinInput = z.infer<typeof NewsBulletinInputSchema>;
export type VoiceLinkContentInput = z.infer<typeof VoiceLinkContentInputSchema>;
export type VoiceLinkDraftInput = z.infer<typeof VoiceLinkDraftInputSchema>;

export function requestFingerprint(input: ContentRequestInput): string {
  return payloadFingerprint(input);
}

export function payloadFingerprint(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || 'station';
}

export function contentRequestResource(row: IntegrationContentRequest) {
  const input = row.input as IntegrationContentInput;
  return {
    id: row.id,
    stationId: row.stationId,
    kind: row.kind,
    status: row.status,
    input,
    sourceReferences: row.sourceReferences ?? [],
    scheduledFor: row.scheduledFor?.toISOString() ?? null,
    validFrom: row.validFrom?.toISOString() ?? null,
    expiresAt: row.expiresAt.toISOString(),
    error:
      row.errorCode || row.errorMessage
        ? { code: row.errorCode, message: row.errorMessage }
        : null,
    asset:
      row.status === 'ready' && row.audioId
        ? {
            audioId: row.audioId,
            sha256: row.assetSha256,
            bytes: row.assetBytes,
            contentType: row.assetContentType,
            downloadUrl: `/api/v1/stations/${row.stationId}/assets/${row.audioId}/download`,
          }
        : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries
      .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
