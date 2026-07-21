import {
  authenticateDevice,
  integrationErrorResponse,
} from '@/lib/integration/authorization';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const context = await authenticateDevice(req, undefined, 'station:read');
    return Response.json({
      device: {
        id: context.device.id,
        name: context.device.name,
        platform: context.device.platform,
        activationSlot: context.device.activationSlot,
        scopes: context.device.scopes,
        deviceKeyAlgorithm: context.device.deviceKeyAlgorithm,
        deviceKeyFingerprint: context.device.deviceKeyFingerprint,
      },
      station: {
        id: context.station.id,
        name: context.station.name,
        timezone: context.station.timezone,
        defaultLanguage: context.station.defaultLanguage,
      },
      organization: {
        id: context.organization.id,
        name: context.organization.name,
      },
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
