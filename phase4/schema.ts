import { z } from 'zod';
import { VectorDocumentSchema } from '../phase3/schema';

export const QueryIntentSchema = z.enum([
  'overview',
  'performance',
  'holdings',
  'costs_and_terms',
  'comparison',
  'general'
]);
export type QueryIntent = z.infer<typeof QueryIntentSchema>;

export const ProcessedQuerySchema = z.object({
  rawQuery: z.string(),
  intent: QueryIntentSchema,
  targetFunds: z.array(z.string()).default([]),
  targetSubCategories: z.array(z.string()).default([]),
  expandedKeywords: z.array(z.string()).default([]),
  isComparative: z.boolean().default(false)
});
export type ProcessedQuery = z.infer<typeof ProcessedQuerySchema>;

export const ScoredCandidateSchema = z.object({
  document: VectorDocumentSchema,
  denseScore: z.number().optional(),
  denseRank: z.number().optional(),
  sparseScore: z.number().optional(),
  sparseRank: z.number().optional(),
  rrfScore: z.number(),
  rerankScore: z.number().optional(),
  finalRank: z.number(),
  relevanceRationale: z.string().optional()
});
export type ScoredCandidate = z.infer<typeof ScoredCandidateSchema>;

export const RetrievalResultSchema = z.object({
  query: z.string(),
  processedQuery: ProcessedQuerySchema,
  topChunks: z.array(ScoredCandidateSchema),
  totalExamined: z.number(),
  latencyMs: z.number(),
  rerankerMode: z.enum(['heuristic_cross_encoder', 'gemini_flash', 'none']),
  contextMarkdown: z.string()
});
export type RetrievalResult = z.infer<typeof RetrievalResultSchema>;
