import { z } from 'zod';

export const ScheduleSlotSchema = z.object({
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'invalid_time'),
  categories: z.array(z.string()).min(1),
  // JS Date.getDay() encoding: 0=Sun, 1=Mon, ..., 6=Sat. Empty or
  // omitted = fire every day (preserves the original behavior for
  // automations created before this field existed).
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
});

export const AutomationInput = z.object({
  name: z.string().min(2).max(120),
  slots: z.array(ScheduleSlotSchema).min(1).max(24),
  durationSeconds: z.number().int().min(30).max(600),
  language: z.enum(['en', 'pt', 'es']),
  voiceId: z.string().uuid(),
  speed: z.number().min(0.8).max(1.5).default(1.0),
  bgTrackUrl: z.string().url().optional().nullable(),
  duckAudio: z.boolean().default(true),
  includeWeather: z.boolean().default(false),
  weatherFormat: z.enum(['separate', 'integrated']).default('separate'),
  geographicScope: z.enum(['global', 'country']).default('global'),
  location: z.string().optional().nullable(),
  // Optional dedicated city for the weather block. Falls back to
  // `location` when blank.
  weatherCity: z.string().optional().nullable(),
  // Whether to insert a short transition sting between blocks whose
  // topic changes. Default ON because the beta tester explicitly
  // asked for it and the cost is one cached audio file.
  transitionEffects: z.boolean().default(true),
  bias: z.enum(['left', 'center', 'right']).default('center'),
  timezone: z.string().default('UTC'),
  enabled: z.boolean().default(true),
});

export type AutomationInputType = z.infer<typeof AutomationInput>;
