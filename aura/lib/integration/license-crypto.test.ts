import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  challengeMatches,
  deviceKeyFingerprint,
  deviceProofMessage,
  pairingProofMessage,
  refreshProofMessage,
  sha256Hex,
  signStudioLicense,
  verifyDeviceSignature,
  verifyStudioLicense,
  type StudioLicenseClaims,
} from './license-crypto';

describe('Studio Pro license cryptography', () => {
  it('signs an offline lease with Ed25519 and rejects payload tampering', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const claims: StudioLicenseClaims = {
      iss: 'aura',
      aud: 'studio-pro',
      version: 1,
      jti: 'e7bb0e9b-ff3d-48b6-8355-f485741503ec',
      organizationId: 'a8ce9c36-ec59-4e83-a011-377951cb4986',
      stationId: 'd15ab02f-9b06-47e2-9086-79e399453c8d',
      deviceId: '79725216-0a37-48e7-8047-a0762a0da9e5',
      deviceKeyFingerprint: 'abc123',
      planCode: 'studio_pro',
      features: ['aura_content', 'core_playout'],
      maxDevices: 2,
      maxConcurrentOutputs: 1,
      expirationMode: 'safe_restricted',
      serverTime: 1_784_633_400,
      iat: 1_784_633_400,
      exp: 1_784_719_800,
      offlineGraceUntil: 1_785_238_200,
    };

    const signed = signStudioLicense(claims, {
      privateKey,
      keyId: 'test-key',
    });
    expect(verifyStudioLicense(signed.token, publicKey)?.claims).toEqual(claims);

    const parts = signed.token.split('.');
    const tamperedClaims = { ...claims, maxConcurrentOutputs: 99 };
    parts[1] = Buffer.from(JSON.stringify(tamperedClaims)).toString('base64url');
    expect(verifyStudioLicense(parts.join('.'), publicKey)).toBeNull();
  });

  it('binds pairing, challenge and refresh proofs to a P-256 device key', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ec', {
      namedCurve: 'P-256',
    });
    const publicKeyBase64 = publicKey
      .export({ format: 'der', type: 'spki' })
      .toString('base64');
    const fingerprint = deviceKeyFingerprint(publicKeyBase64);
    const messages = [
      pairingProofMessage({
        code: 'ABCDEFGH',
        deviceName: 'On-air Mac',
        platform: 'macos',
        deviceKeyFingerprint: fingerprint,
      }),
      deviceProofMessage({
        purpose: 'lease',
        challengeId: 'e7bb0e9b-ff3d-48b6-8355-f485741503ec',
        challenge: 'test-challenge',
        deviceId: '79725216-0a37-48e7-8047-a0762a0da9e5',
        stationId: 'd15ab02f-9b06-47e2-9086-79e399453c8d',
        payloadHash: sha256Hex('payload'),
      }),
      refreshProofMessage({
        deviceId: '79725216-0a37-48e7-8047-a0762a0da9e5',
        refreshToken: 'aura_rt_secret',
      }),
    ];

    for (const message of messages) {
      const signature = sign('sha256', Buffer.from(message), privateKey).toString(
        'base64url'
      );
      expect(
        verifyDeviceSignature({ publicKeyBase64, message, signature })
      ).toBe(true);
      expect(
        verifyDeviceSignature({
          publicKeyBase64,
          message: `${message}-tampered`,
          signature,
        })
      ).toBe(false);
    }
  });

  it('compares one-time challenges without exposing the stored value', () => {
    const challenge = 'random-base64url-challenge';
    expect(challengeMatches(challenge, sha256Hex(challenge))).toBe(true);
    expect(challengeMatches(`${challenge}x`, sha256Hex(challenge))).toBe(false);
  });
});
