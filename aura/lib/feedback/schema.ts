import { z } from 'zod';

export const FEEDBACK_CATEGORIES = ['bug', 'suggestion', 'praise', 'other'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const feedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  message: z.string().trim().min(10).max(2000),
  pageUrl: z.string().trim().max(300).optional().default(''),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
