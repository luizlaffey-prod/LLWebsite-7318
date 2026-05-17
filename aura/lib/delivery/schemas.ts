import { z } from 'zod';

export const FtpConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(21),
  username: z.string().min(1),
  password: z.string().min(1),
  remoteDir: z.string().optional(),
  secure: z.boolean().optional(),
});

export const HttpConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['POST', 'PUT']).default('POST'),
  bearerToken: z.string().optional(),
  customHeaders: z.record(z.string(), z.string()).optional(),
});

export const EmailConfigSchema = z.object({
  recipient: z.string().email(),
});

export const LocalFolderConfigSchema = z.object({
  // The actual filesystem handle lives in the operator's browser
  // (IndexedDB), not on the server. We only persist a friendly label so
  // the UI can show something meaningful next to the row.
  label: z.string().max(80).optional(),
});

export const DeliveryInput = z.discriminatedUnion('type', [
  z.object({
    name: z.string().min(2).max(120),
    type: z.literal('ftp'),
    config: FtpConfigSchema,
    slotNamingPattern: z.string().min(1).max(200).default('{{name}}_{{date}}'),
    enabled: z.boolean().default(true),
  }),
  z.object({
    name: z.string().min(2).max(120),
    type: z.literal('http'),
    config: HttpConfigSchema,
    slotNamingPattern: z.string().min(1).max(200).default('{{name}}_{{date}}'),
    enabled: z.boolean().default(true),
  }),
  z.object({
    name: z.string().min(2).max(120),
    type: z.literal('email'),
    config: EmailConfigSchema,
    slotNamingPattern: z.string().min(1).max(200).default('{{name}}_{{date}}'),
    enabled: z.boolean().default(true),
  }),
  z.object({
    name: z.string().min(2).max(120),
    type: z.literal('local_folder'),
    config: LocalFolderConfigSchema,
    slotNamingPattern: z.string().min(1).max(200).default('{{name}}_{{date}}'),
    enabled: z.boolean().default(true),
  }),
]);

export type DeliveryInputType = z.infer<typeof DeliveryInput>;
