import { z } from 'zod';

export const ChunkTypeEnum = z.enum([
  'overview',
  'performance',
  'holdings',
  'costs_and_terms',
  'peer_context'
]);

export type ChunkType = z.infer<typeof ChunkTypeEnum>;

export const ChunkMetadataSchema = z.object({
  category: z.string(),
  sub_category: z.string(),
  aum: z.number().optional().nullable(),
  nav: z.number().optional().nullable(),
  expense_ratio: z.number().optional().nullable(),
  return1y: z.number().optional().nullable(),
  return3y: z.number().optional().nullable(),
  return5y: z.number().optional().nullable(),
  exit_load: z.string().optional().nullable(),
  lock_in: z.string().optional().nullable(),
  tags: z.array(z.string()),
  as_of_date: z.string().optional()
});

export type ChunkMetadata = z.infer<typeof ChunkMetadataSchema>;

export const SemanticChunkSchema = z.object({
  chunk_id: z.string().min(1),
  fund_id: z.string().min(1),
  fund_name: z.string().min(1),
  chunk_type: ChunkTypeEnum,
  title: z.string().min(1),
  content: z.string().min(10),
  token_count: z.number().positive(),
  source_url: z.string().url(),
  content_hash: z.string().min(8),
  metadata: ChunkMetadataSchema,
  created_at: z.string()
});

export type SemanticChunk = z.infer<typeof SemanticChunkSchema>;

export const ChunkingOptionsSchema = z.object({
  includePeerContext: z.boolean().default(false),
  maxHoldingsInChunk: z.number().min(5).max(30).default(15),
  minTokenCount: z.number().default(50),
  maxTokenCount: z.number().default(350)
});

export type ChunkingOptions = z.infer<typeof ChunkingOptionsSchema>;

export const ChunkingSummarySchema = z.object({
  totalFundsProcessed: z.number(),
  totalChunksGenerated: z.number(),
  chunksByType: z.record(ChunkTypeEnum, z.number()),
  avgTokensPerChunk: z.number(),
  durationMs: z.number(),
  timestamp: z.string()
});

export type ChunkingSummary = z.infer<typeof ChunkingSummarySchema>;
