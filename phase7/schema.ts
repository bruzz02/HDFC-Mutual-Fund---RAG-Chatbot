import { z } from 'zod';

export const ApiHealthResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
  uptimeSec: z.number(),
  version: z.string()
});
export type ApiHealthResponse = z.infer<typeof ApiHealthResponseSchema>;

export const ChatRequestSchema = z.object({
  message: z.string().min(2, 'Message cannot be empty'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional(),
  stream: z.boolean().default(false)
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const RateLimitConfigSchema = z.object({
  windowMs: z.number().default(60000),
  maxRequests: z.number().default(100)
});
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
