import { z } from 'zod';

export const EvaluationMetricsSchema = z.object({
  contextPrecision: z.number().min(0).max(1),
  faithfulness: z.number().min(0).max(1),
  answerRelevance: z.number().min(0).max(1),
  compositeRagScore: z.number().min(0).max(1)
});
export type EvaluationMetrics = z.infer<typeof EvaluationMetricsSchema>;

export const EvaluationCaseResultSchema = z.object({
  caseId: z.string(),
  query: z.string(),
  expectedCategory: z.string(),
  retrievedChunksCount: z.number(),
  metrics: EvaluationMetricsSchema,
  passedThresholds: z.boolean(),
  latencyMs: z.number()
});
export type EvaluationCaseResult = z.infer<typeof EvaluationCaseResultSchema>;

export const EvaluationSuiteReportSchema = z.object({
  totalCases: z.number(),
  passedCases: z.number(),
  averageContextPrecision: z.number(),
  averageFaithfulness: z.number(),
  averageAnswerRelevance: z.number(),
  overallCompositeScore: z.number(),
  results: z.array(EvaluationCaseResultSchema),
  timestamp: z.string()
});
export type EvaluationSuiteReport = z.infer<typeof EvaluationSuiteReportSchema>;

export const CacheEntrySchema = z.object({
  query: z.string(),
  queryEmbedding: z.array(z.number()),
  responseMarkdown: z.string(),
  sourceUrls: z.array(z.string()),
  hits: z.number(),
  createdAt: z.string()
});
export type CacheEntry = z.infer<typeof CacheEntrySchema>;
