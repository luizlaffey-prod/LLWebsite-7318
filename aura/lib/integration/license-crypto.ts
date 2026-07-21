import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  timingSafeEqual,
  verify,
  type KeyObject,
} from 'node:crypto';

export const DEVICE_KEY_ALGORITHM = 'ES256' as const;
export const LICENSE_ALGORITHM = 'EdDSA' as const;
export const LICENSE_TOKEN_TYPE = 'AURA-STUDIO-LICENSE' as const;

export interface StudioLicenseClaims {
  iss: 'aura';
  aud: 'studio-pro';
  version: 1;
  jti: string;
  organizationId: string;
  stationId: string;
  deviceId: string;
  deviceKeyFingerprint: string;
  planCode: string;
  features: string[];
  maxDevices: number;
  maxConcurrentOutputs: number;
  expirationMode: 'safe_restricted';
  serverTime: number;
  iat: number;
  exp: number;
  offlineGraceUntil: number;
}

interface StudioLicenseHeader {
  alg: typeof LICENSE_ALGORITHM;
  typ: typeof LICENSE_TOKEN_TYPE;
  kid: string;
}

export function sha256Hex(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

export function deviceKeyFingerprint(publicKeyBase64: string): string {
  const key = parseDevicePublicKey(publicKeyBase64);
  const canonical = key.export({ format: 'der', type: 'spki' });
  return sha256Hex(canonical);
}

export function parseDevicePublicKey(publicKeyBase64: string): KeyObject {
  let key: KeyObject;
  try {
    key = createPublicKey({
      key: Buffer.from(publicKeyBase64, 'base64'),
      format: 'der',
      type: 'spki',
    });
  } catch {
    throw new Error('invalid_device_public_key');
  }

  if (
    key.asymmetricKeyType !== 'ec' ||
    key.asymmetricKeyDetails?.namedCurve !== 'prime256v1'
  ) {
    throw new Error('unsupported_device_public_key');
  }
  return key;
}

export function pairingProofMessage(input: {
  code: string;
  deviceName: string;
  platform: 'windows' | 'macos';
  deviceKeyFingerprint: string;
}): string {
  return [
    'studio-pro-pairing-v1',
    input.code,
    input.deviceName,
    input.platform,
    input.deviceKeyFingerprint,
  ].join('\n');
}

export function deviceProofMessage(input: {
  purpose: 'lease' | 'heartbeat' | 'deactivate';
  challengeId: string;
  challenge: string;
  deviceId: string;
  stationId: string;
  payloadHash: string;
}): string {
  return [
    'studio-pro-device-proof-v1',
    input.purpose,
    input.challengeId,
    input.challenge,
    input.deviceId,
    input.stationId,
    input.payloadHash,
  ].join('\n');
}

export function refreshProofMessage(input: {
  deviceId: string;
  refreshToken: string;
}): string {
  return [
    'studio-pro-token-refresh-v1',
    input.deviceId,
    sha256Hex(input.refreshToken),
  ].join('\n');
}

export function verifyDeviceSignature(input: {
  publicKeyBase64: string;
  message: string;
  signature: string;
}): boolean {
  try {
    const key = parseDevicePublicKey(input.publicKeyBase64);
    return verify(
      'sha256',
      Buffer.from(input.message, 'utf8'),
      key,
      Buffer.from(input.signature, 'base64url')
    );
  } catch {
    return false;
  }
}

export function challengeMatches(challenge: string, expectedHash: string): boolean {
  const actual = Buffer.from(sha256Hex(challenge), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function signStudioLicense(
  claims: StudioLicenseClaims,
  options?: { privateKey?: KeyObject; keyId?: string }
): { token: string; keyId: string } {
  const privateKey = options?.privateKey ?? loadLicensePrivateKey();
  if (privateKey.asymmetricKeyType !== 'ed25519') {
    throw new Error('invalid_studio_license_signing_key');
  }
  const keyId = options?.keyId ?? process.env.STUDIO_LICENSE_KEY_ID ?? 'studio-2026-01';
  const header: StudioLicenseHeader = {
    alg: LICENSE_ALGORITHM,
    typ: LICENSE_TOKEN_TYPE,
    kid: keyId,
  };
  const signingInput = `${encodeJson(header)}.${encodeJson(claims)}`;
  const signature = sign(null, Buffer.from(signingInput), privateKey).toString(
    'base64url'
  );
  return { token: `${signingInput}.${signature}`, keyId };
}

export function verifyStudioLicense(
  token: string,
  publicKey: KeyObject
): { header: StudioLicenseHeader; claims: StudioLicenseClaims } | null {
  const [encodedHeader, encodedClaims, encodedSignature, ...rest] = token.split('.');
  if (!encodedHeader || !encodedClaims || !encodedSignature || rest.length > 0) {
    return null;
  }

  try {
    const header = decodeJson<StudioLicenseHeader>(encodedHeader);
    const claims = decodeJson<StudioLicenseClaims>(encodedClaims);
    if (
      header.alg !== LICENSE_ALGORITHM ||
      header.typ !== LICENSE_TOKEN_TYPE ||
      claims.iss !== 'aura' ||
      claims.aud !== 'studio-pro' ||
      claims.version !== 1
    ) {
      return null;
    }
    const valid = verify(
      null,
      Buffer.from(`${encodedHeader}.${encodedClaims}`),
      publicKey,
      Buffer.from(encodedSignature, 'base64url')
    );
    return valid ? { header, claims } : null;
  } catch {
    return null;
  }
}

function loadLicensePrivateKey(): KeyObject {
  const raw = process.env.STUDIO_LICENSE_PRIVATE_KEY;
  if (!raw) throw new Error('studio_license_signing_key_not_configured');

  try {
    if (raw.includes('BEGIN PRIVATE KEY')) return createPrivateKey(raw);
    return createPrivateKey({
      key: Buffer.from(raw, 'base64'),
      format: 'der',
      type: 'pkcs8',
    });
  } catch {
    throw new Error('invalid_studio_license_signing_key');
  }
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
}
