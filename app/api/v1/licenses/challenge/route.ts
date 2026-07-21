import {
  authenticateDevice,
  integrationErrorResponse,
} from '@/lib/integration/authorization';
import { LicenseChallengeCreateSchema } from '@/lib/integration/contracts';
import { createLicenseChallenge } from '@/lib/integration/licensing';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const context = await authenticateDevice(req, undefined, 'station:read');
    const body = await req.json().catch(() => ({}));
    const parsed = LicenseChallengeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'invalid_input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const challenge = await createLicenseChallenge(context, parsed.data.purpose);
    return Response.json(
      {
        challengeId: challenge.id,
        challenge: challenge.challenge,
        purpose: challenge.purpose,
        expiresAt: challenge.expiresAt.toISOString(),
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
