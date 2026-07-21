import { z } from 'zod';

/**
 * Validation for the website-publishing connection a station configures in
 * /settings/publishing. A discriminated union on `type` keeps the WordPress
 * and generic-webhook shapes separate. Secrets (app password / signing
 * secret) are split from the plaintext fields by the API route before the
 * secret half is encrypted at rest.
 */

// Trailing slashes on the site root break `${siteUrl}/wp-json/...`, so we
// normalize them off wherever a URL is accepted.
const trimmedUrl = z
  .string()
  .url()
  .transform((u) => u.replace(/\/+$/, ''));

export const WordPressInput = z.object({
  type: z.literal('wordpress'),
  siteUrl: trimmedUrl,
  username: z.string().min(1),
  // WordPress "Application Passwords" are shown with spaces (xxxx xxxx …);
  // they work with or without them, but we keep exactly what the user pasted.
  appPassword: z.string().min(1),
  defaultStatus: z.enum(['draft', 'publish']).default('draft'),
  enabled: z.boolean().default(true),
});

export const WebhookInput = z.object({
  type: z.literal('webhook'),
  siteUrl: trimmedUrl,
  secret: z.string().max(200).optional(),
  enabled: z.boolean().default(true),
});

export const PublishingInput = z.discriminatedUnion('type', [
  WordPressInput,
  WebhookInput,
]);

export type PublishingInputType = z.infer<typeof PublishingInput>;
